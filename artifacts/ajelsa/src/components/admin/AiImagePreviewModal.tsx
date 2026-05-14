"use client";

import { Loader2, RefreshCw, Check, X, Sparkles } from "lucide-react";

export interface AiImageResult {
  url: string;
  model: string;
  width: number;
  height: number;
  sizeKB?: number;
}

interface AiImagePreviewModalProps {
  open: boolean;
  result: AiImageResult | null;
  /** True while a regenerate request is in flight. */
  regenerating: boolean;
  onConfirm: () => void;
  onRegenerate: () => void;
  onCancel: () => void;
}

/**
 * Shared "preview a freshly generated AI image before saving" modal.
 *
 * Used by the article create/edit pages and the opinion create/edit pages.
 * The image is shown at full 16:9 size with a small metadata caption
 * (model + resolution). The editor decides whether to attach it to the
 * draft (confirm), throw it away and try again (regenerate), or just back
 * out (cancel).
 *
 * Note: the URL passed in is already a CDN URL — the API has uploaded the
 * bytes to storage by the time this modal appears. Cancelling does NOT
 * delete the underlying asset (it remains in /admin/media as an orphan).
 */
export function AiImagePreviewModal({
  open,
  result,
  regenerating,
  onConfirm,
  onRegenerate,
  onCancel,
}: AiImagePreviewModalProps) {
  if (!open || !result) return null;

  const caption = `${result.model} · ${result.width}×${result.height}`;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !regenerating) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="معاينة الصورة المولدة بالذكاء الاصطناعي"
    >
      <div
        className="relative w-full max-w-3xl bg-paper rounded-2xl shadow-2xl overflow-hidden"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-cream grid place-items-center text-burgundy flex-shrink-0">
              <Sparkles size={16} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold text-ink leading-tight">
                معاينة الصورة المولّدة
              </h2>
              <p className="text-[11px] text-ink-soft mt-0.5 truncate">
                راجعها قبل إرفاقها بالخبر
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={regenerating}
            className="w-9 h-9 rounded-xl border border-line bg-paper grid place-items-center text-ink-soft hover:bg-bg-2 hover:text-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            aria-label="إغلاق"
          >
            <X size={15} />
          </button>
        </div>

        {/* Image preview — full 16:9 */}
        <div className="relative aspect-video w-full bg-bg-2 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={result.url}
            src={result.url}
            alt="معاينة الصورة المولدة"
            className="w-full h-full object-cover"
          />
          {regenerating && (
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm grid place-items-center text-white">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin" size={28} />
                <span className="text-sm font-semibold">جاري توليد بديلة…</span>
              </div>
            </div>
          )}
        </div>

        {/* Metadata caption */}
        <div className="px-5 py-3 bg-bg-2 border-y border-line text-center">
          <p className="text-[12px] text-ink-2 font-mono tracking-wide">
            {caption}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2.5 p-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={regenerating}
            className="flex-1 sm:flex-none sm:min-w-[110px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-line bg-paper text-[13px] font-semibold text-ink-2 hover:bg-bg-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={14} />
            إلغاء
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            disabled={regenerating}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-burgundy/30 bg-rose-cream/40 text-[13px] font-semibold text-burgundy hover:bg-rose-cream/70 hover:border-burgundy transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {regenerating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                جاري التوليد…
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                توليد بديلة
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={regenerating}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-burgundy text-white text-[13px] font-bold shadow-red hover:bg-burgundy-dark hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            <Check size={14} />
            استخدام هذه الصورة
          </button>
        </div>
      </div>
    </div>
  );
}
