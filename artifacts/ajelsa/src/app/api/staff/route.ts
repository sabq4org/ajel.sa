/**
 * /api/staff — list / create staff members
 */
import { NextRequest } from "next/server";
import { db, users, articles, roles } from "@/lib/db";
import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { ok, created, fromError, ensurePerm, badRequest, conflict, imageUrlSchema } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { STAFF_COLUMNS, generateUniqueSlug, FORMER_STAFF_SLUG } from "@/lib/staff";
import { logActivity, requestMeta } from "@/lib/activity";
import { validatePassword, generateTemporaryPassword } from "@/lib/password";

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().optional(),
  fullName: z.string().min(2).max(200),
  displayName: z.string().max(200).optional().nullable(),
  slug: z.string().max(200).optional().nullable(),
  jobTitle: z.string().max(200).optional().nullable(),
  department: z.string().max(120).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  alternateEmail: z.string().email().optional().nullable().or(z.literal("")),
  shortBio: z.string().max(280).optional().nullable(),
  bio: z.string().optional().nullable(),
  avatarUrl: imageUrlSchema.optional().nullable(),
  coverUrl: imageUrlSchema.optional().nullable(),
  twitterHandle: z.string().max(50).optional().nullable(),
  facebookHandle: z.string().max(100).optional().nullable(),
  instagramHandle: z.string().max(100).optional().nullable(),
  linkedinHandle: z.string().max(100).optional().nullable(),
  youtubeHandle: z.string().max(100).optional().nullable(),
  tiktokHandle: z.string().max(100).optional().nullable(),
  websiteUrl: z.string().url().optional().nullable().or(z.literal("")),
  roleId: z.string().uuid().optional().nullable(),
  /** Legacy enum (still required by NOT NULL column) */
  role: z.enum(["super_admin", "editor_in_chief", "editor", "writer", "contributor"]).default("writer"),
  isActive: z.boolean().default(true),
  isVerified: z.boolean().default(false),
  mustChangePassword: z.boolean().default(true),
  internalNotes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    await ensurePerm("staff.view");
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim();
    const roleId = url.searchParams.get("roleId");
    const department = url.searchParams.get("department");
    const status = url.searchParams.get("status"); // active|inactive|all
    const sort = url.searchParams.get("sort") ?? "createdAt"; // createdAt|fullName|lastLoginAt
    const dir = url.searchParams.get("dir") === "asc" ? "asc" : "desc";
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 200), 500);

    const filters = [] as any[];
    // Always hide the system "Former Staff" placeholder from the team list
    filters.push(ne(users.slug, FORMER_STAFF_SLUG));
    if (q) {
      filters.push(
        or(
          ilike(users.fullName, `%${q}%`),
          ilike(users.email, `%${q}%`),
          ilike(users.displayName, `%${q}%`)
        )
      );
    }
    if (roleId) filters.push(eq(users.roleId, roleId));
    if (department) filters.push(eq(users.department, department));
    if (status === "active") filters.push(eq(users.isActive, true));
    if (status === "inactive") filters.push(eq(users.isActive, false));

    const sortCol =
      sort === "fullName"
        ? users.fullName
        : sort === "lastLoginAt"
        ? users.lastLoginAt
        : users.createdAt;

    const items = await db
      .select({
        ...STAFF_COLUMNS,
        roleKey: roles.key,
        roleNameAr: roles.nameAr,
      })
      .from(users)
      .leftJoin(roles, eq(roles.id, users.roleId))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(dir === "asc" ? asc(sortCol) : desc(sortCol))
      .limit(limit);

    // Article counts in one query
    const ids = items.map((r) => r.id);
    let counts: Record<string, number> = {};
    if (ids.length > 0) {
      const cs = await db
        .select({ authorId: articles.authorId, c: sql<number>`count(*)::int` })
        .from(articles)
        .where(inArray(articles.authorId, ids))
        .groupBy(articles.authorId);
      counts = Object.fromEntries(cs.map((r) => [r.authorId, Number(r.c)]));
    }

    return ok({
      items: items.map((it) => ({ ...it, articlesCount: counts[it.id] ?? 0 })),
    });
  } catch (e) {
    return fromError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await ensurePerm("staff.create");
    const body = await req.json();
    const data = createSchema.parse(body);

    const password = data.password?.trim() || generateTemporaryPassword();
    const pwCheck = validatePassword(password);
    if (!pwCheck.ok) return badRequest(pwCheck.error);

    const email = data.email.trim().toLowerCase();
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing) return conflict("البريد مسجَّل مسبقًا");

    const slug = data.slug?.trim()
      ? await generateUniqueSlug(data.slug)
      : await generateUniqueSlug(data.fullName);

    const passwordHash = await hashPassword(password);

    const [row] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        fullName: data.fullName,
        displayName: data.displayName || null,
        slug,
        jobTitle: data.jobTitle || null,
        department: data.department || null,
        phone: data.phone || null,
        alternateEmail: data.alternateEmail || null,
        shortBio: data.shortBio || null,
        bio: data.bio || null,
        avatarUrl: data.avatarUrl || null,
        coverUrl: data.coverUrl || null,
        twitterHandle: data.twitterHandle || null,
        facebookHandle: data.facebookHandle || null,
        instagramHandle: data.instagramHandle || null,
        linkedinHandle: data.linkedinHandle || null,
        youtubeHandle: data.youtubeHandle || null,
        tiktokHandle: data.tiktokHandle || null,
        websiteUrl: data.websiteUrl || null,
        roleId: data.roleId || null,
        role: data.role,
        isActive: data.isActive,
        isVerified: data.isVerified,
        mustChangePassword: data.mustChangePassword,
        internalNotes: data.internalNotes || null,
        createdBy: session.userId,
        joinedAt: new Date(),
      })
      .returning(STAFF_COLUMNS);

    const meta = requestMeta(req);
    await logActivity({
      userId: row.id,
      action: "created",
      actorId: session.userId,
      actorName: session.fullName,
      details: { generatedPassword: !data.password },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    // Never return the plain password in the HTTP response. When a temp
    // password is generated, log it to the server console so an admin can
    // retrieve it from the workflow logs until SMTP delivery is wired up
    // (see follow-up #29). The UI tells the admin to use the password
    // reset flow if the value isn't surfaced.
    if (!data.password) {
      console.warn(
        `[staff:create] Generated temporary password for ${email} (id=${row.id}): ${password}`
      );
    }

    return created({
      user: row,
      passwordWasGenerated: !data.password,
    });
  } catch (e) {
    return fromError(e);
  }
}
