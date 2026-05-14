/**
 * Meilisearch — Full-text search for articles
 */

import { MeiliSearch } from "meilisearch";

let _client: MeiliSearch | null = null;

export function getSearchClient(): MeiliSearch {
  if (_client) return _client;

  _client = new MeiliSearch({
    host: process.env.MEILISEARCH_HOST || "http://localhost:7700",
    apiKey: process.env.MEILISEARCH_API_KEY,
  });

  return _client;
}

export const ARTICLES_INDEX = "articles";

export type SearchableArticle = {
  id: string;
  title: string;
  subtitle?: string;
  excerpt?: string;
  contentText?: string;
  slug: string;
  categoryName: string;
  categorySlug: string;
  authorName: string;
  tags: string[];
  type: string;
  isBreaking: boolean;
  publishedAt: number; // unix timestamp
  featuredImageUrl?: string;
};

export async function ensureArticlesIndex() {
  const client = getSearchClient();
  try {
    await client.getIndex(ARTICLES_INDEX);
  } catch {
    await client.createIndex(ARTICLES_INDEX, { primaryKey: "id" });
  }

  const index = client.index(ARTICLES_INDEX);

  await index.updateSettings({
    searchableAttributes: [
      "title",
      "subtitle",
      "excerpt",
      "contentText",
      "tags",
      "authorName",
      "categoryName",
    ],
    filterableAttributes: [
      "categorySlug",
      "type",
      "isBreaking",
      "publishedAt",
      "tags",
    ],
    sortableAttributes: ["publishedAt"],
    rankingRules: [
      "words",
      "typo",
      "proximity",
      "attribute",
      "sort",
      "exactness",
    ],
    typoTolerance: { enabled: true },
    pagination: { maxTotalHits: 5000 },
  });
}

export async function indexArticle(article: SearchableArticle) {
  const index = getSearchClient().index(ARTICLES_INDEX);
  return index.addDocuments([article]);
}

export async function removeArticleFromIndex(id: string) {
  const index = getSearchClient().index(ARTICLES_INDEX);
  return index.deleteDocument(id);
}

export async function searchArticles(
  query: string,
  options: {
    categorySlug?: string;
    type?: string;
    limit?: number;
    offset?: number;
  } = {}
) {
  const index = getSearchClient().index(ARTICLES_INDEX);

  const filters: string[] = [];
  if (options.categorySlug) filters.push(`categorySlug = "${options.categorySlug}"`);
  if (options.type) filters.push(`type = "${options.type}"`);

  return index.search(query, {
    limit: options.limit ?? 20,
    offset: options.offset ?? 0,
    filter: filters.length ? filters.join(" AND ") : undefined,
    sort: ["publishedAt:desc"],
    attributesToHighlight: ["title", "excerpt"],
  });
}
