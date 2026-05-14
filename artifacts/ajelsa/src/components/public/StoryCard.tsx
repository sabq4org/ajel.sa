/**
 * StoryCard — Reusable article card with multiple variants
 */

import Link from "next/link";
import Image from "next/image";
import { formatNumber } from "@/lib/utils";
import { Eye, MessageCircle, Zap } from "lucide-react";
import { RelativeTime } from "./RelativeTime";

type StoryCardProps = {
  article: {
    slug: string;
    title: string;
    excerpt?: string | null;
    featuredImageUrl?: string | null;
    isBreaking?: boolean;
    publishedAt?: Date | null;
    viewCount?: number;
    commentCount?: number;
    readingTimeMinutes?: number | null;
    category?: { name: string; slug: string } | null;
    author?: { fullName: string } | null;
  };
  variant?: "lead" | "side" | "row" | "tile";
};

export function StoryCard({ article, variant = "row" }: StoryCardProps) {
  // Inline image payloads can make ISR responses exceed Vercel's size limit.
  let safeImageUrl = article.featuredImageUrl;
  if (safeImageUrl?.startsWith("data:image")) {
    safeImageUrl = null;
  }

  const safeArticle = { ...article, featuredImageUrl: safeImageUrl };

  if (variant === "lead") return <LeadStory article={safeArticle} />;
  if (variant === "side") return <SideStory article={safeArticle} />;
  if (variant === "tile") return <TileStory article={safeArticle} />;
  return <RowStory article={safeArticle} />;
}

function PhotoPlaceholder({ category }: { category?: string | null }) {
  // Subtle gradient placeholder - design language compliant
  const gradients: Record<string, string> = {
    local: "linear-gradient(135deg, #f0d8c0, #d4ad88)",
    business: "linear-gradient(135deg, #e8e0d4, #d8c8b8)",
    sports: "linear-gradient(135deg, #c8d8c0, #88a878)",
    world: "linear-gradient(135deg, #c8d4e0, #748090)",
    tech: "linear-gradient(135deg, #d8c4d4, #b094c5)",
    opinion: "linear-gradient(135deg, #fce8e9, #d8a5aa)",
  };
  const bg =
    gradients[category ?? ""] ?? "linear-gradient(135deg, #f5efe9, #e8dcd0)";

  return (
    <div
      className="absolute inset-0"
      style={{ background: bg }}
    />
  );
}

function LeadStory({ article }: StoryCardProps) {
  return (
    <Link href={`/article/${article.slug}`} className="block group">
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-paper dark:bg-zinc-900 border border-line mb-5">
        {article.isBreaking && (
          <span className="absolute top-4 right-4 z-10 inline-flex items-center gap-1.5 bg-burgundy dark:bg-rose-500 text-white px-3.5 py-1.5 rounded-md text-xs font-extrabold tracking-wider shadow-red">
            <Zap size={12} />
            عاجل
          </span>
        )}
        {article.featuredImageUrl ? (
          <Image
            src={article.featuredImageUrl}
            alt={article.title}
            fill
            sizes="(max-width: 768px) 100vw, 60vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            priority
          />
        ) : (
          <PhotoPlaceholder category={article.category?.slug} />
        )}
      </div>
      <div className="flex items-center gap-3 mb-3">
        {article.category && (
          <span className="pill-burgundy">{article.category.name}</span>
        )}
        <span className="text-xs text-ink-soft">
          <RelativeTime date={article.publishedAt} />
        </span>
      </div>
      <h1 className="text-3xl md:text-4xl font-extrabold leading-tight text-ink mb-3 group-hover:text-burgundy dark:group-hover:text-rose-300 transition-colors -tracking-[0.02em]">
        {article.title}
      </h1>
      {article.excerpt && (
        <p className="text-base text-ink-2 leading-loose mb-4">
          {article.excerpt}
        </p>
      )}
      <div className="flex items-center gap-3.5 text-xs text-ink-soft pt-3.5 border-t border-line">
        {article.author && (
          <span>
            بقلم <span className="text-ink font-semibold">{article.author.fullName}</span>
          </span>
        )}
        <span className="w-1 h-1 rounded-full bg-ink-faint" />
        <span className="flex items-center gap-1">
          <Eye size={12} /> {formatNumber(article.viewCount ?? 0)}
        </span>
        {article.commentCount != null && (
          <>
            <span className="w-1 h-1 rounded-full bg-ink-faint" />
            <span className="flex items-center gap-1">
              <MessageCircle size={12} /> {formatNumber(article.commentCount)}
            </span>
          </>
        )}
      </div>
    </Link>
  );
}

function SideStory({ article }: StoryCardProps) {
  return (
    <Link
      href={`/article/${article.slug}`}
      className="grid grid-cols-[140px_1fr] gap-3.5 pb-5 border-b border-line last:border-b-0 last:pb-0 group"
    >
      <div className="relative aspect-video rounded-lg overflow-hidden bg-paper dark:bg-zinc-900 border border-line">
        {article.featuredImageUrl ? (
          <Image
            src={article.featuredImageUrl}
            alt={article.title}
            fill
            sizes="140px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <PhotoPlaceholder category={article.category?.slug} />
        )}
      </div>
      <div className="flex flex-col justify-center">
        {article.category && (
          <span className="text-xs text-burgundy dark:text-rose-300 font-bold mb-1">
            {article.category.name}
          </span>
        )}
        <h3 className="text-sm font-bold leading-snug text-ink mb-1.5 group-hover:text-burgundy dark:group-hover:text-rose-300 transition-colors">
          {article.title}
        </h3>
        <span className="text-xs text-ink-faint">
          <RelativeTime date={article.publishedAt} />
        </span>
      </div>
    </Link>
  );
}

function RowStory({ article }: StoryCardProps) {
  return (
    <Link
      href={`/article/${article.slug}`}
      className="grid grid-cols-[220px_1fr] gap-5 py-6 border-b border-line first:pt-0 last:border-b-0 group"
    >
      <div className="relative aspect-video rounded-xl overflow-hidden bg-paper dark:bg-zinc-900 border border-line">
        {article.featuredImageUrl ? (
          <Image
            src={article.featuredImageUrl}
            alt={article.title}
            fill
            sizes="220px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <PhotoPlaceholder category={article.category?.slug} />
        )}
      </div>
      <div className="flex flex-col">
        {article.category && (
          <span className="text-xs text-burgundy dark:text-rose-300 font-bold mb-2 tracking-wide">
            {article.category.name}
          </span>
        )}
        <h2 className="text-xl font-extrabold leading-snug text-ink mb-2 group-hover:text-burgundy dark:group-hover:text-rose-300 transition-colors -tracking-[0.01em]">
          {article.title}
        </h2>
        {article.excerpt && (
          <p className="text-sm text-ink-soft leading-relaxed mb-3 line-clamp-2">
            {article.excerpt}
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-ink-faint mt-auto">
          <span>
            <RelativeTime date={article.publishedAt} />
          </span>
          <span className="w-1 h-1 rounded-full bg-ink-faint" />
          <span>{formatNumber(article.viewCount ?? 0)} قراءة</span>
          {article.commentCount != null && article.commentCount > 0 && (
            <>
              <span className="w-1 h-1 rounded-full bg-ink-faint" />
              <span>{article.commentCount} تعليق</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

function TileStory({ article }: StoryCardProps) {
  return (
    <Link
      href={`/article/${article.slug}`}
      className="bg-paper border border-line rounded-2xl overflow-hidden group transition-all hover:shadow-card hover:-translate-y-1 hover:border-rose-soft dark:hover:border-rose-400/30 dark:hover:shadow-2xl dark:hover:shadow-black/50"
    >
      <div className="relative aspect-video overflow-hidden bg-rose-cream dark:bg-zinc-900">
        {article.featuredImageUrl ? (
          <Image
            src={article.featuredImageUrl}
            alt={article.title}
            fill
            sizes="(max-width: 768px) 100vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <PhotoPlaceholder category={article.category?.slug} />
        )}
      </div>
      <div className="p-4">
        {article.category && (
          <span className="text-xs text-burgundy dark:text-rose-300 font-bold mb-2 block">
            {article.category.name}
          </span>
        )}
        <h3 className="text-[15px] font-bold leading-snug text-ink mb-2.5 group-hover:text-burgundy dark:group-hover:text-rose-300 transition-colors line-clamp-2">
          {article.title}
        </h3>
        <div className="text-xs text-ink-faint">
          <RelativeTime date={article.publishedAt} /> ·{" "}
          {formatNumber(article.viewCount ?? 0)} قراءة
        </div>
      </div>
    </Link>
  );
}
