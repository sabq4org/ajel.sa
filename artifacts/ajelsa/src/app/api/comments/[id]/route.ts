/**
 * /api/comments/[id] — approve/reject/delete
 */
import { NextRequest } from "next/server";
import { db, comments, articles } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { ok, noContent, notFound, fromError, ensurePerm } from "@/lib/api";

const updateSchema = z.object({
  isApproved: z.boolean().optional(),
  isSpam: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensurePerm("comments.moderate");
    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);

    const [existing] = await db.select().from(comments).where(eq(comments.id, id)).limit(1);
    if (!existing) return notFound("التعليق غير موجود");

    const [row] = await db.update(comments).set(data).where(eq(comments.id, id)).returning();

    // recalc commentCount on the article (approved only)
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(comments)
      .where(sql`${comments.articleId} = ${existing.articleId} AND ${comments.isApproved} = true`);
    await db.update(articles).set({ commentCount: count }).where(eq(articles.id, existing.articleId));

    return ok({ comment: row });
  } catch (e) {
    return fromError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensurePerm("comments.moderate");
    const { id } = await params;
    const [existing] = await db.select().from(comments).where(eq(comments.id, id)).limit(1);
    if (existing) {
      await db.delete(comments).where(eq(comments.id, id));
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(comments)
        .where(sql`${comments.articleId} = ${existing.articleId} AND ${comments.isApproved} = true`);
      await db.update(articles).set({ commentCount: count }).where(eq(articles.id, existing.articleId));
    }
    return noContent();
  } catch (e) {
    return fromError(e);
  }
}
