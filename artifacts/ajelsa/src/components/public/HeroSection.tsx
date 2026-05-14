import Link from "next/link";
import { Flame, ArrowLeft, TrendingUp, Eye, Clock } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { RelativeTime } from "./RelativeTime";

interface Article {
  slug: string;
  title: string;
  subtitle?: string | null;
  excerpt?: string | null;
  featuredImageUrl?: string | null;
  isBreaking?: boolean;
  publishedAt?: Date | null;
  viewCount?: number;
  category?: { name: string; slug: string } | null;
  author?: { fullName: string } | null;
}

interface Props {
  lead: Article;
  side: Article[];
}

export function HeroSection({ lead, side }: Props) {
  const hasSide = side.length > 0;
  return (
    <section className={hasSide ? "grid lg:grid-cols-[1.7fr_1fr] gap-6 lg:gap-8" : ""}>
      {/* ━━━━━━━━━━━━ الخبر الرئيسي الضخم ━━━━━━━━━━━━ */}
      <Link href={`/article/${lead.slug}`} className="group relative overflow-hidden rounded-3xl bg-paper border border-line shadow-sm hover:shadow-xl dark:hover:shadow-2xl dark:hover:shadow-black/50 transition-all duration-500 block">
        <div className="relative aspect-video overflow-hidden bg-rose-cream dark:bg-zinc-800">
          {lead.featuredImageUrl ? (
            <img
              src={lead.featuredImageUrl}
              alt={lead.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-burgundy/10 to-rose-cream" />
          )}

          {/* Gradient overlay — خفيف فقط تحت النص */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-burgundy-dark/85 via-burgundy-dark/40 to-transparent" />

          {/* Breaking badge top */}
          {lead.isBreaking && (
            <div className="absolute top-5 right-5 inline-flex items-center gap-1.5 bg-burgundy dark:bg-rose-500 text-white px-3.5 py-1.5 rounded-full text-[11px] font-extrabold tracking-wider shadow-lg backdrop-blur-sm">
              <Flame size={11} />
              عاجل
            </div>
          )}

          {/* Content overlay */}
          <div className="absolute bottom-0 inset-x-0 p-6 lg:p-8 text-white">
            {lead.category && (
              <span className="inline-block bg-burgundy dark:bg-rose-500 text-white px-3 py-1 rounded-full text-[11px] font-bold mb-3 shadow-lg">
                {lead.category.name}
              </span>
            )}

            <h1 className="text-2xl lg:text-4xl font-extrabold leading-tight mb-3 group-hover:text-rose-cream transition-colors">
              {lead.title}
            </h1>

            <div className="flex items-center gap-4 text-[11px] text-white/75">
              {lead.publishedAt && (
                <span className="flex items-center gap-1.5">
                  <Clock size={11} />
                  <RelativeTime date={lead.publishedAt} />
                </span>
              )}
              {lead.viewCount != null && lead.viewCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <Eye size={11} />
                  {formatNumber(lead.viewCount)} قراءة
                </span>
              )}
            </div>
          </div>

          {/* Hover arrow */}
          <div className="absolute top-5 left-5 w-10 h-10 rounded-full bg-white/15 backdrop-blur-md grid place-items-center text-white opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
            <ArrowLeft size={16} />
          </div>
        </div>
      </Link>

      {/* ━━━━━━━━━━━━ Side Stories — تصميم بطاقات حديث ━━━━━━━━━━━━ */}
      {hasSide && (
      <div className="space-y-3">
        {side.slice(0, 4).map((s, i) => (
          <Link
            key={i}
            href={`/article/${s.slug}`}
            className="group flex gap-3 p-3 rounded-2xl bg-paper border border-line hover:border-burgundy/30 dark:hover:border-rose-400/30 hover:shadow-md dark:hover:shadow-black/40 transition-all"
          >
            {/* صورة مصغرة — 16:9 ثابت لتطابق إطار التوليد */}
            <div className="relative w-32 lg:w-40 aspect-video flex-shrink-0 rounded-xl overflow-hidden bg-rose-cream dark:bg-zinc-800">
              {s.featuredImageUrl ? (
                <img
                  src={s.featuredImageUrl}
                  alt={s.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-burgundy/20 to-rose-cream" />
              )}
              {s.isBreaking && (
                <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-burgundy dark:bg-rose-500 text-white grid place-items-center text-[9px] font-extrabold shadow-sm">
                  <Flame size={9} />
                </span>
              )}
            </div>

            <div className="flex-1 flex flex-col justify-between min-w-0">
              {s.category && (
                <span className="text-[10px] font-bold text-burgundy dark:text-rose-300 uppercase tracking-wider">
                  {s.category.name}
                </span>
              )}

              <h3 className="text-[14px] font-bold text-ink leading-snug line-clamp-2 group-hover:text-burgundy dark:group-hover:text-rose-300 transition-colors -tracking-[0.01em]">
                {s.title}
              </h3>

              <div className="flex items-center gap-2 text-[10px] text-ink-soft">
                {s.publishedAt && (
                  <span className="flex items-center gap-1">
                    <Clock size={9} />
                    <RelativeTime date={s.publishedAt} />
                  </span>
                )}
                {s.viewCount != null && s.viewCount > 0 && (
                  <>
                    <span className="w-0.5 h-0.5 rounded-full bg-ink-faint" />
                    <span className="flex items-center gap-1">
                      <TrendingUp size={9} />
                      {formatNumber(s.viewCount)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
      )}
    </section>
  );
}
