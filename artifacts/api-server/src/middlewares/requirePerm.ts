/**
 * Express middlewares for permission-gated routes.
 *
 *   router.get("/users", requirePerm("users.view"), handler)
 *   router.put("/roles/:id", requireAnyPerm(["roles.edit"]), handler)
 *
 * The JWT carries a snapshot of permission keys; we trust the snapshot
 * unless the requested key is missing, in which case we re-resolve from
 * the DB (a permission added since last login).
 *
 * Attaches the verified session to `req.session` for handlers to read.
 * `readSession` already enforces the session_epoch revocation check.
 */
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { hasPermissionInList } from "@workspace/shared/permissions";
import type { SessionPayload } from "@workspace/shared/jwt";
import { readSession, resolveUserPermissionKeys } from "../lib/auth";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: SessionPayload;
    }
  }
}

async function sessionHasPermission(
  session: SessionPayload,
  perm: string,
): Promise<boolean> {
  if (hasPermissionInList(session.permissionKeys, perm)) return true;
  const fresh = await resolveUserPermissionKeys(session.userId);
  return fresh.includes(perm);
}

export function requirePerm(perm: string): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await readSession(req);
      if (!session) {
        res.status(401).json({ error: "UNAUTHENTICATED" });
        return;
      }
      if (!(await sessionHasPermission(session, perm))) {
        res.status(403).json({ error: "FORBIDDEN" });
        return;
      }
      req.session = session;
      next();
    } catch (err) {
      req.log.error({ err }, "requirePerm failed");
      res.status(500).json({ error: "خطأ غير متوقع" });
    }
  };
}

export function requireAnyPerm(perms: string[]): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await readSession(req);
      if (!session) {
        res.status(401).json({ error: "UNAUTHENTICATED" });
        return;
      }
      for (const p of perms) {
        if (await sessionHasPermission(session, p)) {
          req.session = session;
          next();
          return;
        }
      }
      res.status(403).json({ error: "FORBIDDEN" });
    } catch (err) {
      req.log.error({ err }, "requireAnyPerm failed");
      res.status(500).json({ error: "خطأ غير متوقع" });
    }
  };
}

export function requireAuth(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await readSession(req);
      if (!session) {
        res.status(401).json({ error: "UNAUTHENTICATED" });
        return;
      }
      req.session = session;
      next();
    } catch (err) {
      req.log.error({ err }, "requireAuth failed");
      res.status(500).json({ error: "خطأ غير متوقع" });
    }
  };
}
