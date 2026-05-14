/**
 * Aggregated storage health for the admin UI.
 *
 * The AI image generator (and media uploads in general) tries providers in
 * order: Cloudinary → Replit Object Storage → Cloudflare R2. This helper
 * mirrors that priority and returns a single overall status so editors can
 * be warned before they click "توليد صورة" rather than after it fails.
 *
 * Status semantics:
 *   - healthy:     At least one provider is fully usable for new uploads.
 *   - degraded:    Uploads are still possible but the only / primary
 *                  destination is near its quota limit.
 *   - unavailable: No provider can accept new uploads right now (none
 *                  configured, or the only configured provider is exceeded).
 */

import { fetchStorageQuota, isObjectStorageReady } from "./objectStorage";
import { isCloudinaryReady } from "./cloudinary";

export type StorageStatus = "healthy" | "degraded" | "unavailable";

export interface StorageProviderStatus {
  configured: boolean;
  /** Optional usage info — only Object Storage exposes this today. */
  usedBytes?: number;
  maxBytes?: number;
  fileCount?: number;
  percentUsed?: number;
  isNearLimit?: boolean;
  isExceeded?: boolean;
}

export interface StorageHealth {
  status: StorageStatus;
  /** True iff at least one provider can currently accept new uploads. */
  canUpload: boolean;
  message: string;
  providers: {
    cloudinary: StorageProviderStatus;
    objectStorage: StorageProviderStatus;
    r2: StorageProviderStatus;
  };
}

function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}

export async function getStorageHealth(): Promise<StorageHealth> {
  const cloudinaryConfigured = isCloudinaryReady();
  const objectStorageConfigured = isObjectStorageReady();
  const r2Configured = isR2Configured();

  // Only Object Storage exposes a programmatic quota endpoint; query it only
  // if it's actually configured to avoid noisy 5xx logs in unconfigured envs.
  const quota = objectStorageConfigured ? await fetchStorageQuota() : null;

  const objectStorage: StorageProviderStatus = {
    configured: objectStorageConfigured,
    ...(quota
      ? {
          usedBytes: quota.usedBytes,
          maxBytes: quota.maxBytes,
          fileCount: quota.fileCount,
          percentUsed: quota.percentUsed,
          isNearLimit: quota.isNearLimit,
          isExceeded: quota.isExceeded,
        }
      : {}),
  };

  const cloudinary: StorageProviderStatus = { configured: cloudinaryConfigured };
  const r2: StorageProviderStatus = { configured: r2Configured };

  // A provider is "usable" if it's configured AND not known to be exceeded.
  // For Cloudinary and R2 we don't have a quota signal, so configured == usable.
  const cloudinaryUsable = cloudinaryConfigured;
  const objectStorageUsable =
    objectStorageConfigured && !(quota?.isExceeded ?? false);
  const r2Usable = r2Configured;

  const usableCount =
    (cloudinaryUsable ? 1 : 0) +
    (objectStorageUsable ? 1 : 0) +
    (r2Usable ? 1 : 0);

  const canUpload = usableCount > 0;

  let status: StorageStatus;
  let message: string;

  if (!canUpload) {
    status = "unavailable";
    if (
      !cloudinaryConfigured &&
      !objectStorageConfigured &&
      !r2Configured
    ) {
      message = "لا يوجد مخزن صور مُهيّأ. أضف مفاتيح Cloudinary أو R2 لتفعيل رفع الصور.";
    } else if (objectStorageConfigured && quota?.isExceeded) {
      message = "مساحة التخزين ممتلئة. لن يتم حفظ الصور الجديدة حتى يتم تحرير مساحة أو إضافة مزود بديل.";
    } else {
      message = "تعذّر الوصول لأي مزود تخزين. تواصل مع الدعم الفني.";
    }
  } else {
    // Determine if we're degraded: only Object Storage usable AND near limit,
    // OR Object Storage near limit and no full-fallback (Cloudinary/R2) exists.
    const hasUnboundedFallback = cloudinaryUsable || r2Usable;
    const osNearLimit =
      objectStorageUsable && (quota?.isNearLimit ?? false);

    if (osNearLimit && !hasUnboundedFallback) {
      status = "degraded";
      const pct = Math.round(quota?.percentUsed ?? 0);
      message = `مساحة Object Storage على وشك الامتلاء (${pct}%). يُنصح بتحرير مساحة أو إضافة Cloudinary/R2 كاحتياط.`;
    } else {
      status = "healthy";
      message = "جميع مزودات التخزين تعمل بشكل طبيعي.";
    }
  }

  return {
    status,
    canUpload,
    message,
    providers: { cloudinary, objectStorage, r2 },
  };
}
