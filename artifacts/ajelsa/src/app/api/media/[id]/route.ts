/**
 * /api/media/[id] — delete (supports Object Storage, Cloudinary, local)
 *
 * Refuses to delete when an article still references the media row,
 * unless the caller passes ?force=true. Linked articles are detected via:
 *   - articles.featured_media_id  (FK; preferred, survives URL re-renders)
 *   - articles.featured_image_url == media.url
 *   - articles.og_image_url == media.url
 *   - articles.content_html LIKE '%media.url%'
 *
 * On force-delete the FK (ON DELETE SET NULL) clears featured_media_id; we
 * also clear the cached featured_image_url so we don't keep a stale link.
 *
 * The 409 response includes the full linked article list and a
 * publishedCount summary so the UI can render an appropriate warning.
 */
import { NextRequest, NextResponse } from "next/server";
import { db, media, articles } from "@/lib/db";
import { eq, or, sql } from "drizzle-orm";
import { noContent, fromError, ensurePerm, notFound } from "@/lib/api";
import { deleteFile } from "@/lib/storage";

async function deleteFromObjectStorage(filename: string) {
  // Direct in-container call to api-server's bound port (8080), bypassing
  // the shared proxy. See artifacts/ajelsa/src/lib/objectStorage.ts for
  // the rationale.
  //
  // The api-server DELETE route is gated behind the shared SESSION_SECRET
  // (X-Internal-Token header) so external callers can't delete arbitrary
  // objects. Both artifacts run in the same container and share env vars.
  const apiBase = process.env.INTERNAL_API_URL || "http://localhost:8080/api";
  const internalToken = process.env.SESSION_SECRET;
  if (!internalToken) {
    throw new Error("SESSION_SECRET missing — cannot authorize internal storage delete");
  }
  const path = filename.startsWith("/api/storage")
    ? filename.replace("/api/storage", "")
    : filename;
  const res = await fetch(`${apiBase}/storage${path}`, {
    method: "DELETE",
    headers: { "X-Internal-Token": internalToken },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Object Storage delete failed: ${res.status}`);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensurePerm("media.delete");
    const { id } = await params;
    const force = req.nextUrl.searchParams.get("force") === "true";

    const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1);
    if (!row) return notFound("الملف غير موجود");

    // Find every article that still references this media (FK or URL).
    const linked = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        status: articles.status,
        publishedAt: articles.publishedAt,
      })
      .from(articles)
      .where(
        or(
          eq(articles.featuredMediaId, id),
          eq(articles.featuredImageUrl, row.url),
          eq(articles.ogImageUrl, row.url),
          sql`${articles.contentHtml} LIKE '%' || ${row.url} || '%'`
        )
      )
      .limit(100);

    if (linked.length > 0 && !force) {
      const publishedCount = linked.filter((a) => a.status === "published").length;
      const message =
        publishedCount > 0
          ? `هذا الملف مستخدم في ${publishedCount} خبر منشور. أعد تأكيد الحذف لإزالته.`
          : `هذا الملف مستخدم في ${linked.length} ${
              linked.length === 1 ? "خبر" : "أخبار"
            }. أعد تأكيد الحذف لإزالته.`;

      return NextResponse.json(
        {
          error: message,
          code: "MEDIA_IN_USE",
          articles: linked,
          publishedCount,
          referencingArticles: linked, // backwards-compat alias
        },
        { status: 409 }
      );
    }

    // Force-delete: clear cached URL on articles whose featured image points at
    // this row. The FK ON DELETE SET NULL clears featured_media_id automatically.
    if (force && linked.length > 0) {
      await db
        .update(articles)
        .set({ featuredImageUrl: null })
        .where(
          or(
            eq(articles.featuredMediaId, id),
            eq(articles.featuredImageUrl, row.url)
          )
        );
    }

    try {
      if (row.storageSource === "object_storage") {
        await deleteFromObjectStorage(row.filename);
      } else if (row.storageSource !== "cloudinary") {
        await deleteFile(row.filename);
      }
    } catch {}

    await db.delete(media).where(eq(media.id, id));
    return noContent();
  } catch (e) {
    return fromError(e);
  }
}
