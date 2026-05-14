"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GitBranch, FileText, Clock, CheckCircle, Calendar, ArrowLeft, Plus, Loader2 } from "lucide-react";

interface Article {
  id: string;
  title: string;
  status: string;
  authorName: string | null;
  categoryName: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

const COLUMNS = [
  {
    key: "draft",
    label: "مسودات",
    icon: FileText,
    color: "text-ink-soft",
    headerBg: "bg-bg-2",
    badgeBg: "bg-bg-2 text-ink-soft border-line",
    nextStatus: "review",
    nextLabel: "إرسال للمراجعة",
  },
  {
    key: "review",
    label: "قيد المراجعة",
    icon: Clock,
    color: "text-amber-600",
    headerBg: "bg-amber-50",
    badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
    nextStatus: "scheduled",
    nextLabel: "جدولة للنشر",
  },
  {
    key: "scheduled",
    label: "مجدول",
    icon: Calendar,
    color: "text-blue-600",
    headerBg: "bg-blue-50",
    badgeBg: "bg-blue-50 text-blue-700 border-blue-200",
    nextStatus: "published",
    nextLabel: "نشر الآن",
  },
  {
    key: "published",
    label: "منشور",
    icon: CheckCircle,
    color: "text-emerald-600",
    headerBg: "bg-emerald-50",
    badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    nextStatus: null,
    nextLabel: null,
  },
] as const;

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `${mins}د`;
  if (hours < 24) return `${hours}س`;
  return `${days}ي`;
}

export default function WorkflowPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState<string | null>(null);

  const fetchArticles = async () => {
    try {
      const res = await fetch("/api/articles?limit=100");
      const data = await res.json();
      setArticles(data.items ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchArticles(); }, []);

  const moveArticle = async (id: string, newStatus: string) => {
    setMoving(id);
    try {
      const res = await fetch(`/api/articles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setArticles((prev) =>
          prev.map((a) => a.id === id ? { ...a, status: newStatus } : a)
        );
      }
    } finally {
      setMoving(null);
    }
  };

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.key] = articles.filter((a) => a.status === col.key);
    return acc;
  }, {} as Record<string, Article[]>);

  return (
    <div className="p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#8c1d2b]/10 grid place-items-center">
            <GitBranch size={20} className="text-[#8c1d2b]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">سير العمل التحريري</h1>
            <p className="text-sm text-ink-soft">تتبع مراحل الأخبار من المسودة للنشر</p>
          </div>
        </div>
        <Link
          href="/admin/articles/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#8c1d2b] text-white text-sm font-medium hover:bg-[#7a1824] transition-colors"
        >
          <Plus size={15} />
          خبر جديد
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-ink-faint" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {COLUMNS.map((col, colIdx) => {
            const Icon = col.icon;
            const colArticles = grouped[col.key] ?? [];
            const nextCol = COLUMNS[colIdx + 1];
            return (
              <div key={col.key} className="flex flex-col">
                {/* Column Header */}
                <div className={`flex items-center justify-between px-4 py-3 rounded-xl mb-3 ${col.headerBg} border border-line`}>
                  <div className="flex items-center gap-2">
                    <Icon size={16} className={col.color} />
                    <span className={`font-semibold text-sm ${col.color}`}>{col.label}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${col.badgeBg}`}>
                    {colArticles.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-3 flex-1">
                  {colArticles.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-line bg-paper/50 py-8 text-center">
                      <p className="text-xs text-ink-faint">لا توجد أخبار</p>
                    </div>
                  ) : (
                    colArticles.map((article) => (
                      <div key={article.id} className="card hover:shadow-sm transition-shadow p-4">
                        <h3 className="text-sm font-semibold text-ink leading-relaxed line-clamp-2 mb-2">
                          {article.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-ink-faint mb-3">
                          {article.authorName && <span>{article.authorName}</span>}
                          {article.categoryName && (
                            <>
                              <span>·</span>
                              <span>{article.categoryName}</span>
                            </>
                          )}
                          <span>·</span>
                          <span>{timeAgo(article.updatedAt ?? article.createdAt)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/articles/${article.id}/edit`}
                            className="flex-1 text-center py-1.5 rounded-lg bg-bg-2 hover:bg-bg-2/80 text-xs text-ink-soft transition-colors"
                          >
                            تعديل
                          </Link>
                          {col.nextStatus && col.nextLabel && (
                            <button
                              onClick={() => moveArticle(article.id, col.nextStatus!)}
                              disabled={moving === article.id}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#8c1d2b]/10 hover:bg-[#8c1d2b]/20 text-xs text-[#8c1d2b] font-medium transition-colors disabled:opacity-50"
                            >
                              {moving === article.id ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                <ArrowLeft size={11} />
                              )}
                              {col.nextLabel}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
