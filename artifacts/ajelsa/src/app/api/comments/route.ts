/**
 * /api/comments — list comments (admin)
 */
import { NextRequest } from "next/server";
import { db, comments, articles } from "@/lib/db";
import { desc, eq, sql } from "drizzle-orm";
import { ok, fromError, ensurePerm } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    await ensurePerm("comments.view");
    const url = new URL(req.url);
    const status = url.searchParams.get("status"); // pending | approved | spam | all
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100"), 200);

    const conds: any[] = [];
    if (status === "pending") conds.push(eq(comments.isApproved, false), eq(comments.isSpam, false));
    else if (status === "approved") conds.push(eq(comments.isApproved, true));
    else if (status === "spam") conds.push(eq(comments.isSpam, true));

    const items = await db
      .select({
        id: comments.id,
        articleId: comments.articleId,
        authorName: comments.authorName,
        authorEmail: comments.authorEmail,
        content: comments.content,
        isApproved: comments.isApproved,
        isSpam: comments.isSpam,
        createdAt: comments.createdAt,
        articleTitle: articles.title,
        articleSlug: articles.slug,
      })
      .from(comments)
      .leftJoin(articles, eq(comments.articleId, articles.id))
      .where(conds.length ? sql`${conds.reduce((acc, c, i) => i === 0 ? c : sql`${acc} AND ${c}`)}` : undefined)
      .orderBy(desc(comments.createdAt))
      .limit(limit);

    const [{ pending }] = await db
      .select({ pending: sql<number>`count(*) filter (where ${comments.isApproved} = false and ${comments.isSpam} = false)::int` })
      .from(comments);
    const [{ approved }] = await db
      .select({ approved: sql<number>`count(*) filter (where ${comments.isApproved} = true)::int` })
      .from(comments);
    const [{ spam }] = await db
      .select({ spam: sql<number>`count(*) filter (where ${comments.isSpam} = true)::int` })
      .from(comments);

    return ok({ items, counts: { pending, approved, spam } });
  } catch (e) {
    return fromError(e);
  }
}
