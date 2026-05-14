/**
 * Shared upload chain helper.
 *
 * Mirrors the Cloudinary → Object Storage → R2 → local-FS fallback used by
 * /api/upload, but exposes it as a callable function so other server-side
 * routes (e.g. /api/staff/[id]/avatar, /api/staff/[id]/cover) can reuse the
 * exact same destination chain instead of hard-coding a single provider.
 *
 * Hardening note: when ANY cloud destination is configured (Cloudinary,
 * Object Storage, or R2), the local-FS fallback is disabled so a configured
 * cloud failure cannot silently degrade to a `/uploads/...` URL that won't
 * resolve in production.
 *
 * Cloudinary transforms (e.g. canonical avatar/cover crops) are applied
 * only when Cloudinary is the chosen destination — Object Storage and R2
 * store the buffer as-is. Callers that depend on a specific transform should
 * pre-process the buffer themselves if Cloudinary may not be configured.
 */
import { uploadFile, isR2Configured } from "@/lib/storage";
import {
  uploadToCloudinary,
  isCloudinaryReady,
  type CloudinaryTransform,
} from "@/lib/cloudinary";
import {
  uploadToObjectStorage,
  isObjectStorageReady,
  StorageQuotaError,
} from "@/lib/objectStorage";

export type UploadSource = "cloudinary" | "object_storage" | "r2" | "local";

export type UploadChainResult = {
  url: string;
  key: string;
  source: UploadSource;
};

export type UploadChainInput = {
  buffer: Buffer;
  contentType: string;
  fileName: string;
  /** Logical folder used by Cloudinary / R2 (e.g. "staff/avatars"). */
  folder: string;
  /** Optional Cloudinary-only transform (resize/crop). */
  cloudinaryTransform?: CloudinaryTransform;
};

/**
 * Try each configured destination in order and return the first successful
 * upload. Re-throws StorageQuotaError immediately so the caller can surface
 * a 507 to the client. Returns null if every configured destination failed.
 */
export async function uploadWithFallback(
  input: UploadChainInput,
): Promise<UploadChainResult | null> {
  const { buffer, contentType, fileName, folder, cloudinaryTransform } = input;
  const ext = fileName.includes(".")
    ? fileName.split(".").pop() || "bin"
    : "bin";

  const cloudinaryReady = isCloudinaryReady();
  const objectStorageReady = isObjectStorageReady();
  const r2Ready = isR2Configured();
  const hasAnyCloud = cloudinaryReady || objectStorageReady || r2Ready;

  const attempted: string[] = [];

  // ① Cloudinary (with optional transform)
  if (cloudinaryReady) {
    attempted.push("Cloudinary");
    try {
      const url = await uploadToCloudinary(buffer, folder, cloudinaryTransform);
      return { url, key: url.split("/").slice(-2).join("/"), source: "cloudinary" };
    } catch (e) {
      if (e instanceof StorageQuotaError) throw e;
      console.error("[uploadChain] Cloudinary failed:", (e as Error).message);
    }
  }

  // ② Replit Object Storage (no transform — stores as-is)
  if (objectStorageReady) {
    attempted.push("Object Storage");
    try {
      const url = await uploadToObjectStorage(buffer, contentType, fileName);
      return { url, key: url, source: "object_storage" };
    } catch (e) {
      if (e instanceof StorageQuotaError) throw e;
      console.error("[uploadChain] Object Storage failed:", (e as Error).message);
    }
  }

  // ③ R2 (only when explicitly configured)
  if (r2Ready) {
    attempted.push("R2");
    try {
      const result = await uploadFile(buffer, {
        folder,
        extension: ext,
        contentType,
      });
      return { url: result.url, key: result.key, source: "r2" };
    } catch (e) {
      if (e instanceof StorageQuotaError) throw e;
      console.error("[uploadChain] R2 failed:", (e as Error).message);
    }
  }

  // ④ Local FS — ONLY when no cloud destination is configured at all.
  if (!hasAnyCloud) {
    const result = await uploadFile(buffer, {
      folder,
      extension: ext,
      contentType,
    });
    return { url: result.url, key: result.key, source: "local" };
  }

  console.error(
    "[uploadChain] All configured destinations failed.",
    `Tried: ${attempted.join(", ") || "(none)"}`,
  );
  return null;
}
