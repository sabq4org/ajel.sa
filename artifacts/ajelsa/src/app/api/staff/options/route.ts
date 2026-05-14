/**
 * /api/staff/options — lightweight list for dropdowns (article author picker)
 *
 * Optional filter `?role=reporter,content_manager,system_admin,supervisor`
 * limits to the given system role keys (used by the news author dropdown
 * to exclude opinion writers).
 */
import { NextRequest } from "next/server";
import { db, users, roles } from "@/lib/db";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { ok, fromError, ensureAnyPerm } from "@/lib/api";
import { FORMER_STAFF_SLUG } from "@/lib/staff";

export async function GET(req: NextRequest) {
  try {
    // Anyone who can edit articles or view staff can list authors
    await ensureAnyPerm([
      "articles.create",
      "articles.edit_own",
      "articles.edit_any",
      "staff.view",
    ]);

    const url = new URL(req.url);
    const onlyActive = url.searchParams.get("active") !== "false";
    const roleKeys = url.searchParams.get("role")?.split(",").filter(Boolean);
    const exclude = url.searchParams.get("exclude")?.split(",").filter(Boolean);

    const filters: any[] = [];
    // Always exclude the system "Former Staff" placeholder from author pickers
    filters.push(ne(users.slug, FORMER_STAFF_SLUG));
    if (onlyActive) filters.push(eq(users.isActive, true));
    if (roleKeys && roleKeys.length > 0) {
      filters.push(inArray(roles.key, roleKeys));
    }

    const items = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        roleKey: roles.key,
        roleNameAr: roles.nameAr,
      })
      .from(users)
      .leftJoin(roles, eq(roles.id, users.roleId))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(asc(users.fullName));

    const filtered = exclude && exclude.length > 0
      ? items.filter((i) => !exclude.includes(i.id))
      : items;

    return ok({ items: filtered });
  } catch (e) {
    return fromError(e);
  }
}
