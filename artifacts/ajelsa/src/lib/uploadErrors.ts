/**
 * Shared helper for surfacing /api/upload failures in the admin UI.
 *
 * The upload route returns Arabic error messages directly in the response
 * body, so the UI mostly needs to read them and map a few common conditions
 * (network failures, oversize files, cloud storage outages) to user-friendly
 * toasts. Mirrors the pattern already used for /api/ai/generate-image
 * (`saveAndReturn` returns 503 with code "storage_unavailable" and the UI
 * shows `toast.error(err.error)`).
 */

const FALLBACK_AR = "تعذّر رفع الصورة، حاول مجدداً";
const NETWORK_AR = "تعذّر الاتصال بالخادم، تحقق من الإنترنت وحاول مجدداً";
const OVERSIZE_AR = "حجم الملف يتجاوز 10 ميجا";

export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

/**
 * Parse a non-OK Response from /api/upload and return the most specific
 * Arabic error message we can derive.
 */
export async function readUploadErrorMessage(res: Response): Promise<string> {
  let body: { error?: unknown; code?: unknown } | null = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  const serverMsg =
    body && typeof body.error === "string" && body.error.trim().length > 0
      ? body.error
      : null;
  if (serverMsg) return serverMsg;

  if (res.status === 413) return OVERSIZE_AR;
  if (res.status === 401 || res.status === 403)
    return "ليس لديك صلاحية رفع الصور";
  if (res.status === 503) return "تخزين الصور غير متاح حالياً";
  if (res.status === 507) return "مساحة التخزين وصلت للحد الأقصى";

  return FALLBACK_AR;
}

/**
 * Map a thrown error from `fetch("/api/upload")` (e.g. network failure,
 * abort) to an Arabic toast message.
 */
export function readUploadThrownMessage(err: unknown): string {
  if (err instanceof TypeError) return NETWORK_AR;
  if (err instanceof Error && err.message) return err.message;
  return FALLBACK_AR;
}

/**
 * Client-side guard so we surface oversize files before sending megabytes
 * over the wire just to be rejected with a 400.
 */
export function checkUploadSize(file: File): string | null {
  if (file.size > UPLOAD_MAX_BYTES) return OVERSIZE_AR;
  return null;
}
