/**
 * JWT session helpers — pure (no Next.js, no DB).
 *
 * Used by both:
 *   - ajelsa (Next.js) — to sign cookies after login
 *   - api-server (Express) — to verify cookies on every request
 *
 * The cookie-binding helpers (read from request headers, set/clear on
 * response) live separately in each app since they depend on the host
 * framework's request/response abstractions.
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const DEFAULT_SECRET = "dev-secret-change-me-32chars-aaaa";

export const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "ajel_session";
export const SESSION_DURATION = "30d";

function getSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.AUTH_SECRET || DEFAULT_SECRET);
}

export type SessionPayload = JWTPayload & {
  userId: string;
  email: string;
  /** @deprecated legacy enum role — kept for backward compatibility with existing checks */
  role: string;
  fullName: string;
  /** FK into roles table */
  roleId?: string | null;
  /** Snapshot of effective permission keys at login */
  permissionKeys?: string[];
  /**
   * Snapshot of `users.session_epoch` at login. Compared against the current
   * DB value on every session check so "force logout" / password reset can
   * revoke this token by bumping the DB counter.
   */
  sessionEpoch?: number;
};

export async function signSession(
  payload: Omit<SessionPayload, "iat" | "exp">,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecret());
}

export async function verifySession(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, getSecret());
    return payload;
  } catch {
    return null;
  }
}
