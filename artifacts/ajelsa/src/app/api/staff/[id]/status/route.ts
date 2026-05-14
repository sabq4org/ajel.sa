/**
 * PATCH /api/staff/[id]/status — activate/deactivate (soft) and optional leftAt
 */
import { NextRequest } from "next/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ok, notFound, badRequest, fromError, ensurePerm } from "@/lib/api";
import { logActivity, requestMeta } from "@/lib/activity";

const schema = z.object({
  isActive: z.boolean(),
  reason: z.string().max(500).optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await ensurePerm("staff.change_status");
    const { id } = await params;
    if (id === session.userId) return badRequest("لا يمكنك تعطيل حسابك");

    const data = schema.parse(await req.json());

    const updates: {
      isActive: boolean;
      updatedAt: Date;
      leftAt: Date | null;
    } = {
      isActive: data.isActive,
      updatedAt: new Date(),
      leftAt: data.isActive ? null : new Date(),
    };

    const [row] = await db.update(users).set(updates).where(eq(users.id, id)).returning({
      id: users.id, isActive: users.isActive, leftAt: users.leftAt,
    });
    if (!row) return notFound("المنسوب غير موجود");

    const meta = requestMeta(req);
    await logActivity({
      userId: id,
      action: data.isActive ? "activated" : "deactivated",
      actorId: session.userId,
      actorName: session.fullName,
      details: { reason: data.reason ?? null },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return ok({ user: row });
  } catch (e) {
    return fromError(e);
  }
}
