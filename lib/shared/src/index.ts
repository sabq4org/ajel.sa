/**
 * @workspace/shared — pure utilities shared across ajelsa (Next.js) and
 * api-server (Express).
 *
 * Nothing here touches the database or framework request/response objects.
 * DB-dependent helpers (resolveUserPermissionKeys, loginByEmail, etc.) live
 * in each app since they need the local drizzle client.
 *
 * Sub-paths (for tree-shaking / clarity):
 *   - @workspace/shared/jwt
 *   - @workspace/shared/password
 *   - @workspace/shared/permissions
 *   - @workspace/shared/legacy-roles
 */
export * from "./jwt";
export * from "./password";
export * from "./permissions";
export * from "./legacy-roles";
export * from "./activity-labels";
