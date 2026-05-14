/**
 * Authentication (ajelsa, Next.js) — cookie binding + DB-backed session
 * resolution.
 *
 * Pure JWT / password / legacy-role helpers live in `@workspace/shared` and
 * are consumed by both ajelsa and api-server. This file keeps:
 *   - Next.js `cookies()` integration (get/set/clear)
 *   - DB-backed session epoch lookup (for force-logout revocation)
 *   - DB-backed login (email + password → JWT + permission snapshot)
 *   - Request-time permission guards that read the session from cookies
 */

import { cookies } from "next/headers";
import { db, users } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import {
  COOKIE_NAME,
  signSession,
  verifySession,
  type SessionPayload,
} from "@workspace/shared/jwt";
import { hashPassword, verifyPassword } from "@workspace/shared/password";
import { hasRole } from "@workspace/shared/legacy-roles";
import {
  hasPermissionInList,
} from "@workspace/shared/permissions";
import {
  resolveUserPermissionKeys,
  userHasPermission,
} from "./permissions";
import { logActivity } from "./activity";

// Re-export so existing `@/lib/auth` imports of these names keep working.
export {
  type SessionPayload,
  signSession,
  verifySession,
  hashPassword,
  verifyPassword,
  hasRole,
};

/**
 * DB lookup of a user's current session_epoch. Done on every getSession()
 * call (no in-process cache) so a force-logout takes effect on the very
 * next request — any caching layer that survives across requests would
 * risk serving a stale epoch and silently bypassing revocation.
 */
async function getCurrentSessionEpoch(userId: string): Promise<number | null> {
  const [row] = await db
    .select({ sessionEpoch: users.sessionEpoch })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) return null;
  return row.sessionEpoch ?? 0;
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySession(token);
  if (!session) return null;

  // Compare the JWT's session epoch against the current DB value. If the
  // user's epoch was bumped after this token was issued (force logout /
  // password reset / deleted user) the cookie is treated as expired.
  const currentEpoch = await getCurrentSessionEpoch(session.userId);
  if (currentEpoch === null) return null; // user no longer exists
  const tokenEpoch = typeof session.sessionEpoch === "number" ? session.sessionEpoch : 0;
  if (tokenEpoch !== currentEpoch) return null;

  return session;
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function loginByEmail(
  email: string,
  password: string,
  meta?: { ipAddress?: string | null; userAgent?: string | null },
) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
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

  // Snapshot the user's permission keys into the JWT for fast checks.
  // The DB-backed cache stays the source of truth at runtime.
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

  return { user, token };
}

/** @deprecated use requirePerm instead — kept for backward compatibility */
export async function requireRole(required: string) {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  if (!hasRole(session.role, required)) throw new Error("FORBIDDEN");
  return session;
}

// =====================================================
// Permission-aware request guards
// =====================================================

/**
 * Returns true if the current session has the given permission key.
 * Uses the JWT snapshot first; falls back to a fresh DB lookup if missing.
 */
export async function sessionHasPermission(
  session: SessionPayload | null,
  perm: string,
): Promise<boolean> {
  if (!session) return false;
  if (hasPermissionInList(session.permissionKeys, perm)) return true;
  // Fallback (e.g. permission added since last login)
  return userHasPermission(session.userId, perm);
}

/**
 * Throws UNAUTHENTICATED / FORBIDDEN if the current session lacks `perm`.
 * Returns the session on success.
 */
export async function requirePerm(perm: string): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  const allowed = await sessionHasPermission(session, perm);
  if (!allowed) throw new Error("FORBIDDEN");
  return session;
}

/** Throws UNAUTHENTICATED / FORBIDDEN unless ALL `perms` are held. */
export async function requireAllPerms(perms: string[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  for (const p of perms) {
    if (!(await sessionHasPermission(session, p))) throw new Error("FORBIDDEN");
  }
  return session;
}

/** Throws UNAUTHENTICATED / FORBIDDEN unless ANY of `perms` is held. */
export async function requireAnyPerm(perms: string[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  for (const p of perms) {
    if (await sessionHasPermission(session, p)) return session;
  }
  throw new Error("FORBIDDEN");
}
