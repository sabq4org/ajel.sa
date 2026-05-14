/**
 * /api/roles/[id]/permissions — replace the permission set for a role
 */
import { NextRequest } from "next/server";
import { db, roles, permissions, rolePermissions } from "@/lib/db";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { ok, notFound, fromError, ensurePerm, badRequest } from "@/lib/api";
import { invalidateAllPermissions } from "@/lib/permissions";

const putSchema = z.object({
  permissionIds: z.array(z.string().uuid()).default([]),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensurePerm("roles.edit");
    const { id } = await params;
    const body = await req.json();
    const { permissionIds } = putSchema.parse(body);

    const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (!role) return notFound("الدور غير موجود");

    // Validate each permissionId exists
    if (permissionIds.length > 0) {
      const found = await db
        .select({ id: permissions.id })
        .from(permissions)
        .where(inArray(permissions.id, permissionIds));
      if (found.length !== permissionIds.length) {
        return badRequest("أحد معرّفات الصلاحيات غير صحيح");
      }
    }

    // Replace set: delete all existing then insert new
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
    if (permissionIds.length > 0) {
      await db
        .insert(rolePermissions)
        .values(permissionIds.map((pid) => ({ roleId: id, permissionId: pid })))
        .onConflictDoNothing();
    }

    await db.update(roles).set({ updatedAt: new Date() }).where(eq(roles.id, id));
    invalidateAllPermissions();

    return ok({ ok: true, count: permissionIds.length });
  } catch (e) {
    return fromError(e);
  }
}
