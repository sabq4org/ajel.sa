/**
 * /api/staff/stats — counters for the staff dashboard.
 *
 * The system "Former Staff" placeholder is excluded from every count.
 */
import { db, users, roles } from "@/lib/db";
import { eq, ne, sql } from "drizzle-orm";
import { ok, fromError, ensurePerm } from "@/lib/api";
import { FORMER_STAFF_SLUG } from "@/lib/staff";

export async function GET() {
  try {
    await ensurePerm("staff.view");

    const notPlaceholder = ne(users.slug, FORMER_STAFF_SLUG);

    const [totals] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${users.isActive} = true)::int`,
        inactive: sql<number>`count(*) filter (where ${users.isActive} = false)::int`,
        verified: sql<number>`count(*) filter (where ${users.isVerified} = true)::int`,
        joinedThisMonth: sql<number>`count(*) filter (where ${users.joinedAt} >= date_trunc('month', now()))::int`,
        loggedInThisWeek: sql<number>`count(*) filter (where ${users.lastLoginAt} >= now() - interval '7 days')::int`,
      })
      .from(users)
      .where(notPlaceholder);

    const byRole = await db
      .select({
        roleId: users.roleId,
        roleKey: roles.key,
        roleNameAr: roles.nameAr,
        count: sql<number>`count(*)::int`,
      })
      .from(users)
      .leftJoin(roles, eq(roles.id, users.roleId))
      .where(notPlaceholder)
      .groupBy(users.roleId, roles.key, roles.nameAr);

    const byDepartment = await db
      .select({
        department: users.department,
        count: sql<number>`count(*)::int`,
      })
      .from(users)
      .where(notPlaceholder)
      .groupBy(users.department);

    return ok({ totals, byRole, byDepartment });
  } catch (e) {
    return fromError(e);
  }
}
