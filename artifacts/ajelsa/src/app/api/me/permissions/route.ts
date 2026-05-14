/**
 * GET /api/me/permissions — current session's effective permissions
 *
 * Used by the client to gate UI elements like the "نشر الآن" button.
 */
import { ok, fromError, ensureAuth } from "@/lib/api";
import { resolveUserPermissionKeys } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await ensureAuth();
    // Source of truth is the DB-backed cache (handles permission changes since login)
    const keys = await resolveUserPermissionKeys(session.userId);
    return ok({
      userId: session.userId,
      role: session.role,
      roleId: session.roleId ?? null,
      permissions: keys,
    });
  } catch (e) {
    return fromError(e);
  }
}
