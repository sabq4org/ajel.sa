/**
 * API helpers — موحّد للـ Routes
 */
import { NextResponse } from "next/server";
import {
  getSession,
  hasRole,
  sessionHasPermission,
  type SessionPayload,
} from "./auth";
import { z, ZodError } from "zod";

/**
 * Image-URL validator that accepts BOTH absolute URLs (http/https — used by
 * Cloudinary, R2, and other CDN-style providers) AND relative paths produced
 * by our internal storage (e.g. `/api/storage/objects/uploads/<uuid>` from
 * Replit Object Storage, or `/uploads/...` from the local-FS fallback).
 *
 * The previous `z.string().url()` rejected our own internal paths and caused
 * draft saves & publishes to fail with a 400 right after the editor uploaded
 * an image. Inline `data:` URLs remain rejected for security/perf reasons.
 */
export const imageUrlSchema = z.string().refine(
  (u) => {
    if (u.startsWith("data:")) return false;
    // Reject protocol-relative URLs ("//evil.com/...") — they would load
    // external content under the page's own protocol when rendered as <img>.
    if (u.startsWith("//")) return false;
    if (u.startsWith("/")) return true; // internal serving path
    try {
      const parsed = new URL(u);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  },
  {
    message:
      "رابط الصورة غير صالح — يجب أن يكون URL مطلق أو مسار داخلي يبدأ بـ /",
  },
);

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function unauthorized(message = "غير مسجّل دخول") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "ليس لديك صلاحية") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message = "غير موجود") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function conflict(message: string) {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function serverError(err: unknown) {
  console.error("[API Error]", err);
  const message = err instanceof Error ? err.message : "خطأ غير متوقع";
  return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * يلتقط ZodError ويرجّع 400 منظم
 */
export function fromError(err: unknown) {
  if (err instanceof ZodError) {
    return badRequest("بيانات غير صحيحة", err.flatten());
  }
  if (err instanceof Error && err.message === "UNAUTHENTICATED") {
    return unauthorized();
  }
  if (err instanceof Error && err.message === "FORBIDDEN") {
    return forbidden();
  }
  return serverError(err);
}

/**
 * يفرض المصادقة، يرجّع session أو يرمي
 */
export async function ensureAuth(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) throw new Error("UNAUTHENTICATED");
  return s;
}

/**
 * @deprecated use ensurePerm — يفرض دور معين (للأكواد القديمة)
 */
export async function ensureRole(required: string): Promise<SessionPayload> {
  const s = await ensureAuth();
  if (!hasRole(s.role, required)) throw new Error("FORBIDDEN");
  return s;
}

/**
 * يفرض صلاحية محددة باستخدام نظام RBAC الجديد
 */
export async function ensurePerm(perm: string): Promise<SessionPayload> {
  const s = await ensureAuth();
  if (!(await sessionHasPermission(s, perm))) throw new Error("FORBIDDEN");
  return s;
}

/**
 * يفرض أيًا من الصلاحيات
 */
export async function ensureAnyPerm(perms: string[]): Promise<SessionPayload> {
  const s = await ensureAuth();
  for (const p of perms) {
    if (await sessionHasPermission(s, p)) return s;
  }
  throw new Error("FORBIDDEN");
}
