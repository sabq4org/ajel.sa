"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Zap, Plus, Newspaper, RefreshCw, Edit, X } from "lucide-react";

interface Article {
  id: string;
  title: string;
  categoryName: string;
  authorName: string;
  publishedAt: string | null;
  viewCount: number;
  isBreaking: boolean;
  status: string;
  createdAt: string;
}

function timeAgo(date: string | null): string {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${Math.floor(diff / 86400000)} يوم`;
}

export default function BreakingPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [removing, setRemoving] = useState<string | null>(null);

  const fetchBreaking = useCallback(async () => {
    try {
      const res = await fetch("/api/articles?breaking=true&limit=50");
      const data = await res.json();
      setArticles(data.items ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBreaking();
  }, [fetchBreaking]);

  // Auto-refresh every 30s with countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          fetchBreaking();
          return 30;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchBreaking]);

  const removeBreaking = async (id: string) => {
    setRemoving(id);
    try {
      await fetch(`/api/articles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBreaking: false }),
      });
      setArticles((prev) => prev.filter((a) => a.id !== id));
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      {/* Header Banner */}
      <div className="rounded-xl bg-[#8c1d2b] text-white p-5 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-white animate-ping opacity-75" />
            <span className="w-2.5 h-2.5 rounded-full bg-white block" />
          </div>
          <div>
            <h1 className="text-xl font-bold">🔴 غرفة الأخبار العاجلة</h1>
            <p className="text-sm text-white/70 mt-0.5">
              {articles.length} خبر عاجل · يتجدد خلال {countdown}ث
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchBreaking(); setCountdown(30); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-sm transition-colors"
          >
            <RefreshCw size={14} />
            تحديث
          </button>
          <Link
            href="/admin/articles/new?breaking=true"
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white text-[#8c1d2b] font-semibold text-sm hover:bg-white/90 transition-colors"
          >
            <Plus size={15} />
            خبر عاجل جديد
          </Link>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card animate-pulse h-36" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="card text-center py-20">
          <Newspaper size={44} className="mx-auto text-ink-faint mb-4" />
          <p className="text-ink-soft text-lg font-medium">لا توجد أخبار عاجلة الآن</p>
          <p className="text-ink-faint text-sm mt-1">استخدم زر "خبر عاجل جديد" لإضافة خبر</p>
          <Link
            href="/admin/articles/new?breaking=true"
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-[#8c1d2b] text-white text-sm font-medium hover:bg-[#7a1824] transition-colors"
          >
            <Plus size={15} />
            خبر عاجل جديد
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {articles.map((article) => (
            <div key={article.id} className="card hover:shadow-md transition-shadow border-r-4 border-r-[#8c1d2b]">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#8c1d2b]/10 text-[#8c1d2b] text-xs font-medium">
                    <Zap size={11} />
                    عاجل
                  </span>
                  {article.categoryName && (
                    <span className="text-xs text-ink-faint">{article.categoryName}</span>
                  )}
                </div>
                <span className="text-xs text-ink-faint whitespace-nowrap">
                  {timeAgo(article.publishedAt ?? article.createdAt)}
                </span>
              </div>

              <h3 className="font-bold text-ink leading-relaxed mb-3 line-clamp-2">
                {article.title}
              </h3>

              <div className="flex items-center justify-between">
                <div className="text-xs text-ink-faint">
                  <span>{article.authorName ?? "غير محدد"}</span>
                  {article.viewCount > 0 && (
                    <span className="mr-3">{article.viewCount.toLocaleString("en")} مشاهدة</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/articles/${article.id}/edit`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-bg-2 hover:bg-bg-2/80 text-ink-soft text-xs transition-colors"
                  >
                    <Edit size={12} />
                    تعديل
                  </Link>
                  <button
                    onClick={() => removeBreaking(article.id)}
                    disabled={removing === article.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs transition-colors disabled:opacity-50"
                  >
                    <X size={12} />
                    {removing === article.id ? "جارٍ..." : "إزالة العاجل"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
