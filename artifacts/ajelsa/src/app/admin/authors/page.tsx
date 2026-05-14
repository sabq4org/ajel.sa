"use client";

import { AdminTopbar } from "@/components/admin/AdminLayout";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Edit3, Trash2, Loader2, ExternalLink, UserSquare, FileText, Power, Eye } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/Modal";
import { toast } from "@/components/admin/Toast";
import { cn } from "@/lib/utils";

type AuthorRow = {
  id: string;
  slug: string;
  fullName: string;
  position: string | null;
  shortBio: string | null;
  avatarUrl: string | null;
  email: string | null;
  twitter: string | null;
  isActive: boolean;
  opinionCount: number;
  totalReads: number;
  createdAt: string;
};

const READS_FORMATTER = new Intl.NumberFormat("ar-SA");
function formatReads(n: number): string {
  return READS_FORMATTER.format(n ?? 0);
}

export default function AuthorsAdminPage() {
  const [items, setItems] = useState<AuthorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<AuthorRow | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/authors");
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      toast.error("فشل تحميل قائمة الكتّاب");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(author: AuthorRow) {
    const next = !author.isActive;
    setTogglingId(author.id);
    setItems((prev) => prev.map((x) => (x.id === author.id ? { ...x, isActive: next } : x)));
    try {
      const res = await fetch(`/api/authors/${author.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "فشل التحديث");
      }
      toast.success(next ? "تم تفعيل الكاتب" : "تم إيقاف الكاتب");
    } catch (e: any) {
      setItems((prev) => prev.map((x) => (x.id === author.id ? { ...x, isActive: !next } : x)));
      toast.error(e.message ?? "تعذّر تغيير الحالة");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(author: AuthorRow, opts: { cascade?: boolean } = {}) {
    try {
      const url = opts.cascade
        ? `/api/authors/${author.id}?cascade=true`
        : `/api/authors/${author.id}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // 409 → server is asking us to re-confirm with cascade
        if (res.status === 409 && body.requiresConfirmation) {
          setConfirmDelete({
            ...author,
            opinionCount: body.opinionCount ?? author.opinionCount,
          });
          throw new Error("CASCADE_REQUIRED");
        }
        throw new Error(body.error || "فشل الحذف");
      }
      setItems((prev) => prev.filter((x) => x.id !== author.id));
      toast.success(opts.cascade ? "تم حذف الكاتب وجميع مقالاته" : "تم حذف الكاتب");
    } catch (e: any) {
      if (e.message === "CASCADE_REQUIRED") return;
      toast.error(e.message ?? "خطأ في الحذف");
    }
  }

  return (
    <>
      <AdminTopbar
        title="كتّاب الرأي"
        subtitle={`${items.length} كاتب · إدارة ملفات كتّاب الرأي وروابطهم`}
        actions={
          <Link
            href="/admin/authors/new"
            className="bg-burgundy text-white px-4.5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 shadow-red hover:bg-burgundy-dark hover:-translate-y-0.5 transition-all"
          >
            <Plus size={14} /> كاتب جديد
          </Link>
        }
      />

      {loading ? (
        <div className="card p-10 grid place-items-center">
          <Loader2 className="animate-spin text-burgundy" />
        </div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center">
          <UserSquare size={32} className="mx-auto mb-3 text-ink-faint" />
          <div className="text-sm text-ink-soft">لا يوجد كتّاب — أضف الكاتب الأول لبدء نشر مقالات الرأي.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((a) => (
            <div
              key={a.id}
              className="card p-5 flex flex-col gap-3 hover:border-burgundy/40 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-burgundy to-burgundy-soft text-white grid place-items-center font-bold text-lg flex-shrink-0 overflow-hidden">
                  {a.avatarUrl ? (
                    <img src={a.avatarUrl} alt={a.fullName} className="w-full h-full object-cover" />
                  ) : (
                    a.fullName[0]
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold text-ink truncate">{a.fullName}</div>
                  {a.position && (
                    <div className="text-[11px] text-burgundy font-bold mt-0.5 line-clamp-1">
                      {a.position}
                    </div>
                  )}
                  {!a.isActive && (
                    <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-bg-2 text-ink-soft">
                      موقوف
                    </span>
                  )}
                </div>
              </div>

              {a.shortBio && (
                <p className="text-[12px] text-ink-2 leading-relaxed line-clamp-2">{a.shortBio}</p>
              )}

              <div className="flex items-center gap-3 text-[11px] text-ink-soft pt-2 border-t border-line-soft">
                <span className="flex items-center gap-1" title="عدد المقالات">
                  <FileText size={11} />
                  {a.opinionCount} مقال
                </span>
                <span className="text-ink-faint">·</span>
                <span className="flex items-center gap-1" title="إجمالي القراءات">
                  <Eye size={11} />
                  {formatReads(a.totalReads)} قراءة
                </span>
                {a.twitter && (
                  <>
                    <span className="text-ink-faint">·</span>
                    <span>@{a.twitter}</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Link
                  href={`/admin/authors/${a.id}/edit`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 text-[12px] font-bold text-burgundy bg-rose-cream hover:bg-rose-cream/70 px-3 py-2 rounded-lg transition-colors"
                >
                  <Edit3 size={12} /> تعديل
                </Link>
                <button
                  onClick={() => void handleToggleActive(a)}
                  disabled={togglingId === a.id}
                  className={cn(
                    "inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors",
                    a.isActive
                      ? "text-emerald-600 border-line hover:bg-emerald-50"
                      : "text-ink-soft border-line hover:bg-bg-2",
                    togglingId === a.id && "opacity-50 cursor-not-allowed"
                  )}
                  title={a.isActive ? "إيقاف الكاتب" : "تفعيل الكاتب"}
                  aria-label={a.isActive ? "إيقاف الكاتب" : "تفعيل الكاتب"}
                  aria-pressed={a.isActive}
                >
                  {togglingId === a.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Power size={13} />
                  )}
                </button>
                <Link
                  href={`/opinions/author/${a.slug}`}
                  target="_blank"
                  className="inline-flex items-center justify-center text-ink-soft hover:text-burgundy w-9 h-9 rounded-lg border border-line transition-colors"
                  title="عرض الصفحة العامة"
                >
                  <ExternalLink size={13} />
                </Link>
                <button
                  onClick={() => setConfirmDelete(a)}
                  className="inline-flex items-center justify-center text-rose-600 hover:bg-rose-50 w-9 h-9 rounded-lg border border-line transition-colors"
                  title={
                    a.opinionCount > 0
                      ? `حذف الكاتب وجميع مقالاته (${a.opinionCount})`
                      : "حذف"
                  }
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title={
          confirmDelete && confirmDelete.opinionCount > 0
            ? "حذف الكاتب وجميع مقالاته؟"
            : "حذف الكاتب؟"
        }
        message={
          confirmDelete && confirmDelete.opinionCount > 0
            ? `سيتم حذف "${confirmDelete.fullName}" بشكل نهائي، إضافةً إلى ${confirmDelete.opinionCount} مقال رأي منسوبة إليه. لا يمكن التراجع.`
            : `هل أنت متأكد من حذف "${confirmDelete?.fullName}"؟ لا يمكن التراجع.`
        }
        confirmText={
          confirmDelete && confirmDelete.opinionCount > 0
            ? "حذف الكل"
            : "حذف"
        }
        danger
        onConfirm={() => {
          if (confirmDelete) {
            void handleDelete(confirmDelete, {
              cascade: confirmDelete.opinionCount > 0,
            });
          }
        }}
        onClose={() => setConfirmDelete(null)}
      />
    </>
  );
}
