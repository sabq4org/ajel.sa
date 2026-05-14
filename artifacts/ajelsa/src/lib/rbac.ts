export const ROLE_HIERARCHY = {
  super_admin: 5,
  editor_in_chief: 4,
  editor: 3,
  writer: 2,
  contributor: 1,
} as const;

export type Role = keyof typeof ROLE_HIERARCHY;

export function hasPermission(userRole: string, requiredRole: Role): boolean {
  return (ROLE_HIERARCHY[userRole as Role] ?? 0) >= ROLE_HIERARCHY[requiredRole];
}

export const PERMISSIONS = {
  publish:       ["super_admin", "editor_in_chief", "editor"],
  delete:        ["super_admin", "editor_in_chief"],
  manage_users:  ["super_admin", "editor_in_chief"],
  manage_cats:   ["super_admin", "editor_in_chief", "editor"],
  view_audit:    ["super_admin", "editor_in_chief"],
  manage_ads:    ["super_admin", "editor_in_chief"],
} as const;

export function can(userRole: string, permission: keyof typeof PERMISSIONS): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(userRole);
}

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "مدير عام",
  editor_in_chief: "رئيس التحرير",
  editor: "محرر",
  writer: "كاتب",
  contributor: "مساهم",
};
