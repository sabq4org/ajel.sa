/**
 * /api/opinions/[id] — single opinion ops
 */

import { NextRequest, NextResponse } from "next/server";
import { db, opinionArticles, authors } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requirePerm, sessionHasPermission } from "@/lib/auth";
import { imageUrlSchema } from "@/lib/api";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { stripHtml, readingTimeMinutes } from "@/lib/utils";
import { resolveFeaturedImage } from "@/lib/featuredImage";

const updateSchema = z.object({
  title: z.string().min(5).max(300).optional(),
  subtitle: z.string().max(500).optional(),
  excerpt: z.string().max(500).optional(),
  contentHtml: z.string().optional(),
  contentJson: z.any().optional(),
  authorId: z.string().uuid().optional(),
  status: z.enum(["draft", "review", "scheduled", "published", "archived"]).optional(),
  isFeatured: z.boolean().optional(),
  excludeFromHome: z.boolean().optional(),
  featuredImageUrl: imageUrlSchema.nullable().optional(),
  featuredMediaId: z.string().uuid().nullable().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
  ogImageUrl: imageUrlSchema.nullable().optional(),
  canonicalUrl: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Admin-style fetch by id (used by the editor pages). Public surfaces fetch
  // by slug via lib/queries/opinions.ts. Gate behind opinion.view to match
  // the rest of the opinion endpoint surface.
  try {
    await requirePerm("opinion.view");
  } catch (err: any) {
    if (err.message === "UNAUTHENTICATED")
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (err.message === "FORBIDDEN")
      return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
    throw err;
  }
  const { id } = await params;
  const [opinion] = await db.select().from(opinionArticles).where(eq(opinionArticles.id, id)).limit(1);
  if (!opinion) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  return NextResponse.json({ opinion });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePerm("opinion.edit_own");
    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);

    const [existing] = await db.select().from(opinionArticles).where(eq(opinionArticles.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

    // Ownership for opinion pieces is defined as "the columnist authored it":
    // the linked authors row's userId must match the current session user.
    // Falling back to createdById covers the case where an editor drafted on
    // behalf of a columnist who has no linked user account yet.
    const [authorRow] = await db
      .select({ userId: authors.userId })
      .from(authors)
      .where(eq(authors.id, existing.authorId))
      .limit(1);
    const isOwnAuthor =
      (authorRow?.userId && authorRow.userId === session.userId) ||
      existing.createdById === session.userId;

    if (!isOwnAuthor) {
      const canEditAny = await sessionHasPermission(session, "opinion.edit_any");
      if (!canEditAny) {
        return NextResponse.json(
          { error: "لا يمكنك تعديل مقال كاتب آخر" },
          { status: 403 }
        );
      }
    }

    if (data.status === "published" && existing.status !== "published") {
      const canPublish = await sessionHasPermission(session, "opinion.publish");
      if (!canPublish) {
        return NextResponse.json(
          { error: "ليس لديك صلاحية النشر المباشر" },
          { status: 403 }
        );
      }
    }

    if (data.authorId && data.authorId !== existing.authorId) {
      // Reassigning byline is editorial — only `opinion.edit_any` holders may
      // change `authorId` on an existing piece. Without this gate, any
      // columnist who happens to own the article could re-attribute it to
      // another author (impersonation / byline laundering).
      const canReassign = await sessionHasPermission(session, "opinion.edit_any");
      if (!canReassign) {
        return NextResponse.json(
          { error: "لا تملك صلاحية تغيير الكاتب — هذا إجراء تحريري." },
          { status: 403 }
        );
      }
      const [a] = await db.select({ id: authors.id }).from(authors).where(eq(authors.id, data.authorId)).limit(1);
      if (!a) return NextResponse.json({ error: "كاتب الرأي غير موجود" }, { status: 400 });
    }

    const featured = await resolveFeaturedImage({
      hasMediaId: Object.prototype.hasOwnProperty.call(body, "featuredMediaId"),
      mediaId: data.featuredMediaId,
      hasUrl: Object.prototype.hasOwnProperty.call(body, "featuredImageUrl"),
      url: data.featuredImageUrl,
    });

    const { featuredMediaId: _fmid, featuredImageUrl: _furl, ...restData } = data;
    const updates: any = { ...restData, updatedAt: new Date() };
    if (featured.apply) {
      updates.featuredMediaId = featured.featuredMediaId;
      updates.featuredImageUrl = featured.featuredImageUrl;
    }

    if (data.contentHtml) {
      const cleanText = stripHtml(data.contentHtml);
      updates.readingTimeMinutes = readingTimeMinutes(cleanText);
    }

    if (data.status === "published" && !existing.publishedAt) {
      updates.publishedAt = new Date();
    }

    if (data.scheduledAt) {
      updates.scheduledAt = new Date(data.scheduledAt);
    }

    const [updated] = await db
      .update(opinionArticles)
      .set(updates)
      .where(eq(opinionArticles.id, id))
      .returning();

    try {
      revalidatePath("/");
      revalidatePath("/opinions");
      revalidatePath(`/opinion/${updated.slug}`);
    } catch {}

    const auditAction = data.status === "published" && existing.status !== "published"
      ? "opinion_published"
      : data.status === "archived"
      ? "opinion_archived"
      : "opinion_updated";

    await logAction({
      userId: session.userId,
      userFullName: session.fullName,
      action: auditAction,
      entityType: "opinion",
      entityId: updated.id,
      entityTitle: updated.title,
      details: data.status ? { status: data.status, previousStatus: existing.status } : undefined,
    });

    return NextResponse.json({ opinion: updated });
  } catch (err: any) {
    if (err.message === "UNAUTHENTICATED")
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (err.message === "FORBIDDEN")
      return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
    if (err.message === "FEATURED_MEDIA_NOT_FOUND")
      return NextResponse.json({ error: "الصورة المحددة غير موجودة في مكتبة الوسائط" }, { status: 400 });
    if (err.name === "ZodError")
      return NextResponse.json({ error: err.errors }, { status: 400 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePerm("opinion.delete");
    const { id } = await params;

    const [existing] = await db
      .select({ title: opinionArticles.title, slug: opinionArticles.slug })
      .from(opinionArticles)
      .where(eq(opinionArticles.id, id))
      .limit(1);
    if (!existing) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

    await db.delete(opinionArticles).where(eq(opinionArticles.id, id));

    try {
      revalidatePath("/");
      revalidatePath("/opinions");
      revalidatePath(`/opinion/${existing.slug}`);
    } catch {}

    await logAction({
      userId: session.userId,
      userFullName: session.fullName,
      action: "opinion_deleted",
      entityType: "opinion",
      entityId: id,
      entityTitle: existing.title,
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
