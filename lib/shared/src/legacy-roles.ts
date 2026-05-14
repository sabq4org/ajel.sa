/**
 * Legacy role hierarchy — kept for backward compatibility with the
 * `users.role` enum from the original schema (super_admin > editor_in_chief
 * > editor > writer > contributor).
 *
 * New code should use the database-driven RBAC (permission keys) from
 * `@workspace/shared/permissions`. These helpers exist so old checks keep
 * working during the gradual permission-key migration.
 */

export const ROLE_LEVELS: Record<string, number> = {
  contributor: 1,
  writer: 2,
  editor: 3,
  editor_in_chief: 4,
  super_admin: 5,
};

/** @deprecated use permission key checks instead */
export function hasRole(userRole: string, required: string): boolean {
  return (ROLE_LEVELS[userRole] ?? 0) >= (ROLE_LEVELS[required] ?? 0);
}
