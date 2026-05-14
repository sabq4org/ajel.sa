"use client";

import { useEffect, useState } from "react";
import { X, History, Eye, RotateCcw, Loader2, ChevronLeft } from "lucide-react";

interface Revision {
  id: string;
  title: string;
  contentJson: any;
  note: string | null;
  createdAt: string;
  authorName: string | null;
}

interface VersionHistoryPanelProps {
  open: boolean;
  onClose: () => void;
  articleId: string;
  onRestore: (title: string, contentJson: any) => void;
}

export function VersionHistoryPanel({ open, onClose, articleId, onRestore }: VersionHistoryPanelProps) {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Revision | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelected(null);
    fetch(`/api/articles/${articleId}/revisions`)
      .then((r) => r.json())
      .then((d) => setRevisions(d.revisions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, articleId]);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-paper shadow-2xl flex flex-col"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-line">
          <div className="flex items-center gap-2">
            {selected ? (
              <button
                onClick={() => setSelected(null)}
                className="w-8 h-8 rounded-lg border border-line bg-paper grid place-items-center hover:bg-bg-2 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
            ) : null}
            <History size={16} className="text-burgundy" />
            <h2 className="text-[15px] font-bold text-ink">
              {selected ? "معاينة النسخة" : "سجل النسخ"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-line bg-paper grid place-items-center hover:bg-bg-2 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-16 grid place-items-center text-ink-soft">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : selected ? (
            /* Version detail view */
            <div className="p-5 space-y-4">
              <div className="p-3 bg-bg-2 rounded-xl text-[12px] text-ink-soft">
                <div className="font-semibold text-ink mb-1">{formatDate(selected.createdAt)}</div>
                <div>{selected.authorName ?? "مجهول"}</div>
                {selected.note && <div className="mt-1 text-ink-2 italic">{selected.note}</div>}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-ink-soft mb-1 tracking-wide">العنوان</label>
                <p className="text-[15px] font-bold text-ink leading-snug">{selected.title}</p>
              </div>

              {selected.contentJson && (
                <div>
                  <label className="block text-[11px] font-semibold text-ink-soft mb-1 tracking-wide">المحتوى (JSON)</label>
                  <div className="bg-bg-2 rounded-xl p-3 text-[11px] text-ink-2 font-mono overflow-auto max-h-48">
                    <pre>{JSON.stringify(selected.contentJson, null, 2)}</pre>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  onRestore(selected.title, selected.contentJson);
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-2 bg-burgundy text-white px-4 py-3 rounded-xl text-[13px] font-semibold hover:bg-burgundy-dark transition-all"
              >
                <RotateCcw size={14} />
                استعادة هذه النسخة
              </button>
            </div>
          ) : revisions.length === 0 ? (
            <div className="py-16 text-center text-ink-soft">
              <History size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">لا توجد نسخ محفوظة بعد</p>
              <p className="text-[12px] mt-1">ستظهر هنا عند حفظ التعديلات</p>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {revisions.map((rev, i) => (
                <button
                  key={rev.id}
                  onClick={() => setSelected(rev)}
                  className="w-full text-right p-4 hover:bg-bg-2 transition-colors flex items-start gap-3"
                >
                  {/* Version number badge */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-rose-cream text-burgundy text-[11px] font-bold grid place-items-center mt-0.5">
                    {revisions.length - i}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-ink truncate leading-snug mb-0.5">
                      {rev.title}
                    </p>
                    <p className="text-[11px] text-ink-soft">
                      {formatDate(rev.createdAt)} · {rev.authorName ?? "مجهول"}
                    </p>
                    {rev.note && (
                      <p className="text-[11px] text-ink-2 mt-0.5 truncate italic">{rev.note}</p>
                    )}
                  </div>
                  <Eye size={14} className="text-ink-soft mt-1 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
