/**
 * /api/admin/inline-images
 *
 * Maintenance endpoint for legacy articles whose featured_image_url was saved
 * as an inline `data:` URL. These render only in the editor preview and are
 * silently nulled out for public readers (see `lib/queries/articles.ts`).
 *
 * GET  — list all affected articles (id, slug, title, status, category, …)
 * POST — bulk clear: set featured_image_url + featured_media_id to NULL for
 *        the supplied article ids (or every affected article when no ids
 *        are provided). Article content is NEVER modified.
 */

import { NextRequest, NextResponse } from "next/server";
import { db, articles, categories, users } from "@/lib/db";
import { and, desc, eq, inArray, like, sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { cacheDeletePattern } from "@/lib/redis";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const INLINE_FILTER = like(articles.featuredImageUrl, "data:%");

export async function GET(_req: NextRequest) {
  try {
    await requireRole("editor");

    const rows = await db
      .select({
        id: articles.id,
        slug: articles.slug,
        title: articles.title,
        excerpt: articles.excerpt,
        status: articles.status,
        type: articles.type,
        publishedAt: articles.publishedAt,
        createdAt: articles.createdAt,
        categoryId: articles.categoryId,
        categoryName: categories.name,
        authorName: users.fullName,
      })
      .from(articles)
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .leftJoin(users, eq(articles.authorId, users.id))
      .where(INLINE_FILTER)
      .orderBy(desc(articles.publishedAt), desc(articles.createdAt));

    return NextResponse.json({ items: rows, total: rows.length });
  } catch (err: any) {
    if (err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (err.message === "FORBIDDEN") return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

const clearSchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
  all: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("editor");

    const body = await req.json().catch(() => ({}));
    const { ids, all } = clearSchema.parse(body);

    if (!all && (!ids || ids.length === 0)) {
      return NextResponse.json(
        { error: "حدد المقالات المطلوب تنظيفها أو فعّل الخيار 'الكل'" },
        { status: 400 },
      );
    }

    // Always restrict to articles that actually have an inline image so we
    // never accidentally null out a valid image even if the client sent
    // stale ids.
    const where = all
      ? INLINE_FILTER
      : and(INLINE_FILTER, inArray(articles.id, ids!));

    const updated = await db
      .update(articles)
      .set({
        featuredImageUrl: null,
        featuredMediaId: null,
        updatedAt: new Date(),
      })
      .where(where)
      .returning({
        id: articles.id,
        slug: articles.slug,
        title: articles.title,
        status: articles.status,
      });

    if (updated.length > 0) {
      await cacheDeletePattern("articles:*");
      try {
        revalidatePath("/");
        revalidatePath("/latest");
        for (const row of updated) {
          revalidatePath(`/article/${row.slug}`);
        }
        revalidatePath("/category/[slug]", "page");
      } catch (e) {
        console.error("[inline-images:revalidate]", e);
      }

      await logAction({
        userId: session.userId,
        userFullName: session.fullName,
        action: "article_updated",
        entityType: "article",
        entityTitle: `تنظيف صور مضمّنة (${updated.length} خبر)`,
        details: {
          reason: "inline_image_cleanup",
          mode: all ? "all" : "selected",
          count: updated.length,
          ids: updated.map((u) => u.id),
        },
      });
    }

    return NextResponse.json({ cleared: updated.length, items: updated });
  } catch (err: any) {
    if (err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (err.message === "FORBIDDEN") return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
    if (err.name === "ZodError") return NextResponse.json({ error: err.errors }, { status: 400 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
