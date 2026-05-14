import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ads } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updateData: Partial<typeof ads.$inferInsert> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.position !== undefined) updateData.position = body.position;
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
    if (body.linkUrl !== undefined) updateData.linkUrl = body.linkUrl;
    if (body.advertiser !== undefined) updateData.advertiser = body.advertiser;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(ads)
      .set(updateData)
      .where(eq(ads.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/ads/[id] error:", error);
    return NextResponse.json({ error: "Failed to update ad" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [deleted] = await db
      .delete(ads)
      .where(eq(ads.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/ads/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete ad" }, { status: 500 });
  }
}
