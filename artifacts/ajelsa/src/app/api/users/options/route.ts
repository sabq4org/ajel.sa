/**
 * /api/users/options — lightweight dropdown options for linking an author
 * profile to a system user account.
 *
 * Returns ONLY id/email/fullName/role/avatarUrl. Gated by `authors.manage`
 * since the only legitimate caller is the author create/edit form, which
 * itself requires that permission. Active users only — inactive accounts
 * shouldn't be linkable to a public columnist profile.
 */

import { NextRequest, NextResponse } from "next/server";
import { db, users } from "@/lib/db";
import { eq, asc } from "drizzle-orm";
import { requirePerm } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  try {
    await requirePerm("authors.manage");
  } catch (err: any) {
    if (err.message === "UNAUTHENTICATED")
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (err.message === "FORBIDDEN")
      return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
    throw err;
  }

  const items = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.isActive, true))
    .orderBy(asc(users.fullName));

  return NextResponse.json({ items });
}
