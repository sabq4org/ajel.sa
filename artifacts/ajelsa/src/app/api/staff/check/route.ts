/**
 * GET /api/staff/check?email=foo@bar.com[&excludeId=...]
 * GET /api/staff/check?slug=foo[&excludeId=...]
 *
 * Lightweight existence probe used by the staff editor for real-time
 * uniqueness validation while the admin is still typing. Returns
 * `{ available: boolean }` so the UI can render an inline check/cross
 * indicator without forcing the admin to wait for a full save round-trip
 * (and without surfacing a 409 / "duplicate email" toast at submit time).
 *
 * Always returns 200; never leaks any user fields beyond the boolean.
 * Gated behind `staff.view` because anonymous probing of which emails
 * exist in the system would be a tiny enumeration vector.
 */
import { NextRequest } from "next/server";
import { db, users } from "@/lib/db";
import { and, eq, ne, type SQL } from "drizzle-orm";
import { ok, fromError, ensurePerm } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    await ensurePerm("staff.view");

    const url = new URL(req.url);
    const email = url.searchParams.get("email")?.trim().toLowerCase();
    const slug = url.searchParams.get("slug")?.trim().toLowerCase();
    const excludeId = url.searchParams.get("excludeId")?.trim() || undefined;

    if (!email && !slug) {
      return ok({ available: true });
    }

    const conds: SQL[] = [];
    if (email) conds.push(eq(users.email, email));
    if (slug) conds.push(eq(users.slug, slug));
    if (excludeId) conds.push(ne(users.id, excludeId));

    const [row] = await db
      .select({ id: users.id })
      .from(users)
      .where(conds.length > 1 ? and(...conds) : conds[0])
      .limit(1);

    return ok({ available: !row });
  } catch (e) {
    return fromError(e);
  }
}
