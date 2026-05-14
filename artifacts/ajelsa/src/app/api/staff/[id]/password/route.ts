/**
 * POST /api/staff/[id]/password — admin reset password
 *
 * Body: { newPassword?: string, mustChangeOnNextLogin?: boolean }
 *
 * If newPassword is omitted, a random one is generated and logged to the
 * server console (the plain value is NEVER returned to the client; the
 * admin must read it from server logs until SMTP delivery is wired up).
 */
import { NextRequest } from "next/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ok, notFound, badRequest, fromError, ensurePerm } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { validatePassword, generateTemporaryPassword } from "@/lib/password";
import { logActivity, requestMeta } from "@/lib/activity";

const schema = z.object({
  newPassword: z.string().optional(),
  mustChangeOnNextLogin: z.boolean().default(true),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await ensurePerm("staff.change_password");
    const { id } = await params;
    const data = schema.parse(await req.json().catch(() => ({})));

    const password = data.newPassword?.trim() || generateTemporaryPassword();
    const check = validatePassword(password);
    if (!check.ok) return badRequest(check.error);

    const passwordHash = await hashPassword(password);
    const [row] = await db
      .update(users)
      .set({
        passwordHash,
        mustChangePassword: data.mustChangeOnNextLogin,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning({ id: users.id, fullName: users.fullName, email: users.email });

    if (!row) return notFound("المنسوب غير موجود");

    const meta = requestMeta(req);
    await logActivity({
      userId: id,
      action: "password_reset",
      actorId: session.userId,
      actorName: session.fullName,
      details: { mustChangeOnNextLogin: data.mustChangeOnNextLogin, generated: !data.newPassword },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    if (!data.newPassword) {
      console.warn(
        `[staff:password-reset] Generated temporary password for ${row.email} (id=${id}): ${password}`
      );
    }

    return ok({
      ok: true,
      passwordWasGenerated: !data.newPassword,
    });
  } catch (e) {
    return fromError(e);
  }
}
