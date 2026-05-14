/**
 * Opinion queries — Public-facing reads for مقالات الرأي
 *
 * All helpers in this module are defensive: if the DB is unreachable or
 * the query throws for any reason, they log and return a safe empty/null
 * value instead of bubbling the error up to the request handler. The
 * public surfaces (homepage section, /opinions, author profile, opinion
 * detail) must continue to render even when the DB is degraded.
 */

import { db, authors, opinionArticles } from "@/lib/db";
import { eq, and, desc, sql, isNotNull, gte } from "drizzle-orm";

export type OpinionListItem = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  featuredImageUrl: string | null;
  publishedAt: Date | null;
  viewCount: number;
  readingTimeMinutes: number | null;
  author: {
    id: string;
    slug: string;
    fullName: string;
    position: string | null;
    avatarUrl: string | null;
    shortBio: string | null;
  };
};

const OPINION_PUBLISHED_FILTER = and(
  eq(opinionArticles.status, "published"),
  isNotNull(opinionArticles.publishedAt)
);

const OPINION_HOME_FILTER = and(
  OPINION_PUBLISHED_FILTER,
  eq(opinionArticles.excludeFromHome, false)
);

const publicOpinionImageUrl = sql<string | null>`
  CASE
    WHEN ${opinionArticles.featuredImageUrl} LIKE 'data:%' THEN NULL
    ELSE ${opinionArticles.featuredImageUrl}
  END
`;

function stripInlineImage<T extends { featuredImageUrl?: string | null }>(row: T): T {
  if (row.featuredImageUrl?.startsWith("data:")) {
    return { ...row, featuredImageUrl: null };
  }
  return row;
}

const baseSelect = {
  id: opinionArticles.id,
  slug: opinionArticles.slug,
  title: opinionArticles.title,
  subtitle: opinionArticles.subtitle,
  excerpt: opinionArticles.excerpt,
  featuredImageUrl: publicOpinionImageUrl,
  publishedAt: opinionArticles.publishedAt,
  viewCount: opinionArticles.viewCount,
  readingTimeMinutes: opinionArticles.readingTimeMinutes,
  author: {
    id: authors.id,
    slug: authors.slug,
    fullName: authors.fullName,
    position: authors.position,
    avatarUrl: authors.avatarUrl,
    shortBio: authors.shortBio,
  },
};

/**
 * Run a DB query and swallow any error, returning `fallback` instead.
 * Errors are logged once with the helper name so we still get visibility
 * via the standard logger pipeline.
 */
async function safe<T>(name: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[opinions] ${name} failed; returning fallback`, err);
    return fallback;
  }
}

/** أحدث مقالات الرأي المنشورة */
export async function getLatestOpinions(limit = 8): Promise<OpinionListItem[]> {
  return safe(
    "getLatestOpinions",
    () =>
      db
        .select(baseSelect)
        .from(opinionArticles)
        .innerJoin(authors, eq(opinionArticles.authorId, authors.id))
        .where(OPINION_HOME_FILTER)
        .orderBy(desc(opinionArticles.publishedAt))
        .limit(limit) as unknown as Promise<OpinionListItem[]>,
    []
  );
}

/** كل مقالات الرأي مع تقسيم صفحات (لصفحة /opinions) */
export async function getAllOpinions(limit = 24, offset = 0): Promise<OpinionListItem[]> {
  return safe(
    "getAllOpinions",
    () =>
      db
        .select(baseSelect)
        .from(opinionArticles)
        .innerJoin(authors, eq(opinionArticles.authorId, authors.id))
        .where(OPINION_PUBLISHED_FILTER)
        .orderBy(desc(opinionArticles.publishedAt))
        .limit(limit)
        .offset(offset) as unknown as Promise<OpinionListItem[]>,
    []
  );
}

/** مقال رأي بالـ slug */
export async function getOpinionBySlug(slug: string) {
  return safe(
    "getOpinionBySlug",
    async () => {
      const [row] = await db
        .select({
          opinion: opinionArticles,
          author: authors,
        })
        .from(opinionArticles)
        .innerJoin(authors, eq(opinionArticles.authorId, authors.id))
        .where(and(eq(opinionArticles.slug, slug), eq(opinionArticles.status, "published")))
        .limit(1);

      if (!row?.opinion) return null;
      return { ...row, opinion: stripInlineImage(row.opinion) };
    },
    null as null | { opinion: typeof opinionArticles.$inferSelect; author: typeof authors.$inferSelect },
  );
}

/** كاتب الرأي بالـ slug */
export async function getAuthorBySlug(slug: string) {
  return safe(
    "getAuthorBySlug",
    async () => {
      const [row] = await db
        .select()
        .from(authors)
        .where(and(eq(authors.slug, slug), eq(authors.isActive, true)))
        .limit(1);
      return row ?? null;
    },
    null as null | typeof authors.$inferSelect
  );
}

/** مقالات كاتب معيّن (منشورة فقط) */
export async function getAuthorOpinions(
  authorId: string,
  limit = 24,
  offset = 0
): Promise<OpinionListItem[]> {
  return safe(
    "getAuthorOpinions",
    () =>
      db
        .select(baseSelect)
        .from(opinionArticles)
        .innerJoin(authors, eq(opinionArticles.authorId, authors.id))
        .where(and(eq(opinionArticles.authorId, authorId), OPINION_PUBLISHED_FILTER))
        .orderBy(desc(opinionArticles.publishedAt))
        .limit(limit)
        .offset(offset) as unknown as Promise<OpinionListItem[]>,
    []
  );
}

/** كل الكتّاب النشطين (لصفحات الإدارة العامة + الـ sitemap) */
export async function getActiveAuthors() {
  return safe(
    "getActiveAuthors",
    () =>
      db
        .select()
        .from(authors)
        .where(eq(authors.isActive, true))
        .orderBy(authors.fullName),
    [] as Array<typeof authors.$inferSelect>
  );
}

/** عدّ كل المقالات المنشورة (للـ pagination) */
export async function countPublishedOpinions(): Promise<number> {
  return safe(
    "countPublishedOpinions",
    async () => {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(opinionArticles)
        .where(OPINION_PUBLISHED_FILTER);
      return count;
    },
    0
  );
}

/** عدّ مقالات كاتب معيّن (للـ pagination في صفحة الكاتب) */
export async function countAuthorOpinions(authorId: string): Promise<number> {
  return safe(
    "countAuthorOpinions",
    async () => {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(opinionArticles)
        .where(and(eq(opinionArticles.authorId, authorId), OPINION_PUBLISHED_FILTER));
      return count;
    },
    0
  );
}

/** أهم الكتّاب حسب عدد المقالات المنشورة + إجمالي المشاهدات */
export type TopAuthorStat = {
  id: string;
  slug: string;
  fullName: string;
  position: string | null;
  avatarUrl: string | null;
  opinionCount: number;
  totalViews: number;
};
export async function getTopAuthors(limit = 5): Promise<TopAuthorStat[]> {
  return safe(
    "getTopAuthors",
    async () => {
      const rows = await db
        .select({
          id: authors.id,
          slug: authors.slug,
          fullName: authors.fullName,
          position: authors.position,
          avatarUrl: authors.avatarUrl,
          opinionCount: sql<number>`COUNT(${opinionArticles.id})::int`,
          totalViews: sql<number>`COALESCE(SUM(${opinionArticles.viewCount}), 0)::int`,
        })
        .from(authors)
        .leftJoin(
          opinionArticles,
          and(
            eq(opinionArticles.authorId, authors.id),
            eq(opinionArticles.status, "published"),
            isNotNull(opinionArticles.publishedAt)
          )
        )
        .where(eq(authors.isActive, true))
        .groupBy(authors.id)
        .orderBy(sql`COUNT(${opinionArticles.id}) DESC, COALESCE(SUM(${opinionArticles.viewCount}), 0) DESC`)
        .limit(limit);
      return rows.filter((r) => r.opinionCount > 0);
    },
    [] as TopAuthorStat[]
  );
}

/**
 * كاتب الأسبوع — most-viewed columnist over the last 7 days.
 *
 * Aggregates view counts only across opinions that were *published* in
 * the last 7 days, then picks the author with the highest total. Falls
 * back to most-viewed-overall (top of getTopAuthors-by-views) if no
 * author has any qualifying piece this week, so the page always has a
 * featured slot to render.
 */
export type FeaturedAuthorStat = TopAuthorStat & {
  recentViews: number;
  recentCount: number;
};
export async function getFeaturedAuthor(): Promise<FeaturedAuthorStat | null> {
  return safe(
    "getFeaturedAuthor",
    async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recent = await db
        .select({
          id: authors.id,
          slug: authors.slug,
          fullName: authors.fullName,
          position: authors.position,
          avatarUrl: authors.avatarUrl,
          recentViews: sql<number>`COALESCE(SUM(${opinionArticles.viewCount}), 0)::int`,
          recentCount: sql<number>`COUNT(${opinionArticles.id})::int`,
          opinionCount: sql<number>`COUNT(${opinionArticles.id})::int`,
          totalViews: sql<number>`COALESCE(SUM(${opinionArticles.viewCount}), 0)::int`,
        })
        .from(authors)
        .innerJoin(
          opinionArticles,
          and(
            eq(opinionArticles.authorId, authors.id),
            eq(opinionArticles.status, "published"),
            isNotNull(opinionArticles.publishedAt),
            gte(opinionArticles.publishedAt, since)
          )
        )
        .where(eq(authors.isActive, true))
        .groupBy(authors.id)
        .orderBy(
          sql`COALESCE(SUM(${opinionArticles.viewCount}), 0) DESC, COUNT(${opinionArticles.id}) DESC`
        )
        .limit(1);

      if (recent[0]) return recent[0] as FeaturedAuthorStat;

      // Fallback: lifetime most-viewed columnist with at least one
      // published piece. Keeps the hero slot populated even on a quiet week.
      const lifetime = await db
        .select({
          id: authors.id,
          slug: authors.slug,
          fullName: authors.fullName,
          position: authors.position,
          avatarUrl: authors.avatarUrl,
          opinionCount: sql<number>`COUNT(${opinionArticles.id})::int`,
          totalViews: sql<number>`COALESCE(SUM(${opinionArticles.viewCount}), 0)::int`,
        })
        .from(authors)
        .innerJoin(
          opinionArticles,
          and(
            eq(opinionArticles.authorId, authors.id),
            eq(opinionArticles.status, "published"),
            isNotNull(opinionArticles.publishedAt)
          )
        )
        .where(eq(authors.isActive, true))
        .groupBy(authors.id)
        .orderBy(
          sql`COALESCE(SUM(${opinionArticles.viewCount}), 0) DESC, COUNT(${opinionArticles.id}) DESC`
        )
        .limit(1);

      const f = lifetime[0];
      return f
        ? ({ ...f, recentViews: 0, recentCount: 0 } as FeaturedAuthorStat)
        : null;
    },
    null as FeaturedAuthorStat | null
  );
}

/**
 * الأكثر قراءة — top columnists ranked by total opinion views in the last
 * 7 days. Falls back to all-time totals if no opinion has been published
 * (or read) in the trailing week, so the widget is rarely empty.
 *
 * Returns at most `limit` rows; only authors with at least one published
 * piece in the chosen window are included. Defensive: any DB failure
 * yields an empty array so the page still renders.
 */
export type MostReadAuthor = {
  id: string;
  slug: string;
  fullName: string;
  position: string | null;
  avatarUrl: string | null;
  totalViews: number;
  windowDays: 7 | null;
};
export async function getMostReadAuthors(limit = 5): Promise<MostReadAuthor[]> {
  return safe(
    "getMostReadAuthors",
    async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const recent = await db
        .select({
          id: authors.id,
          slug: authors.slug,
          fullName: authors.fullName,
          position: authors.position,
          avatarUrl: authors.avatarUrl,
          totalViews: sql<number>`COALESCE(SUM(${opinionArticles.viewCount}), 0)::int`,
        })
        .from(authors)
        .innerJoin(
          opinionArticles,
          and(
            eq(opinionArticles.authorId, authors.id),
            eq(opinionArticles.status, "published"),
            isNotNull(opinionArticles.publishedAt),
            gte(opinionArticles.publishedAt, since)
          )
        )
        .where(eq(authors.isActive, true))
        .groupBy(authors.id)
        .orderBy(sql`COALESCE(SUM(${opinionArticles.viewCount}), 0) DESC`)
        .limit(limit);

      const recentRanked = recent.filter((r) => r.totalViews > 0);
      if (recentRanked.length > 0) {
        return recentRanked.map((r) => ({ ...r, windowDays: 7 as const }));
      }

      // Fallback — all-time view totals so the widget still has content.
      const lifetime = await db
        .select({
          id: authors.id,
          slug: authors.slug,
          fullName: authors.fullName,
          position: authors.position,
          avatarUrl: authors.avatarUrl,
          totalViews: sql<number>`COALESCE(SUM(${opinionArticles.viewCount}), 0)::int`,
        })
        .from(authors)
        .innerJoin(
          opinionArticles,
          and(
            eq(opinionArticles.authorId, authors.id),
            eq(opinionArticles.status, "published"),
            isNotNull(opinionArticles.publishedAt)
          )
        )
        .where(eq(authors.isActive, true))
        .groupBy(authors.id)
        .orderBy(sql`COALESCE(SUM(${opinionArticles.viewCount}), 0) DESC`)
        .limit(limit);

      return lifetime
        .filter((r) => r.totalViews > 0)
        .map((r) => ({ ...r, windowDays: null }));
    },
    [] as MostReadAuthor[]
  );
}

/** زيادة عدد المشاهدات */
export async function incrementOpinionViews(id: string): Promise<void> {
  try {
    await db
      .update(opinionArticles)
      .set({ viewCount: sql`${opinionArticles.viewCount} + 1` })
      .where(eq(opinionArticles.id, id));
  } catch (err) {
    console.error(`[opinions] incrementOpinionViews failed for ${id}; ignoring`, err);
  }
}
