/**
 * User activity log — records lifecycle events on staff accounts.
 *
 * Non-blocking: never throws. Failures are swallowed so they cannot break
 * the request path that triggered them.
 */
import type { Request } from "express";
import { db } from "@workspace/db";
import { userActivity } from "@workspace/db/schema";
import type { ActivityAction } from "@workspace/shared/activity-labels";

export type LogActivityInput = {
  userId: string;
  action: ActivityAction;
  actorId?: string | null;
  actorName?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    await db.insert(userActivity).values({
      userId: input.userId,
      action: input.action,
      actorId: input.actorId ?? null,
      actorName: input.actorName ?? null,
      details: input.details ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });
  } catch {
    // never block on telemetry
  }
}

/** Pull IP/UA from an Express request safely. */
export function requestMeta(req: Request | null | undefined): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  if (!req) return { ipAddress: null, userAgent: null };
  const xff = req.get("x-forwarded-for");
  const ip = xff ? xff.split(",")[0]!.trim() : req.get("x-real-ip") ?? null;
  const ua = req.get("user-agent") ?? null;
  return { ipAddress: ip ?? null, userAgent: ua };
}
