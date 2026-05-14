/**
 * Article queries — Public-facing reads
 */

import { db, articles, categories, users, articleTags, tags } from "@/lib/db";
import { eq, and, desc, sql, inArray, gt, isNotNull } from "drizzle-orm";
import { cacheRemember } from "@/lib/redis";

export type ArticleListItem = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  featuredImageUrl: string | null;
  type: string;
  isBreaking: boolean;
  publishedAt: Date | null;
  viewCount: number;
  commentCount: number;
  readingTimeMinutes: number | null;
  category: { name: string; slug: string };
  author: { fullName: string };
};

const PUBLISHED_FILTER = and(
  eq(articles.status, "published"),
  isNotNull(articles.publishedAt)
);

const HOME_FILTER = and(
  PUBLISHED_FILTER,
  eq(articles.excludeFromHome, false)
);

const publicFeaturedImageUrl = sql<string | null>`
  CASE
    WHEN ${articles.featuredImageUrl} LIKE 'data:%' THEN NULL
    ELSE ${articles.featuredImageUrl}
  END
`;

function stripInlineFeaturedImage<T extends { featuredImageUrl?: string | null }>(row: T): T {
  if (row.featuredImageUrl?.startsWith("data:")) {
    return { ...row, featuredImageUrl: null };
  }
  return row;
}

/** أحدث الأخبار — كل الأخبار المنشورة بترتيب النشر */
export async function getLatestArticles(limit = 10): Promise<ArticleListItem[]> {
  return db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      subtitle: articles.subtitle,
      excerpt: articles.excerpt,
      featuredImageUrl: publicFeaturedImageUrl,
      type: articles.type,
      isBreaking: articles.isBreaking,
      publishedAt: articles.publishedAt,
      viewCount: articles.viewCount,
      commentCount: articles.commentCount,
      readingTimeMinutes: articles.readingTimeMinutes,
      category: {
        name: categories.name,
        slug: categories.slug,
      },
      author: {
        fullName: users.fullName,
      },
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(users, eq(articles.authorId, users.id))
    .where(PUBLISHED_FILTER)
    .orderBy(desc(articles.publishedAt))
    .limit(limit) as unknown as Promise<ArticleListItem[]>;
}

/** الأخبار العاجلة (للتيكر) */
export async function getBreakingHeadlines(limit = 5): Promise<string[]> {
  const rows = await db
    .select({ title: articles.title })
    .from(articles)
    .where(and(PUBLISHED_FILTER, eq(articles.isBreaking, true)))
    .orderBy(desc(articles.publishedAt))
    .limit(limit);
  return rows.map((r) => r.title);
}

/** الأكثر قراءة (آخر 7 أيام) */
export async function getMostReadArticles(limit = 5): Promise<ArticleListItem[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      subtitle: articles.subtitle,
      excerpt: articles.excerpt,
      featuredImageUrl: publicFeaturedImageUrl,
      type: articles.type,
      isBreaking: articles.isBreaking,
      publishedAt: articles.publishedAt,
      viewCount: articles.viewCount,
      commentCount: articles.commentCount,
      readingTimeMinutes: articles.readingTimeMinutes,
      category: { name: categories.name, slug: categories.slug },
      author: { fullName: users.fullName },
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(users, eq(articles.authorId, users.id))
    .where(and(PUBLISHED_FILTER, gt(articles.publishedAt, sevenDaysAgo)))
    .orderBy(desc(articles.viewCount))
    .limit(limit) as unknown as Promise<ArticleListItem[]>;
}

/** المميزة على الصفحة الرئيسية */
export async function getFeaturedArticles(limit = 5): Promise<ArticleListItem[]> {
  return db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      subtitle: articles.subtitle,
      excerpt: articles.excerpt,
      featuredImageUrl: publicFeaturedImageUrl,
      type: articles.type,
      isBreaking: articles.isBreaking,
      publishedAt: articles.publishedAt,
      viewCount: articles.viewCount,
      commentCount: articles.commentCount,
      readingTimeMinutes: articles.readingTimeMinutes,
      category: { name: categories.name, slug: categories.slug },
      author: { fullName: users.fullName },
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(users, eq(articles.authorId, users.id))
    .where(and(HOME_FILTER, eq(articles.isFeatured, true)))
    .orderBy(desc(articles.publishedAt))
    .limit(limit) as unknown as Promise<ArticleListItem[]>;
}

/** خبر بالـ slug */
export async function getArticleBySlug(slug: string) {
  const [row] = await db
    .select({
      article: articles,
      category: categories,
      author: users,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(users, eq(articles.authorId, users.id))
    .where(and(eq(articles.slug, slug), eq(articles.status, "published")))
    .limit(1);

  if (!row?.article) return null;

  // get tags
  const tagRows = await db
    .select({
      id: tags.id,
      slug: tags.slug,
      name: tags.name,
    })
    .from(articleTags)
    .innerJoin(tags, eq(articleTags.tagId, tags.id))
    .where(eq(articleTags.articleId, row.article.id));

  return { ...row, article: stripInlineFeaturedImage(row.article), tags: tagRows };
}

/** أخبار قسم — raw SQL لتجنب مشكلة Drizzle enum */
export async function getCategoryArticles(
  categorySlug: string,
  limit = 20,
  offset = 0
) {
  let result: any;
  try {
    result = await db.execute(
      sql`
        SELECT
          a.id, a.slug, a.title, a.excerpt,
          CASE
            WHEN a.featured_image_url LIKE 'data:%' THEN NULL
            ELSE a.featured_image_url
          END AS "featuredImageUrl",
          a.is_breaking         AS "isBreaking",
          a.published_at        AS "publishedAt",
          a.view_count          AS "viewCount",
          c.name                AS "categoryName",
          c.slug                AS "categorySlug",
          u.full_name           AS "authorName"
        FROM articles a
        INNER JOIN categories c ON a.category_id = c.id
        LEFT  JOIN users u      ON a.author_id   = u.id
        WHERE a.status = 'published'
          AND a.published_at IS NOT NULL
          AND c.slug = ${categorySlug}
        ORDER BY a.published_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    );
  } catch (err: any) {
    console.error("[getCategoryArticles] RAW SQL ERROR:", err);
    throw err;
  }

  // Neon HTTP (serverless) returns result.rows directly sometimes, or { rows: [...] }
  const rows = Array.isArray(result) ? result : (result?.rows ?? []);
  console.log(`[getCategoryArticles] Found ${rows.length} rows for category: ${categorySlug}`);

  return rows.map((r: any) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    featuredImageUrl: r.featuredImageUrl,
    isBreaking: r.isBreaking,
    publishedAt: r.publishedAt ? new Date(r.publishedAt) : null,
    viewCount: r.viewCount ?? 0,
    category: { name: r.categoryName ?? "", slug: r.categorySlug ?? "" },
    author: r.authorName ? { fullName: r.authorName } : null,
  }));
}

/** أخبار الكلمة المفتاحية */
export async function getKeywordArticles(keyword: string, limit = 24) {
  // نبحث في metaKeywords عن الكلمة (ILIKE للبحث غير الحساس)
  const rows = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      featuredImageUrl: publicFeaturedImageUrl,
      isBreaking: articles.isBreaking,
      publishedAt: articles.publishedAt,
      viewCount: articles.viewCount,
      categoryName: categories.name,
      categorySlug: categories.slug,
      authorName: users.fullName,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(users, eq(articles.authorId, users.id))
    .where(and(
      PUBLISHED_FILTER,
      sql`${articles.metaKeywords} ILIKE ${('%' + keyword + '%')}`
    ))
    .orderBy(desc(articles.publishedAt))
    .limit(limit);

  return rows.map((r: any) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    featuredImageUrl: r.featuredImageUrl,
    isBreaking: r.isBreaking,
    publishedAt: r.publishedAt,
    viewCount: r.viewCount,
    category: { name: r.categoryName ?? "", slug: r.categorySlug ?? "" },
    author: r.authorName ? { fullName: r.authorName } : null,
  }));
}

/** كل الأقسام (بدون cache لضمان البيانات الحديثة) */
export async function getActiveCategories() {
  return db
    .select()
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(categories.position);
}
