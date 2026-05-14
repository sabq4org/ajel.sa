/**
 * POST /api/staff/me/password — change own password.
 * Requires: current password + new password.
 */
import { NextRequest } from "next/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ok, badRequest, fromError, ensureAuth } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { validatePassword } from "@/lib/password";
import { logActivity, requestMeta } from "@/lib/activity";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await ensureAuth();
    const data = schema.parse(await req.json());

    const check = validatePassword(data.newPassword);
    if (!check.ok) return badRequest(check.error);

    const [user] = await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);
    if (!user) throw new Error("UNAUTHENTICATED");

    const valid = await verifyPassword(data.currentPassword, user.passwordHash);
    if (!valid) return badRequest("كلمة المرور الحالية غير صحيحة");

    const passwordHash = await hashPassword(data.newPassword);
    await db
      .update(users)
      .set({ passwordHash, mustChangePassword: false, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    const meta = requestMeta(req);
    await logActivity({
      userId: user.id,
      action: "password_changed",
      actorId: user.id,
      actorName: session.fullName,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return ok({ ok: true });
  } catch (e) {
    return fromError(e);
  }
}
