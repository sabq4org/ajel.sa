/**
 * /api/authors/[id] — single columnist ops
 */

import { NextRequest, NextResponse } from "next/server";
import { db, authors, opinionArticles } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { requirePerm } from "@/lib/auth";
import { imageUrlSchema } from "@/lib/api";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const slugSchema = z
  .string()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9\u0600-\u06FF-]+$/i, "الرابط يجب أن يحتوي حروفاً أو أرقاماً أو شرطات فقط");

const updateSchema = z.object({
  fullName: z.string().min(2).max(200).optional(),
  slug: slugSchema.optional(),
  position: z.string().max(200).nullable().optional(),
  bio: z.string().max(4000).nullable().optional(),
  shortBio: z.string().max(300).nullable().optional(),
  avatarUrl: imageUrlSchema.nullable().optional(),
  email: z.string().email().nullable().optional(),
  twitter: z.string().max(60).nullable().optional(),
  userId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Admin-only — public surfaces use lib/queries/opinions.ts directly.
  try {
    await requirePerm("authors.manage");
  } catch (err: any) {
    if (err.message === "UNAUTHENTICATED")
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (err.message === "FORBIDDEN")
      return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
    throw err;
  }
  const { id } = await params;
  const [row] = await db.select().from(authors).where(eq(authors.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  return NextResponse.json({ author: row });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePerm("authors.manage");
    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);

    const [existing] = await db.select().from(authors).where(eq(authors.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

    // If editor changed the slug, enforce uniqueness up-front for a clean error.
    if (data.slug && data.slug.trim().toLowerCase() !== existing.slug) {
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
      data.slug = wanted;
    } else if (data.slug) {
      // No change — drop it so we don't trigger an UPDATE on the slug column.
      delete data.slug;
    }

    const [updated] = await db
      .update(authors)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(authors.id, id))
      .returning();

    try {
      revalidatePath("/opinions");
      revalidatePath(`/opinions/author/${updated.slug}`);
      revalidatePath("/");
    } catch {}

    await logAction({
      userId: session.userId,
      userFullName: session.fullName,
      action: "author_updated",
      entityType: "author",
      entityId: updated.id,
      entityTitle: updated.fullName,
    });

    return NextResponse.json({ author: updated });
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePerm("authors.manage");
    const { id } = await params;
    const cascade = req.nextUrl.searchParams.get("cascade") === "true";

    const [existing] = await db
      .select({ slug: authors.slug, fullName: authors.fullName })
      .from(authors)
      .where(eq(authors.id, id))
      .limit(1);

    if (!existing) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

    // The FK on opinion_articles.author_id is RESTRICT, so we either need a
    // confirmed cascade (delete the author's opinions first) or a clean
    // 409 telling the caller they need to confirm.
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(opinionArticles)
      .where(eq(opinionArticles.authorId, id));

    if (count > 0 && !cascade) {
      // Caller must re-issue the request with ?cascade=true to confirm.
      return NextResponse.json(
        {
          error: `لهذا الكاتب ${count} مقال رأي. أكّد الحذف لإزالة الكاتب وجميع مقالاته.`,
          requiresConfirmation: true,
          opinionCount: count,
        },
        { status: 409 }
      );
    }

    if (count > 0 && cascade) {
      const deletedOpinions = await db
        .delete(opinionArticles)
        .where(eq(opinionArticles.authorId, id))
        .returning({ id: opinionArticles.id, title: opinionArticles.title });
      // Log each removed opinion individually so the audit trail captures the
      // titles that disappeared as part of the cascade.
      for (const op of deletedOpinions) {
        await logAction({
          userId: session.userId,
          userFullName: session.fullName,
          action: "opinion_deleted",
          entityType: "opinion",
          entityId: op.id,
          entityTitle: `${op.title} (حذف متسلسل مع الكاتب ${existing.fullName})`,
        });
      }
    }

    await db.delete(authors).where(eq(authors.id, id));

    try {
      revalidatePath("/opinions");
      revalidatePath(`/opinions/author/${existing.slug}`);
    } catch {}

    await logAction({
      userId: session.userId,
      userFullName: session.fullName,
      action: "author_deleted",
      entityType: "author",
      entityId: id,
      entityTitle: existing.fullName,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err.message === "UNAUTHENTICATED")
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (err.message === "FORBIDDEN")
      return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
