"use client";

import { AdminTopbar } from "@/components/admin/AdminLayout";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, Edit3, Trash2, Eye, Loader2, Search, Sparkles, Wrench } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/Modal";
import { toast } from "@/components/admin/Toast";

function isAiGeneratedImage(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.includes("ai-generated") || url.startsWith("data:");
}

function formatMeta(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} · ${hours}:${minutes}`;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "bg-bg-2 text-ink-soft" },
  review: { label: "قيد المراجعة", color: "bg-amber-50 text-gold" },
  scheduled: { label: "مجدول", color: "bg-blue-50 text-navy" },
  published: { label: "منشور", color: "bg-emerald-50 text-sage" },
  archived: { label: "مؤرشف", color: "bg-rose-cream text-burgundy" },
};

type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  status: keyof typeof STATUS_LABELS;
  type: string;
  isBreaking: boolean;
  publishedAt: string | null;
  createdAt: string;
  viewCount: number;
  categoryName?: string | null;
  authorName?: string | null;
  hasInlineImage?: boolean;
  featuredImageUrl?: string | null;
};

type FilterKey = "all" | "published" | "draft" | "review" | "scheduled" | "breaking";

export default function ArticlesPage() {
  const [items, setItems] = useState<ArticleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [confirmDelete, setConfirmDelete] = useState<ArticleRow | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/articles?limit=100");
      const data = await res.json();
      setItems(
        (data.items ?? []).map((a: any) => ({
          id: a.id,
          slug: a.slug,
          title: a.title,
          status: a.status,
          type: a.type,
          isBreaking: a.isBreaking,
          publishedAt: a.publishedAt,
          createdAt: a.createdAt,
          viewCount: a.viewCount,
          categoryName: a.categoryName ?? null,
          authorName: a.authorName ?? null,
          hasInlineImage: !!a.hasInlineImage,
          featuredImageUrl: a.featuredImageUrl ?? null,
        })),
      );
    } catch (e) {
      toast.error("فشل تحميل الأخبار");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return items.filter((a) => {
      if (filter === "breaking") {
        if (!a.isBreaking) return false;
      } else if (filter !== "all") {
        if (a.status !== filter) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!a.title.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [items, filter, search]);

  async function handleDelete(article: ArticleRow) {
    try {
      const res = await fetch(`/api/articles/${article.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "فشل الحذف");
      setItems((prev) => prev.filter((x) => x.id !== article.id));
      toast.success("تم حذف الخبر");
    } catch (e: any) {
      toast.error(e.message ?? "خطأ في الحذف");
    }
  }

  async function togglePublish(article: ArticleRow) {
    const targetStatus = article.status === "published" ? "draft" : "published";
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "فشل التحديث");
      const data = await res.json();
      setItems((prev) =>
        prev.map((x) =>
          x.id === article.id
            ? { ...x, status: data.article.status, publishedAt: data.article.publishedAt }
            : x,
        ),
      );
      toast.success(targetStatus === "published" ? "تم النشر" : "تم إلغاء النشر");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function toggleBreaking(article: ArticleRow) {
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBreaking: !article.isBreaking }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "فشل التحديث");
      setItems((prev) =>
        prev.map((x) => (x.id === article.id ? { ...x, isBreaking: !x.isBreaking } : x)),
      );
      toast.success(article.isBreaking ? "تم إزالة التعليم كعاجل" : "تم تعليم كعاجل");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const counts = useMemo(() => {
    return {
      all: items.length,
      published: items.filter((a) => a.status === "published").length,
      draft: items.filter((a) => a.status === "draft").length,
      review: items.filter((a) => a.status === "review").length,
      scheduled: items.filter((a) => a.status === "scheduled").length,
      breaking: items.filter((a) => a.isBreaking).length,
    };
  }, [items]);

  const inlineImageCount = useMemo(
    () => items.filter((a) => a.hasInlineImage).length,
    [items],
  );

  return (
    <>
      <AdminTopbar
        title="الأخبار"
        subtitle={`${items.length} خبر · إدارة كاملة لمحتوى الموقع`}
        actions={
          <Link
            href="/admin/articles/new"
            className="bg-burgundy text-white px-4.5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 shadow-red hover:bg-burgundy-dark hover:-translate-y-0.5 transition-all"
          >
            <Plus size={14} /> خبر جديد
          </Link>
        }
      />

      {/* Inline-image cleanup banner */}
      {inlineImageCount > 0 && (
        <div className="card mb-5 p-4 border-amber-300 bg-amber-50/50">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 grid place-items-center shrink-0">
              <Wrench size={18} />
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="text-[14px] font-semibold text-ink">
                {inlineImageCount} خبر بصور غير ظاهرة للقرّاء
              </div>
              <div className="text-[12px] text-ink-soft">
                نظّفها أو أعد توليدها دفعة واحدة من صفحة الصيانة
              </div>
            </div>
            <Link
              href="/admin/maintenance/inline-images"
              className="bg-burgundy text-white px-4 py-2 rounded-xl text-[12px] font-semibold flex items-center gap-2 shadow-red hover:bg-burgundy-dark hover:-translate-y-0.5 transition-all shrink-0"
            >
              <Wrench size={13} /> فتح أداة الصيانة
            </Link>
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="card mb-5 p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 bg-bg border border-line rounded-xl px-3 py-2">
          <Search size={14} className="text-ink-soft" />
          <input
            type="search"
            placeholder="ابحث عن خبر بالعنوان..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm text-ink"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <FilterChip label="الكل" count={counts.all} active={filter === "all"} onClick={() => setFilter("all")} />
          <FilterChip label="منشور" count={counts.published} active={filter === "published"} onClick={() => setFilter("published")} />
          <FilterChip label="مسودة" count={counts.draft} active={filter === "draft"} onClick={() => setFilter("draft")} />
          <FilterChip label="قيد المراجعة" count={counts.review} active={filter === "review"} onClick={() => setFilter("review")} />
          <FilterChip label="مجدول" count={counts.scheduled} active={filter === "scheduled"} onClick={() => setFilter("scheduled")} />
          <FilterChip label="عاجل" count={counts.breaking} active={filter === "breaking"} onClick={() => setFilter("breaking")} burgundy />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="py-16 grid place-items-center text-ink-soft">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-ink-soft text-sm">
            {items.length === 0 ? "لا توجد أخبار بعد. ابدأ بإضافة أول خبر." : "لا توجد نتائج مطابقة."}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-line bg-bg-2">
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-ink-soft tracking-wide">العنوان</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-ink-soft tracking-wide w-28">الحالة</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-ink-soft tracking-wide w-24">القراءات</th>
                <th className="w-44"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const status = STATUS_LABELS[item.status] ?? STATUS_LABELS.draft;
                const isPublished = item.status === "published";
                return (
                  <tr key={item.id} className="border-b border-line-soft last:border-b-0 hover:bg-bg-2/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-start gap-2 flex-wrap">
                        {item.isBreaking && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-burgundy text-white shrink-0">عاجل</span>}
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[14px] text-ink font-medium leading-snug">{item.title}</span>
                            {isAiGeneratedImage(item.featuredImageUrl) && (
                              <span
                                title="صورة مولدة بالذكاء الاصطناعي"
                                className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-rose-cream text-burgundy shrink-0"
                              >
                                <Sparkles size={11} />
                              </span>
                            )}
                            {item.hasInlineImage && (
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 shrink-0"
                                title="الصورة الحالية محفوظة بصيغة data: ولن تظهر للقرّاء — أعد توليد الصورة لإصلاح المشكلة"
                              >
                                ⚠ صورة غير ظاهرة
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-ink-soft leading-tight">
                            بقلم {item.authorName ?? "—"} · {formatMeta(item.publishedAt ?? item.createdAt)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full ${status.color}`}>{status.label}</span>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-ink font-semibold tabular-nums">
                      {item.viewCount > 0 ? item.viewCount.toLocaleString("en") : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => togglePublish(item)}
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                            isPublished
                              ? "border-line text-ink-2 hover:bg-bg-2"
                              : "border-burgundy text-burgundy hover:bg-rose-cream"
                          }`}
                          title={isPublished ? "إلغاء النشر" : "نشر"}
                        >
                          {isPublished ? "إلغاء النشر" : "نشر"}
                        </button>
                        <button
                          onClick={() => toggleBreaking(item)}
                          className={`w-7 h-7 rounded-lg grid place-items-center transition-colors ${
                            item.isBreaking
                              ? "bg-burgundy text-white"
                              : "text-ink-soft hover:bg-bg-2 hover:text-burgundy"
                          }`}
                          title={item.isBreaking ? "إزالة عاجل" : "تعليم كعاجل"}
                        >
                          <span className="text-[10px] font-extrabold">⚡</span>
                        </button>
                        <Link href={`/article/${item.slug}`} target="_blank" className="w-7 h-7 rounded-lg grid place-items-center text-ink-soft hover:bg-bg-2 hover:text-burgundy transition-colors" title="عرض">
                          <Eye size={14} />
                        </Link>
                        <Link href={`/admin/articles/${item.id}/edit`} className="w-7 h-7 rounded-lg grid place-items-center text-ink-soft hover:bg-bg-2 hover:text-burgundy transition-colors" title="تعديل">
                          <Edit3 size={14} />
                        </Link>
                        <button onClick={() => setConfirmDelete(item)} className="w-7 h-7 rounded-lg grid place-items-center text-ink-soft hover:bg-rose-cream hover:text-burgundy transition-colors" title="حذف">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => { if (confirmDelete) await handleDelete(confirmDelete); }}
        title="حذف الخبر"
        message={`هل أنت متأكد من حذف "${confirmDelete?.title}"؟ لا يمكن التراجع عن هذه العملية.`}
        confirmText="حذف نهائي"
        danger
      />
    </>
  );
}

function FilterChip({
  label,
  count,
  active,
  burgundy,
  onClick,
}: {
  label: string;
  count: number;
  active?: boolean;
  burgundy?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-all ${
        active ? "bg-ink text-white" : burgundy ? "bg-rose-cream text-burgundy hover:bg-rose-soft" : "bg-bg-2 text-ink-2 hover:bg-line"
      }`}
    >
      {label}
      <span className="mr-2 opacity-70 text-[11px]">{count}</span>
    </button>
  );
}
