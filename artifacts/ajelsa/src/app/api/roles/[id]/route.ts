/**
 * /api/roles/[id] — get/update/delete a role
 */
import { NextRequest } from "next/server";
import { db, roles, rolePermissions, permissions, users } from "@/lib/db";
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  ok,
  noContent,
  notFound,
  badRequest,
  fromError,
  ensurePerm,
  conflict,
} from "@/lib/api";
import { invalidateAllPermissions } from "@/lib/permissions";

const updateSchema = z.object({
  nameAr: z.string().min(1).max(100).optional(),
  nameEn: z.string().max(100).optional(),
  description: z.string().optional(),
  level: z.number().int().min(0).max(1000).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensurePerm("roles.view");
    const { id } = await params;

    const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (!role) return notFound("الدور غير موجود");

    const perms = await db
      .select({
        id: permissions.id,
        key: permissions.key,
        category: permissions.category,
        labelAr: permissions.labelAr,
        position: permissions.position,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(eq(rolePermissions.roleId, id))
      .orderBy(asc(permissions.category), asc(permissions.position));

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.roleId, id));

    return ok({ role, permissions: perms, userCount: count });
  } catch (e) {
    return fromError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensurePerm("roles.edit");
    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);

    const [existing] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (!existing) return notFound("الدور غير موجود");

    const [row] = await db
      .update(roles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(roles.id, id))
      .returning();

    invalidateAllPermissions();
    return ok({ role: row });
  } catch (e) {
    return fromError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensurePerm("roles.delete");
    const { id } = await params;

    const [existing] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (!existing) return notFound("الدور غير موجود");
    if (existing.isSystem) return badRequest("لا يمكن حذف دور نظامي");

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.roleId, id));

    if (count > 0) {
      return conflict(
        `الدور مرتبط بـ ${count} مستخدم. يرجى نقل المستخدمين إلى دور آخر قبل الحذف.`
      );
    }

    await db.delete(roles).where(eq(roles.id, id));
    invalidateAllPermissions();
    return noContent();
  } catch (e) {
    return fromError(e);
  }
}
