"use client";

import { X, Zap } from "lucide-react";

interface ArticlePreviewModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  contentHtml: string;
  featuredImageUrl?: string;
  isBreaking?: boolean;
  categoryName?: string;
}

export function ArticlePreviewModal({
  open,
  onClose,
  title,
  subtitle,
  contentHtml,
  featuredImageUrl,
  isBreaking,
  categoryName,
}: ArticlePreviewModalProps) {
  if (!open) return null;

  const now = new Date().toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-3xl bg-paper rounded-2xl shadow-2xl mt-8 mb-8 overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-paper/90 border border-line grid place-items-center hover:bg-bg-2 transition-colors shadow-sm"
        >
          <X size={15} />
        </button>

        {/* Preview badge */}
        <div className="absolute top-4 right-4 z-10">
          <span className="bg-burgundy text-white text-[11px] font-bold px-3 py-1 rounded-full shadow">
            معاينة
          </span>
        </div>

        {/* Featured image */}
        {featuredImageUrl ? (
          <div className="aspect-video w-full overflow-hidden bg-bg-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={featuredImageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-video w-full bg-bg-2 flex items-center justify-center">
            <span className="text-ink-soft text-sm">لا توجد صورة رئيسية</span>
          </div>
        )}

        <div className="p-6 md:p-8" dir="rtl">
          {/* Category + breaking badges */}
          <div className="flex items-center gap-2 mb-4">
            {isBreaking && (
              <span className="flex items-center gap-1 bg-burgundy text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                <Zap size={10} />
                عاجل
              </span>
            )}
            {categoryName && (
              <span className="bg-rose-cream text-burgundy text-[11px] font-semibold px-2.5 py-1 rounded-full">
                {categoryName}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl font-extrabold text-ink leading-tight -tracking-[0.02em] mb-3">
            {title || "العنوان سيظهر هنا"}
          </h1>

          {/* Subtitle */}
          {subtitle && (
            <p className="text-lg text-ink-2 font-medium mb-4 leading-snug">
              {subtitle}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 text-[12px] text-ink-soft border-b border-line pb-4 mb-6">
            <span>المحرر</span>
            <span>•</span>
            <span>{now}</span>
          </div>

          {/* Content */}
          {contentHtml ? (
            <div
              className="prose prose-lg max-w-none text-ink leading-relaxed"
              style={{
                fontFamily: "'Tajawal', sans-serif",
                fontSize: "17px",
                lineHeight: "1.9",
              }}
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          ) : (
            <div className="py-8 text-center text-ink-soft">
              <p className="text-sm">المحتوى سيظهر هنا...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
