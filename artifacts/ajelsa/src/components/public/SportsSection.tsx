import Link from "next/link";
import { Trophy, ArrowLeft, Clock, Eye, Flame } from "lucide-react";
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
 * Sports Section — خلفية ممتدة على كامل عرض الصفحة
 * بطاقة كبيرة + 3 صغيرة بأسلوب احترافي
 */
export function SportsSection({ articles }: Props) {
  if (articles.length === 0) return null;

  const main = articles[0];
  const others = articles.slice(1, 4);

  return (
    <section className="relative w-screen left-1/2 right-1/2 -mx-[50vw]">
      {/* خلفية ممتدة على كامل العرض بهوية عاجل */}
      <div className="relative bg-gradient-to-br from-burgundy-dark via-[#3d0d14] to-ink dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950 overflow-hidden">
        {/* نمط زخرفي خفيف */}
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.025]" style={{
          backgroundImage: "linear-gradient(90deg, white 1px, transparent 1px), linear-gradient(white 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />

        {/* دوائر ضبابية بألوان عنابية */}
        <div className="absolute -top-32 -right-20 w-96 h-96 rounded-full bg-burgundy/15 dark:bg-rose-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-rose-cream/[0.06] dark:bg-rose-500/5 blur-3xl" />

        {/* خط زخرفي ذهبي علوي */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-l from-transparent via-rose-cream/30 dark:via-rose-400/30 to-transparent" />

        <div className="relative max-w-[1320px] mx-auto px-4 lg:px-8 py-12">

          {/* العنوان */}
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-burgundy to-burgundy-dark dark:from-rose-500 dark:to-rose-700 grid place-items-center shadow-lg shadow-burgundy/40 dark:shadow-rose-500/20 border border-rose-cream/10 dark:border-rose-400/20">
                <Trophy size={20} className="text-rose-cream dark:text-rose-100" />
              </div>
              <div>
                <h2 className="text-2xl lg:text-3xl font-extrabold text-white -tracking-[0.02em] flex items-center gap-2">
                  الرياضة
                </h2>
                <p className="text-[12px] text-rose-cream/70 dark:text-rose-300/80 mt-0.5">
                  أحدث أخبار الملاعب والبطولات
                </p>
              </div>
            </div>

            <Link
              href="/category/sports"
              className="inline-flex items-center gap-2 bg-white/10 dark:bg-white/[0.06] hover:bg-rose-cream dark:hover:bg-rose-500/20 hover:text-burgundy-dark dark:hover:text-rose-100 text-white backdrop-blur-sm border border-white/20 dark:border-white/10 hover:border-rose-cream dark:hover:border-rose-400/40 px-5 py-2 rounded-xl text-[13px] font-bold transition-all hover:gap-3"
            >
              كل أخبار الرياضة
              <ArrowLeft size={14} />
            </Link>
          </div>

          {/* الشبكة */}
          <div className="grid lg:grid-cols-[1.5fr_1fr] gap-5">

            {/* البطاقة الكبيرة */}
            <Link
              href={`/article/${main.slug}`}
              className="group relative overflow-hidden rounded-2xl bg-burgundy-dark/40 dark:bg-zinc-900/60 border border-white/10 dark:border-white/[0.06] hover:border-rose-cream/40 dark:hover:border-rose-400/30 transition-all duration-300 hover:shadow-2xl hover:shadow-burgundy/30 dark:hover:shadow-rose-500/15"
            >
              <div className="relative aspect-video overflow-hidden bg-burgundy-dark dark:bg-zinc-800">
                {main.featuredImageUrl ? (
                  <img
                    src={main.featuredImageUrl}
                    alt={main.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-burgundy to-burgundy-dark grid place-items-center">
                    <Trophy size={64} className="text-rose-cream/20" />
                  </div>
                )}
                {/* gradient overlay */}
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-burgundy-dark via-burgundy-dark/70 dark:from-zinc-950 dark:via-zinc-900/80 to-transparent" />

                {main.isBreaking && (
                  <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 bg-burgundy dark:bg-rose-500 text-white px-3 py-1.5 rounded-full text-[10px] font-extrabold tracking-widest shadow-lg">
                    <Flame size={10} />
                    عاجل
                  </div>
                )}

                <div className="absolute bottom-0 inset-x-0 p-5 lg:p-6">
                  <span className="inline-block bg-rose-cream text-burgundy-dark dark:bg-rose-500/20 dark:text-rose-200 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest mb-3 shadow-lg">
                    {main.category?.name ?? "رياضة"}
                  </span>

                  <h3 className="text-xl lg:text-2xl font-extrabold text-white leading-tight mb-2 group-hover:text-rose-cream dark:group-hover:text-rose-200 transition-colors -tracking-[0.01em]">
                    {main.title}
                  </h3>

                  {main.excerpt && (
                    <p className="text-[13px] text-white/80 leading-relaxed line-clamp-2 mb-3 hidden md:block">
                      {main.excerpt}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-[10px] text-rose-cream/70 dark:text-rose-300/70">
                    {main.publishedAt && (
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        <RelativeTime date={main.publishedAt} />
                      </span>
                    )}
                    {main.viewCount != null && main.viewCount > 0 && (
                      <>
                        <span className="w-0.5 h-0.5 rounded-full bg-rose-cream/40 dark:bg-rose-300/40" />
                        <span className="flex items-center gap-1">
                          <Eye size={10} />
                          {formatNumber(main.viewCount)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Link>

            {/* البطاقات الصغيرة */}
            <div className="space-y-3">
              {others.map((a, i) => (
                <Link
                  key={i}
                  href={`/article/${a.slug}`}
                  className="group flex gap-3 p-3 rounded-xl bg-burgundy-dark/40 dark:bg-zinc-900/60 backdrop-blur-sm border border-white/10 dark:border-white/[0.06] hover:border-rose-cream/30 dark:hover:border-rose-400/30 hover:bg-burgundy-dark/60 dark:hover:bg-zinc-900/80 transition-all"
                >
                  <div className="relative w-32 lg:w-40 aspect-video flex-shrink-0 rounded-lg overflow-hidden bg-burgundy-dark dark:bg-zinc-800">
                    {a.featuredImageUrl ? (
                      <img
                        src={a.featuredImageUrl}
                        alt={a.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-burgundy to-burgundy-dark grid place-items-center">
                        <Trophy size={20} className="text-rose-cream/30" />
                      </div>
                    )}
                    {a.isBreaking && (
                      <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-burgundy dark:bg-rose-500 text-white grid place-items-center shadow-md">
                        <Flame size={9} />
                      </span>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <span className="text-[10px] font-bold text-rose-cream/80 dark:text-rose-300/80 uppercase tracking-widest">
                      {a.category?.name ?? "رياضة"}
                    </span>
                    <h3 className="text-[13px] font-bold text-white leading-snug line-clamp-2 group-hover:text-rose-cream dark:group-hover:text-rose-200 transition-colors -tracking-[0.01em]">
                      {a.title}
                    </h3>
                    {a.publishedAt && (
                      <div className="flex items-center gap-1 text-[10px] text-rose-cream/50 dark:text-rose-300/60">
                        <Clock size={9} />
                        <RelativeTime date={a.publishedAt} />
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
