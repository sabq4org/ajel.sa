"use client";

import { AdminTopbar } from "@/components/admin/AdminLayout";
import { useEffect, useMemo, useState } from "react";
import { Check, X, Trash2, Loader2, AlertCircle, MessageCircle } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/Modal";
import { toast } from "@/components/admin/Toast";

type Comment = {
  id: string;
  articleId: string;
  articleTitle: string | null;
  articleSlug: string | null;
  authorName: string;
  authorEmail: string | null;
  content: string;
  isApproved: boolean;
  isSpam: boolean;
  createdAt: string;
};

type Filter = "pending" | "approved" | "spam" | "all";

export default function CommentsPage() {
  const [items, setItems] = useState<Comment[]>([]);
  const [counts, setCounts] = useState({ pending: 0, approved: 0, spam: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("pending");
  const [confirmDelete, setConfirmDelete] = useState<Comment | null>(null);

  useEffect(() => {
    void load();
  }, [filter]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/comments?status=${filter}`);
      const d = await res.json();
      setItems(d.items ?? []);
      if (d.counts) setCounts(d.counts);
    } catch {
      toast.error("فشل التحميل");
    } finally {
      setLoading(false);
    }
  }

  async function setFlag(c: Comment, flags: { isApproved?: boolean; isSpam?: boolean }) {
    try {
      const res = await fetch(`/api/comments/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(flags),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("تم التحديث");
      void load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleDelete(c: Comment) {
    try {
      const res = await fetch(`/api/comments/${c.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("تم الحذف");
      setItems((prev) => prev.filter((x) => x.id !== c.id));
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <>
      <AdminTopbar
        title="التعليقات"
        subtitle={`${counts.pending} في الانتظار · ${counts.approved} موافَق عليها · ${counts.spam} مزعجة`}
      />

      <div className="card mb-5 p-4 flex items-center gap-2 flex-wrap">
        {[
          { key: "pending", label: "في الانتظار", count: counts.pending, danger: true },
          { key: "approved", label: "موافَق عليها", count: counts.approved },
          { key: "spam", label: "مزعجة", count: counts.spam },
          { key: "all", label: "الكل", count: counts.pending + counts.approved + counts.spam },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as Filter)}
            className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-all ${
              filter === f.key
                ? "bg-ink text-white"
                : f.danger && f.count > 0
                ? "bg-rose-cream text-burgundy hover:bg-rose-soft"
                : "bg-bg-2 text-ink-2 hover:bg-line"
            }`}
          >
            {f.label}
            <span className="mr-2 opacity-70 text-[11px]">{f.count}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="card py-16 grid place-items-center text-ink-soft"><Loader2 className="animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="card py-16 text-center text-ink-soft text-sm flex flex-col items-center gap-3">
            <MessageCircle size={32} className="opacity-40" />
            <div>لا توجد تعليقات في هذه الفئة</div>
          </div>
        ) : (
          items.map((c) => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[14px] font-bold text-ink">{c.authorName}</span>
                    {c.isSpam && <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><AlertCircle size={10} />مزعج</span>}
                    {c.isApproved && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">موافَق عليه</span>}
                    {!c.isApproved && !c.isSpam && <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">في الانتظار</span>}
                  </div>
                  <div className="text-[11px] text-ink-soft">
                    {c.authorEmail ?? "بدون إيميل"} · {new Date(c.createdAt).toLocaleString("ar-SA-u-ca-gregory-nu-latn")}
                  </div>
                </div>
                <div className="flex gap-1">
                  {!c.isApproved && (
                    <button onClick={() => setFlag(c, { isApproved: true, isSpam: false })} className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1">
                      <Check size={12} /> موافقة
                    </button>
                  )}
                  {c.isApproved && (
                    <button onClick={() => setFlag(c, { isApproved: false })} className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-bg-2 text-ink-2 hover:bg-line transition-colors flex items-center gap-1">
                      <X size={12} /> إلغاء الموافقة
                    </button>
                  )}
                  {!c.isSpam && (
                    <button onClick={() => setFlag(c, { isSpam: true, isApproved: false })} className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors">
                      مزعج
                    </button>
                  )}
                  <button onClick={() => setConfirmDelete(c)} className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <p className="text-[14px] text-ink leading-relaxed mb-2">{c.content}</p>
              {c.articleTitle && (
                <div className="text-[11px] text-ink-soft pt-2 border-t border-line-soft">
                  على خبر: <a href={`/article/${c.articleSlug}`} target="_blank" rel="noopener" className="text-burgundy hover:underline">{c.articleTitle}</a>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => { if (confirmDelete) await handleDelete(confirmDelete); }}
        title="حذف التعليق"
        message="هل تريد حذف هذا التعليق نهائياً؟"
        confirmText="حذف"
        danger
      />
    </>
  );
}
