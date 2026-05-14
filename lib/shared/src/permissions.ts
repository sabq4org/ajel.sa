/**
 * Permission registry & pure RBAC helpers — no DB, no framework dependencies.
 *
 * DB-touching helpers (resolveUserPermissionKeys, userHasPermission, the
 * in-process cache) live in each app's own `permissions.ts`, since they
 * need to call into that app's drizzle client.
 */

// =====================================================
// Permission registry — canonical list seeded into DB
// =====================================================

export type PermissionDef = {
  key: string;
  category: string;
  labelAr: string;
  labelEn: string;
  description?: string;
};

export const PERMISSION_REGISTRY: PermissionDef[] = [
  // ---- articles ----
  { key: "articles.view", category: "articles", labelAr: "عرض الأخبار", labelEn: "View articles" },
  { key: "articles.create", category: "articles", labelAr: "إنشاء خبر", labelEn: "Create article" },
  { key: "articles.edit_own", category: "articles", labelAr: "تعديل أخباره الخاصة", labelEn: "Edit own articles" },
  { key: "articles.edit_any", category: "articles", labelAr: "تعديل أي خبر", labelEn: "Edit any article" },
  { key: "articles.delete_own", category: "articles", labelAr: "حذف أخباره الخاصة", labelEn: "Delete own articles" },
  { key: "articles.delete_any", category: "articles", labelAr: "حذف أي خبر", labelEn: "Delete any article" },
  { key: "articles.publish", category: "articles", labelAr: "نشر الأخبار", labelEn: "Publish articles" },
  { key: "articles.feature", category: "articles", labelAr: "تمييز الأخبار في الصفحة الرئيسية", labelEn: "Feature on homepage" },

  // ---- opinion ----
  { key: "opinion.view", category: "opinion", labelAr: "عرض مقالات الرأي", labelEn: "View opinion pieces" },
  { key: "opinion.create", category: "opinion", labelAr: "كتابة مقال رأي", labelEn: "Create opinion piece" },
  { key: "opinion.edit_own", category: "opinion", labelAr: "تعديل مقالاته الخاصة", labelEn: "Edit own opinion pieces" },
  { key: "opinion.edit_any", category: "opinion", labelAr: "تعديل أي مقال رأي", labelEn: "Edit any opinion piece" },
  { key: "opinion.publish", category: "opinion", labelAr: "نشر مقالات الرأي", labelEn: "Publish opinion pieces" },
  { key: "opinion.delete", category: "opinion", labelAr: "حذف مقالات الرأي", labelEn: "Delete opinion pieces" },
  { key: "authors.manage", category: "opinion", labelAr: "إدارة كتّاب الرأي", labelEn: "Manage columnists" },

  // ---- media ----
  { key: "media.view", category: "media", labelAr: "عرض مكتبة الوسائط", labelEn: "View media library" },
  { key: "media.upload", category: "media", labelAr: "رفع وسائط", labelEn: "Upload media" },
  { key: "media.delete", category: "media", labelAr: "حذف وسائط", labelEn: "Delete media" },
  { key: "media.ai_generate", category: "media", labelAr: "توليد صور بالذكاء الاصطناعي", labelEn: "AI image generation" },

  // ---- ai ----
  { key: "ai.smart_edit", category: "ai", labelAr: "استخدام التحرير الذكي", labelEn: "Use smart editor" },
  { key: "ai.key_points", category: "ai", labelAr: "توليد النقاط الرئيسية", labelEn: "Generate key points" },
  { key: "ai.daily_brief", category: "ai", labelAr: "ملخص الأخبار اليومي", labelEn: "Daily brief" },

  // ---- users ----
  { key: "users.view", category: "users", labelAr: "عرض المستخدمين", labelEn: "View users" },
  { key: "users.create", category: "users", labelAr: "إضافة مستخدم", labelEn: "Create user" },
  { key: "users.edit", category: "users", labelAr: "تعديل بيانات المستخدمين", labelEn: "Edit users" },
  { key: "users.assign_roles", category: "users", labelAr: "تعيين الأدوار", labelEn: "Assign roles" },
  { key: "users.delete", category: "users", labelAr: "حذف مستخدم", labelEn: "Delete user" },

  // ---- roles ----
  { key: "roles.view", category: "roles", labelAr: "عرض الأدوار والصلاحيات", labelEn: "View roles" },
  { key: "roles.create", category: "roles", labelAr: "إنشاء دور جديد", labelEn: "Create role" },
  { key: "roles.edit", category: "roles", labelAr: "تعديل الأدوار", labelEn: "Edit roles" },
  { key: "roles.delete", category: "roles", labelAr: "حذف الأدوار", labelEn: "Delete roles" },

  // ---- settings ----
  { key: "settings.view", category: "settings", labelAr: "عرض الإعدادات", labelEn: "View settings" },
  { key: "settings.edit", category: "settings", labelAr: "تعديل الإعدادات", labelEn: "Edit settings" },

  // ---- analytics ----
  { key: "analytics.view", category: "analytics", labelAr: "عرض التحليلات", labelEn: "View analytics" },

  // ---- comments ----
  { key: "comments.view", category: "comments", labelAr: "عرض التعليقات", labelEn: "View comments" },
  { key: "comments.moderate", category: "comments", labelAr: "الموافقة/رفض التعليقات", labelEn: "Moderate comments" },
  { key: "comments.delete", category: "comments", labelAr: "حذف التعليقات", labelEn: "Delete comments" },

  // ---- workflow ----
  { key: "workflow.view", category: "workflow", labelAr: "عرض سير العمل", labelEn: "View workflow" },
  { key: "workflow.review", category: "workflow", labelAr: "مراجعة الأخبار", labelEn: "Review articles" },
  { key: "workflow.approve", category: "workflow", labelAr: "اعتماد الأخبار للنشر", labelEn: "Approve for publication" },

  // ---- staff ----
  { key: "staff.view", category: "staff", labelAr: "عرض المنسوبين", labelEn: "View staff" },
  { key: "staff.view_self", category: "staff", labelAr: "عرض ملفه الشخصي", labelEn: "View own profile" },
  { key: "staff.create", category: "staff", labelAr: "إضافة منسوب", labelEn: "Create staff" },
  { key: "staff.edit", category: "staff", labelAr: "تعديل بيانات المنسوبين", labelEn: "Edit staff" },
  { key: "staff.edit_self", category: "staff", labelAr: "تعديل ملفه الشخصي", labelEn: "Edit own profile" },
  { key: "staff.assign_roles", category: "staff", labelAr: "تعيين أدوار المنسوبين", labelEn: "Assign staff roles" },
  { key: "staff.override_permissions", category: "staff", labelAr: "تجاوز صلاحيات الأدوار", labelEn: "Override permissions" },
  { key: "staff.change_password", category: "staff", labelAr: "تغيير كلمة مرور منسوب", labelEn: "Change staff password" },
  { key: "staff.change_status", category: "staff", labelAr: "تفعيل/تعطيل المنسوبين", labelEn: "Activate/deactivate staff" },
  { key: "staff.force_logout", category: "staff", labelAr: "إنهاء جلسات المنسوبين", labelEn: "Force logout" },
  { key: "staff.delete", category: "staff", labelAr: "حذف منسوب", labelEn: "Delete staff" },
  { key: "staff.view_activity", category: "staff", labelAr: "عرض سجل نشاط المنسوبين", labelEn: "View staff activity" },
];

export const CATEGORY_LABELS_AR: Record<string, string> = {
  articles: "الأخبار",
  opinion: "الرأي",
  media: "الوسائط",
  ai: "الذكاء الاصطناعي",
  users: "المستخدمون",
  roles: "الأدوار",
  settings: "الإعدادات",
  analytics: "التحليلات",
  comments: "التعليقات",
  workflow: "سير العمل",
  staff: "المنسوبون",
};

// =====================================================
// System roles registry — seeded with isSystem=true
// =====================================================

export type SystemRoleKey =
  | "system_admin"
  | "supervisor"
  | "content_manager"
  | "reporter"
  | "columnist";

export type SystemRoleDef = {
  key: SystemRoleKey;
  nameAr: string;
  nameEn: string;
  description: string;
  level: number;
  permissions: string[];
};

const ALL_KEYS = PERMISSION_REGISTRY.map((p) => p.key);

export const SYSTEM_ROLES: SystemRoleDef[] = [
  {
    key: "system_admin",
    nameAr: "مدير النظام",
    nameEn: "System Administrator",
    description: "صلاحية كاملة على جميع جوانب النظام",
    level: 100,
    permissions: ALL_KEYS,
  },
  {
    key: "supervisor",
    nameAr: "مشرف عام",
    nameEn: "Supervisor",
    description: "إدارة المحتوى والمستخدمين بدون حذف الأدوار أو المستخدمين",
    level: 80,
    permissions: ALL_KEYS.filter(
      (k) => !["roles.delete", "users.delete", "settings.edit", "staff.delete"].includes(k),
    ),
  },
  {
    key: "content_manager",
    nameAr: "مدير محتوى",
    nameEn: "Content Manager",
    description: "إدارة كاملة للمحتوى والتعليقات وسير العمل",
    level: 60,
    permissions: [
      "articles.view", "articles.create", "articles.edit_own", "articles.edit_any",
      "articles.delete_own", "articles.publish", "articles.feature",
      "opinion.view", "opinion.create", "opinion.edit_own", "opinion.edit_any",
      "opinion.publish", "authors.manage",
      "media.view", "media.upload", "media.ai_generate",
      "ai.smart_edit", "ai.key_points", "ai.daily_brief",
      "comments.view", "comments.moderate", "comments.delete",
      "workflow.view", "workflow.review", "workflow.approve",
      "analytics.view",
      "staff.view", "staff.view_self", "staff.edit_self",
    ],
  },
  {
    key: "reporter",
    nameAr: "مراسل",
    nameEn: "Reporter",
    description: "كتابة الأخبار وإرسالها للمراجعة بدون نشر مباشر",
    level: 40,
    permissions: [
      "articles.view", "articles.create", "articles.edit_own", "articles.delete_own",
      "media.view", "media.upload",
      "ai.smart_edit", "ai.key_points",
      "comments.view",
      "workflow.view",
      "staff.view_self", "staff.edit_self",
    ],
  },
  {
    key: "columnist",
    nameAr: "كاتب رأي",
    nameEn: "Columnist",
    description: "كتابة مقالات الرأي وإرسالها للمراجعة",
    level: 30,
    permissions: [
      "articles.view",
      "opinion.view", "opinion.create", "opinion.edit_own",
      "media.view", "media.upload",
      "ai.smart_edit",
      "staff.view_self", "staff.edit_self",
    ],
  },
];

// Roles that cannot publish directly — submissions from these users are
// auto-downgraded to draft by the staff API regardless of requested status.
export const NON_PUBLISHING_ROLE_KEYS: SystemRoleKey[] = ["reporter", "columnist"];

// Mapping from legacy enum role to new system role key (used at login backfill).
export const LEGACY_ROLE_MAP: Record<string, SystemRoleKey> = {
  super_admin: "system_admin",
  editor_in_chief: "supervisor",
  editor: "content_manager",
  writer: "reporter",
  contributor: "columnist",
};

// =====================================================
// Pure helpers
// =====================================================

export type PermissionOverrides = {
  add?: string[];
  remove?: string[];
};

/** Apply per-user overrides to a base permission set. */
export function applyPermissionOverrides(
  baseKeys: string[],
  overrides: PermissionOverrides | null | undefined,
): string[] {
  if (!overrides) return baseKeys;
  const set = new Set(baseKeys);
  for (const k of overrides.add ?? []) set.add(k);
  for (const k of overrides.remove ?? []) set.delete(k);
  return Array.from(set);
}

export function hasPermissionInList(
  keys: string[] | undefined,
  perm: string,
): boolean {
  if (!keys || keys.length === 0) return false;
  return keys.includes(perm);
}
