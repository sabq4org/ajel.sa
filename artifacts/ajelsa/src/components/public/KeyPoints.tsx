"use client";

import { useState, useEffect } from "react";
import { Lightbulb, Loader2, CheckCircle2 } from "lucide-react";

interface Props {
  articleId: string;
  articleTitle: string;
  articleContent: string;
}

export function KeyPoints({ articleId, articleTitle, articleContent }: Props) {
  const [points, setPoints] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cacheKey = `keypoints:${articleId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        setPoints(JSON.parse(cached));
        setLoading(false);
        return;
      } catch {}
    }

    let mounted = true;
    fetch("/api/ai/key-points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleTitle, articleContent }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        if (Array.isArray(d.points) && d.points.length > 0) {
          setPoints(d.points);
          try { sessionStorage.setItem(cacheKey, JSON.stringify(d.points)); } catch {}
        } else {
          setPoints([]);
        }
      })
      .catch(() => mounted && setPoints([]))
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false; };
  }, [articleId, articleTitle, articleContent]);

  return (
    <div className="bg-paper rounded-2xl border border-line p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-line-soft">
        <div className="w-7 h-7 rounded-lg bg-rose-cream dark:bg-rose-500/15 grid place-items-center">
          <Lightbulb size={13} className="text-burgundy dark:text-rose-300" />
        </div>
        <h3 className="text-[13px] font-extrabold text-ink">النقاط الرئيسية</h3>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full bg-bg-2 mt-0.5 animate-pulse" />
              <div className="flex-1 h-3 rounded bg-bg-2 animate-pulse" />
            </div>
          ))}
        </div>
      ) : points && points.length > 0 ? (
        <ul className="space-y-2.5">
          {points.map((p, i) => (
            <li key={i} className="flex items-start gap-2 text-[12px] leading-relaxed text-ink-2">
              <CheckCircle2 size={14} className="text-burgundy dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-ink-soft text-center py-2">تعذر استخراج النقاط</p>
      )}
    </div>
  );
}
