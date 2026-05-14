/**
 * Featured-image resolver
 *
 * Articles store both `featuredMediaId` (FK -> media.id) and `featuredImageUrl`
 * (denormalized cache + legacy/external URL fallback). This helper turns the
 * client's intent into the canonical pair to write to the DB.
 *
 * Intent semantics — `apply` is true when a field was *present* in the request
 * body (even if explicitly null). When neither field is present we leave the
 * article's image untouched (this prevents the silent overwrite that happens
 * when an editor saves an article after only changing, e.g. the category).
 */

import { db, media } from "@/lib/db";
import { eq } from "drizzle-orm";

export type FeaturedImageInput = {
  /** present in body if true (explicit null counts as present) */
  hasMediaId: boolean;
  mediaId: string | null | undefined;
  hasUrl: boolean;
  url: string | null | undefined;
};

export type FeaturedImageWrite = {
  apply: boolean;
  featuredMediaId: string | null;
  featuredImageUrl: string | null;
};

export async function resolveFeaturedImage(
  input: FeaturedImageInput
): Promise<FeaturedImageWrite> {
  if (!input.hasMediaId && !input.hasUrl) {
    return { apply: false, featuredMediaId: null, featuredImageUrl: null };
  }

  // Explicit clear: either field sent as null/empty AND no other source.
  const wantsClear =
    (input.hasMediaId && !input.mediaId) &&
    (!input.hasUrl || !input.url);

  if (wantsClear) {
    return { apply: true, featuredMediaId: null, featuredImageUrl: null };
  }

  // If a media id was supplied, look it up to get the canonical URL.
  if (input.mediaId) {
    const [row] = await db
      .select({ id: media.id, url: media.url })
      .from(media)
      .where(eq(media.id, input.mediaId))
      .limit(1);

    if (!row) {
      throw new Error("FEATURED_MEDIA_NOT_FOUND");
    }

    return {
      apply: true,
      featuredMediaId: row.id,
      // prefer the URL the client sent (for cache-busting variants), else canonical media URL
      featuredImageUrl: input.url || row.url,
    };
  }

  // URL only — legacy / external / AI-generated images that aren't in the media library.
  return {
    apply: true,
    featuredMediaId: null,
    featuredImageUrl: input.url ?? null,
  };
}

/**
 * Convenience: read presence flags from a raw JSON body and resolve in one call.
 */
export async function resolveFromBody(
  rawBody: Record<string, unknown>
): Promise<FeaturedImageWrite> {
  return resolveFeaturedImage({
    hasMediaId: Object.prototype.hasOwnProperty.call(rawBody, "featuredMediaId"),
    mediaId: rawBody.featuredMediaId as string | null | undefined,
    hasUrl: Object.prototype.hasOwnProperty.call(rawBody, "featuredImageUrl"),
    url: rawBody.featuredImageUrl as string | null | undefined,
  });
}
