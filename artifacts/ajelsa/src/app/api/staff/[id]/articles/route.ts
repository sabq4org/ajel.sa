/**
 * GET /api/staff/[id]/articles — articles authored by this user.
 */
import { NextRequest } from "next/server";
import { db, articles, categories } from "@/lib/db";
import { desc, eq, sql } from "drizzle-orm";
import { ok, fromError, ensureAuth } from "@/lib/api";
import { sessionHasPermission } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await ensureAuth();
    const { id } = await params;
    const isSelf = session.userId === id;
    if (!isSelf) {
      const canView = await sessionHasPermission(session, "staff.view");
      if (!canView) throw new Error("FORBIDDEN");
    }

    const limit = Math.min(Number(new URL(req.url).searchParams.get("limit") ?? 50), 200);

    const items = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        status: articles.status,
        type: articles.type,
        createdAt: articles.createdAt,
        publishedAt: articles.publishedAt,
        viewCount: articles.viewCount,
        categoryNameAr: categories.name,
      })
      .from(articles)
      .leftJoin(categories, eq(categories.id, articles.categoryId))
      .where(eq(articles.authorId, id))
      .orderBy(desc(articles.createdAt))
      .limit(limit);

    const [counts] = await db
      .select({
        total: sql<number>`count(*)::int`,
        published: sql<number>`count(*) filter (where ${articles.status} = 'published')::int`,
        draft: sql<number>`count(*) filter (where ${articles.status} = 'draft')::int`,
        review: sql<number>`count(*) filter (where ${articles.status} = 'review')::int`,
      })
      .from(articles)
      .where(eq(articles.authorId, id));

    return ok({ items, counts });
  } catch (e) {
    return fromError(e);
  }
}
