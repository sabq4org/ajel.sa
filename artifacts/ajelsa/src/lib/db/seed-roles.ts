/**
 * Seed the new RBAC system: permissions, roles, role_permissions.
 * Also backfills users.roleId from the legacy users.role enum.
 *
 * Idempotent — safe to re-run. Use:
 *   pnpm --filter @workspace/ajelsa db:seed-roles
 */
import { db } from "./index";
import { roles, permissions, rolePermissions, users } from "./schema";
import { eq, inArray, isNull, sql } from "drizzle-orm";
import {
  PERMISSION_REGISTRY,
  SYSTEM_ROLES,
  LEGACY_ROLE_MAP,
} from "../permissions";

async function main() {
  console.log("🌱 Seeding RBAC roles & permissions...");

  // ---- 1. Upsert permissions ----
  console.log(`  • Upserting ${PERMISSION_REGISTRY.length} permissions`);
  for (let i = 0; i < PERMISSION_REGISTRY.length; i++) {
    const p = PERMISSION_REGISTRY[i];
    await db
      .insert(permissions)
      .values({
        key: p.key,
        category: p.category,
        labelAr: p.labelAr,
        labelEn: p.labelEn,
        description: p.description ?? null,
        position: i,
      })
      .onConflictDoUpdate({
        target: permissions.key,
        set: {
          category: p.category,
          labelAr: p.labelAr,
          labelEn: p.labelEn,
          description: p.description ?? null,
          position: i,
        },
      });
  }

  // ---- 2. Upsert system roles ----
  console.log(`  • Upserting ${SYSTEM_ROLES.length} system roles`);
  for (const r of SYSTEM_ROLES) {
    await db
      .insert(roles)
      .values({
        key: r.key,
        nameAr: r.nameAr,
        nameEn: r.nameEn,
        description: r.description,
        level: r.level,
        isSystem: true,
      })
      .onConflictDoUpdate({
        target: roles.key,
        set: {
          nameAr: r.nameAr,
          nameEn: r.nameEn,
          description: r.description,
          level: r.level,
          isSystem: true,
          updatedAt: new Date(),
        },
      });
  }

  // ---- 3. Apply role -> permission mappings ----
  console.log(`  • Mapping role permissions`);
  const allRoles = await db.select({ id: roles.id, key: roles.key }).from(roles);
  const allPerms = await db.select({ id: permissions.id, key: permissions.key }).from(permissions);
  const permIdByKey = new Map(allPerms.map((p) => [p.key, p.id]));
  const roleByKey = new Map(allRoles.map((r) => [r.key, r.id]));

  for (const r of SYSTEM_ROLES) {
    const roleId = roleByKey.get(r.key);
    if (!roleId) continue;

    const desiredPermIds = r.permissions
      .map((k) => permIdByKey.get(k))
      .filter((id): id is string => Boolean(id));

    // Wipe + re-insert this role's permissions to mirror the registry exactly
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    if (desiredPermIds.length > 0) {
      await db
        .insert(rolePermissions)
        .values(desiredPermIds.map((permissionId) => ({ roleId, permissionId })))
        .onConflictDoNothing();
    }
    console.log(`    - ${r.key}: ${desiredPermIds.length} permissions`);
  }

  // ---- 4. Backfill users.roleId from legacy users.role enum ----
  console.log(`  • Backfilling users.roleId from legacy role enum`);
  const legacyUsers = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(isNull(users.roleId));

  let backfilled = 0;
  for (const u of legacyUsers) {
    const targetRoleKey = LEGACY_ROLE_MAP[u.role];
    if (!targetRoleKey) continue;
    const targetRoleId = roleByKey.get(targetRoleKey);
    if (!targetRoleId) continue;
    await db.update(users).set({ roleId: targetRoleId }).where(eq(users.id, u.id));
    backfilled++;
  }
  console.log(`    - backfilled ${backfilled}/${legacyUsers.length} users`);

  console.log("✅ RBAC seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
