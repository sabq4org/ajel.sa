"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Clock, Eye, Flame, LayoutGrid, Columns3 } from "lucide-react";
import { formatRelativeTime, formatNumber } from "@/lib/utils";

interface Article {
  slug: string;
  title: string;
  featuredImageUrl?: string | null;
  isBreaking?: boolean;
  publishedAt?: Date | null;
  viewCount?: number;
  category?: { name: string; slug: string } | null;
}

interface Props {
  articles: Article[];
}

const STORAGE_KEY = "latest-news-cols";

export function LatestNewsGrid({ articles }: Props) {
  const [cols, setCols] = useState<3 | 4>(3);

  // استرجاع التفضيل من المتصفح
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "3" || saved === "4") setCols(Number(saved) as 3 | 4);
    } catch {}
  }, []);

  function setColsAndSave(value: 3 | 4) {
    setCols(value);
    try { localStorage.setItem(STORAGE_KEY, String(value)); } catch {}
  }

  const gridClass =
    cols === 4
      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
      : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5";

  return (
    <section>
      {/* Header مع toggle لعدد الأعمدة */}
      <div className="flex items-end justify-between mb-7 pb-3 border-b-2 border-burgundy dark:border-rose-500/60 relative">
        <span className="absolute -bottom-[3px] right-0 w-20 h-1 bg-burgundy dark:bg-rose-500 rounded-t" />

        <div>
          <h2 className="text-2xl font-extrabold text-ink -tracking-[0.02em]">
            آخر الأخبار
          </h2>
          <p className="text-xs text-ink-soft mt-0.5">
            جميع الأخبار بترتيب النشر · {articles.length} خبر
          </p>
        </div>

        {/* Toggle 3/4 columns */}
        <div className="hidden lg:flex items-center gap-1 bg-bg-2 rounded-xl p-1 border border-line">
          <button
            type="button"
            onClick={() => setColsAndSave(3)}
            title="عرض 3 أعمدة"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              cols === 3
                ? "bg-paper text-burgundy dark:text-rose-300 shadow-sm"
                : "text-ink-soft hover:text-burgundy dark:hover:text-rose-300"
            }`}
          >
            <Columns3 size={13} />
            3 أعمدة
          </button>
          <button
            type="button"
            onClick={() => setColsAndSave(4)}
            title="عرض 4 أعمدة"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              cols === 4
                ? "bg-paper text-burgundy dark:text-rose-300 shadow-sm"
                : "text-ink-soft hover:text-burgundy dark:hover:text-rose-300"
            }`}
          >
            <LayoutGrid size={13} />
            4 أعمدة
          </button>
        </div>
      </div>

      {/* الشبكة */}
      <div className={gridClass}>
        {articles.map((a, i) => (
          <Link
            key={a.slug + i}
            href={`/article/${a.slug}`}
            className="group bg-paper rounded-2xl border border-line overflow-hidden hover:border-burgundy/30 dark:hover:border-rose-400/30 hover:shadow-lg dark:hover:shadow-black/40 transition-all duration-300 hover:-translate-y-0.5 flex flex-col"
          >
            {/* الصورة */}
            <div className="relative aspect-video overflow-hidden bg-rose-cream dark:bg-zinc-800">
              {a.featuredImageUrl ? (
                <img
                  src={a.featuredImageUrl}
                  alt={a.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-burgundy/10 via-rose-cream to-burgundy/5" />
              )}
              {a.isBreaking && (
                <div className="absolute top-3 right-3 inline-flex items-center gap-1 bg-burgundy dark:bg-rose-500 text-white px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider shadow-lg">
                  <Flame size={9} />
                  عاجل
                </div>
              )}
            </div>

            {/* المحتوى */}
            <div className="p-5 flex-1 flex flex-col">
              {a.category && (
                <span className="text-[10px] font-bold text-burgundy dark:text-rose-300 uppercase tracking-widest mb-2 block">
                  {a.category.name}
                </span>
              )}

              <h3 className={`font-extrabold text-ink leading-snug line-clamp-2 group-hover:text-burgundy dark:group-hover:text-rose-300 transition-colors mb-3 -tracking-[0.01em] flex-1 ${
                cols === 4 ? "text-[14px]" : "text-[15px]"
              }`}>
                {a.title}
              </h3>

              <div className="flex items-center gap-3 text-[10px] text-ink-soft pt-2 border-t border-line-soft">
                {a.publishedAt && (
                  <span className="flex items-center gap-1">
                    <Clock size={9} />
                    {formatRelativeTime(a.publishedAt)}
                  </span>
                )}
                {a.viewCount != null && a.viewCount > 0 && (
                  <>
                    <span className="w-0.5 h-0.5 rounded-full bg-ink-faint" />
                    <span className="flex items-center gap-1">
                      <Eye size={9} />
                      {formatNumber(a.viewCount)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
