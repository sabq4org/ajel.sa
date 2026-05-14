/**
 * /api/users/[id]
 */
import { NextRequest } from "next/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ok, noContent, notFound, badRequest, fromError, ensurePerm } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { invalidateUserPermissions } from "@/lib/permissions";

const updateSchema = z.object({
  fullName: z.string().min(2).max(200).optional(),
  bio: z.string().optional().nullable(),
  twitterHandle: z.string().max(50).optional().nullable(),
  role: z.enum(["super_admin", "editor_in_chief", "editor", "writer", "contributor"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await ensurePerm("users.edit");
    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);

    const updates: any = { ...data, updatedAt: new Date() };
    if (data.password) {
      updates.passwordHash = await hashPassword(data.password);
      delete updates.password;
    }

    const [row] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        roleId: users.roleId,
        isActive: users.isActive,
      });
    if (!row) return notFound("المستخدم غير موجود");
    // Role enum changed → invalidate cached permissions so next request re-resolves
    if (data.role) invalidateUserPermissions(id);
    return ok({ user: row });
  } catch (e) {
    return fromError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await ensurePerm("users.delete");
    const { id } = await params;
    if (id === session.userId) return badRequest("لا يمكنك حذف حسابك");
    await db.delete(users).where(eq(users.id, id));
    invalidateUserPermissions(id);
    return noContent();
  } catch (e) {
    return fromError(e);
  }
}
