import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { polls, pollOptions } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const voteSchema = z.object({
  optionId: z.string().uuid(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { optionId } = voteSchema.parse(body);

    // Check poll exists and is active
    const [poll] = await db.select().from(polls).where(eq(polls.id, id)).limit(1);
    if (!poll) return NextResponse.json({ error: "الاستطلاع غير موجود" }, { status: 404 });
    if (!poll.isActive) return NextResponse.json({ error: "الاستطلاع منتهي" }, { status: 400 });
    if (poll.endsAt && poll.endsAt < new Date()) {
      return NextResponse.json({ error: "انتهى وقت الاستطلاع" }, { status: 400 });
    }

    // Check option belongs to this poll
    const [option] = await db
      .select()
      .from(pollOptions)
      .where(eq(pollOptions.id, optionId))
      .limit(1);

    if (!option || option.pollId !== id) {
      return NextResponse.json({ error: "الخيار غير صالح" }, { status: 400 });
    }

    const [updated] = await db
      .update(pollOptions)
      .set({ votes: sql`${pollOptions.votes} + 1` })
      .where(eq(pollOptions.id, optionId))
      .returning();

    return NextResponse.json({ option: updated });
  } catch (err: any) {
    if (err.name === "ZodError") return NextResponse.json({ error: err.errors }, { status: 400 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
