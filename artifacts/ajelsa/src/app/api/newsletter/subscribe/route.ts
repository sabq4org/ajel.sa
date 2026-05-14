import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { newsletterSubscribers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  name: z.string().max(200).optional(),
  source: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, source } = schema.parse(body);

    // Check if already subscribed
    const [existing] = await db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, email))
      .limit(1);

    if (existing) {
      if (existing.isActive) {
        return NextResponse.json({ message: "أنت مشترك بالفعل" });
      }
      // Re-subscribe
      const [updated] = await db
        .update(newsletterSubscribers)
        .set({ isActive: true, unsubscribedAt: null, name: name ?? existing.name })
        .where(eq(newsletterSubscribers.email, email))
        .returning();
      return NextResponse.json({ subscriber: updated, resubscribed: true });
    }

    const [subscriber] = await db
      .insert(newsletterSubscribers)
      .values({ email, name, source })
      .returning();

    return NextResponse.json({ subscriber }, { status: 201 });
  } catch (err: any) {
    if (err.name === "ZodError") return NextResponse.json({ error: err.errors }, { status: 400 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
