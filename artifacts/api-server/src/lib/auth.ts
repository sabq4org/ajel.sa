/**
 * Authentication (api-server, Express) — DB-bound login + permission
 * resolution + cookie binding.
 *
 * Pure JWT/password helpers live in `@workspace/shared`. This file keeps
 * the Express-specific glue (reading the cookie from a Request, setting
 * the cross-origin cookie on a Response) plus the DB-touching parts:
 *
 *   - loginByEmail (email + password → user + signed JWT)
 *   - resolveUserPermissionKeys (role + per-user overrides → key array)
 *   - getCurrentSessionEpoch (force-logout revocation check)
 *   - readSession (verify cookie + epoch on every guarded request)
 */
import type { Request, Response } from "express";
import { db } from "@workspace/db";
import {
  users,
  roles,
  permissions,
  rolePermissions,
} from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  COOKIE_NAME,
  signSession,
  verifySession,
  type SessionPayload,
} from "@workspace/shared/jwt";
import { verifyPassword } from "@workspace/shared/password";
import {
  applyPermissionOverrides,
  LEGACY_ROLE_MAP,
  type PermissionOverrides,
} from "@workspace/shared/permissions";
import { logActivity } from "./activity";

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function cookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  const domain = process.env.COOKIE_DOMAIN; // e.g. ".ajelsa.net"
  return {
    httpOnly: true,
    secure: isProd,
    // Cross-site cookie required when frontend and backend live on different
    // origins (Vercel ↔ Railway). SameSite=None requires Secure=true.
    sameSite: isProd ? ("none" as const) : ("lax" as const),
    domain,
    path: "/",
    maxAge: SESSION_MAX_AGE_MS,
  };
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, cookieOptions());
}

export function clearSessionCookie(res: Response): void {
  // clearCookie must mirror domain/path/sameSite/secure for browsers to drop it.
  const { maxAge: _unused, ...opts } = cookieOptions();
  void _unused;
  res.clearCookie(COOKIE_NAME, opts);
}

async function getCurrentSessionEpoch(userId: string): Promise<number | null> {
  const [row] = await db
    .select({ sessionEpoch: users.sessionEpoch })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) return null;
  return row.sessionEpoch ?? 0;
}

/**
 * Verify the session cookie on a request and return the payload.
 * Returns null when no cookie, invalid JWT, deleted user, or the user's
 * `session_epoch` was bumped since the token was issued (force-logout).
 */
export async function readSession(req: Request): Promise<SessionPayload | null> {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  const session = await verifySession(token);
  if (!session) return null;

  const currentEpoch = await getCurrentSessionEpoch(session.userId);
  if (currentEpoch === null) return null;
  const tokenEpoch =
    typeof session.sessionEpoch === "number" ? session.sessionEpoch : 0;
  if (tokenEpoch !== currentEpoch) return null;

  return session;
}

/**
 * Resolve the effective permission keys for a user from the DB.
 * Falls back to the legacy enum role mapping if the user has no roleId yet
 * (and backfills users.role_id best-effort so the next read is fast).
 */
export async function resolveUserPermissionKeys(
  userId: string,
): Promise<string[]> {
  const [user] = await db
    .select({
      roleId: users.roleId,
      role: users.role,
      customPermissions: users.customPermissions,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return [];

  let roleIdToUse = user.roleId;
  if (!roleIdToUse) {
    const mappedKey = LEGACY_ROLE_MAP[user.role];
    if (mappedKey) {
      const [mappedRole] = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.key, mappedKey))
        .limit(1);
      if (mappedRole) {
        roleIdToUse = mappedRole.id;
        await db
          .update(users)
          .set({ roleId: mappedRole.id })
          .where(eq(users.id, userId));
      }
    }
  }

  let baseKeys: string[] = [];
  if (roleIdToUse) {
    const rows = await db
      .select({ key: permissions.key })
      .from(rolePermissions)
      .innerJoin(
        permissions,
        eq(permissions.id, rolePermissions.permissionId),
      )
      .where(eq(rolePermissions.roleId, roleIdToUse));
    baseKeys = rows.map((r) => r.key);
  }

  return applyPermissionOverrides(
    baseKeys,
    (user.customPermissions ?? null) as PermissionOverrides | null,
  );
}

export type LoginResultData = {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    avatarUrl: string | null;
  };
  token: string;
};

export async function loginByEmail(
  email: string,
  password: string,
  meta?: { ipAddress?: string | null; userAgent?: string | null },
): Promise<LoginResultData | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user) return null;

  if (!user.isActive) {
    await logActivity({
      userId: user.id,
      action: "login_failed",
      details: { reason: "inactive" },
      ipAddress: meta?.ipAddress ?? null,
      userAgent: meta?.userAgent ?? null,
    });
    return null;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await logActivity({
      userId: user.id,
      action: "login_failed",
      details: { reason: "bad_password" },
      ipAddress: meta?.ipAddress ?? null,
      userAgent: meta?.userAgent ?? null,
    });
    return null;
  }

  const now = new Date();
  await db
    .update(users)
    .set({
      lastLoginAt: now,
      lastSeenAt: now,
      loginCount: sql`${users.loginCount} + 1`,
    })
    .where(eq(users.id, user.id));

  // Re-read the user's current epoch *after* the login update so the JWT we
  // sign carries the value that any concurrent revocation would also have
  // bumped. (Reading from `user` would race with force-logout.)
  const [{ sessionEpoch: currentEpoch } = { sessionEpoch: 0 }] = await db
    .select({ sessionEpoch: users.sessionEpoch })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  await logActivity({
    userId: user.id,
    action: "login",
    actorId: user.id,
    actorName: user.fullName,
    ipAddress: meta?.ipAddress ?? null,
    userAgent: meta?.userAgent ?? null,
  });

  const permissionKeys = await resolveUserPermissionKeys(user.id);

  const token = await signSession({
    userId: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    roleId: user.roleId ?? null,
    permissionKeys,
    sessionEpoch: currentEpoch ?? 0,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
    },
    token,
  };
}
