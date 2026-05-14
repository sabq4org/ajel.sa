/**
 * PATCH /api/staff/[id]/role — assign role
 */
import { NextRequest } from "next/server";
import { db, users, roles } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ok, notFound, badRequest, fromError, ensurePerm } from "@/lib/api";
import { invalidateUserPermissions } from "@/lib/permissions";
import { logActivity, requestMeta } from "@/lib/activity";

const schema = z.object({ roleId: z.string().uuid().nullable() });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await ensurePerm("staff.assign_roles");
    const { id } = await params;
    const { roleId } = schema.parse(await req.json());

    const [user] = await db
      .select({ id: users.id, prevRoleId: users.roleId })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!user) return notFound("المنسوب غير موجود");

    if (roleId) {
      const [role] = await db.select({ id: roles.id }).from(roles).where(eq(roles.id, roleId)).limit(1);
      if (!role) return badRequest("الدور غير موجود");
    }

    await db
      .update(users)
      .set({ roleId, customPermissions: null, updatedAt: new Date() })
      .where(eq(users.id, id));

    invalidateUserPermissions(id);

    const meta = requestMeta(req);
    await logActivity({
      userId: id,
      action: "role_changed",
      actorId: session.userId,
      actorName: session.fullName,
      details: { from: user.prevRoleId, to: roleId },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return ok({ ok: true });
  } catch (e) {
    return fromError(e);
  }
}
