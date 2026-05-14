import type { MetadataRoute } from "next";
import { db, articles, categories } from "@/lib/db";
import { eq, and, desc, isNotNull } from "drizzle-orm";
import { authors, opinionArticles } from "@/lib/db/schema";

function siteUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : null);
  return fromEnv || "https://ajel.sa";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl().replace(/\/$/, "");
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "hourly", priority: 1.0 },
    { url: `${base}/latest`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/opinions`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
  ];

  let articleEntries: MetadataRoute.Sitemap = [];
  let categoryEntries: MetadataRoute.Sitemap = [];
  let opinionEntries: MetadataRoute.Sitemap = [];
  let authorEntries: MetadataRoute.Sitemap = [];

  try {
    const [arts, cats, ops, auths] = await Promise.all([
      db
        .select({ slug: articles.slug, publishedAt: articles.publishedAt })
        .from(articles)
        .where(and(eq(articles.status, "published"), isNotNull(articles.publishedAt)))
        .orderBy(desc(articles.publishedAt))
        .limit(2000),
      db.select({ slug: categories.slug }).from(categories).where(eq(categories.isActive, true)),
      db
        .select({ slug: opinionArticles.slug, publishedAt: opinionArticles.publishedAt })
        .from(opinionArticles)
        .where(and(eq(opinionArticles.status, "published"), isNotNull(opinionArticles.publishedAt)))
        .orderBy(desc(opinionArticles.publishedAt))
        .limit(2000),
      db.select({ slug: authors.slug }).from(authors).where(eq(authors.isActive, true)),
    ]);

    articleEntries = arts.map((a) => ({
      url: `${base}/article/${a.slug}`,
      lastModified: a.publishedAt ?? now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    categoryEntries = cats.map((c) => ({
      url: `${base}/category/${c.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.6,
    }));

    opinionEntries = ops.map((o) => ({
      url: `${base}/opinion/${o.slug}`,
      lastModified: o.publishedAt ?? now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    authorEntries = auths.map((a) => ({
      url: `${base}/opinions/author/${a.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));
  } catch {
    // DB unreachable — return only static entries
  }

  return [
    ...staticEntries,
    ...categoryEntries,
    ...articleEntries,
    ...authorEntries,
    ...opinionEntries,
  ];
}
