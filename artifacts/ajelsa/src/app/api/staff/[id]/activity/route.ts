/**
 * GET /api/staff/[id]/activity — list user activity entries.
 */
import { NextRequest } from "next/server";
import { db, userActivity } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { ok, fromError, ensureAuth } from "@/lib/api";
import { sessionHasPermission } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await ensureAuth();
    const { id } = await params;
    const isSelf = session.userId === id;

    const canViewAll = await sessionHasPermission(session, "staff.view_activity");
    if (!isSelf && !canViewAll) throw new Error("FORBIDDEN");

    const limit = Math.min(Number(new URL(req.url).searchParams.get("limit") ?? 100), 500);

    const items = await db
      .select()
      .from(userActivity)
      .where(eq(userActivity.userId, id))
      .orderBy(desc(userActivity.createdAt))
      .limit(limit);

    return ok({ items });
  } catch (e) {
    return fromError(e);
  }
}
