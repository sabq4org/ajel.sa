import Link from "next/link";
import { Award, ArrowLeft, Clock } from "lucide-react";
import { RelativeTime } from "./RelativeTime";

interface Article {
  slug: string;
  title: string;
  excerpt?: string | null;
  featuredImageUrl?: string | null;
  publishedAt?: Date | null;
  category?: { name: string; slug: string } | null;
  author?: { fullName: string } | null;
}

interface Props {
  articles: Article[];
}

export function EditorsPicks({ articles }: Props) {
  const items = articles.slice(0, 3);
  if (items.length === 0) return null;

  return (
    <section className="relative">
      {/* Section header مع زخرفة عنابية */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-burgundy to-burgundy-dark dark:from-rose-500 dark:to-rose-700 grid place-items-center shadow-md">
            <Award size={20} className="text-yellow-300" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-ink -tracking-[0.02em]">
              اختيارات المحرر
            </h2>
            <p className="text-xs text-ink-soft">اختيارات شخصية من رئيس التحرير</p>
          </div>
        </div>
        <div className="flex-1 h-px bg-gradient-to-l from-burgundy/30 dark:from-rose-500/30 to-transparent" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {items.map((a, i) => (
          <Link
            key={i}
            href={`/article/${a.slug}`}
            className="group relative bg-paper rounded-2xl border border-line overflow-hidden hover:border-burgundy/40 dark:hover:border-rose-400/40 hover:shadow-xl dark:hover:shadow-black/50 transition-all duration-500 hover:-translate-y-1"
          >
            {/* Badge اختيار المحرر */}
            <div className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 bg-gradient-to-l from-burgundy to-burgundy-dark dark:from-rose-500 dark:to-rose-700 text-white px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider shadow-lg">
              <Award size={10} className="text-yellow-300" />
              اختيار المحرر
            </div>

            {/* الصورة */}
            <div className="relative aspect-video overflow-hidden bg-rose-cream dark:bg-zinc-800">
              {a.featuredImageUrl ? (
                <img
                  src={a.featuredImageUrl}
                  alt={a.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-burgundy/15 to-rose-cream" />
              )}
            </div>

            {/* المحتوى */}
            <div className="p-5">
              {a.category && (
                <span className="text-[10px] font-bold text-burgundy dark:text-rose-300 uppercase tracking-widest mb-2 block">
                  {a.category.name}
                </span>
              )}

              <h3 className="text-base font-extrabold text-ink leading-snug mb-2 line-clamp-2 group-hover:text-burgundy dark:group-hover:text-rose-300 transition-colors -tracking-[0.01em]">
                {a.title}
              </h3>

              {a.excerpt && (
                <p className="text-[12px] text-ink-2 leading-relaxed line-clamp-2 mb-3">
                  {a.excerpt}
                </p>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-line-soft">
                <div className="flex items-center gap-2 text-[10px] text-ink-soft">
                  {a.publishedAt && (
                    <span className="flex items-center gap-1">
                      <Clock size={9} />
                      <RelativeTime date={a.publishedAt} />
                    </span>
                  )}
                </div>
                <ArrowLeft size={13} className="text-burgundy dark:text-rose-300 opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
