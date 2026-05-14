/**
 * GET /api/auth/me — return the current session's identity.
 *
 * The staff editor uses this to detect when an admin is editing their *own*
 * record so it can show the self-change-password form (which requires the
 * current password) in addition to the admin reset form. Returns 401 when
 * no session is present so the client can hide self-only UI.
 */
import { ok } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  return ok({ userId: s.userId, email: s.email, fullName: s.fullName });
}
