/**
 * Users endpoints — newsroom user accounts.
 *
 *   GET    /users               — list (gated by users.view)
 *   POST   /users               — create + hash password (users.create)
 *   GET    /users/options       — compact dropdown for author linking (authors.manage)
 *   PATCH  /users/:id           — update profile / role enum / password (users.edit)
 *   DELETE /users/:id           — delete (users.delete; rejects self-delete)
 *   PUT    /users/:id/role      — assign roleId (users.assign_roles)
 *
 * Note: this file owns ONLY the legacy enum-role surface + role-assignment.
 * Per-user permission overrides and the full staff editor live in the
 * staff endpoints (next batch).
 */
import {
  Router,
  type IRouter,
  type Request,
  type Response,
} from "express";
import { db } from "@workspace/db";
import { users, roles } from "@workspace/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import {
  CreateUserBody,
  UpdateUserBody,
  AssignUserRoleBody,
} from "@workspace/api-zod";
import { hashPassword } from "@workspace/shared/password";
import { requirePerm } from "../middlewares/requirePerm";

const router: IRouter = Router();

router.get(
  "/users",
  requirePerm("users.view"),
  async (req: Request, res: Response) => {
    try {
      const items = await db
        .select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          bio: users.bio,
          avatarUrl: users.avatarUrl,
          twitterHandle: users.twitterHandle,
          role: users.role,
          isActive: users.isActive,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt));
      res.json({ items });
    } catch (err) {
      req.log.error({ err }, "list users failed");
      res.status(500).json({ error: "خطأ غير متوقع" });
    }
  },
);

router.post(
  "/users",
  requirePerm("users.create"),
  async (req: Request, res: Response) => {
    const parsed = CreateUserBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "بيانات غير صحيحة" });
      return;
    }
    const data = parsed.data;
    try {
      const passwordHash = await hashPassword(data.password);
      const [row] = await db
        .insert(users)
        .values({
          email: data.email.toLowerCase(),
          passwordHash,
          fullName: data.fullName,
          bio: data.bio,
          twitterHandle: data.twitterHandle,
          role: data.role ?? "writer",
          isActive: data.isActive ?? true,
        })
        .returning({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
        });
      res.status(201).json({ user: row });
    } catch (err) {
      req.log.error({ err }, "create user failed");
      res.status(500).json({ error: "خطأ غير متوقع" });
    }
  },
);

router.get(
  "/users/options",
  requirePerm("authors.manage"),
  async (req: Request, res: Response) => {
    try {
      const items = await db
        .select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          role: users.role,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(eq(users.isActive, true))
        .orderBy(asc(users.fullName));
      res.json({ items });
    } catch (err) {
      req.log.error({ err }, "list user options failed");
      res.status(500).json({ error: "خطأ غير متوقع" });
    }
  },
);

router.patch(
  "/users/:id",
  requirePerm("users.edit"),
  async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    const parsed = UpdateUserBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "بيانات غير صحيحة" });
      return;
    }
    const { password, ...fields } = parsed.data;
    try {
      const updates: Record<string, unknown> = {
        ...fields,
        updatedAt: new Date(),
      };
      if (password) {
        updates.passwordHash = await hashPassword(password);
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
      if (!row) {
        res.status(404).json({ error: "المستخدم غير موجود" });
        return;
      }
      res.json({ user: row });
    } catch (err) {
      req.log.error({ err }, "update user failed");
      res.status(500).json({ error: "خطأ غير متوقع" });
    }
  },
);

router.delete(
  "/users/:id",
  requirePerm("users.delete"),
  async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    if (req.session && id === req.session.userId) {
      res.status(400).json({ error: "لا يمكنك حذف حسابك" });
      return;
    }
    try {
      await db.delete(users).where(eq(users.id, id));
      res.status(204).end();
    } catch (err) {
      req.log.error({ err }, "delete user failed");
      res.status(500).json({ error: "خطأ غير متوقع" });
    }
  },
);

router.put(
  "/users/:id/role",
  requirePerm("users.assign_roles"),
  async (req: Request<{ id: string }>, res: Response) => {
    const { id } = req.params;
    const parsed = AssignUserRoleBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "بيانات غير صحيحة" });
      return;
    }
    const { roleId } = parsed.data;
    try {
      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      if (!user) {
        res.status(404).json({ error: "المستخدم غير موجود" });
        return;
      }

      if (roleId) {
        const [role] = await db
          .select({ id: roles.id })
          .from(roles)
          .where(eq(roles.id, roleId))
          .limit(1);
        if (!role) {
          res.status(400).json({ error: "الدور غير موجود" });
          return;
        }
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
          isActive: users.isActive,
        });

      res.json({ user: row });
    } catch (err) {
      req.log.error({ err }, "assign user role failed");
      res.status(500).json({ error: "خطأ غير متوقع" });
    }
  },
);

export default router;
