import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ads } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const result = await db.select().from(ads).orderBy(desc(ads.createdAt));
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/ads error:", error);
    return NextResponse.json({ error: "Failed to fetch ads" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, position, imageUrl, linkUrl, advertiser, startDate, endDate } = body;

    if (!title || !position) {
      return NextResponse.json({ error: "title and position are required" }, { status: 400 });
    }

    const [ad] = await db
      .insert(ads)
      .values({
        title,
        position,
        imageUrl: imageUrl || null,
        linkUrl: linkUrl || null,
        advertiser: advertiser || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      })
      .returning();

    return NextResponse.json(ad, { status: 201 });
  } catch (error) {
    console.error("POST /api/ads error:", error);
    return NextResponse.json({ error: "Failed to create ad" }, { status: 500 });
  }
}
