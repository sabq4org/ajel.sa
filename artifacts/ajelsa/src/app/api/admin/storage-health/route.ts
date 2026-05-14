/**
 * GET /api/admin/storage-health
 *
 * Aggregated health of the image storage providers (Cloudinary, Replit
 * Object Storage, R2) so the admin UI can warn editors *before* they try
 * to upload or generate an image.
 */

import { NextResponse } from "next/server";
import { getStorageHealth } from "@/lib/storageHealth";

// Always evaluate at request time — quota changes as files are uploaded.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const health = await getStorageHealth();
    return NextResponse.json(health, {
      headers: {
        // Allow the client to cache briefly to avoid stampedes when many
        // admin pages mount the badge at once, but stay fresh enough that
        // an outage shows up within a minute.
        "Cache-Control": "private, max-age=30, stale-while-revalidate=30",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        status: "unavailable",
        canUpload: false,
        message: "تعذّر التحقق من حالة التخزين",
        providers: {
          cloudinary: { configured: false },
          objectStorage: { configured: false },
          r2: { configured: false },
        },
        error: e?.message ?? "unknown",
      },
      { status: 200 } // Surface as a status, not an HTTP error.
    );
  }
}
