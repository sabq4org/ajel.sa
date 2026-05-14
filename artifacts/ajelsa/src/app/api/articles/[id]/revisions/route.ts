/**
 * /api/articles/[id]/revisions — version history
 */

import { NextRequest, NextResponse } from "next/server";
import { db, articleRevisions, users } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { requirePerm } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePerm("articles.view");
    const { id } = await params;

    const revisions = await db
      .select({
        id: articleRevisions.id,
        articleId: articleRevisions.articleId,
        title: articleRevisions.title,
        contentJson: articleRevisions.contentJson,
        note: articleRevisions.note,
        createdAt: articleRevisions.createdAt,
        revisedBy: articleRevisions.revisedBy,
        authorName: users.fullName,
      })
      .from(articleRevisions)
      .leftJoin(users, eq(articleRevisions.revisedBy, users.id))
      .where(eq(articleRevisions.articleId, id))
      .orderBy(desc(articleRevisions.createdAt))
      .limit(50);

    return NextResponse.json({ revisions });
  } catch (err: any) {
    if (err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (err.message === "FORBIDDEN") return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePerm("articles.edit_own");
    const { id } = await params;
    const body = await req.json();

    const [revision] = await db
      .insert(articleRevisions)
      .values({
        articleId: id,
        title: body.title,
        contentJson: body.contentJson ?? null,
        revisedBy: session.userId,
        note: body.note ?? null,
      })
      .returning();

    return NextResponse.json({ revision }, { status: 201 });
  } catch (err: any) {
    if (err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (err.message === "FORBIDDEN") return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
