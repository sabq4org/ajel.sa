"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";

interface SeoSectionProps {
  articleTitle: string;
  metaTitle: string;
  setMetaTitle: (v: string) => void;
  metaDescription: string;
  setMetaDescription: (v: string) => void;
  metaKeywords: string;
  setMetaKeywords: (v: string) => void;
  ogImageUrl: string;
  setOgImageUrl: (v: string) => void;
}

export function SeoSection({
  articleTitle,
  metaTitle,
  setMetaTitle,
  metaDescription,
  setMetaDescription,
  metaKeywords,
  setMetaKeywords,
  ogImageUrl,
  setOgImageUrl,
}: SeoSectionProps) {
  const [open, setOpen] = useState(false);

  // Auto-fill metaTitle from article title if metaTitle is empty
  useEffect(() => {
    if (!metaTitle && articleTitle) {
      setMetaTitle(articleTitle.slice(0, 60));
    }
  }, [articleTitle]); // eslint-disable-line react-hooks/exhaustive-deps

  const titleLen = metaTitle.length;
  const descLen = metaDescription.length;

  function titleColor() {
    if (titleLen < 60) return "text-green-600";
    if (titleLen === 60) return "text-yellow-600";
    return "text-red-600";
  }

  function descColor() {
    if (descLen < 160) return "text-green-600";
    if (descLen === 160) return "text-yellow-600";
    return "text-red-600";
  }

  const serpTitle = metaTitle || articleTitle || "عنوان المقال";
  const serpDesc = metaDescription || "وصف المقال سيظهر هنا في نتائج البحث على Google...";
  const serpUrl = "ajel.sa › أخبار › ...";

  return (
    <div className="card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-right"
      >
        <div className="flex items-center gap-2">
          <Search size={14} className="text-burgundy" />
          <span className="text-[14px] font-bold text-ink">تحسين محركات البحث (SEO)</span>
          <span className="text-[11px] text-ink-soft bg-bg-2 px-2 py-0.5 rounded-full">اختياري</span>
        </div>
        {open ? (
          <ChevronUp size={16} className="text-ink-soft" />
        ) : (
          <ChevronDown size={16} className="text-ink-soft" />
        )}
      </button>

      {open && (
        <div className="mt-5 space-y-4">
          {/* Meta Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-ink-soft tracking-wide">عنوان SEO</label>
              <span className={`text-[11px] font-semibold ${titleColor()}`}>{titleLen}/60</span>
            </div>
            <input
              type="text"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="عنوان يظهر في نتائج Google..."
              maxLength={80}
              className="w-full input text-sm"
              dir="rtl"
            />
          </div>

          {/* Meta Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-ink-soft tracking-wide">وصف SEO</label>
              <span className={`text-[11px] font-semibold ${descColor()}`}>{descLen}/160</span>
            </div>
            <textarea
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="وصف مختصر يظهر تحت العنوان في نتائج البحث..."
              maxLength={200}
              rows={3}
              className="w-full input text-sm resize-none leading-relaxed"
              dir="rtl"
            />
          </div>

          {/* Meta Keywords */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-soft tracking-wide mb-1.5">
              الكلمات المفتاحية
            </label>
            <input
              type="text"
              value={metaKeywords}
              onChange={(e) => setMetaKeywords(e.target.value)}
              placeholder="كلمة1، كلمة2، كلمة3..."
              className="w-full input text-sm"
              dir="rtl"
            />
            <p className="text-[11px] text-ink-soft mt-1">افصل الكلمات بفواصل</p>
          </div>

          {/* OG Image URL */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-soft tracking-wide mb-1.5">
              صورة Open Graph (مشاركة السوشيال)
            </label>
            <input
              type="text"
              value={ogImageUrl}
              onChange={(e) => setOgImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full input text-sm"
              dir="ltr"
            />
          </div>

          {/* SERP Preview */}
          <div>
            <label className="block text-[11px] font-semibold text-ink-soft tracking-wide mb-2">
              معاينة نتيجة Google
            </label>
            <div className="border border-line rounded-xl p-4 bg-white font-sans" dir="ltr">
              <p className="text-[12px] text-gray-500 mb-0.5 truncate">{serpUrl}</p>
              <p
                className="text-[18px] text-blue-700 font-medium leading-tight mb-1 truncate"
                style={{ fontFamily: "Arial, sans-serif" }}
              >
                {serpTitle}
              </p>
              <p
                className="text-[13px] text-gray-600 leading-snug line-clamp-2"
                style={{ fontFamily: "Arial, sans-serif" }}
              >
                {serpDesc}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
