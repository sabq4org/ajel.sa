/**
 * User activity log — records lifecycle events on staff accounts.
 *
 * Non-blocking: never throws. Failures are swallowed so they cannot break
 * the request path that triggered them.
 */
import type { NextRequest } from "next/server";
import { db } from "./db";
import { userActivity } from "./db/schema";
import type { ActivityAction } from "./activity-labels";
export { ACTIVITY_LABELS_AR, type ActivityAction } from "./activity-labels";

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

/**
 * Pull IP/UA from a Next request safely.
 */
export function requestMeta(req: NextRequest | Request | null | undefined): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  if (!req) return { ipAddress: null, userAgent: null };
  const headers = "headers" in req ? req.headers : null;
  if (!headers) return { ipAddress: null, userAgent: null };
  const xff = headers.get("x-forwarded-for");
  const ip = xff ? xff.split(",")[0]!.trim() : headers.get("x-real-ip");
  const ua = headers.get("user-agent");
  return { ipAddress: ip ?? null, userAgent: ua ?? null };
}

