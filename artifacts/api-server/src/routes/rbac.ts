/**
 * RBAC endpoints — full read + write surface for roles & permissions.
 *
 *   GET    /permissions               — registry list + category groupings
 *   GET    /roles                     — all roles with permission/user counts
 *   POST   /roles                     — create a non-system role
 *   GET    /roles/:id                 — single role + permissions + user count
 *   PATCH  /roles/:id                 — update role fields (nameAr, level, …)
 *   DELETE /roles/:id                 — delete role (rejects system roles + roles with users)
 *   PUT    /roles/:id/permissions     — replace the permission set for a role
 *
 * Per-user permission overrides live on `users.customPermissions` and are
 * handled by the staff endpoints, not here.
 */
import {
  Router,
  type IRouter,
  type Request,
  type Response,
} from "express";
import { db } from "@workspace/db";
import {
  roles,
  permissions,
  rolePermissions,
  users,
} from "@workspace/db/schema";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { CATEGORY_LABELS_AR } from "@workspace/shared/permissions";
import {
  CreateRoleBody,
  UpdateRoleBody,
  ReplaceRolePermissionsBody,
} from "@workspace/api-zod";
import { requirePerm } from "../middlewares/requirePerm";

const router: IRouter = Router();

router.get(
  "/permissions",
  requirePerm("roles.view"),
  async (req: Request, res: Response) => {
    try {
      const items = await db
        .select()
        .from(permissions)
        .orderBy(asc(permissions.category), asc(permissions.position));

      const grouped: Record<
        string,
        { category: string; labelAr: string; items: typeof items }
      > = {};
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

      res.json({ items, groups: Object.values(grouped) });
    } catch (err) {
      req.log.error({ err }, "list permissions failed");
      res.status(500).json({ error: "خطأ غير متوقع" });
    }
  },
);

router.get(
  "/roles",
  requirePerm("roles.view"),
  async (req: Request, res: Response) => {
    try {
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

      res.json({ items });
    } catch (err) {
      req.log.error({ err }, "list roles failed");
      res.status(500).json({ error: "خطأ غير متوقع" });
    }
  },
);

router.get(
  "/roles/:id",
  requirePerm("roles.view"),
  async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    try {
      const [role] = await db
        .select()
        .from(roles)
        .where(eq(roles.id, id))
        .limit(1);
      if (!role) {
        res.status(404).json({ error: "الدور غير موجود" });
        return;
      }

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

      res.json({ role, permissions: perms, userCount: count });
    } catch (err) {
      req.log.error({ err }, "get role failed");
      res.status(500).json({ error: "خطأ غير متوقع" });
    }
  },
);

router.post(
  "/roles",
  requirePerm("roles.create"),
  async (req: Request, res: Response) => {
    const parsed = CreateRoleBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "بيانات غير صحيحة" });
      return;
    }
    const data = parsed.data;
    try {
      const [existing] = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.key, data.key))
        .limit(1);
      if (existing) {
        res.status(400).json({ error: "مفتاح الدور مستخدم مسبقًا" });
        return;
      }

      const [row] = await db
        .insert(roles)
        .values({
          key: data.key,
          nameAr: data.nameAr,
          nameEn: data.nameEn ?? null,
          description: data.description ?? null,
          level: data.level ?? 10,
          isSystem: false,
        })
        .returning();

      if (data.permissionIds && data.permissionIds.length > 0) {
        await db
          .insert(rolePermissions)
          .values(
            data.permissionIds.map((permissionId) => ({
              roleId: row.id,
              permissionId,
            })),
          )
          .onConflictDoNothing();
      }

      res.status(201).json({ role: row });
    } catch (err) {
      req.log.error({ err }, "create role failed");
      res.status(500).json({ error: "خطأ غير متوقع" });
    }
  },
);

router.patch(
  "/roles/:id",
  requirePerm("roles.edit"),
  async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    const parsed = UpdateRoleBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "بيانات غير صحيحة" });
      return;
    }
    try {
      const [existing] = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.id, id))
        .limit(1);
      if (!existing) {
        res.status(404).json({ error: "الدور غير موجود" });
        return;
      }

      const [row] = await db
        .update(roles)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(roles.id, id))
        .returning();

      res.json({ role: row });
    } catch (err) {
      req.log.error({ err }, "update role failed");
      res.status(500).json({ error: "خطأ غير متوقع" });
    }
  },
);

router.delete(
  "/roles/:id",
  requirePerm("roles.delete"),
  async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    try {
      const [existing] = await db
        .select()
        .from(roles)
        .where(eq(roles.id, id))
        .limit(1);
      if (!existing) {
        res.status(404).json({ error: "الدور غير موجود" });
        return;
      }
      if (existing.isSystem) {
        res.status(400).json({ error: "لا يمكن حذف دور نظامي" });
        return;
      }

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.roleId, id));
      if (count > 0) {
        res.status(409).json({
          error: `الدور مرتبط بـ ${count} مستخدم. يرجى نقل المستخدمين إلى دور آخر قبل الحذف.`,
        });
        return;
      }

      await db.delete(roles).where(eq(roles.id, id));
      res.status(204).end();
    } catch (err) {
      req.log.error({ err }, "delete role failed");
      res.status(500).json({ error: "خطأ غير متوقع" });
    }
  },
);

router.put(
  "/roles/:id/permissions",
  requirePerm("roles.edit"),
  async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    const parsed = ReplaceRolePermissionsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "بيانات غير صحيحة" });
      return;
    }
    const permissionIds = parsed.data.permissionIds ?? [];
    try {
      const [role] = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.id, id))
        .limit(1);
      if (!role) {
        res.status(404).json({ error: "الدور غير موجود" });
        return;
      }

      if (permissionIds.length > 0) {
        const validPerms = await db
          .select({ id: permissions.id })
          .from(permissions)
          .where(inArray(permissions.id, permissionIds));
        if (validPerms.length !== permissionIds.length) {
          res.status(400).json({ error: "بعض الصلاحيات غير موجودة" });
          return;
        }
      }

      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
      if (permissionIds.length > 0) {
        await db
          .insert(rolePermissions)
          .values(permissionIds.map((permissionId) => ({ roleId: id, permissionId })));
      }

      res.json({ ok: true, count: permissionIds.length });
    } catch (err) {
      req.log.error({ err }, "replace role permissions failed");
      res.status(500).json({ error: "خطأ غير متوقع" });
    }
  },
);

export default router;
