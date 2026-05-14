/**
 * POST /api/staff/[id]/email-verify
 *
 * Admin-side helper used by the Security tab. Two intents are supported via
 * the JSON body:
 *
 *   { mode: "mark" }   — stamp emailVerifiedAt = now() and log
 *                        `email_verified`. Useful while SMTP is not wired up
 *                        (see follow-up #29) so admins can still tag a staff
 *                        member's email as confirmed once they've verified
 *                        ownership through another channel.
 *   { mode: "resend" } — log `email_verification_sent` only. The actual SMTP
 *                        delivery is out of scope for this iteration; the UI
 *                        shows the operator a notice that the message was
 *                        queued but won't actually be sent until SMTP is
 *                        configured. The activity-log entry preserves intent
 *                        for audit purposes.
 *
 * Both intents require the `staff.edit` permission (the same key used by
 * the profile editor and avatar/cover routes). Returns the updated
 * `emailVerifiedAt` so the client can refresh its in-memory form state
 * without an extra GET.
 */
import { NextRequest } from "next/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ok, badRequest, notFound, fromError, ensurePerm } from "@/lib/api";
import { logActivity, requestMeta } from "@/lib/activity";

const schema = z.object({
  mode: z.enum(["mark", "resend"]),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await ensurePerm("staff.edit");
    const { id } = await params;
    const body = schema.safeParse(await req.json().catch(() => ({})));
    if (!body.success) return badRequest("بيانات غير صحيحة");

    const [existing] = await db
      .select({ id: users.id, email: users.email, emailVerifiedAt: users.emailVerifiedAt })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!existing) return notFound("المنسوب غير موجود");

    const meta = requestMeta(req);

    if (body.data.mode === "mark") {
      const now = new Date();
      await db
        .update(users)
        .set({ emailVerifiedAt: now, updatedAt: now })
        .where(eq(users.id, id));
      await logActivity({
        userId: id,
        action: "email_verified",
        actorId: session.userId,
        actorName: session.fullName,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        details: { byAdmin: true },
      });
      return ok({ emailVerifiedAt: now.toISOString() });
    }

    // mode === "resend" — record intent only.
    await logActivity({
      userId: id,
      action: "email_verification_sent",
      actorId: session.userId,
      actorName: session.fullName,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      details: { email: existing.email, smtpConfigured: false },
    });
    return ok({
      queued: true,
      smtpConfigured: false,
      emailVerifiedAt: existing.emailVerifiedAt?.toISOString() ?? null,
    });
  } catch (e) {
    return fromError(e);
  }
}
