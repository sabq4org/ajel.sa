import Link from "next/link";
import { Eye, Flame, Clock, ArrowLeft } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { RelativeTime } from "./RelativeTime";

interface Article {
  slug: string;
  title: string;
  excerpt?: string | null;
  featuredImageUrl?: string | null;
  isBreaking?: boolean;
  publishedAt?: Date | null;
  viewCount?: number;
  category?: { name: string; slug: string } | null;
}

interface Props {
  articles: Article[];
}

/**
 * Bento Box Grid — مستوحى من Apple
 * 6 بطاقات بأحجام متنوعة في شبكة غير منتظمة
 */
export function BentoNewsGrid({ articles }: Props) {
  const items = articles.slice(0, 6);
  if (items.length < 3) return null;

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 grid-rows-[auto] gap-4 auto-rows-[180px]">
      {/* بطاقة كبيرة 2x2 */}
      {items[0] && (
        <BentoCard
          article={items[0]}
          size="large"
          className="col-span-2 row-span-2"
        />
      )}

      {/* بطاقة عمودية طويلة 1x2 */}
      {items[1] && (
        <BentoCard
          article={items[1]}
          size="tall"
          className="col-span-1 row-span-2 hidden lg:block"
        />
      )}

      {/* بطاقة أفقية 2x1 */}
      {items[2] && (
        <BentoCard
          article={items[2]}
          size="wide"
          className="col-span-2 lg:col-span-1 row-span-1"
        />
      )}

      {/* بطاقات صغيرة */}
      {items[3] && (
        <BentoCard
          article={items[3]}
          size="small"
          className="col-span-1 row-span-1"
        />
      )}
      {items[4] && (
        <BentoCard
          article={items[4]}
          size="small"
          className="col-span-1 row-span-1"
        />
      )}
      {items[5] && (
        <BentoCard
          article={items[5]}
          size="small"
          className="col-span-2 row-span-1 hidden lg:block"
        />
      )}
    </section>
  );
}

interface CardProps {
  article: Article;
  size: "large" | "tall" | "wide" | "small";
  className: string;
}

function BentoCard({ article, size, className }: CardProps) {
  const isBig = size === "large" || size === "tall";

  return (
    <Link
      href={`/article/${article.slug}`}
      className={`group relative overflow-hidden rounded-2xl bg-paper border border-line hover:border-burgundy/30 dark:hover:border-rose-400/30 hover:shadow-lg dark:hover:shadow-black/40 transition-all duration-300 ${className}`}
    >
      {/* الصورة (تملأ البطاقة) */}
      <div className="absolute inset-0">
        {article.featuredImageUrl ? (
          <img
            src={article.featuredImageUrl}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-rose-cream via-paper to-burgundy/10" />
        )}
        {/* gradient overlay — خفيف جداً فقط تحت النص */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-burgundy-dark/85 via-burgundy-dark/40 to-transparent" />
      </div>

      {/* Breaking badge */}
      {article.isBreaking && (
        <div className="absolute top-3 right-3 inline-flex items-center gap-1 bg-burgundy dark:bg-rose-500 text-white px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider shadow-lg backdrop-blur-sm z-10">
          <Flame size={9} />
          عاجل
        </div>
      )}

      {/* Content — عنوان واضح فقط بدون نبذة */}
      <div className="absolute bottom-0 inset-x-0 p-4 lg:p-5 text-white z-10">
        {article.category && (
          <span className="inline-block text-[10px] font-bold text-rose-cream tracking-widest uppercase mb-2">
            {article.category.name}
          </span>
        )}

        <h3
          className={`font-extrabold leading-tight group-hover:text-rose-cream transition-colors -tracking-[0.01em] ${
            isBig ? "text-xl lg:text-3xl mb-3" : "text-base lg:text-lg mb-2"
          }`}
        >
          {article.title}
        </h3>

        <div className="flex items-center gap-3 text-[10px] text-white/80">
          {article.publishedAt && (
            <span className="flex items-center gap-1">
              <Clock size={9} />
              <RelativeTime date={article.publishedAt} />
            </span>
          )}
          {article.viewCount != null && article.viewCount > 0 && (
            <>
              <span className="w-0.5 h-0.5 rounded-full bg-white/40" />
              <span className="flex items-center gap-1">
                <Eye size={9} />
                {formatNumber(article.viewCount)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Hover arrow */}
      <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/15 backdrop-blur-md grid place-items-center text-white opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all z-10">
        <ArrowLeft size={13} />
      </div>
    </Link>
  );
}
