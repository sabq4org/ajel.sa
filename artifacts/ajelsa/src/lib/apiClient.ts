/**
 * Browser-side API client — calls api-server on its own origin
 * (e.g. https://api.ajelsa.net) when `NEXT_PUBLIC_API_URL` is set, and
 * falls back to same-origin relative paths during the transition.
 *
 * Always sends `credentials: "include"` so the cross-subdomain session
 * cookie (`Domain=.ajelsa.net`) is attached on every request.
 *
 * Use this for any CLIENT component that needs to call a route that has
 * been ported to api-server (auth, permissions, roles, users so far).
 * Server components and Next route handlers continue to use the DB
 * directly via `@/lib/db` until their route gets ported too.
 *
 * Example:
 *   const res = await apiFetch("/auth/login", {
 *     method: "POST",
 *     body: JSON.stringify({ email, password }),
 *   });
 */

/**
 * Trimmed API base URL (no trailing slash, no `/api` suffix — that's
 * appended by `apiFetch`).
 *
 * In production: `https://api.ajelsa.net`
 * In dev pointing at local api-server: `http://localhost:8080`
 * Unset: empty string → same-origin relative request (Replit fallback).
 */
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  // Caller passes the path AFTER `/api` (e.g. "/auth/login").
  return `${API_BASE}/api${normalized}`;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (
    init.body &&
    typeof init.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(apiUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });
}
