"use client";

import { AdminTopbar } from "@/components/admin/AdminLayout";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Upload, Trash2, Loader2, Image as ImageIcon, Copy,
  HardDrive, Cloud, Database, Filter, Search, RefreshCw,
  Link2, AlertTriangle, ExternalLink, X,
} from "lucide-react";
import { Modal } from "@/components/admin/Modal";
import { toast } from "@/components/admin/Toast";

type StorageSource = "cloudinary" | "object_storage" | "local" | null;

type Media = {
  id: string;
  filename: string;
  originalFilename: string | null;
  url: string;
  mimeType: string | null;
  sizeBytes: number | null;
  altText: string | null;
  storageSource: StorageSource;
  createdAt: string;
  uploaderName: string | null;
  usageCount: number;
};

type Stats = {
  total: number;
  totalBytes: number;
  bySource: Record<string, { count: number; bytes: number }>;
};

type LinkedArticle = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "review" | "scheduled" | "published" | "archived";
  publishedAt: string | null;
  usage?: "featured" | "og" | "content";
};

function fmtBytes(b: number): string {
  if (b >= 1_073_741_824) return `${(b / 1_073_741_824).toFixed(1)} GB`;
  if (b >= 1_048_576) return `${(b / 1_048_576).toFixed(1)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${b} B`;
}

const SOURCE_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  object_storage: { label: "Object Storage", icon: Database, color: "text-violet-700", bg: "bg-violet-100" },
  cloudinary:     { label: "Cloudinary",      icon: Cloud,     color: "text-blue-700",   bg: "bg-blue-100"   },
  local:          { label: "محلي",            icon: HardDrive, color: "text-ink-soft",   bg: "bg-bg-2"       },
};

const STATUS_META: Record<LinkedArticle["status"], { label: string; bg: string; color: string }> = {
  draft:     { label: "مسودة",    bg: "bg-bg-2",       color: "text-ink-soft" },
  review:    { label: "مراجعة",   bg: "bg-amber-100",  color: "text-amber-800" },
  scheduled: { label: "مجدول",    bg: "bg-blue-100",   color: "text-blue-800" },
  published: { label: "منشور",    bg: "bg-emerald-100", color: "text-emerald-800" },
  archived:  { label: "مؤرشف",    bg: "bg-bg-2",       color: "text-ink-soft" },
};

const USAGE_LABEL: Record<NonNullable<LinkedArticle["usage"]>, string> = {
  featured: "صورة رئيسية",
  og:       "صورة المشاركة",
  content:  "ضمن المحتوى",
};

function SourceBadge({ source }: { source: StorageSource }) {
  const s = source ?? "local";
  const m = SOURCE_META[s] ?? SOURCE_META.local;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${m.bg} ${m.color}`}>
      <Icon size={9} />
      {m.label}
    </span>
  );
}

export default function MediaPage() {
  const [items, setItems] = useState<Media[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ media: Media; warning?: { articles: LinkedArticle[]; publishedCount: number } } | null>(null);
  const [filterSource, setFilterSource] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [usagePanel, setUsagePanel] = useState<Media | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/media");
      const d = await res.json();
      setItems(d.items ?? []);
      setStats(d.stats ?? null);
    } catch {
      toast.error("فشل التحميل");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    let ok = 0, fail = 0;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (res.ok) ok++; else fail++;
      } catch { fail++; }
    }
    setUploading(false);
    if (ok) toast.success(`تم رفع ${ok} ملف`);
    if (fail) toast.error(`فشل ${fail} ملف`);
    void load();
  }

  async function performDelete(m: Media, force: boolean) {
    const res = await fetch(`/api/media/${m.id}${force ? "?force=true" : ""}`, { method: "DELETE" });

    if (res.status === 409) {
      const body = await res.json();
      setConfirmDelete({
        media: m,
        warning: { articles: body.articles ?? [], publishedCount: body.publishedCount ?? 0 },
      });
      return;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "خطأ");
    }

    toast.success("تم الحذف");
    setItems((prev) => prev.filter((x) => x.id !== m.id));
    setConfirmDelete(null);
    if (stats) {
      const src = m.storageSource ?? "local";
      const prev = stats.bySource[src];
      setStats({
        total: stats.total - 1,
        totalBytes: stats.totalBytes - (m.sizeBytes ?? 0),
        bySource: {
          ...stats.bySource,
          [src]: { count: (prev?.count ?? 1) - 1, bytes: (prev?.bytes ?? 0) - (m.sizeBytes ?? 0) },
        },
      });
    }
  }

  async function handleDelete(m: Media, force = false) {
    try {
      await performDelete(m, force);
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(window.location.origin + url);
      toast.success("تم نسخ الرابط");
    } catch {}
  }

  const filtered = items.filter((m) => {
    if (filterSource !== "all" && (m.storageSource ?? "local") !== filterSource) return false;
    if (search && !m.originalFilename?.toLowerCase().includes(search.toLowerCase()) && !m.altText?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const sources = Array.from(new Set(items.map((m) => m.storageSource ?? "local")));

  return (
    <>
      <AdminTopbar
        title="مكتبة الوسائط"
        subtitle={stats ? `${stats.total} ملف · ${fmtBytes(stats.totalBytes)}` : "مكتبة الصور والملفات"}
        actions={
          <>
            <button onClick={() => void load()} className="border border-line px-3.5 py-2 rounded-xl text-[13px] font-medium text-ink-2 hover:bg-bg-2 flex items-center gap-1.5">
              <RefreshCw size={13} />
              تحديث
            </button>
            <input ref={inputRef} type="file" accept="image/*,video/*" multiple onChange={(e) => handleUpload(e.target.files)} className="hidden" />
            <button onClick={() => inputRef.current?.click()} disabled={uploading} className="bg-burgundy text-white px-4 py-2 rounded-xl text-[13px] font-semibold flex items-center gap-2 shadow-red hover:bg-burgundy-dark transition-all disabled:opacity-50">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? "جاري الرفع..." : "رفع ملف"}
            </button>
          </>
        }
      />

      {/* ── إحصائيات التخزين ── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <StatCard label="إجمالي الملفات" value={String(stats.total)} icon={ImageIcon} color="text-ink" />
          <StatCard label="إجمالي الحجم" value={fmtBytes(stats.totalBytes)} icon={HardDrive} color="text-ink" />
          {sources.map((src) => {
            const m = SOURCE_META[src] ?? SOURCE_META.local;
            const Icon = m.icon;
            return (
              <StatCard
                key={src}
                label={m.label}
                value={`${stats.bySource[src]?.count ?? 0} ملف · ${fmtBytes(stats.bySource[src]?.bytes ?? 0)}`}
                icon={Icon}
                color={m.color}
              />
            );
          })}
        </div>
      )}

      {/* ── فلاتر وبحث ── */}
      <div className="card mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 border border-line rounded-xl px-3 py-1.5 flex-1 min-w-[180px]">
            <Search size={13} className="text-ink-soft flex-shrink-0" />
            <input
              type="search"
              placeholder="ابحث بالاسم..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-ink-faint"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-ink-soft" />
            <span className="text-xs text-ink-soft">المصدر:</span>
            {(["all", ...sources]).map((s) => (
              <button
                key={s}
                onClick={() => setFilterSource(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterSource === s ? "bg-burgundy text-white" : "bg-bg-2 text-ink-2 hover:bg-rose-cream"}`}
              >
                {s === "all" ? "الكل" : (SOURCE_META[s]?.label ?? s)}
                {s !== "all" && stats?.bySource[s] && (
                  <span className="mr-1 opacity-70">({stats.bySource[s].count})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── شبكة الملفات ── */}
      {loading ? (
        <div className="card py-16 grid place-items-center text-ink-soft"><Loader2 className="animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center text-ink-soft text-sm flex flex-col items-center gap-3">
          <ImageIcon size={32} className="opacity-40" />
          <div>{items.length === 0 ? "المكتبة فارغة. ارفع أول ملف." : "لا توجد نتائج للفلتر المحدد."}</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((m) => (
            <MediaCard
              key={m.id}
              item={m}
              onCopy={() => copyUrl(m.url)}
              onDelete={() => setConfirmDelete({ media: m })}
              onOpen={() => setUsagePanel(m)}
            />
          ))}
        </div>
      )}

      <DeleteDialog
        state={confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={async (force) => {
          if (confirmDelete) await handleDelete(confirmDelete.media, force);
        }}
      />

      <UsagePanel
        media={usagePanel}
        onClose={() => setUsagePanel(null)}
      />
    </>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="card flex items-center gap-3 py-3">
      <div className={`w-9 h-9 rounded-xl bg-bg-2 grid place-items-center flex-shrink-0 ${color}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-ink-soft truncate">{label}</p>
        <p className="text-sm font-bold text-ink truncate">{value}</p>
      </div>
    </div>
  );
}

function MediaCard({
  item,
  onCopy,
  onDelete,
  onOpen,
}: {
  item: Media;
  onCopy: () => void;
  onDelete: () => void;
  onOpen: () => void;
}) {
  const isImage = item.mimeType?.startsWith("image/");
  const used = (item.usageCount ?? 0) > 0;
  return (
    <div className="group card overflow-hidden p-0 relative">
      {/* الصورة / placeholder — clickable to open usage panel */}
      <button
        type="button"
        onClick={onOpen}
        className="aspect-square overflow-hidden relative w-full block focus:outline-none focus:ring-2 focus:ring-burgundy/40"
        aria-label="عرض الأخبار المرتبطة"
      >
        {isImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={item.url} alt={item.altText ?? ""} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full grid place-items-center bg-bg-2 text-ink-soft text-xs p-2 text-center">{item.mimeType ?? "ملف"}</div>
        )}

        {/* usage badge — top-left corner */}
        <span
          className={`absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold backdrop-blur-sm ${
            used ? "bg-burgundy/90 text-white" : "bg-white/85 text-ink-soft"
          }`}
          title={used ? `مُستخدم في ${item.usageCount} خبر` : "غير مُستخدم"}
        >
          <Link2 size={9} />
          {item.usageCount ?? 0}
        </span>
      </button>

      {/* hover actions overlay — pointer-events only enabled on hover so it doesn't block the underlying card click */}
      <div className="pointer-events-none absolute inset-x-0 top-0 aspect-square flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
        <div className="flex items-center gap-2 bg-black/45 px-2 py-1 rounded-xl">
          <button onClick={onCopy} className="bg-white/90 text-ink p-1.5 rounded-lg hover:bg-white" title="نسخ الرابط">
            <Copy size={13} />
          </button>
          <button onClick={onOpen} className="bg-white/90 text-ink p-1.5 rounded-lg hover:bg-white" title="الأخبار المرتبطة">
            <Link2 size={13} />
          </button>
          <button onClick={onDelete} className="bg-rose-600 text-white p-1.5 rounded-lg hover:bg-rose-700" title="حذف">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* metadata */}
      <div className="px-2.5 py-2 border-t border-line">
        <p className="text-[11px] text-ink truncate font-medium">{item.originalFilename ?? item.filename}</p>
        <div className="flex items-center justify-between mt-1.5 gap-1 flex-wrap">
          <SourceBadge source={item.storageSource} />
          {item.sizeBytes != null && (
            <span className="text-[10px] text-ink-faint">{fmtBytes(item.sizeBytes)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function UsagePanel({ media, onClose }: { media: Media | null; onClose: () => void }) {
  const [data, setData] = useState<{ articles: LinkedArticle[]; total: number; publishedCount: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!media) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/media/${media.id}/usage`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData({ articles: d.articles ?? [], total: d.total ?? 0, publishedCount: d.publishedCount ?? 0 });
      })
      .catch(() => { if (!cancelled) toast.error("فشل تحميل الأخبار المرتبطة"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [media]);

  return (
    <Modal
      open={media !== null}
      onClose={onClose}
      title="الأخبار التي تستخدم هذا الملف"
      width="max-w-2xl"
    >
      {media && (
        <div className="space-y-4">
          {/* preview header */}
          <div className="flex items-center gap-3 pb-4 border-b border-line">
            {media.mimeType?.startsWith("image/") ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={media.url} alt="" className="w-16 h-16 rounded-lg object-cover border border-line" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-bg-2 grid place-items-center text-ink-soft">
                <ImageIcon size={20} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink truncate">{media.originalFilename ?? media.filename}</p>
              <p className="text-xs text-ink-soft truncate" dir="ltr">{media.url}</p>
            </div>
          </div>

          {loading ? (
            <div className="py-10 grid place-items-center text-ink-soft">
              <Loader2 className="animate-spin" />
            </div>
          ) : !data || data.articles.length === 0 ? (
            <div className="py-10 text-center text-sm text-ink-soft">
              <Link2 size={28} className="mx-auto mb-2 opacity-40" />
              <p>لا توجد أخبار مرتبطة بهذا الملف.</p>
              <p className="text-xs mt-1 text-ink-faint">يمكنك حذفه بأمان.</p>
            </div>
          ) : (
            <>
              <div className="text-xs text-ink-soft">
                {data.total} خبر مرتبط
                {data.publishedCount > 0 && ` · ${data.publishedCount} منها منشور`}
              </div>
              <ul className="divide-y divide-line border border-line rounded-xl overflow-hidden">
                {data.articles.map((a) => {
                  const sm = STATUS_META[a.status];
                  return (
                    <li key={a.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-bg-2/60">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <a
                            href={`/admin/articles/${a.id}/edit`}
                            className="text-sm font-medium text-ink hover:text-burgundy truncate"
                          >
                            {a.title}
                          </a>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${sm.bg} ${sm.color}`}>
                            {sm.label}
                          </span>
                          {a.usage && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-bg-2 text-ink-soft">
                              {USAGE_LABEL[a.usage]}
                            </span>
                          )}
                        </div>
                        {a.publishedAt && (
                          <p className="text-[11px] text-ink-faint mt-0.5">
                            {new Date(a.publishedAt).toLocaleDateString("ar-SA")}
                          </p>
                        )}
                      </div>
                      {a.status === "published" && (
                        <a
                          href={`/article/${a.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ink-soft hover:text-burgundy p-1.5 rounded-lg hover:bg-bg-2"
                          title="عرض الخبر"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

function DeleteDialog({
  state,
  onClose,
  onConfirm,
}: {
  state: { media: Media; warning?: { articles: LinkedArticle[]; publishedCount: number } } | null;
  onClose: () => void;
  onConfirm: (force: boolean) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  if (!state) return null;
  const { media, warning } = state;
  const hasWarning = !!warning && warning.articles.length > 0;
  const publishedCount = warning?.publishedCount ?? 0;
  const draftCount = (warning?.articles.length ?? 0) - publishedCount;
  const warningTitle = publishedCount > 0
    ? "تحذير: الملف مستخدم في أخبار منشورة"
    : "تحذير: الملف مستخدم في أخبار";
  const warningHeadline = publishedCount > 0
    ? `سيؤثر الحذف على ${publishedCount} خبر منشور${draftCount > 0 ? ` و ${draftCount} مسودة` : ""}`
    : `سيؤثر الحذف على ${warning?.articles.length ?? 0} ${(warning?.articles.length ?? 0) === 1 ? "خبر" : "أخبار"}`;

  async function run(force: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm(force);
    } finally {
      setBusy(false);
    }
  }

  if (!hasWarning) {
    return (
      <Modal
        open
        onClose={busy ? () => {} : onClose}
        title="حذف الملف"
        width="max-w-md"
      >
        <p className="text-sm text-ink-2 leading-relaxed mb-6">
          حذف "{media.originalFilename ?? media.filename}" نهائياً؟ سيتم إزالته من التخزين
          ومن أي خبر يستخدمه.
        </p>
        <div className="flex items-center gap-2 justify-start">
          <button
            disabled={busy}
            onClick={() => void run(false)}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-60 flex items-center gap-1.5"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            حذف
          </button>
          <button
            disabled={busy}
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-ink-2 border border-line hover:bg-bg transition-colors disabled:opacity-60"
          >
            إلغاء
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={busy ? () => {} : onClose}
      title={warningTitle}
      width="max-w-lg"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-bold mb-1">{warningHeadline}</p>
            <p className="text-xs leading-relaxed">
              سيؤدي حذف هذا الملف إلى كسر الصور في الأخبار التالية. تأكد من استبدالها أولاً
              أو اضغط "حذف رغم ذلك" للمتابعة.
            </p>
          </div>
        </div>

        <ul className="divide-y divide-line border border-line rounded-xl overflow-hidden max-h-60 overflow-y-auto">
          {warning!.articles.map((a) => {
            const sm = STATUS_META[a.status];
            return (
              <li key={a.id} className="px-3 py-2 flex items-center gap-2">
                <a
                  href={`/admin/articles/${a.id}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-sm font-medium text-ink hover:text-burgundy truncate"
                >
                  {a.title}
                </a>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${sm.bg} ${sm.color}`}>
                  {sm.label}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2 justify-start">
          <button
            disabled={busy}
            onClick={() => void run(true)}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-60 flex items-center gap-1.5"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            حذف رغم ذلك
          </button>
          <button
            disabled={busy}
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-ink-2 border border-line hover:bg-bg transition-colors disabled:opacity-60 flex items-center gap-1.5"
          >
            <X size={13} />
            إلغاء
          </button>
        </div>
      </div>
    </Modal>
  );
}
