/**
 * Cloudinary uploader for AI-generated images
 * Falls back to Base64 data URL if Cloudinary is not configured
 */

import { v2 as cloudinary } from "cloudinary";

let configured = false;

function configure() {
  if (configured) return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    return;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  configured = true;
}

export function isCloudinaryReady(): boolean {
  configure();
  return configured;
}

/**
 * Optional resize/crop options for staff avatars, covers, and other
 * fixed-aspect uploads. Applied at upload time so the stored asset is
 * already the canonical size — public pages don't have to rely on
 * client-side cropping or runtime transformations.
 */
export type CloudinaryTransform = {
  /** Target width in pixels */
  width?: number;
  /** Target height in pixels */
  height?: number;
  /** Cloudinary crop mode (e.g. "fill", "fit", "thumb") */
  crop?: "fill" | "fit" | "limit" | "thumb" | "scale";
  /** Where to focus the crop (e.g. "face", "auto", "center") */
  gravity?: "face" | "faces" | "auto" | "center";
};

/**
 * Upload an image buffer to Cloudinary.
 *
 * @param buffer  Image bytes
 * @param folder  Subfolder. The `ai-generated` folder gets a special preset
 *                tuned for editorial featured images (WebP @ 90, capped at
 *                1920px wide, progressive). Other folders (e.g. staff avatars
 *                and covers) keep the existing behaviour and are unaffected.
 * @param transform  Optional resize/crop applied before storage. Used by
 *   the staff feature to enforce canonical dimensions:
 *     - avatars → 400×400 fill, face gravity
 *     - covers  → 1500×500 fill, auto gravity
 * @returns Secure HTTPS URL of the uploaded image
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  folder = "ai-generated",
  transform?: CloudinaryTransform
): Promise<string> {
  configure();

  if (!configured) {
    throw new Error("Cloudinary غير مهيأ — أضف المفاتيح في Vercel");
  }

  const isAiGenerated = folder === "ai-generated";

  // AI-generated images get a tuned transform: cap at 1920px wide using
  // `crop: "limit"` (so smaller images aren't upscaled), encode as WebP at
  // quality 90, and enable progressive loading. This keeps file sizes small
  // without sacrificing the perceived quality of an editorial featured photo.
  //
  // Explicit caller-supplied transforms (used by avatars/covers) always win.
  const aiTransform = isAiGenerated && !transform
    ? [
        {
          width: 1920,
          crop: "limit",
          quality: 90,
          fetch_format: "auto",
          flags: "progressive",
        },
      ]
    : undefined;

  const explicitTransform = transform
    ? [
        {
          ...(transform.width ? { width: transform.width } : {}),
          ...(transform.height ? { height: transform.height } : {}),
          ...(transform.crop ? { crop: transform.crop } : {}),
          ...(transform.gravity ? { gravity: transform.gravity } : {}),
        },
      ]
    : undefined;

  const transformation = explicitTransform ?? aiTransform;

  // For AI-generated images we want WebP at quality 90. For other uploads
  // we keep the previous "auto:good" behaviour so staff avatars/covers and
  // anything else aren't accidentally re-encoded differently.
  const uploadOptions: Record<string, unknown> = {
    folder: `ajelsa/${folder}`,
    resource_type: "image",
    format: "webp",
    fetch_format: "auto",
    quality: isAiGenerated ? 90 : "auto:good",
    ...(transformation ? { transformation } : {}),
  };

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(uploadOptions, (error, result) => {
        if (error || !result) {
          reject(error || new Error("Upload failed"));
          return;
        }
        resolve(result.secure_url);
      })
      .end(buffer);
  });
}
