/**
 * /api/analytics/summary
 */
import { db, articles, categories, users, comments, pageViews } from "@/lib/db";
import { sql, eq, desc, and, gte } from "drizzle-orm";
import { ok, fromError, ensurePerm } from "@/lib/api";

export async function GET() {
  try {
    await ensurePerm("analytics.view");

    // Totals
    const [totals] = await db.select({
      articles: sql<number>`count(*)::int`,
      published: sql<number>`count(*) filter (where ${articles.status} = 'published')::int`,
      draft: sql<number>`count(*) filter (where ${articles.status} = 'draft')::int`,
      breaking: sql<number>`count(*) filter (where ${articles.isBreaking} = true)::int`,
      totalViews: sql<number>`coalesce(sum(${articles.viewCount}), 0)::int`,
      totalComments: sql<number>`coalesce(sum(${articles.commentCount}), 0)::int`,
    }).from(articles);

    const [usersTotal] = await db.select({ c: sql<number>`count(*)::int` }).from(users);
    const [pendingComments] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(comments)
      .where(and(eq(comments.isApproved, false), eq(comments.isSpam, false)));

    // Top articles
    const topArticles = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        viewCount: articles.viewCount,
        publishedAt: articles.publishedAt,
        categoryName: categories.name,
      })
      .from(articles)
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .where(eq(articles.status, "published"))
      .orderBy(desc(articles.viewCount))
      .limit(10);

    // By category
    const byCategory = await db
      .select({
        name: categories.name,
        count: sql<number>`count(${articles.id})::int`,
        views: sql<number>`coalesce(sum(${articles.viewCount}), 0)::int`,
      })
      .from(categories)
      .leftJoin(articles, eq(articles.categoryId, categories.id))
      .groupBy(categories.id, categories.name)
      .orderBy(desc(sql`count(${articles.id})`))
      .limit(10);

    // Daily views last 14 days
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const dailyViews = await db
      .select({
        day: sql<string>`to_char(${pageViews.createdAt}, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, since))
      .groupBy(sql`to_char(${pageViews.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${pageViews.createdAt}, 'YYYY-MM-DD')`);

    return ok({
      totals: {
        ...totals,
        users: usersTotal.c,
        pendingComments: pendingComments.c,
      },
      topArticles,
      byCategory,
      dailyViews,
    });
  } catch (e) {
    return fromError(e);
  }
}
