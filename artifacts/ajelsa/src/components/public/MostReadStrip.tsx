import Link from "next/link";
import { Flame, Eye } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface Article {
  slug: string;
  title: string;
  featuredImageUrl?: string | null;
  viewCount?: number;
  category?: { name: string; slug: string } | null;
}

interface Props {
  articles: Article[];
}

const ARABIC_NUMS = ["١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩", "١٠"];

export function MostReadStrip({ articles }: Props) {
  const items = articles.slice(0, 5);
  if (items.length === 0) return null;

  return (
    <section>
      {/* Header أنيق */}
      <div className="flex items-end justify-between mb-7 pb-3 border-b-2 border-burgundy dark:border-rose-500/60 relative">
        <span className="absolute -bottom-[3px] right-0 w-20 h-1 bg-burgundy dark:bg-rose-500 rounded-t" />

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-cream dark:bg-rose-500/15 grid place-items-center text-burgundy dark:text-rose-300">
            <Flame size={18} />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-ink -tracking-[0.02em] flex items-center gap-2.5">
              الأكثر قراءة اليوم
            </h2>
            <p className="text-xs text-ink-soft mt-0.5">القائمة الذهبية للقراء</p>
          </div>
        </div>

        <span className="hidden md:inline text-[10px] font-bold text-burgundy dark:text-rose-300 tracking-widest opacity-70">
          TOP {items.length}
        </span>
      </div>

      {/* البطاقات — مع مسافات بينها */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {items.map((a, i) => (
          <Link
            key={i}
            href={`/article/${a.slug}`}
            className="group bg-paper rounded-2xl border border-line overflow-hidden hover:border-burgundy/30 dark:hover:border-rose-400/30 hover:shadow-lg dark:hover:shadow-black/40 transition-all duration-300 hover:-translate-y-0.5"
          >
            <div className="relative aspect-video overflow-hidden bg-rose-cream dark:bg-zinc-800">
              {a.featuredImageUrl ? (
                <img
                  src={a.featuredImageUrl}
                  alt={a.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-burgundy/15 to-rose-cream" />
              )}

              {/* رقم زجاجي أنيق في الزاوية */}
              <div className="absolute top-2 right-2 w-11 h-11 rounded-xl bg-paper/95 dark:bg-zinc-900/95 backdrop-blur-md grid place-items-center text-burgundy dark:text-rose-300 font-serif text-2xl font-extrabold shadow-lg border border-burgundy/10 dark:border-rose-500/20">
                {ARABIC_NUMS[i]}
              </div>
            </div>

            <div className="p-4">
              {a.category && (
                <span className="text-[10px] font-bold text-burgundy dark:text-rose-300 uppercase tracking-widest mb-2 block">
                  {a.category.name}
                </span>
              )}
              <h3 className="text-[13px] font-bold text-ink leading-snug line-clamp-2 group-hover:text-burgundy dark:group-hover:text-rose-300 transition-colors mb-2 -tracking-[0.01em] min-h-[2.6rem]">
                {a.title}
              </h3>
              {a.viewCount != null && a.viewCount > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] text-ink-soft pt-2 border-t border-line-soft">
                  <Eye size={10} />
                  {formatNumber(a.viewCount)} قراءة
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
