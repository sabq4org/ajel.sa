/**
 * /api/authors/options — lightweight dropdown options for the opinion editor.
 *
 * Returns ONLY the fields needed to populate the "اختر الكاتب" select on the
 * opinion editor pages: id, slug, fullName, position. Anybody with
 * `opinion.create` or `opinion.edit_own` legitimately needs to see this list,
 * but they should not see private columns (email, userId, etc.) which live
 * behind the admin-only `/api/authors` endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { db, authors } from "@/lib/db";
import { eq, asc } from "drizzle-orm";
import { requireAnyPerm } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  try {
    await requireAnyPerm(["opinion.create", "opinion.edit_own", "opinion.edit_any", "authors.manage"]);
  } catch (err: any) {
    if (err.message === "UNAUTHENTICATED")
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (err.message === "FORBIDDEN")
      return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
    throw err;
  }

  const items = await db
    .select({
      id: authors.id,
      slug: authors.slug,
      fullName: authors.fullName,
      position: authors.position,
      avatarUrl: authors.avatarUrl,
    })
    .from(authors)
    .where(eq(authors.isActive, true))
    .orderBy(asc(authors.fullName));

  return NextResponse.json({ items });
}
