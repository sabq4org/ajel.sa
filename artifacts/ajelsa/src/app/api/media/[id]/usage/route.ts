/**
 * /api/media/[id]/usage — list articles that reference this media file
 *
 * Detects references via the featured_media_id FK or any URL-based usage
 * (featured_image_url, og_image_url, content_html).
 */
import { NextRequest } from "next/server";
import { db, media, articles } from "@/lib/db";
import { eq, or, sql, desc } from "drizzle-orm";
import { ok, fromError, ensurePerm, notFound } from "@/lib/api";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensurePerm("media.view");
    const { id } = await params;

    const [m] = await db
      .select({ id: media.id, url: media.url })
      .from(media)
      .where(eq(media.id, id))
      .limit(1);

    if (!m) return notFound("الملف غير موجود");

    const rows = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        status: articles.status,
        publishedAt: articles.publishedAt,
        usage: sql<string>`CASE
          WHEN ${articles.featuredMediaId} = ${m.id} THEN 'featured'
          WHEN ${articles.featuredImageUrl} = ${m.url} THEN 'featured'
          WHEN ${articles.ogImageUrl} = ${m.url} THEN 'og'
          ELSE 'content'
        END`,
      })
      .from(articles)
      .where(
        or(
          eq(articles.featuredMediaId, m.id),
          eq(articles.featuredImageUrl, m.url),
          eq(articles.ogImageUrl, m.url),
          sql`${articles.contentHtml} LIKE '%' || ${m.url} || '%'`
        )
      )
      .orderBy(desc(articles.publishedAt))
      .limit(200);

    return ok({
      url: m.url,
      total: rows.length,
      publishedCount: rows.filter((r) => r.status === "published").length,
      articles: rows,
    });
  } catch (e) {
    return fromError(e);
  }
}
