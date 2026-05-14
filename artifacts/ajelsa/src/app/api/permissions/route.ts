/**
 * GET /api/permissions — list all permissions grouped by category
 */
import { db, permissions } from "@/lib/db";
import { asc } from "drizzle-orm";
import { ok, fromError, ensurePerm } from "@/lib/api";
import { CATEGORY_LABELS_AR } from "@/lib/permissions";

export async function GET() {
  try {
    await ensurePerm("roles.view");

    const items = await db
      .select()
      .from(permissions)
      .orderBy(asc(permissions.category), asc(permissions.position));

    // Group by category
    const grouped: Record<string, { category: string; labelAr: string; items: typeof items }> = {};
    for (const p of items) {
      if (!grouped[p.category]) {
        grouped[p.category] = {
          category: p.category,
          labelAr: CATEGORY_LABELS_AR[p.category] ?? p.category,
          items: [],
        };
      }
      grouped[p.category].items.push(p);
    }

    return ok({ items, groups: Object.values(grouped) });
  } catch (e) {
    return fromError(e);
  }
}
