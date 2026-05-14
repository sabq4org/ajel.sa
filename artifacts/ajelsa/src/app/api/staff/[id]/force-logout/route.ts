/**
 * POST /api/staff/[id]/force-logout — immediately revoke the user's sessions.
 *
 * Sessions are stateless JWTs in httpOnly cookies, so to revoke them we bump
 * the user's `session_epoch` counter. Every subsequent getSession() call
 * compares the JWT's embedded epoch against the DB; a mismatch is treated
 * as an expired cookie, so the user is logged out within seconds (next
 * request) on every device. We also flip `mustChangePassword` so they have
 * to set a new password before the new session is allowed to do anything
 * sensitive, and record the action in the activity log.
 */
import { NextRequest } from "next/server";
import { db, users } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { ok, notFound, fromError, ensurePerm } from "@/lib/api";
import { logActivity, requestMeta } from "@/lib/activity";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await ensurePerm("staff.force_logout");
    const { id } = await params;

    const [row] = await db
      .update(users)
      .set({
        sessionEpoch: sql`${users.sessionEpoch} + 1`,
        mustChangePassword: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning({ id: users.id, sessionEpoch: users.sessionEpoch });
    if (!row) return notFound("المنسوب غير موجود");

    const meta = requestMeta(req);
    await logActivity({
      userId: id,
      action: "force_logout",
      actorId: session.userId,
      actorName: session.fullName,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return ok({ ok: true });
  } catch (e) {
    return fromError(e);
  }
}
