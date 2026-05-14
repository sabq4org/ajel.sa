/**
 * /api/articles — Article CRUD
 */

import { NextRequest, NextResponse } from "next/server";
import { db, articles, categories, users, media } from "@/lib/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { getSession, requireRole, requirePerm, sessionHasPermission } from "@/lib/auth";
import { z } from "zod";
import { imageUrlSchema } from "@/lib/api";
import { arabicSlug, readingTimeMinutes, stripHtml } from "@/lib/utils";
import { cacheDeletePattern } from "@/lib/redis";
import { revalidatePath } from "next/cache";
import { indexArticle } from "@/lib/search";
import { logAction } from "@/lib/audit";
import { resolveFeaturedImage } from "@/lib/featuredImage";
import { isNonPublishingRole } from "@/lib/staff";
import { users as usersTable } from "@/lib/db/schema";

const createSchema = z.object({
  title: z.string().min(5).max(300),
  subtitle: z.string().max(500).optional(),
  excerpt: z.string().max(500).optional(),
  contentHtml: z.string().optional(),
  contentJson: z.any().optional(),
  categoryId: z.string().uuid(),
  tagIds: z.array(z.string().uuid()).optional(),
  authorId: z.string().uuid().optional(),
  type: z.enum(["regular", "breaking", "exclusive", "investigation", "opinion", "video", "photo"]).default("regular"),
  status: z.enum(["draft", "review", "scheduled", "published"]).default("draft"),
  isBreaking: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  excludeFromHome: z.boolean().default(false),
  featuredImageUrl: imageUrlSchema.nullable().optional(),
  featuredMediaId: z.string().uuid().nullable().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
  ogImageUrl: imageUrlSchema.nullable().optional(),
  canonicalUrl: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
});

// GET — list articles (paginated, with joined names)
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 100);
  const offset = parseInt(url.searchParams.get("offset") ?? "0");
  const status = url.searchParams.get("status");
  const breaking = url.searchParams.get("breaking");

  const where = (() => {
    if (breaking === "true") return eq(articles.isBreaking, true);
    if (status) return eq(articles.status, status as any);
    return undefined;
  })();

  const rawItems = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      subtitle: articles.subtitle,
      excerpt: articles.excerpt,
      featuredImageUrl: articles.featuredImageUrl,
      type: articles.type,
      status: articles.status,
      isBreaking: articles.isBreaking,
      isFeatured: articles.isFeatured,
      categoryId: articles.categoryId,
      authorId: articles.authorId,
      publishedAt: articles.publishedAt,
      scheduledAt: articles.scheduledAt,
      viewCount: articles.viewCount,
      commentCount: articles.commentCount,
      readingTimeMinutes: articles.readingTimeMinutes,
      createdAt: articles.createdAt,
      updatedAt: articles.updatedAt,
      categoryName: categories.name,
      authorName: users.fullName,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(users, eq(articles.authorId, users.id))
    .where(where)
    .orderBy(desc(articles.createdAt))
    .limit(limit)
    .offset(offset);

  // Flag legacy articles whose stored image is an inline data: URL — public
  // pages already null these out, so editors need to know to re-generate.
  const items = rawItems.map((row) => ({
    ...row,
    hasInlineImage: row.featuredImageUrl?.startsWith("data:") ?? false,
  }));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(articles)
    .where(where);

  return NextResponse.json({ items, total: count, limit, offset });
}

// POST — create
export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm("articles.create");
    const body = await req.json();
    const data = createSchema.parse(body);

    // Resolve final author: defaults to the session user. Choosing a different
    // author requires articles.edit_any (otherwise editors could ghost-author
    // for someone else).
    let authorId = session.userId;
    if (data.authorId && data.authorId !== session.userId) {
      const canSetAuthor = await sessionHasPermission(session, "articles.edit_any");
      if (!canSetAuthor) {
        return NextResponse.json(
          { error: "لا تملك صلاحية اختيار كاتب آخر" },
          { status: 403 }
        );
      }
      const [other] = await db
        .select({ id: usersTable.id, roleId: usersTable.roleId })
        .from(usersTable)
        .where(eq(usersTable.id, data.authorId))
        .limit(1);
      if (!other) {
        return NextResponse.json({ error: "الكاتب المحدد غير موجود" }, { status: 400 });
      }
      authorId = other.id;
      // Force draft if the chosen author can't publish (reporter/columnist).
      if (data.status === "published" && (await isNonPublishingRole(other.roleId))) {
        data.status = "draft";
      }
    }

    // Gating publish: only users with `articles.publish` may set status=published
    if (data.status === "published") {
      const canPublish = await sessionHasPermission(session, "articles.publish");
      if (!canPublish) {
        return NextResponse.json(
          { error: "ليس لديك صلاحية النشر المباشر — استخدم 'إرسال للمراجعة'" },
          { status: 403 }
        );
      }
    }

    const baseSlug = arabicSlug(data.title);
    const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

    const cleanText = data.contentHtml ? stripHtml(data.contentHtml) : "";
    const reading = cleanText ? readingTimeMinutes(cleanText) : null;

    // Resolve featured image (validates the media id when supplied)
    const featured = await resolveFeaturedImage({
      hasMediaId: Object.prototype.hasOwnProperty.call(body, "featuredMediaId"),
      mediaId: data.featuredMediaId,
      hasUrl: Object.prototype.hasOwnProperty.call(body, "featuredImageUrl"),
      url: data.featuredImageUrl,
    });

    const [created] = await db
      .insert(articles)
      .values({
        slug: uniqueSlug,
        title: data.title,
        subtitle: data.subtitle,
        excerpt: data.excerpt ?? cleanText.slice(0, 200),
        contentHtml: data.contentHtml,
        contentJson: data.contentJson,
        categoryId: data.categoryId,
        authorId,
        type: data.type,
        status: data.status,
        isBreaking: data.isBreaking,
        isFeatured: data.isFeatured,
        excludeFromHome: data.excludeFromHome,
        featuredMediaId: featured.apply ? featured.featuredMediaId : undefined,
        featuredImageUrl: featured.apply ? featured.featuredImageUrl : undefined,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        metaKeywords: data.metaKeywords,
        ogImageUrl: data.ogImageUrl,
        canonicalUrl: data.canonicalUrl,
        readingTimeMinutes: reading,
        publishedAt: data.status === "published" ? new Date() : null,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      })
      .returning();

    // Bust caches
    await cacheDeletePattern("articles:*");

    // تحديث الصفحات العامة فوراً (ISR revalidation)
    if (created.status === "published") {
      try {
        revalidatePath("/");
        revalidatePath("/latest");
        revalidatePath(`/article/${created.slug}`);
      } catch (e) {
        console.error("[revalidate]", e);
      }
    }

    // Index in search if published
    if (created.status === "published") {
      await indexArticle({
        id: created.id,
        title: created.title,
        excerpt: created.excerpt ?? undefined,
        contentText: cleanText,
        slug: created.slug,
        categoryName: "", // filled later
        categorySlug: "",
        authorName: session.fullName,
        tags: [],
        type: created.type,
        isBreaking: created.isBreaking,
        publishedAt: created.publishedAt
          ? Math.floor(created.publishedAt.getTime() / 1000)
          : Math.floor(Date.now() / 1000),
        featuredImageUrl: created.featuredImageUrl ?? undefined,
      }).catch(() => {});
    }

    await logAction({
      userId: session.userId,
      userFullName: session.fullName,
      action: "article_created",
      entityType: "article",
      entityId: created.id,
      entityTitle: created.title,
    });

    return NextResponse.json({ article: created }, { status: 201 });
  } catch (err: any) {
    if (err.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
    }
    if (err.message === "FEATURED_MEDIA_NOT_FOUND") {
      return NextResponse.json({ error: "الصورة المحددة غير موجودة في مكتبة الوسائط" }, { status: 400 });
    }
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
