"use client";

import { useEffect, useState } from "react";
import { Sparkles, Coffee, RefreshCw } from "lucide-react";

interface Article {
  title: string;
  excerpt?: string | null;
}

interface Props {
  articles: Article[];
}

export function AIBriefWidget({ articles }: Props) {
  const [brief, setBrief] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cacheKey = "ai-brief:" + articles.map((a) => a.title).join("|").slice(0, 100);
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      setBrief(cached);
      setLoading(false);
      return;
    }

    let mounted = true;
    fetch("/api/ai/daily-brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articles: articles.slice(0, 5) }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        if (d.brief) {
          setBrief(d.brief);
          try { sessionStorage.setItem(cacheKey, d.brief); } catch {}
        }
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false; };
  }, [articles]);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-cream/60 via-paper to-rose-cream/40 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900 border border-burgundy/15 dark:border-rose-500/20 shadow-sm hover:shadow-md dark:hover:shadow-black/40 transition-shadow">
      {/* زخارف خفيفة في الخلفية */}
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-burgundy/[0.04] dark:bg-rose-500/[0.06] blur-2xl" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-burgundy/[0.04] dark:bg-rose-500/[0.06] blur-2xl" />

      <div className="relative p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-burgundy to-burgundy-dark dark:from-rose-500 dark:to-rose-700 grid place-items-center shadow-md">
              <Sparkles size={18} className="text-yellow-300" />
            </div>
            {/* نقطة حية */}
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-paper dark:border-zinc-900">
              <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
            </span>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-extrabold text-ink -tracking-[0.01em]">
                نشرة عاجل اليومية
              </h3>
              <span className="text-[9px] bg-burgundy dark:bg-rose-500 text-white px-2 py-0.5 rounded-full font-bold tracking-wider">
                AI
              </span>
            </div>
            <p className="text-[11px] text-ink-soft flex items-center gap-1.5 mt-0.5">
              <Coffee size={11} className="text-burgundy dark:text-rose-300" />
              قراءة في 60 ثانية — أهم ما يحدث اليوم
            </p>
          </div>
        </div>

        {/* النشرة نفسها */}
        {loading ? (
          <div className="space-y-2 py-2">
            <div className="h-3 rounded-full bg-burgundy/10 dark:bg-white/[0.06] animate-pulse w-full" />
            <div className="h-3 rounded-full bg-burgundy/10 dark:bg-white/[0.06] animate-pulse w-11/12" />
            <div className="h-3 rounded-full bg-burgundy/10 dark:bg-white/[0.06] animate-pulse w-4/5" />
            <div className="h-3 rounded-full bg-burgundy/10 dark:bg-white/[0.06] animate-pulse w-9/12" />
          </div>
        ) : brief ? (
          <div className="relative">
            {/* خط عنابي على اليمين كاقتباس صحفي */}
            <div className="absolute top-1 bottom-1 right-0 w-[3px] bg-gradient-to-b from-burgundy via-burgundy-dark to-burgundy/40 dark:from-rose-400 dark:via-rose-500 dark:to-rose-500/40 rounded-full" />

            <p className="text-[15px] lg:text-base leading-loose text-ink font-medium pr-5">
              {brief}
            </p>
          </div>
        ) : (
          <p className="text-[12px] text-ink-soft italic">
            يحتاج المساعد إلى أخبار أكثر لإعداد النشرة
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-burgundy/10 dark:border-white/[0.06]">
          <div className="flex items-center gap-2 text-[10px] text-ink-soft">
            <RefreshCw size={10} className="text-burgundy dark:text-rose-300" />
            تتجدد كل ساعة
          </div>
          <span className="text-[10px] text-ink-soft flex items-center gap-1">
            <Sparkles size={9} className="text-burgundy dark:text-rose-300" />
            مولد بـ GPT-4o
          </span>
        </div>
      </div>
    </div>
  );
}
