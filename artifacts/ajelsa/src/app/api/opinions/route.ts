/**
 * /api/opinions — list + create opinion articles
 */

import { NextRequest, NextResponse } from "next/server";
import { db, opinionArticles, authors } from "@/lib/db";
import { eq, desc, sql, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { requirePerm, sessionHasPermission } from "@/lib/auth";
import { imageUrlSchema } from "@/lib/api";
import { arabicSlug, readingTimeMinutes, stripHtml } from "@/lib/utils";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { resolveFeaturedImage } from "@/lib/featuredImage";

const createSchema = z.object({
  title: z.string().min(5).max(300),
  subtitle: z.string().max(500).optional(),
  excerpt: z.string().max(500).optional(),
  contentHtml: z.string().optional(),
  contentJson: z.any().optional(),
  authorId: z.string().uuid(),
  status: z.enum(["draft", "review", "scheduled", "published"]).default("draft"),
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

export async function GET(req: NextRequest) {
  // Admin-only listing — public surfaces use lib/queries/opinions.ts directly.
  try {
    await requirePerm("opinion.view");
  } catch (err: any) {
    if (err.message === "UNAUTHENTICATED")
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (err.message === "FORBIDDEN")
      return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
    throw err;
  }

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 200);
  const offset = parseInt(url.searchParams.get("offset") ?? "0");
  const status = url.searchParams.get("status");
  const authorIdFilter = url.searchParams.get("authorId");
  const q = url.searchParams.get("q")?.trim();

  const conds: any[] = [];
  if (status) conds.push(eq(opinionArticles.status, status as any));
  if (authorIdFilter) conds.push(eq(opinionArticles.authorId, authorIdFilter));
  if (q) {
    // Title or columnist name — both surfaces the editor expects from the
    // admin search box. Bound the input so a 1000-char query can't degrade
    // the trigram scan; trim happens above.
    const safe = q.slice(0, 200).replace(/[%_\\]/g, (c) => `\\${c}`);
    const pat = `%${safe}%`;
    conds.push(or(ilike(opinionArticles.title, pat), ilike(authors.fullName, pat)));
  }
  const where = conds.length === 0 ? undefined : conds.length === 1 ? conds[0] : conds.reduce((a, b) => sql`${a} AND ${b}`);

  const items = await db
    .select({
      id: opinionArticles.id,
      slug: opinionArticles.slug,
      title: opinionArticles.title,
      status: opinionArticles.status,
      authorId: opinionArticles.authorId,
      createdById: opinionArticles.createdById,
      isFeatured: opinionArticles.isFeatured,
      featuredImageUrl: opinionArticles.featuredImageUrl,
      publishedAt: opinionArticles.publishedAt,
      scheduledAt: opinionArticles.scheduledAt,
      viewCount: opinionArticles.viewCount,
      readingTimeMinutes: opinionArticles.readingTimeMinutes,
      createdAt: opinionArticles.createdAt,
      updatedAt: opinionArticles.updatedAt,
      authorName: authors.fullName,
      authorSlug: authors.slug,
    })
    .from(opinionArticles)
    .leftJoin(authors, eq(opinionArticles.authorId, authors.id))
    .where(where)
    .orderBy(desc(opinionArticles.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(opinionArticles)
    .leftJoin(authors, eq(opinionArticles.authorId, authors.id))
    .where(where);

  return NextResponse.json({ items, total: count, limit, offset });
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm("opinion.create");
    const body = await req.json();
    const data = createSchema.parse(body);

    if (data.status === "published") {
      const canPublish = await sessionHasPermission(session, "opinion.publish");
      if (!canPublish) {
        return NextResponse.json(
          { error: "ليس لديك صلاحية النشر المباشر — استخدم 'إرسال للمراجعة'" },
          { status: 403 }
        );
      }
    }

    // Confirm author exists + enforce ownership.
    // A user with `opinion.create` but only `opinion.edit_own` may only
    // create opinions under an author profile that's linked to their own
    // user account. Editors with `opinion.edit_any` can pick any author
    // (this is the byline reassignment / editorial-on-behalf-of case).
    const [authorRow] = await db
      .select({ id: authors.id, userId: authors.userId, fullName: authors.fullName })
      .from(authors)
      .where(eq(authors.id, data.authorId))
      .limit(1);
    if (!authorRow) {
      return NextResponse.json({ error: "كاتب الرأي غير موجود" }, { status: 400 });
    }
    const canEditAny = await sessionHasPermission(session, "opinion.edit_any");
    if (!canEditAny && authorRow.userId !== session.userId) {
      return NextResponse.json(
        { error: "لا يمكنك النشر باسم كاتب آخر — اختر ملفك الشخصي ككاتب." },
        { status: 403 }
      );
    }

    const baseSlug = arabicSlug(data.title);
    const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

    const cleanText = data.contentHtml ? stripHtml(data.contentHtml) : "";
    const reading = cleanText ? readingTimeMinutes(cleanText) : null;

    const featured = await resolveFeaturedImage({
      hasMediaId: Object.prototype.hasOwnProperty.call(body, "featuredMediaId"),
      mediaId: data.featuredMediaId,
      hasUrl: Object.prototype.hasOwnProperty.call(body, "featuredImageUrl"),
      url: data.featuredImageUrl,
    });

    const [created] = await db
      .insert(opinionArticles)
      .values({
        slug: uniqueSlug,
        title: data.title,
        subtitle: data.subtitle,
        excerpt: data.excerpt ?? cleanText.slice(0, 200),
        contentHtml: data.contentHtml,
        contentJson: data.contentJson,
        authorId: data.authorId,
        createdById: session.userId,
        status: data.status,
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

    if (created.status === "published") {
      try {
        revalidatePath("/");
        revalidatePath("/opinions");
        revalidatePath(`/opinion/${created.slug}`);
      } catch {}
    }

    await logAction({
      userId: session.userId,
      userFullName: session.fullName,
      action: "opinion_created",
      entityType: "opinion",
      entityId: created.id,
      entityTitle: created.title,
    });

    return NextResponse.json({ opinion: created }, { status: 201 });
  } catch (err: any) {
    if (err.message === "UNAUTHENTICATED")
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (err.message === "FORBIDDEN")
      return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
    if (err.message === "FEATURED_MEDIA_NOT_FOUND")
      return NextResponse.json({ error: "الصورة المحددة غير موجودة في مكتبة الوسائط" }, { status: 400 });
    if (err.name === "ZodError")
      return NextResponse.json({ error: err.errors }, { status: 400 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
