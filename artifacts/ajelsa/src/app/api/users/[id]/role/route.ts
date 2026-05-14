/**
 * PUT /api/users/[id]/role — assign a role (by roleId) to a user
 */
import { NextRequest } from "next/server";
import { db, users } from "@/lib/db";
import { roles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ok, notFound, fromError, ensurePerm, badRequest } from "@/lib/api";
import { invalidateUserPermissions } from "@/lib/permissions";

const putSchema = z.object({
  roleId: z.string().uuid().nullable(),
});

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensurePerm("users.assign_roles");
    const { id } = await params;
    const body = await req.json();
    const { roleId } = putSchema.parse(body);

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
    if (!user) return notFound("المستخدم غير موجود");

    if (roleId) {
      const [role] = await db.select({ id: roles.id }).from(roles).where(eq(roles.id, roleId)).limit(1);
      if (!role) return badRequest("الدور غير موجود");
    }

    const [row] = await db
      .update(users)
      .set({ roleId, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        roleId: users.roleId,
      });

    invalidateUserPermissions(id);
    return ok({ user: row });
  } catch (e) {
    return fromError(e);
  }
}
