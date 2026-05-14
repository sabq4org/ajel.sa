"use client";

import { AdminTopbar } from "@/components/admin/AdminLayout";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Edit3, Loader2, Sparkles, Trash2, RefreshCw, ExternalLink } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/Modal";
import { toast } from "@/components/admin/Toast";

type InlineImageRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  status: string;
  type: string;
  publishedAt: string | null;
  createdAt: string;
  categoryId: string | null;
  categoryName: string | null;
  authorName: string | null;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "مسودة", color: "bg-bg-2 text-ink-soft" },
  review: { label: "قيد المراجعة", color: "bg-amber-50 text-gold" },
  scheduled: { label: "مجدول", color: "bg-blue-50 text-navy" },
  published: { label: "منشور", color: "bg-emerald-50 text-sage" },
  archived: { label: "مؤرشف", color: "bg-rose-cream text-burgundy" },
};

type RowState = "idle" | "regenerating" | "clearing" | "done" | "failed";

export default function InlineImagesMaintenancePage() {
  const [items, setItems] = useState<InlineImageRow[]>([]);
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [bulkClearOpen, setBulkClearOpen] = useState(false);
  const [bulkRegenRunning, setBulkRegenRunning] = useState(false);
  const [bulkRegenProgress, setBulkRegenProgress] = useState({ done: 0, total: 0, failed: 0 });

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/inline-images");
      if (!res.ok) throw new Error((await res.json()).error || "فشل التحميل");
      const data = await res.json();
      setItems(data.items ?? []);
      setRowState({});
      setRowError({});
    } catch (e: any) {
      toast.error(e.message ?? "فشل تحميل القائمة");
    } finally {
      setLoading(false);
    }
  }

  const publishedCount = useMemo(
    () => items.filter((i) => i.status === "published").length,
    [items],
  );

  function setState(id: string, state: RowState, err?: string) {
    setRowState((prev) => ({ ...prev, [id]: state }));
    if (err !== undefined) {
      setRowError((prev) => ({ ...prev, [id]: err }));
    } else {
      setRowError((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    }
  }

  async function regenerateOne(item: InlineImageRow): Promise<boolean> {
    setState(item.id, "regenerating");
    try {
      const genRes = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          excerpt: item.excerpt || undefined,
          category: item.categoryName || undefined,
          style: "photorealistic",
        }),
      });
      if (!genRes.ok) {
        const err = await genRes.json().catch(() => ({}));
        throw new Error(err.error || `فشل توليد الصورة (${genRes.status})`);
      }
      const { url } = await genRes.json();
      if (typeof url !== "string" || url.startsWith("data:")) {
        throw new Error("تعذّر حفظ الصورة في التخزين السحابي");
      }

      const patchRes = await fetch(`/api/articles/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featuredImageUrl: url, featuredMediaId: null }),
      });
      if (!patchRes.ok) {
        const err = await patchRes.json().catch(() => ({}));
        throw new Error(err.error || `فشل تحديث الخبر (${patchRes.status})`);
      }
      setState(item.id, "done");
      return true;
    } catch (e: any) {
      setState(item.id, "failed", e.message ?? "خطأ غير معروف");
      return false;
    }
  }

  async function clearOne(item: InlineImageRow): Promise<boolean> {
    setState(item.id, "clearing");
    try {
      const res = await fetch("/api/admin/inline-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [item.id] }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `فشل التنظيف (${res.status})`);
      }
      setState(item.id, "done");
      return true;
    } catch (e: any) {
      setState(item.id, "failed", e.message ?? "خطأ غير معروف");
      return false;
    }
  }

  async function handleRegenerateAll() {
    if (items.length === 0) return;
    const queue = items.filter((i) => rowState[i.id] !== "done");
    if (queue.length === 0) {
      toast.info("لا توجد عناصر متبقية لإعادة التوليد");
      return;
    }
    setBulkRegenRunning(true);
    setBulkRegenProgress({ done: 0, total: queue.length, failed: 0 });
    let done = 0;
    let failed = 0;
    for (const item of queue) {
      const ok = await regenerateOne(item);
      if (ok) done++;
      else failed++;
      setBulkRegenProgress({ done: done + failed, total: queue.length, failed });
    }
    setBulkRegenRunning(false);
    if (failed === 0) {
      toast.success(`تم توليد ${done} صورة بنجاح`);
    } else {
      toast.error(`اكتمل: ${done} نجحت، ${failed} فشلت`);
    }
    // Refresh: successful items will no longer match the filter on the server.
    await load();
  }

  async function handleBulkClear() {
    setBulkClearOpen(false);
    try {
      const res = await fetch("/api/admin/inline-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "فشل التنظيف الجماعي");
      }
      const data = await res.json();
      toast.success(`تم تنظيف ${data.cleared} خبر — الصور أُزيلت دون المساس بالمحتوى`);
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "فشل التنظيف الجماعي");
    }
  }

  return (
    <>
      <AdminTopbar
        title="تنظيف الصور المضمّنة"
        subtitle="مقالات قديمة محفوظة بصيغة data: ولا تظهر للقرّاء — أعد توليدها أو نظّفها دفعة واحدة"
      />

      {/* Summary card */}
      <div className="card mb-5 p-5">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 grid place-items-center shrink-0">
            <AlertTriangle size={22} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="text-[15px] font-semibold text-ink mb-1">
              {loading
                ? "جارِ الفحص…"
                : items.length === 0
                ? "لا توجد مقالات بصور مضمّنة "
                : `${items.length} خبر يحتوي على صورة مضمّنة`}
            </div>
            <p className="text-[13px] text-ink-soft leading-relaxed">
              هذه المقالات تحتفظ برابط صورة بصيغة <code className="bg-bg-2 px-1.5 py-0.5 rounded text-[11px]">data:</code> وقد
              أُخفيت الصور تلقائياً عن القرّاء. يمكنك إعادة توليدها بالذكاء الاصطناعي أو إزالة الصور
              المعطوبة فقط دون أي تأثير على نص الخبر.
            </p>
            {publishedCount > 0 && !loading && (
              <div className="mt-2 text-[12px] text-burgundy font-semibold">
                ⚠ منها {publishedCount} خبر منشور حالياً للقرّاء
              </div>
            )}
          </div>
          {!loading && items.length > 0 && (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleRegenerateAll}
                disabled={bulkRegenRunning}
                className="bg-burgundy text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 shadow-red hover:bg-burgundy-dark hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
                title="توليد صورة بالذكاء الاصطناعي لكل خبر باستخدام Imagen 4"
              >
                {bulkRegenRunning ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <Sparkles size={14} />
                )}
                إعادة توليد الكل
              </button>
              <button
                onClick={() => setBulkClearOpen(true)}
                disabled={bulkRegenRunning}
                className="bg-bg-2 text-ink px-4 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 border border-line hover:bg-line transition-colors disabled:opacity-60"
                title="إزالة جميع روابط الصور المعطوبة دون تعديل المحتوى"
              >
                <Trash2 size={14} />
                تنظيف الكل
              </button>
              <button
                onClick={load}
                disabled={bulkRegenRunning}
                className="w-10 h-10 grid place-items-center rounded-xl border border-line text-ink-soft hover:bg-bg-2 transition-colors disabled:opacity-60"
                title="تحديث القائمة"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          )}
        </div>

        {bulkRegenRunning && (
          <div className="mt-4 pt-4 border-t border-line">
            <div className="flex items-center justify-between text-[12px] text-ink-soft mb-2">
              <span>
                جارِ التوليد… {bulkRegenProgress.done}/{bulkRegenProgress.total}
                {bulkRegenProgress.failed > 0 && (
                  <span className="text-burgundy mr-2">({bulkRegenProgress.failed} فشل)</span>
                )}
              </span>
              <span className="tabular-nums">
                {bulkRegenProgress.total > 0
                  ? Math.round((bulkRegenProgress.done / bulkRegenProgress.total) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="h-2 bg-bg-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-burgundy transition-all"
                style={{
                  width: `${
                    bulkRegenProgress.total > 0
                      ? (bulkRegenProgress.done / bulkRegenProgress.total) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="py-16 grid place-items-center text-ink-soft">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-ink-soft text-sm">
            ✅ كل المقالات نظيفة — لا توجد صور مضمّنة معطوبة
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-line bg-bg-2">
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-ink-soft tracking-wide">العنوان</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-ink-soft tracking-wide w-32">القسم</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-ink-soft tracking-wide w-28">الحالة</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-ink-soft tracking-wide w-64">الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const status = STATUS_LABELS[item.status] ?? STATUS_LABELS.draft;
                const state = rowState[item.id] ?? "idle";
                const error = rowError[item.id];
                const busy = state === "regenerating" || state === "clearing";
                return (
                  <tr key={item.id} className="border-b border-line-soft last:border-b-0 hover:bg-bg-2/40 transition-colors align-top">
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-1">
                        <div className="text-[14px] text-ink font-medium leading-snug">{item.title}</div>
                        {item.excerpt && (
                          <div className="text-[12px] text-ink-soft line-clamp-2 leading-relaxed">{item.excerpt}</div>
                        )}
                        {error && (
                          <div className="text-[11px] text-burgundy font-semibold mt-1">⚠ {error}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-ink-soft">
                      {item.categoryName ?? <span className="opacity-50">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {state === "done" ? (
                          <span className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-sage">
                            ✓ تم
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => regenerateOne(item)}
                              disabled={busy || bulkRegenRunning}
                              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-burgundy text-burgundy hover:bg-rose-cream transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                              {state === "regenerating" ? (
                                <Loader2 className="animate-spin" size={11} />
                              ) : (
                                <Sparkles size={11} />
                              )}
                              توليد
                            </button>
                            <button
                              onClick={() => clearOne(item)}
                              disabled={busy || bulkRegenRunning}
                              className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-line text-ink-2 hover:bg-bg-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                              {state === "clearing" ? (
                                <Loader2 className="animate-spin" size={11} />
                              ) : (
                                <Trash2 size={11} />
                              )}
                              تنظيف
                            </button>
                          </>
                        )}
                        <Link
                          href={`/admin/articles/${item.id}/edit`}
                          className="w-8 h-8 grid place-items-center rounded-lg text-ink-soft hover:bg-bg-2 hover:text-burgundy transition-colors"
                          title="تعديل الخبر"
                        >
                          <Edit3 size={13} />
                        </Link>
                        <Link
                          href={`/article/${item.slug}`}
                          target="_blank"
                          className="w-8 h-8 grid place-items-center rounded-lg text-ink-soft hover:bg-bg-2 hover:text-burgundy transition-colors"
                          title="عرض الخبر"
                        >
                          <ExternalLink size={13} />
                        </Link>
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
        open={bulkClearOpen}
        onClose={() => setBulkClearOpen(false)}
        onConfirm={handleBulkClear}
        title="تنظيف جميع الصور المضمّنة"
        message={`سيتم إزالة رابط الصورة المعطوبة من ${items.length} خبر دون أي تأثير على النص أو العنوان أو التصنيف. هل أنت متأكد؟`}
        confirmText="نعم، نظّف الكل"
      />
    </>
  );
}
