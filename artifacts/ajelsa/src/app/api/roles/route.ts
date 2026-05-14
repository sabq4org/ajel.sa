/**
 * /api/roles — list roles, create role
 */
import { NextRequest } from "next/server";
import { db, roles, rolePermissions, users } from "@/lib/db";
import { asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { ok, created, fromError, ensurePerm, badRequest } from "@/lib/api";
import { invalidateAllPermissions } from "@/lib/permissions";

const createSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z][a-z0-9_]*$/, "المفتاح يجب أن يكون أحرفًا صغيرة وأرقامًا وشرطات سفلية"),
  nameAr: z.string().min(1).max(100),
  nameEn: z.string().max(100).optional(),
  description: z.string().optional(),
  level: z.number().int().min(0).max(1000).default(10),
  permissionIds: z.array(z.string().uuid()).optional(),
});

export async function GET() {
  try {
    await ensurePerm("roles.view");

    const items = await db
      .select({
        id: roles.id,
        key: roles.key,
        nameAr: roles.nameAr,
        nameEn: roles.nameEn,
        description: roles.description,
        level: roles.level,
        isSystem: roles.isSystem,
        createdAt: roles.createdAt,
        updatedAt: roles.updatedAt,
        permissionCount: sql<number>`(select count(*)::int from ${rolePermissions} where ${rolePermissions.roleId} = ${roles.id})`,
        userCount: sql<number>`(select count(*)::int from ${users} where ${users.roleId} = ${roles.id})`,
      })
      .from(roles)
      .orderBy(desc(roles.level), asc(roles.nameAr));

    return ok({ items });
  } catch (e) {
    return fromError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensurePerm("roles.create");
    const body = await req.json();
    const data = createSchema.parse(body);

    const [existing] = await db.select().from(roles).where(eq(roles.key, data.key)).limit(1);
    if (existing) return badRequest("مفتاح الدور مستخدم مسبقًا");

    const [row] = await db
      .insert(roles)
      .values({
        key: data.key,
        nameAr: data.nameAr,
        nameEn: data.nameEn ?? null,
        description: data.description ?? null,
        level: data.level,
        isSystem: false,
      })
      .returning();

    if (data.permissionIds && data.permissionIds.length > 0) {
      await db
        .insert(rolePermissions)
        .values(data.permissionIds.map((permissionId) => ({ roleId: row.id, permissionId })))
        .onConflictDoNothing();
    }

    invalidateAllPermissions();
    return created({ role: row });
  } catch (e) {
    return fromError(e);
  }
}
