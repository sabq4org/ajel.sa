export const revalidate = 60;

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PenTool, Clock, ArrowLeft, Twitter, Mail } from "lucide-react";
import { formatArabicDate, stripHtml } from "@/lib/utils";
import { ArticleSidebar } from "@/components/public/ArticleSidebar";
import {
  getOpinionBySlug,
  getAuthorOpinions,
  incrementOpinionViews,
} from "@/lib/queries/opinions";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await getOpinionBySlug(slug);
    if (!data) return { title: "مقال رأي · صحيفة عاجل" };
    const { opinion, author } = data;
    return {
      title: `${opinion.title} · ${author.fullName} · عاجل`,
      description: opinion.metaDescription || opinion.excerpt || undefined,
      openGraph: {
        title: opinion.title,
        description: opinion.excerpt ?? undefined,
        type: "article",
        images: opinion.ogImageUrl || opinion.featuredImageUrl
          ? [{ url: (opinion.ogImageUrl || opinion.featuredImageUrl) as string }]
          : undefined,
      },
    };
  } catch {
    return { title: "مقال رأي · صحيفة عاجل" };
  }
}

function gregorianLatin(date: Date): string {
  // Gregorian date with Latin numerals (per task spec)
  const day = date.getDate();
  const months = [
    "يناير","فبراير","مارس","أبريل","مايو","يونيو",
    "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
  ];
  return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export default async function OpinionDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  let data: Awaited<ReturnType<typeof getOpinionBySlug>> = null;
  let related: Awaited<ReturnType<typeof getAuthorOpinions>> = [];

  try {
    data = await getOpinionBySlug(slug);
    if (!data) return notFound();
    related = await getAuthorOpinions(data.author.id, 5);
    // fire-and-forget view increment
    incrementOpinionViews(data.opinion.id).catch(() => {});
  } catch {
    return notFound();
  }

  const { opinion, author } = data;
  const otherFromAuthor = related.filter((r) => r.id !== opinion.id).slice(0, 4);

  // Plain-text content for the AI-powered sidebar widgets (KeyPoints,
  // AskTheArticle). Same pattern as the article detail page.
  const plainContent = stripHtml(opinion.contentHtml || "");

  return (
    <div className="max-w-[1320px] mx-auto px-4 lg:px-8 py-10 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8" dir="rtl">
      <article className="min-w-0">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-ink-soft mb-6" dir="rtl">
        <Link href="/" className="hover:text-burgundy">الرئيسية</Link>
        <span>·</span>
        <Link href="/opinions" className="hover:text-burgundy">مقالات الرأي</Link>
        <span>·</span>
        <Link href={`/opinions/author/${author.slug}`} className="hover:text-burgundy">
          {author.fullName}
        </Link>
      </nav>

      {/* Header */}
      <header className="text-center space-y-4 mb-8 pb-8 border-b-2 border-burgundy/20">
        <div className="inline-flex items-center gap-1.5 bg-burgundy text-white px-3 py-1 rounded-full text-[10px] font-bold tracking-wider">
          <PenTool size={11} />
          مقال رأي
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-ink leading-tight -tracking-[0.02em]">
          {opinion.title}
        </h1>
        {opinion.subtitle && (
          <p className="text-base md:text-lg text-ink-2 leading-relaxed max-w-3xl mx-auto">
            {opinion.subtitle}
          </p>
        )}

        {/* Author byline */}
        <div className="flex items-center justify-center gap-3 pt-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-burgundy to-burgundy-soft text-white grid place-items-center font-bold overflow-hidden">
            {author.avatarUrl ? (
              <img src={author.avatarUrl} alt={author.fullName} className="w-full h-full object-cover" />
            ) : (
              author.fullName[0]
            )}
          </div>
          <div className="text-right">
            <Link href={`/opinions/author/${author.slug}`} className="text-base font-bold text-ink hover:text-burgundy transition-colors block">
              {author.fullName}
            </Link>
            {author.position && (
              <div className="text-[12px] text-ink-soft">{author.position}</div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 text-xs text-ink-soft pt-2">
          {opinion.publishedAt && (
            <span className="flex items-center gap-1.5">
              <Clock size={12} />
              {gregorianLatin(new Date(opinion.publishedAt))}
            </span>
          )}
          {opinion.readingTimeMinutes && (
            <>
              <span>·</span>
              <span>~ {opinion.readingTimeMinutes} دقيقة قراءة</span>
            </>
          )}
        </div>
      </header>

      {/* Featured image */}
      {opinion.featuredImageUrl && (
        <div className="mb-8 rounded-2xl overflow-hidden border border-line">
          <img
            src={opinion.featuredImageUrl}
            alt={opinion.featuredImageAlt || opinion.title}
            className="w-full h-auto object-cover"
          />
          {opinion.featuredImageCaption && (
            <div className="bg-bg-2 px-4 py-2 text-xs text-ink-soft text-center">
              {opinion.featuredImageCaption}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div
        className="prose prose-lg max-w-none text-ink leading-loose mx-auto opinion-content"
        dir="rtl"
        dangerouslySetInnerHTML={{ __html: opinion.contentHtml || "" }}
      />

      {/* Author bio card */}
      <aside className="mt-12 p-6 bg-rose-cream/40 border border-burgundy/15 rounded-2xl" dir="rtl">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-burgundy to-burgundy-soft text-white grid place-items-center font-bold text-xl flex-shrink-0 overflow-hidden">
            {author.avatarUrl ? (
              <img src={author.avatarUrl} alt={author.fullName} className="w-full h-full object-cover" />
            ) : (
              author.fullName[0]
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Link href={`/opinions/author/${author.slug}`} className="text-lg font-extrabold text-ink hover:text-burgundy transition-colors">
                {author.fullName}
              </Link>
              {author.twitter && (
                <a
                  href={`https://x.com/${author.twitter}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ink-soft hover:text-burgundy transition-colors"
                  title={`@${author.twitter}`}
                >
                  <Twitter size={14} />
                </a>
              )}
              {author.email && (
                <a
                  href={`mailto:${author.email}`}
                  className="text-ink-soft hover:text-burgundy transition-colors"
                  title={author.email}
                >
                  <Mail size={14} />
                </a>
              )}
            </div>
            {author.position && (
              <div className="text-[12px] text-burgundy font-bold mb-2">{author.position}</div>
            )}
            {(author.bio || author.shortBio) && (
              <p className="text-[13px] text-ink-2 leading-relaxed">
                {author.bio || author.shortBio}
              </p>
            )}
            <Link
              href={`/opinions/author/${author.slug}`}
              className="inline-flex items-center gap-1 text-[12px] font-bold text-burgundy hover:text-burgundy-dark transition-colors mt-3"
            >
              كل مقالات الكاتب
              <ArrowLeft size={12} />
            </Link>
          </div>
        </div>
      </aside>

      {/* More from this author */}
      {otherFromAuthor.length > 0 && (
        <section className="mt-12 pt-8 border-t border-line">
          <h2 className="text-xl font-extrabold text-ink mb-5 -tracking-[0.01em]">
            مقالات أخرى للكاتب
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {otherFromAuthor.map((op) => (
              <Link
                key={op.id}
                href={`/opinion/${op.slug}`}
                className="group block bg-paper border border-line rounded-2xl p-4 hover:border-burgundy/40 hover:shadow-md transition-all"
                dir="rtl"
              >
                <h3 className="text-[14px] font-bold text-ink leading-snug line-clamp-2 group-hover:text-burgundy transition-colors -tracking-[0.01em]">
                  {op.title}
                </h3>
                {op.publishedAt && (
                  <div className="text-[10px] text-ink-soft mt-2">
                    {gregorianLatin(new Date(op.publishedAt))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
      </article>

      {/* Sidebar — same widget set as articles, repurposed for opinion content. */}
      <ArticleSidebar
        articleId={opinion.id}
        articleTitle={opinion.title}
        articleSlug={opinion.slug}
        shareBasePath="opinion"
        articleContent={plainContent}
        publishedAt={opinion.publishedAt ?? null}
        readingTimeMinutes={opinion.readingTimeMinutes ?? null}
        viewCount={opinion.viewCount ?? 0}
        commentCount={0}
      />
    </div>
  );
}
