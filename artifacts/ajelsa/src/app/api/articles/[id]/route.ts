/**
 * /api/articles/[id] — single article ops
 */

import { NextRequest, NextResponse } from "next/server";
import { db, articles, articleRevisions } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requirePerm, sessionHasPermission } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { z } from "zod";
import { imageUrlSchema } from "@/lib/api";
import { stripHtml, readingTimeMinutes } from "@/lib/utils";
import { cacheDeletePattern } from "@/lib/redis";
import { revalidatePath } from "next/cache";
import { indexArticle, removeArticleFromIndex } from "@/lib/search";
import { resolveFeaturedImage } from "@/lib/featuredImage";
import { isNonPublishingRole } from "@/lib/staff";
import { users as usersTable } from "@/lib/db/schema";

const updateSchema = z.object({
  title: z.string().min(5).max(300).optional(),
  subtitle: z.string().max(500).optional(),
  excerpt: z.string().max(500).optional(),
  contentHtml: z.string().optional(),
  contentJson: z.any().optional(),
  categoryId: z.string().uuid().optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  authorId: z.string().uuid().optional(),
  type: z.enum(["regular", "breaking", "exclusive", "investigation", "opinion", "video", "photo"]).optional(),
  status: z.enum(["draft", "review", "scheduled", "published", "archived"]).optional(),
  isBreaking: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  excludeFromHome: z.boolean().optional(),
  isPinned: z.boolean().optional(),
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
  const { id } = await params;
  const [article] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
  if (!article) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  return NextResponse.json({ article });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Need at least the ability to edit own articles to enter the route
    const session = await requirePerm("articles.edit_own");
    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);

    // Save revision before update
    const [existing] = await db.select().from(articles).where(eq(articles.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

    // Author check: only `articles.edit_any` allows editing somebody else's article
    if (existing.authorId !== session.userId) {
      const canEditAny = await sessionHasPermission(session, "articles.edit_any");
      if (!canEditAny) {
        return NextResponse.json(
          { error: "لا يمكنك تعديل خبر كاتب آخر" },
          { status: 403 }
        );
      }
    }

    // Reassign author requires articles.edit_any
    if (data.authorId && data.authorId !== existing.authorId) {
      const canEditAny = await sessionHasPermission(session, "articles.edit_any");
      if (!canEditAny) {
        return NextResponse.json(
          { error: "لا تملك صلاحية تغيير الكاتب" },
          { status: 403 }
        );
      }
      const [other] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.id, data.authorId))
        .limit(1);
      if (!other) {
        return NextResponse.json({ error: "الكاتب المحدد غير موجود" }, { status: 400 });
      }
    }

    // Force draft when the (final) author belongs to a non-publishing
    // role (reporter / columnist). This applies in either of two cases:
    //   1) The request is asking to set status="published".
    //   2) The article is currently published and the author is being
    //      reassigned to a non-publishing user — without this branch a
    //      previously-published article would silently keep its
    //      published state under a reporter, which violates the
    //      "reporters can never publish" invariant.
    const finalAuthorId = data.authorId ?? existing.authorId;
    const wantsToBePublished =
      data.status === "published" ||
      (data.status === undefined && existing.status === "published");
    if (wantsToBePublished) {
      const [authorRow] = await db
        .select({ roleId: usersTable.roleId })
        .from(usersTable)
        .where(eq(usersTable.id, finalAuthorId))
        .limit(1);
      if (await isNonPublishingRole(authorRow?.roleId ?? null)) {
        data.status = "draft";
      }
    }

    // Publish gating: status transition to published requires articles.publish
    if (data.status === "published" && existing.status !== "published") {
      const canPublish = await sessionHasPermission(session, "articles.publish");
      if (!canPublish) {
        return NextResponse.json(
          { error: "ليس لديك صلاحية النشر المباشر" },
          { status: 403 }
        );
      }
    }

    if (data.contentJson || data.title) {
      await db.insert(articleRevisions).values({
        articleId: id,
        title: existing.title,
        contentJson: existing.contentJson,
        revisedBy: session.userId,
      });
    }

    // Resolve featured image based on what the body actually sent.
    // If neither field is present we leave the existing image untouched —
    // this prevents silent overwrites when editors save unrelated changes.
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
      .update(articles)
      .set(updates)
      .where(eq(articles.id, id))
      .returning();

    await cacheDeletePattern("articles:*");

    // تحديث الصفحات العامة فوراً
    try {
      revalidatePath("/");
      revalidatePath("/latest");
      revalidatePath(`/article/${updated.slug}`);
      if (updated.categoryId) revalidatePath("/category/[slug]", "page");
    } catch (e) {
      console.error("[revalidate]", e);
    }

    if (updated.status === "published") {
      indexArticle({
        id: updated.id,
        title: updated.title,
        excerpt: updated.excerpt ?? undefined,
        slug: updated.slug,
        categoryName: "",
        categorySlug: "",
        authorName: session.fullName,
        tags: [],
        type: updated.type,
        isBreaking: updated.isBreaking,
        publishedAt: updated.publishedAt ? Math.floor(updated.publishedAt.getTime() / 1000) : 0,
        featuredImageUrl: updated.featuredImageUrl ?? undefined,
      }).catch(() => {});
    } else if (updated.status === "archived") {
      removeArticleFromIndex(updated.id).catch(() => {});
    }

    // Determine audit action
    const auditAction = data.status === "published" && existing.status !== "published"
      ? "article_published"
      : data.status === "archived"
      ? "article_archived"
      : "article_updated";

    await logAction({
      userId: session.userId,
      userFullName: session.fullName,
      action: auditAction,
      entityType: "article",
      entityId: updated.id,
      entityTitle: updated.title,
      details: data.status ? { status: data.status, previousStatus: existing.status } : undefined,
    });

    return NextResponse.json({ article: updated });
  } catch (err: any) {
    if (err.message === "FORBIDDEN") return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
    if (err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (err.message === "FEATURED_MEDIA_NOT_FOUND") {
      return NextResponse.json({ error: "الصورة المحددة غير موجودة في مكتبة الوسائط" }, { status: 400 });
    }
    if (err.name === "ZodError") return NextResponse.json({ error: err.errors }, { status: 400 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Anyone with delete_own can attempt delete; if they're not the author they need delete_any
    const delSession = await requirePerm("articles.delete_own");
    const { id } = await params;
    const [deleted] = await db
      .select({ title: articles.title, authorId: articles.authorId })
      .from(articles)
      .where(eq(articles.id, id))
      .limit(1);
    if (deleted && deleted.authorId !== delSession.userId) {
      const canDeleteAny = await sessionHasPermission(delSession, "articles.delete_any");
      if (!canDeleteAny) {
        return NextResponse.json(
          { error: "لا يمكنك حذف خبر كاتب آخر" },
          { status: 403 }
        );
      }
    }
    await db.delete(articles).where(eq(articles.id, id));
    await cacheDeletePattern("articles:*");
    try {
      revalidatePath("/");
      revalidatePath("/latest");
    } catch {}
    removeArticleFromIndex(id).catch(() => {});

    await logAction({
      userId: delSession.userId,
      userFullName: delSession.fullName,
      action: "article_deleted",
      entityType: "article",
      entityId: id,
      entityTitle: deleted?.title,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
}
