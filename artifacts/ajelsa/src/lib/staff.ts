/**
 * Staff helpers — slug generation, sanitized output, role lookup.
 */
import { db } from "./db";
import { users, roles } from "./db/schema";
import { and, eq, ne } from "drizzle-orm";
import { arabicSlug } from "./utils";
import { NON_PUBLISHING_ROLE_KEYS } from "./permissions";
import { randomBytes } from "crypto";

/** Reserved slug for the "Former Staff" placeholder author. */
export const FORMER_STAFF_SLUG = "former-staff";
/** Reserved email for the placeholder; never used to log in. */
export const FORMER_STAFF_EMAIL = "former-staff@system.local";

/**
 * Columns returned to the client. Never includes passwordHash.
 */
export const STAFF_COLUMNS = {
  id: users.id,
  email: users.email,
  fullName: users.fullName,
  displayName: users.displayName,
  slug: users.slug,
  bio: users.bio,
  shortBio: users.shortBio,
  avatarUrl: users.avatarUrl,
  coverUrl: users.coverUrl,
  role: users.role,
  roleId: users.roleId,
  customPermissions: users.customPermissions,
  phone: users.phone,
  alternateEmail: users.alternateEmail,
  jobTitle: users.jobTitle,
  department: users.department,
  twitterHandle: users.twitterHandle,
  facebookHandle: users.facebookHandle,
  instagramHandle: users.instagramHandle,
  linkedinHandle: users.linkedinHandle,
  youtubeHandle: users.youtubeHandle,
  tiktokHandle: users.tiktokHandle,
  websiteUrl: users.websiteUrl,
  isActive: users.isActive,
  isVerified: users.isVerified,
  mustChangePassword: users.mustChangePassword,
  emailVerifiedAt: users.emailVerifiedAt,
  lastLoginAt: users.lastLoginAt,
  lastSeenAt: users.lastSeenAt,
  loginCount: users.loginCount,
  joinedAt: users.joinedAt,
  leftAt: users.leftAt,
  preferences: users.preferences,
  internalNotes: users.internalNotes,
  createdBy: users.createdBy,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
} as const;

/**
 * Generate a unique slug for a staff member based on their full name. If a
 * slug collision is detected we append a short suffix derived from the user
 * id (when known) or a random base36 segment.
 *
 * @param fullName Source text for the slug
 * @param excludeId User id to exclude when checking collisions (for updates)
 */
export async function generateUniqueSlug(
  fullName: string,
  excludeId?: string
): Promise<string> {
  const base = arabicSlug(fullName) || "user-" + Math.random().toString(36).slice(2, 6);

  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate =
      attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 5)}`;
    const where = excludeId
      ? and(eq(users.slug, candidate), ne(users.id, excludeId))
      : eq(users.slug, candidate);
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(where)
      .limit(1);
    if (!existing) return candidate;
  }
  // Last-resort: timestamp suffix
  return `${base}-${Date.now().toString(36)}`;
}

/**
 * Resolve a role id to its key. Used to enforce role-based gates such as
 * forcing reporters' articles to draft state.
 */
export async function getRoleKey(roleId: string | null | undefined): Promise<string | null> {
  if (!roleId) return null;
  const [r] = await db
    .select({ key: roles.key })
    .from(roles)
    .where(eq(roles.id, roleId))
    .limit(1);
  return r?.key ?? null;
}

/**
 * True if the given roleId belongs to a role that cannot publish (e.g.
 * "reporter", "columnist"). Falls back to false on lookup failure.
 */
export async function isNonPublishingRole(roleId: string | null | undefined): Promise<boolean> {
  const key = await getRoleKey(roleId);
  if (!key) return false;
  return (NON_PUBLISHING_ROLE_KEYS as string[]).includes(key);
}

/**
 * Get (or lazily create) the system "Former Staff" placeholder user.
 *
 * When a real staff member is deleted without an explicit reassignment
 * target, their authored articles are reassigned to this placeholder so
 * authorship is preserved (instead of dangling FK / `null` author).
 *
 * The placeholder has:
 *   - a fixed slug ("former-staff") and reserved email
 *   - a random unguessable password hash (cannot log in)
 *   - isActive=false so it never appears in pickers
 *   - no role, no permissions
 */
export async function getOrCreateFormerStaffUser(): Promise<string> {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.slug, FORMER_STAFF_SLUG))
    .limit(1);
  if (existing) return existing.id;

  // Random non-bcrypt hash (login flow uses bcrypt.compare which will
  // always fail against this string — placeholder cannot authenticate).
  const stubHash = "x" + randomBytes(48).toString("hex");

  const [created] = await db
    .insert(users)
    .values({
      email: FORMER_STAFF_EMAIL,
      passwordHash: stubHash,
      fullName: "منسوب سابق",
      displayName: "منسوب سابق",
      slug: FORMER_STAFF_SLUG,
      shortBio: "حساب نظام لحفظ نسبة المقالات إلى منسوبين سابقين.",
      role: "writer",
      isActive: false,
      isVerified: false,
      mustChangePassword: false,
      leftAt: new Date(),
      internalNotes: "System placeholder. Do not delete.",
    })
    .onConflictDoNothing({ target: users.email })
    .returning({ id: users.id });

  if (created) return created.id;

  // Lost a race — fetch again
  const [again] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, FORMER_STAFF_EMAIL))
    .limit(1);
  if (!again) throw new Error("Failed to create Former Staff placeholder");
  return again.id;
}
