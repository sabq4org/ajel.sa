"use client";

import { AdminTopbar } from "@/components/admin/AdminLayout";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Edit3,
  Trash2,
  Eye,
  Loader2,
  Search,
  PenTool,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { ConfirmDialog } from "@/components/admin/Modal";
import { toast } from "@/components/admin/Toast";
import { AuthorSelect, type AuthorOption } from "@/components/admin/AuthorSelect";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "bg-bg-2 text-ink-soft" },
  review: { label: "قيد المراجعة", color: "bg-amber-50 text-gold" },
  scheduled: { label: "مجدول", color: "bg-blue-50 text-navy" },
  published: { label: "منشور", color: "bg-emerald-50 text-sage" },
  archived: { label: "مؤرشف", color: "bg-rose-cream text-burgundy" },
};

type StatusKey = keyof typeof STATUS_LABELS;
type FilterKey = "all" | "published" | "draft" | "review" | "scheduled";

type OpinionRow = {
  id: string;
  slug: string;
  title: string;
  status: StatusKey;
  isFeatured: boolean;
  publishedAt: string | null;
  createdAt: string;
  viewCount: number;
  authorId?: string | null;
  authorName?: string | null;
  authorSlug?: string | null;
  featuredImageUrl?: string | null;
};

const PAGE_SIZE = 25;

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

export default function OpinionsAdminPage() {
  const [items, setItems] = useState<OpinionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterKey>("all");
  const [authorFilter, setAuthorFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<OpinionRow | null>(null);
  const [authorOptions, setAuthorOptions] = useState<AuthorOption[]>([]);

  // Authors registry — used by both the filter dropdown and any future
  // bulk-reassign flows. Loaded once on mount; the list is small.
  useEffect(() => {
    fetch("/api/authors/options")
      .then((r) => r.json())
      .then((d) => setAuthorOptions(d.items ?? []))
      .catch(() => {
        /* non-fatal — author filter just stays empty */
      });
  }, []);

  // Debounce search input → goes to the server as `?q=`. We keep `search`
  // for the controlled input and `debouncedSearch` for the actual request,
  // so typing doesn't fire a request per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Whenever any server-side filter changes, reset back to page 1. The
  // actual fetch is triggered by the `load` effect below.
  useEffect(() => {
    setPage(1);
  }, [statusFilter, authorFilter, debouncedSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String((page - 1) * PAGE_SIZE));
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (authorFilter) params.set("authorId", authorFilter);
      if (debouncedSearch) params.set("q", debouncedSearch);
      const res = await fetch(`/api/opinions?${params.toString()}`);
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setItems(data.items ?? []);
      setTotal(typeof data.total === "number" ? data.total : 0);
    } catch {
      toast.error("فشل تحميل المقالات");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, authorFilter, debouncedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  // Server now does the search; the rendered list is just `items`. We keep
  // the `filtered` variable for backward-compatibility with the JSX below.
  const filtered = items;

  async function handleDelete(op: OpinionRow) {
    try {
      const res = await fetch(`/api/opinions/${op.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "فشل الحذف");
      toast.success("تم حذف المقال");
      // Refetch to keep total + pagination accurate; if the current page is
      // now empty and we're past page 1, step back one.
      if (items.length === 1 && page > 1) {
        setPage((p) => Math.max(1, p - 1));
      } else {
        void load();
      }
    } catch (e: any) {
      toast.error(e.message ?? "خطأ في الحذف");
    }
  }

  async function togglePublish(op: OpinionRow) {
    const targetStatus = op.status === "published" ? "draft" : "published";
    try {
      const res = await fetch(`/api/opinions/${op.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "فشل التحديث");
      const data = await res.json();
      setItems((prev) =>
        prev.map((x) =>
          x.id === op.id
            ? { ...x, status: data.opinion.status, publishedAt: data.opinion.publishedAt }
            : x
        )
      );
      toast.success(targetStatus === "published" ? "تم النشر" : "تم إلغاء النشر");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(page * PAGE_SIZE, total);

  return (
    <>
      <AdminTopbar
        title="مقالات الرأي"
        subtitle={`${total} مقال · إدارة كل المقالات وكتّابها`}
        actions={
          <Link
            href="/admin/opinions/new"
            className="bg-burgundy text-white px-4.5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 shadow-red hover:bg-burgundy-dark hover:-translate-y-0.5 transition-all"
          >
            <Plus size={14} /> مقال جديد
          </Link>
        }
      />

      {/* Filters: search + status chips + author dropdown */}
      <div className="card p-4 mb-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-bg-2 px-3 py-2 rounded-xl flex-1 min-w-[200px]">
            <Search size={13} className="text-ink-soft" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بعنوان المقال أو اسم الكاتب..."
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>
          {(
            [
              { k: "all", label: "الكل" },
              { k: "published", label: "منشور" },
              { k: "draft", label: "مسودة" },
              { k: "review", label: "مراجعة" },
              { k: "scheduled", label: "مجدول" },
            ] as const
          ).map((c) => (
            <button
              key={c.k}
              onClick={() => setStatusFilter(c.k as FilterKey)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
                statusFilter === c.k
                  ? "bg-burgundy text-white"
                  : "bg-bg-2 text-ink-2 hover:bg-rose-cream hover:text-burgundy"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Author filter */}
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-bold text-ink-soft whitespace-nowrap">
            تصفية حسب الكاتب:
          </span>
          <div className="flex-1 max-w-[320px]">
            <AuthorSelect
              value={authorFilter}
              options={authorOptions}
              onChange={setAuthorFilter}
              placeholder="كل الكتّاب"
            />
          </div>
          {authorFilter && (
            <button
              onClick={() => setAuthorFilter("")}
              className="text-[12px] font-bold text-burgundy hover:underline"
            >
              إزالة الفلتر
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="card p-10 grid place-items-center">
          <Loader2 className="animate-spin text-burgundy" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <PenTool size={32} className="mx-auto mb-3 text-ink-faint" />
          <div className="text-sm text-ink-soft">
            {debouncedSearch
              ? `لا توجد مقالات تطابق "${debouncedSearch}".`
              : "لا توجد مقالات تطابق المعايير."}
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir="rtl">
              <thead>
                <tr className="bg-bg-2 text-ink-soft text-[11px] font-bold tracking-wider">
                  <th className="text-right px-4 py-3">العنوان</th>
                  <th className="text-right px-4 py-3">الكاتب</th>
                  <th className="text-right px-4 py-3">الحالة</th>
                  <th className="text-right px-4 py-3">المشاهدات</th>
                  <th className="text-right px-4 py-3">التاريخ</th>
                  <th className="text-right px-4 py-3 w-[200px]">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((op) => {
                  const s = STATUS_LABELS[op.status];
                  return (
                    <tr key={op.id} className="border-t border-line hover:bg-bg-2/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          {op.featuredImageUrl && (
                            <img
                              src={op.featuredImageUrl}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                            />
                          )}
                          <div className="min-w-0 max-w-[400px]">
                            <div className="font-bold text-ink line-clamp-2">{op.title}</div>
                            {op.isFeatured && (
                              <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-rose-cream text-burgundy font-bold">
                                مميز
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-ink-2">
                        {op.authorName ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-[11px] px-2 py-1 rounded-full font-bold ${s.color}`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-ink-2">{op.viewCount}</td>
                      <td className="px-4 py-3 text-[11px] text-ink-soft whitespace-nowrap">
                        {formatMeta(op.publishedAt ?? op.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => togglePublish(op)}
                            className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-colors ${
                              op.status === "published"
                                ? "bg-bg-2 text-ink-soft hover:bg-line"
                                : "bg-emerald-50 text-sage hover:bg-emerald-100"
                            }`}
                          >
                            {op.status === "published" ? "إلغاء النشر" : "نشر"}
                          </button>
                          <Link
                            href={`/admin/opinions/${op.id}/edit`}
                            className="w-8 h-8 grid place-items-center rounded-lg text-burgundy bg-rose-cream hover:bg-rose-cream/70"
                            title="تعديل"
                          >
                            <Edit3 size={13} />
                          </Link>
                          {op.status === "published" && (
                            <Link
                              href={`/opinion/${op.slug}`}
                              target="_blank"
                              className="w-8 h-8 grid place-items-center rounded-lg text-ink-soft hover:text-burgundy border border-line"
                              title="معاينة"
                            >
                              <Eye size={13} />
                            </Link>
                          )}
                          <button
                            onClick={() => setConfirmDelete(op)}
                            className="w-8 h-8 grid place-items-center rounded-lg text-rose-600 hover:bg-rose-50 border border-line"
                            title="حذف"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom pagination — server-driven via offset/limit on /api/opinions */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-line bg-bg-2/40 flex-wrap">
            <div className="text-[12px] text-ink-soft">
              {total === 0
                ? "لا توجد سجلات"
                : `عرض ${startRow}–${endRow} من ${total}`}
            </div>
            <div className="flex items-center gap-2" dir="ltr">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-line bg-paper text-[12px] font-bold text-ink-2 hover:bg-rose-cream hover:text-burgundy disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowRight size={12} /> السابق
              </button>
              <div className="text-[12px] font-bold text-ink-soft px-2">
                صفحة {page} من {totalPages}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-line bg-paper text-[12px] font-bold text-ink-2 hover:bg-rose-cream hover:text-burgundy disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                التالي <ArrowLeft size={12} />
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="حذف المقال؟"
        message={`هل أنت متأكد من حذف "${confirmDelete?.title}"؟ لا يمكن التراجع.`}
        confirmText="حذف"
        danger
        onConfirm={() => {
          if (confirmDelete) void handleDelete(confirmDelete);
        }}
        onClose={() => setConfirmDelete(null)}
      />
    </>
  );
}
