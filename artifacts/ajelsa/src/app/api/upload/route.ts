/**
 * /api/upload — Image upload (Cloudinary → Replit Object Storage → R2 → Local fallback)
 *
 * Hardening note: when ANY cloud destination is configured (Cloudinary, Object
 * Storage, or R2), the local-FS fallback is disabled. Configured destinations
 * are tried in order; if all of them fail, the handler returns a real error
 * instead of silently writing to disk and returning a `/uploads/...` URL that
 * doesn't resolve in production. The local-FS path is reachable only when no
 * cloud is configured at all (true dev-only mode).
 */

import { NextRequest, NextResponse } from "next/server";
import { uploadFile, isR2Configured } from "@/lib/storage";
import { uploadToCloudinary, isCloudinaryReady } from "@/lib/cloudinary";
import {
  uploadToObjectStorage,
  isObjectStorageReady,
  StorageQuotaError,
} from "@/lib/objectStorage";
import { db, media } from "@/lib/db";
import { requirePerm } from "@/lib/auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const QUOTA_EXCEEDED_AR =
  "مساحة التخزين وصلت للحد الأقصى. يرجى حذف ملفات قديمة أو التواصل مع المشرف.";

const STORAGE_FAILED_AR =
  "تعذّر حفظ الصورة، حاول مجدداً";

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm("media.upload");
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "ملف مطلوب" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "حجم الملف يتجاوز 10 ميجا" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "bin";

    let url: string | null = null;
    let key: string | null = null;
    const attempted: string[] = [];

    const cloudinaryReady = isCloudinaryReady();
    const objectStorageReady = isObjectStorageReady();
    const r2Ready = isR2Configured();
    const hasAnyCloud = cloudinaryReady || objectStorageReady || r2Ready;

    // ① Cloudinary
    if (cloudinaryReady) {
      attempted.push("Cloudinary");
      try {
        url = await uploadToCloudinary(buffer, "articles");
        key = url.split("/").slice(-2).join("/");
      } catch (e: unknown) {
        if (e instanceof StorageQuotaError) {
          return NextResponse.json({ error: QUOTA_EXCEEDED_AR }, { status: 507 });
        }
        console.error("[upload] Cloudinary upload failed:", (e as Error).message);
      }
    }

    // ② Replit Object Storage
    if (url === null && objectStorageReady) {
      attempted.push("Object Storage");
      try {
        url = await uploadToObjectStorage(buffer, file.type, file.name);
        key = url;
      } catch (e: unknown) {
        if (e instanceof StorageQuotaError) {
          return NextResponse.json({ error: QUOTA_EXCEEDED_AR }, { status: 507 });
        }
        console.error("[upload] Object Storage upload failed:", (e as Error).message);
      }
    }

    // ③ R2 (only if explicitly configured — uploadFile would otherwise silently
    // write to local FS, which we explicitly do not want when any cloud is set up)
    if (url === null && r2Ready) {
      attempted.push("R2");
      try {
        const result = await uploadFile(buffer, {
          folder: "articles",
          extension: ext,
          contentType: file.type,
        });
        url = result.url;
        key = result.key;
      } catch (e: unknown) {
        if (e instanceof StorageQuotaError) {
          return NextResponse.json({ error: QUOTA_EXCEEDED_AR }, { status: 507 });
        }
        console.error("[upload] R2 upload failed:", (e as Error).message);
      }
    }

    // ④ Local FS — ONLY when no cloud destination is configured at all.
    // This prevents silent fallbacks when a configured cloud destination fails:
    // returning a `/uploads/...` URL that doesn't resolve in production used to
    // mask the real failure (see Task #12).
    if (url === null && !hasAnyCloud) {
      const result = await uploadFile(buffer, {
        folder: "articles",
        extension: ext,
        contentType: file.type,
      });
      url = result.url;
      key = result.key;
    }

    if (url === null || key === null) {
      console.error(
        "[upload] All configured storage destinations failed.",
        `Tried: ${attempted.join(", ") || "(none)"}`,
      );
      return NextResponse.json(
        { error: STORAGE_FAILED_AR, code: "storage_unavailable" },
        { status: 503 },
      );
    }

    const storageSource = cloudinaryReady && url.includes("cloudinary")
      ? "cloudinary"
      : objectStorageReady && url.startsWith("/api/storage")
      ? "object_storage"
      : r2Ready && !url.startsWith("/uploads/")
      ? "r2"
      : "local";

    const [record] = await db
      .insert(media)
      .values({
        filename: key,
        originalFilename: file.name,
        url,
        mimeType: file.type,
        sizeBytes: file.size,
        storageSource,
        uploadedBy: session.userId,
      })
      .returning();

    return NextResponse.json({ media: record });
  } catch (err: unknown) {
    if (err instanceof StorageQuotaError) {
      return NextResponse.json({ error: QUOTA_EXCEEDED_AR }, { status: 507 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
