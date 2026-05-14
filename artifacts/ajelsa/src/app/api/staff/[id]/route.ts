/**
 * /api/staff/[id] — get / update / delete a single staff member.
 *
 * - GET requires staff.view (or self with staff.view_self)
 * - PATCH requires staff.edit (or self with staff.edit_self for safe fields)
 * - DELETE requires staff.delete and supports optional `?reassignTo=<id>`
 *   (or `{ reassignTo }` JSON body) to reassign the deleted member's
 *   articles to another author. When omitted, all articles are reassigned
 *   to the system "Former Staff" placeholder so authorship is preserved.
 */
import { NextRequest } from "next/server";
import { db, users, articles, roles } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  ok, badRequest, conflict, notFound, fromError, ensureAuth, imageUrlSchema,
} from "@/lib/api";
import { sessionHasPermission } from "@/lib/auth";
import { invalidateUserPermissions } from "@/lib/permissions";
import { STAFF_COLUMNS, generateUniqueSlug, getOrCreateFormerStaffUser } from "@/lib/staff";
import { logActivity, requestMeta } from "@/lib/activity";

const updateSchema = z.object({
  fullName: z.string().min(2).max(200).optional(),
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
  isVerified: z.boolean().optional(),
  internalNotes: z.string().optional().nullable(),
  preferences: z.any().optional(),
  customPermissions: z
    .object({
      add: z.array(z.string()).default([]),
      remove: z.array(z.string()).default([]),
    })
    .nullable()
    .optional(),
});

const SELF_SAFE_FIELDS = new Set([
  "fullName",
  "displayName",
  "phone",
  "alternateEmail",
  "shortBio",
  "bio",
  "avatarUrl",
  "coverUrl",
  "twitterHandle",
  "facebookHandle",
  "instagramHandle",
  "linkedinHandle",
  "youtubeHandle",
  "tiktokHandle",
  "websiteUrl",
  "preferences",
]);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await ensureAuth();
    const { id } = await params;
    const isSelf = session.userId === id;

    if (!isSelf) {
      const canViewAll = await sessionHasPermission(session, "staff.view");
      if (!canViewAll) throw new Error("FORBIDDEN");
    } else {
      const canSelf =
        (await sessionHasPermission(session, "staff.view_self")) ||
        (await sessionHasPermission(session, "staff.view"));
      if (!canSelf) throw new Error("FORBIDDEN");
    }

    const [user] = await db
      .select({
        ...STAFF_COLUMNS,
        roleKey: roles.key,
        roleNameAr: roles.nameAr,
        roleLevel: roles.level,
      })
      .from(users)
      .leftJoin(roles, eq(roles.id, users.roleId))
      .where(eq(users.id, id))
      .limit(1);

    if (!user) return notFound("المنسوب غير موجود");
    return ok({ user });
  } catch (e) {
    return fromError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await ensureAuth();
    const { id } = await params;
    const isSelf = session.userId === id;

    const canEditAll = await sessionHasPermission(session, "staff.edit");
    if (!isSelf && !canEditAll) throw new Error("FORBIDDEN");
    if (isSelf && !canEditAll) {
      const canSelfEdit = await sessionHasPermission(session, "staff.edit_self");
      if (!canSelfEdit) throw new Error("FORBIDDEN");
    }

    const body = await req.json();
    const data = updateSchema.parse(body);

    // Self-edit: drop any field not in SELF_SAFE_FIELDS
    if (isSelf && !canEditAll) {
      const mutableData = data as Record<string, unknown>;
      for (const key of Object.keys(mutableData)) {
        if (!SELF_SAFE_FIELDS.has(key)) delete mutableData[key];
      }
    }

    // customPermissions: requires staff.override_permissions
    if (data.customPermissions !== undefined) {
      const ok = await sessionHasPermission(session, "staff.override_permissions");
      if (!ok) return badRequest("لا تملك صلاحية تعديل الصلاحيات الخاصة");
    }

    // Slug uniqueness on rename
    let newSlug: string | undefined;
    if (data.slug !== undefined && data.slug !== null && data.slug !== "") {
      newSlug = await generateUniqueSlug(data.slug, id);
    } else if (data.fullName) {
      const [cur] = await db
        .select({ slug: users.slug, fullName: users.fullName })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      if (cur && (!cur.slug || cur.slug === "")) {
        newSlug = await generateUniqueSlug(data.fullName, id);
      }
    }

    const updates: Record<string, unknown> = { ...data, updatedAt: new Date() };
    if (newSlug) updates.slug = newSlug;
    // empty strings → null for optional cols
    for (const k of ["alternateEmail", "websiteUrl"] as const) {
      if (updates[k] === "") updates[k] = null;
    }

    const [row] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning(STAFF_COLUMNS);

    if (!row) return notFound("المنسوب غير موجود");

    if (data.customPermissions !== undefined) {
      invalidateUserPermissions(id);
      const meta = requestMeta(req);
      await logActivity({
        userId: id,
        action: "permissions_changed",
        actorId: session.userId,
        actorName: session.fullName,
        details: { customPermissions: data.customPermissions },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
    }

    const meta = requestMeta(req);
    await logActivity({
      userId: id,
      action: "updated",
      actorId: session.userId,
      actorName: session.fullName,
      details: { fields: Object.keys(data) },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return ok({ user: row });
  } catch (e: any) {
    if (e?.code === "23505") return conflict("هذا المعرف مستخدم");
    return fromError(e);
  }
}

const deleteSchema = z.object({
  reassignTo: z.string().uuid().nullable().optional(),
});

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await ensureAuth();
    const can = await sessionHasPermission(session, "staff.delete");
    if (!can) throw new Error("FORBIDDEN");

    const { id } = await params;
    if (id === session.userId) return badRequest("لا يمكنك حذف حسابك");

    // Resolve `reassignTo` from query string first, then JSON body as a
    // fallback. The admin UI sends it as a query param.
    const qpRaw = req.nextUrl.searchParams.get("reassignTo");
    let rawReassign: string | null | undefined =
      qpRaw === null ? undefined : qpRaw === "" ? null : qpRaw;

    if (rawReassign === undefined) {
      try {
        const parsedBody = deleteSchema.parse(await req.json());
        rawReassign = parsedBody.reassignTo ?? undefined;
      } catch {
        // body optional / not JSON
      }
    } else {
      // Validate query value matches schema (uuid or null)
      try {
        deleteSchema.parse({ reassignTo: rawReassign });
      } catch (e) {
        return fromError(e);
      }
    }

    const [target] = await db
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!target) return notFound("المنسوب غير موجود");

    // Determine the effective reassignment target.
    // - explicit uuid: validate it exists and isn't the same user being deleted
    // - null / omitted: fall back to the "Former Staff" placeholder so
    //   article authorship is always preserved (no orphans)
    let reassignTargetId: string;
    let usedPlaceholder = false;
    if (rawReassign) {
      if (rawReassign === id) return badRequest("لا يمكن إعادة الإسناد إلى نفس المنسوب");
      const [reassign] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, rawReassign))
        .limit(1);
      if (!reassign) return badRequest("المنسوب البديل غير موجود");
      reassignTargetId = rawReassign;
    } else {
      reassignTargetId = await getOrCreateFormerStaffUser();
      usedPlaceholder = true;
    }

    await db
      .update(articles)
      .set({ authorId: reassignTargetId })
      .where(eq(articles.authorId, id));

    await db.delete(users).where(eq(users.id, id));
    invalidateUserPermissions(id);

    const meta = requestMeta(req);
    await logActivity({
      userId: id,
      action: "deleted",
      actorId: session.userId,
      actorName: session.fullName,
      details: {
        reassignedTo: reassignTargetId,
        usedPlaceholder,
        fullName: target.fullName,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return ok({ ok: true, reassignedTo: reassignTargetId, usedPlaceholder });
  } catch (e) {
    return fromError(e);
  }
}
