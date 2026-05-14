/**
 * /api/media — list + stats (admin)
 *
 * Each item is enriched with `usageCount`, the number of articles that
 * reference the file via:
 *   - articles.featured_media_id (FK to media.id), or
 *   - articles.featured_image_url == media.url, or
 *   - articles.og_image_url == media.url, or
 *   - articles.content_html embeds media.url
 */
import { db, media, users } from "@/lib/db";
import { eq, desc, sql, count, sum } from "drizzle-orm";
import { ok, fromError, ensurePerm } from "@/lib/api";

export async function GET() {
  try {
    await ensurePerm("media.view");

    const usageCountSql = sql<number>`(
      SELECT COUNT(*)::int FROM articles a
      WHERE a.featured_media_id = ${media.id}
         OR a.featured_image_url = ${media.url}
         OR a.og_image_url = ${media.url}
         OR a.content_html LIKE '%' || ${media.url} || '%'
    )`;

    const [items, statsRows] = await Promise.all([
      db
        .select({
          id: media.id,
          filename: media.filename,
          originalFilename: media.originalFilename,
          url: media.url,
          mimeType: media.mimeType,
          sizeBytes: media.sizeBytes,
          width: media.width,
          height: media.height,
          altText: media.altText,
          caption: media.caption,
          storageSource: media.storageSource,
          createdAt: media.createdAt,
          uploaderName: users.fullName,
          usageCount: usageCountSql,
        })
        .from(media)
        .leftJoin(users, eq(media.uploadedBy, users.id))
        .orderBy(desc(media.createdAt))
        .limit(500),

      db
        .select({
          storageSource: media.storageSource,
          fileCount: count(media.id),
          totalBytes: sum(media.sizeBytes),
        })
        .from(media)
        .groupBy(media.storageSource),
    ]);

    const stats = {
      total: items.length,
      totalBytes: statsRows.reduce((s, r) => s + Number(r.totalBytes ?? 0), 0),
      bySource: Object.fromEntries(
        statsRows.map((r) => [
          r.storageSource ?? "local",
          { count: Number(r.fileCount), bytes: Number(r.totalBytes ?? 0) },
        ])
      ),
    };

    return ok({ items, stats });
  } catch (e) {
    return fromError(e);
  }
}
