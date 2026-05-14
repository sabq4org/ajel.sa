/**
 * Cloudflare R2 (S3-compatible) — Media uploads
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials not set");
  }

  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return _client;
}

const BUCKET = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

export function isR2Configured() {
  return !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME);
}

async function uploadToFs(buffer: Buffer | Uint8Array, key: string): Promise<string> {
  // Fallback for dev/no-R2: store under public/uploads
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const fullPath = path.join(process.cwd(), "public", "uploads", key);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer as Buffer);
  return `/uploads/${key}`;
}

export async function uploadFile(
  buffer: Buffer | Uint8Array,
  options: {
    folder?: string;
    extension?: string;
    contentType?: string;
  } = {}
): Promise<{ key: string; url: string }> {
  const folder = options.folder ?? "uploads";
  const ext = options.extension?.replace(/^\./, "") ?? "bin";
  const key = `${folder}/${new Date().toISOString().slice(0, 7)}/${nanoid(16)}.${ext}`;

  if (!isR2Configured()) {
    const url = await uploadToFs(buffer, key);
    return { key, url };
  }

  await getClient().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: options.contentType,
    })
  );

  return {
    key,
    url: `${PUBLIC_URL}/${key}`,
  };
}

export async function deleteFile(key: string): Promise<void> {
  if (!isR2Configured()) {
    try {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      await fs.unlink(path.join(process.cwd(), "public", "uploads", key));
    } catch {}
    return;
  }
  await getClient().send(
    new DeleteObjectCommand({ Bucket: BUCKET, Key: key })
  );
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 60 * 5
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(getClient(), command, { expiresIn });
}
