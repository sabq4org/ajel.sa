/**
 * Database-driven RBAC — permission helpers + in-process cache (ajelsa).
 *
 * The pure pieces (registry constants, system role definitions, override
 * math, list lookup) now live in `@workspace/shared/permissions`. This
 * file keeps the DB-touching parts that depend on ajelsa's local drizzle
 * client + per-process cache:
 *
 *   - resolveUserPermissionKeys / userHasPermission / getRolePermissionKeys
 *   - invalidate{User,All,Role}Permissions (clears the in-process Map)
 *
 * The session JWT also carries the user's permission key array at login
 * time so the very first checks of each request don't need a DB roundtrip.
 * The DB-backed cache is the source of truth at runtime.
 */
import { db } from "./db";
import { roles, permissions, rolePermissions, users } from "./db/schema";
import { eq } from "drizzle-orm";
import {
  applyPermissionOverrides,
  LEGACY_ROLE_MAP,
  type PermissionOverrides,
} from "@workspace/shared/permissions";

// Re-export the pure pieces so existing `@/lib/permissions` imports keep working.
export {
  PERMISSION_REGISTRY,
  CATEGORY_LABELS_AR,
  SYSTEM_ROLES,
  NON_PUBLISHING_ROLE_KEYS,
  LEGACY_ROLE_MAP,
  applyPermissionOverrides,
  hasPermissionInList,
  type PermissionDef,
  type SystemRoleKey,
  type SystemRoleDef,
  type PermissionOverrides,
} from "@workspace/shared/permissions";

// =====================================================
// In-process cache for resolved permission keys per user
// =====================================================

const permissionCache = new Map<string, { keys: string[]; at: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function invalidateUserPermissions(userId: string): void {
  permissionCache.delete(userId);
}

export function invalidateAllPermissions(): void {
  permissionCache.clear();
}

export function invalidateRolePermissions(roleId: string): void {
  // Anyone with this role needs a fresh fetch — clearing all is simplest and cheap
  // since the cache is small and reseeds quickly on next request.
  void roleId;
  permissionCache.clear();
}

/**
 * Resolve the effective permission keys for a user from the DB.
 * Falls back to the legacy enum role mapping if the user has no roleId yet.
 * Applies any per-user customPermissions overrides on top of the role.
 */
export async function resolveUserPermissionKeys(userId: string): Promise<string[]> {
  const cached = permissionCache.get(userId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.keys;
  }

  const [user] = await db
    .select({
      roleId: users.roleId,
      role: users.role,
      customPermissions: users.customPermissions,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    permissionCache.set(userId, { keys: [], at: Date.now() });
    return [];
  }

  let roleIdToUse = user.roleId;

  // Backfill: legacy users without a roleId get mapped via LEGACY_ROLE_MAP
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
        // best-effort backfill so the next read is fast
        await db.update(users).set({ roleId: mappedRole.id }).where(eq(users.id, userId));
      }
    }
  }

  let baseKeys: string[] = [];
  if (roleIdToUse) {
    const rows = await db
      .select({ key: permissions.key })
      .from(rolePermissions)
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(eq(rolePermissions.roleId, roleIdToUse));
    baseKeys = rows.map((r) => r.key);
  }

  const keys = applyPermissionOverrides(
    baseKeys,
    (user.customPermissions ?? null) as PermissionOverrides | null,
  );

  permissionCache.set(userId, { keys, at: Date.now() });
  return keys;
}

/**
 * Get the role's default permission key set (no overrides). Used by the staff
 * editor to compute the diff against custom overrides.
 */
export async function getRolePermissionKeys(roleId: string): Promise<string[]> {
  const rows = await db
    .select({ key: permissions.key })
    .from(rolePermissions)
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(eq(rolePermissions.roleId, roleId));
  return rows.map((r) => r.key);
}

export async function userHasPermission(userId: string, perm: string): Promise<boolean> {
  const keys = await resolveUserPermissionKeys(userId);
  return keys.includes(perm);
}
