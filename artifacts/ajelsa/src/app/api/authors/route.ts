/**
 * /api/authors — list + create columnist profiles
 */

import { NextRequest, NextResponse } from "next/server";
import { db, authors, opinionArticles } from "@/lib/db";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { requirePerm } from "@/lib/auth";
import { imageUrlSchema } from "@/lib/api";
import { arabicSlug } from "@/lib/utils";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const slugSchema = z
  .string()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9\u0600-\u06FF-]+$/i, "الرابط يجب أن يحتوي حروفاً أو أرقاماً أو شرطات فقط");

const createSchema = z.object({
  fullName: z.string().min(2).max(200),
  slug: slugSchema.optional(),
  position: z.string().max(200).optional().nullable(),
  bio: z.string().max(4000).optional().nullable(),
  shortBio: z.string().max(300).optional().nullable(),
  avatarUrl: imageUrlSchema.optional().nullable(),
  email: z.string().email().optional().nullable(),
  twitter: z.string().max(60).optional().nullable(),
  userId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().default(true),
});

export async function GET(_req: NextRequest) {
  // Admin-only listing — public surfaces use lib/queries/opinions.ts directly
  // and the dropdown for the opinion editor uses /api/authors/options.
  try {
    await requirePerm("authors.manage");
  } catch (err: any) {
    if (err.message === "UNAUTHENTICATED")
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (err.message === "FORBIDDEN")
      return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
    throw err;
  }
  const rows = await db
    .select({
      id: authors.id,
      slug: authors.slug,
      fullName: authors.fullName,
      position: authors.position,
      shortBio: authors.shortBio,
      avatarUrl: authors.avatarUrl,
      email: authors.email,
      twitter: authors.twitter,
      isActive: authors.isActive,
      userId: authors.userId,
      createdAt: authors.createdAt,
      updatedAt: authors.updatedAt,
      opinionCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${opinionArticles}
        WHERE ${opinionArticles.authorId} = ${authors.id}
      )`,
      totalReads: sql<number>`(
        SELECT COALESCE(SUM(${opinionArticles.viewCount}), 0)::int FROM ${opinionArticles}
        WHERE ${opinionArticles.authorId} = ${authors.id}
      )`,
    })
    .from(authors)
    .orderBy(desc(authors.createdAt));
  return NextResponse.json({ items: rows });
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm("authors.manage");
    const body = await req.json();
    const data = createSchema.parse(body);

    let slug: string;
    if (data.slug && data.slug.trim().length > 0) {
      // Editor-supplied slug — verify uniqueness up-front so we can surface
      // a clean Arabic error rather than a Postgres unique-constraint 500.
      const wanted = data.slug.trim().toLowerCase();
      const [clash] = await db
        .select({ id: authors.id })
        .from(authors)
        .where(eq(authors.slug, wanted))
        .limit(1);
      if (clash) {
        return NextResponse.json(
          { error: "هذا الرابط مستخدم بالفعل لكاتب آخر" },
          { status: 409 }
        );
      }
      slug = wanted;
    } else {
      const baseSlug = arabicSlug(data.fullName);
      slug = `${baseSlug}-${Date.now().toString(36)}`;
    }

    const [created] = await db
      .insert(authors)
      .values({
        slug,
        fullName: data.fullName,
        position: data.position ?? null,
        bio: data.bio ?? null,
        shortBio: data.shortBio ?? null,
        avatarUrl: data.avatarUrl ?? null,
        email: data.email ?? null,
        twitter: data.twitter ?? null,
        userId: data.userId ?? null,
        isActive: data.isActive,
      })
      .returning();

    try {
      revalidatePath("/opinions");
      revalidatePath("/");
    } catch {}

    await logAction({
      userId: session.userId,
      userFullName: session.fullName,
      action: "author_created",
      entityType: "author",
      entityId: created.id,
      entityTitle: created.fullName,
    });

    return NextResponse.json({ author: created }, { status: 201 });
  } catch (err: any) {
    if (err.message === "UNAUTHENTICATED")
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (err.message === "FORBIDDEN")
      return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
    if (err.name === "ZodError")
      return NextResponse.json({ error: err.errors }, { status: 400 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
