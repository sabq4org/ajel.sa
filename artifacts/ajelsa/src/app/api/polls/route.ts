import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { polls, pollOptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { z } from "zod";

export async function GET() {
  try {
    const allPolls = await db.select().from(polls).orderBy(polls.createdAt);
    const allOptions = await db.select().from(pollOptions).orderBy(pollOptions.position);

    const result = allPolls.map((poll) => ({
      ...poll,
      options: allOptions.filter((o) => o.pollId === poll.id),
    }));

    return NextResponse.json({ polls: result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

const createSchema = z.object({
  question: z.string().min(5).max(500),
  options: z.array(z.string().min(1).max(300)).min(2).max(6),
  articleId: z.string().uuid().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const body = await req.json();
    const data = createSchema.parse(body);

    const [poll] = await db
      .insert(polls)
      .values({
        question: data.question,
        articleId: data.articleId ?? null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        isActive: data.isActive ?? true,
        createdBy: session.userId,
      })
      .returning();

    const opts = await db
      .insert(pollOptions)
      .values(
        data.options.map((text, i) => ({
          pollId: poll.id,
          text,
          position: i,
        }))
      )
      .returning();

    return NextResponse.json({ poll: { ...poll, options: opts } }, { status: 201 });
  } catch (err: any) {
    if (err.name === "ZodError") return NextResponse.json({ error: err.errors }, { status: 400 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
