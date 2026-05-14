/**
 * Replit Object Storage upload helper
 * Calls the API server to get a presigned URL, uploads directly to GCS,
 * and returns the serving URL via /api/storage/objects/...
 */

/**
 * Structured error thrown when the storage quota is exceeded or the cloud
 * provider (GCS) reports a budget/quota failure. Using a class instead of
 * error-message matching allows callers to branch deterministically.
 */
export class StorageQuotaError extends Error {
  readonly status = 507 as const;
  readonly code = "storage_quota_exceeded" as const;

  constructor(message = "Storage quota exceeded") {
    super(message);
    this.name = "StorageQuotaError";
    Object.setPrototypeOf(this, StorageQuotaError.prototype);
  }
}

/**
 * Inspect a GCS error body (XML or JSON) and decide whether it represents a
 * quota / budget exhaustion error.
 *
 * GCS returns XML like:
 *   <Code>QuotaExceeded</Code>
 *   <Code>AccountDisabled</Code>   (billing suspended / budget cap hit)
 *   <Details>...</Details>
 *
 * It may also return JSON for some paths:
 *   { "error": { "code": 429, "status": "RESOURCE_EXHAUSTED" } }
 */
export function isGcsQuotaBody(body: string): boolean {
  const lower = body.toLowerCase();
  return (
    lower.includes("quotaexceeded") ||
    lower.includes("quota_exceeded") ||
    lower.includes("resource_exhausted") ||
    lower.includes("budgetexceeded") ||
    lower.includes("budget exceeded") ||
    lower.includes("accountdisabled") ||
    lower.includes("account disabled") ||
    lower.includes("storageusage") && lower.includes("exceeded") ||
    lower.includes("quota") && (lower.includes("exceeded") || lower.includes("limit"))
  );
}

export function isObjectStorageReady(): boolean {
  return !!process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
}

/**
 * Request a presigned URL from the API server, with brief retry on transient
 * network failures (e.g. fetch failed during an API-server restart) and 5xx
 * responses. Never retries on 4xx — those are deterministic (validation /
 * quota) and will never recover by retrying. 507 (quota exceeded) bypasses
 * retries by being thrown as `StorageQuotaError` immediately.
 */
async function requestPresignedUrlWithRetry(
  apiBase: string,
  fileName: string,
  size: number,
  contentType: string,
): Promise<Response> {
  const maxAttempts = 3; // initial + 2 retries
  const backoffMs = [150, 400];
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(`${apiBase}/storage/uploads/request-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fileName, size, contentType }),
      });

      // Retry only on 5xx; 4xx (incl. 507 quota) is deterministic.
      if (res.status >= 500 && res.status < 600 && attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, backoffMs[attempt] ?? 400));
        continue;
      }
      return res;
    } catch (e) {
      // Network-level failure (e.g. "fetch failed" during API restart).
      lastError = e;
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, backoffMs[attempt] ?? 400));
        continue;
      }
      throw lastError;
    }
  }
  // Unreachable, but satisfies TS.
  throw lastError ?? new Error("Failed to get presigned URL");
}

/**
 * Upload a buffer to Replit Object Storage via the API server presigned URL flow.
 * Briefly retries the presigned-URL request on transient network failures and
 * 5xx responses so a single API-server restart does not abort the whole upload.
 * @param buffer Image / file bytes
 * @param contentType MIME type (e.g. 'image/png')
 * @param fileName Original file name (used for metadata only)
 * @returns Serving URL (e.g. /api/storage/objects/uploads/uuid)
 * @throws StorageQuotaError when the site quota is exceeded or GCS reports a budget/quota failure
 */
export async function uploadToObjectStorage(
  buffer: Buffer,
  contentType: string,
  fileName = "upload"
): Promise<string> {
  // Internal server-to-server call. We hit the api-server directly on its
  // bound port (8080) instead of going through the shared proxy at port 80.
  // The proxy is reachable from outside the container, but in production
  // hosted deployments it has been observed to fail with "fetch failed"
  // for in-container requests. Both artifacts run in the same container
  // so localhost:8080 is always available and avoids the extra hop.
  const apiBase = process.env.INTERNAL_API_URL || "http://localhost:8080/api";

  const requestUrlRes = await requestPresignedUrlWithRetry(
    apiBase,
    fileName,
    buffer.length,
    contentType,
  );

  if (requestUrlRes.status === 507) {
    const body = await requestUrlRes.json().catch(() => ({})) as Record<string, string>;
    throw new StorageQuotaError(body.message || "Storage quota exceeded");
  }

  if (!requestUrlRes.ok) {
    const text = await requestUrlRes.text().catch(() => "");
    throw new Error(`Failed to get presigned URL (${requestUrlRes.status}): ${text.slice(0, 200)}`);
  }

  const presignedData = await requestUrlRes.json() as { uploadURL: string; objectPath: string; storageWarning?: string | null };
  const { uploadURL, objectPath, storageWarning } = presignedData;

  if (storageWarning === "quota_near_limit") {
    console.warn("[upload] Storage is near quota limit. Consider cleaning up old files.");
  }

  const uploadRes = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: new Uint8Array(buffer),
  });

  if (!uploadRes.ok) {
    const status = uploadRes.status;

    if (status === 429 || status === 507) {
      throw new StorageQuotaError(`GCS upload quota error (HTTP ${status})`);
    }

    if (status === 403) {
      const body = await uploadRes.text().catch(() => "");
      if (isGcsQuotaBody(body)) {
        throw new StorageQuotaError(`GCS budget/quota exceeded (HTTP 403): ${body.slice(0, 200)}`);
      }
      throw new Error(`GCS upload forbidden (HTTP 403): ${body.slice(0, 200)}`);
    }

    const body = await uploadRes.text().catch(() => "");
    if (isGcsQuotaBody(body)) {
      throw new StorageQuotaError(`GCS quota error (HTTP ${status})`);
    }

    throw new Error(`Failed to upload to GCS (${status})`);
  }

  return `/api/storage${objectPath}`;
}

/**
 * Fetch current Object Storage usage from the API server.
 * Returns null if the quota endpoint is unavailable.
 */
export async function fetchStorageQuota(): Promise<{
  usedBytes: number;
  maxBytes: number;
  fileCount: number;
  percentUsed: number;
  isNearLimit: boolean;
  isExceeded: boolean;
} | null> {
  try {
    const apiBase = process.env.INTERNAL_API_URL || "http://localhost:8080/api";
    const res = await fetch(`${apiBase}/storage/quota`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
