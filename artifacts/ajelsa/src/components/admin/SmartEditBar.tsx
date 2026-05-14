"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { toast } from "./Toast";

type Mode = "smart" | "full_edit";

interface SmartEditResult {
  main_title: string;
  sub_title: string;
  smart_summary: string;
  keywords: string[];
  seo: { meta_title: string; meta_description: string };
  suggested_category: string;
}

interface FullEditResult extends SmartEditResult {
  edited_content: string;
  improvements_summary: string[];
}

interface Props {
  contentHtml: string;
  onApply: (data: {
    title?: string;
    subtitle?: string;
    excerpt?: string;
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
    contentHtml?: string;
  }) => void;
}

const IMPROVEMENTS_AUTO_HIDE_MS = 8000;

export function SmartEditBar({ contentHtml, onApply }: Props) {
  const [loading, setLoading] = useState<Mode | null>(null);
  const [result, setResult] = useState<SmartEditResult | null>(null);
  const [improvements, setImprovements] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);

  const plainText = contentHtml
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Auto-hide the improvements banner so it doesn't linger after the user
  // has moved on. Keeping it 8s gives time to read 3-5 bullet points.
  useEffect(() => {
    if (improvements.length === 0) return;
    const t = setTimeout(() => setImprovements([]), IMPROVEMENTS_AUTO_HIDE_MS);
    return () => clearTimeout(t);
  }, [improvements]);

  async function call(mode: Mode) {
    if (plainText.length < 30) {
      toast.error("أضف نص الخبر أولاً قبل استخدام التحرير الذكي");
      return;
    }
    setLoading(mode);
    try {
      const res = await fetch("/api/ai/smart-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: plainText, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "فشل الطلب");

      if (mode === "smart") {
        setResult(data as SmartEditResult);
        setExpanded(true);
        toast.success("تم التوليد — راجع النتائج أدناه");
      } else {
        const full = data as FullEditResult;
        onApply({
          contentHtml: full.edited_content,
          title: full.main_title,
          subtitle: full.sub_title,
          excerpt: full.smart_summary,
          metaTitle: full.seo?.meta_title,
          metaDescription: full.seo?.meta_description,
          metaKeywords: (full.keywords ?? []).join("، "),
        });
        setImprovements(full.improvements_summary ?? []);
        setResult(null);
        setExpanded(false);
        toast.success("تم التحرير الشامل ✨");
      }
    } catch (e: any) {
      toast.error(e.message ?? "حدث خطأ");
    }
    setLoading(null);
  }

  function applyResult() {
    if (!result) return;
    onApply({
      title: result.main_title,
      subtitle: result.sub_title,
      excerpt: result.smart_summary,
      metaTitle: result.seo.meta_title,
      metaDescription: result.seo.meta_description,
      metaKeywords: result.keywords.join("، "),
    });
    toast.success("تم تطبيق كل العناصر التحريرية");
    setResult(null);
    setExpanded(false);
  }

  return (
    <div className="card border-2 border-burgundy/20 bg-gradient-to-l from-rose-cream/40 to-transparent mb-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-burgundy grid place-items-center flex-shrink-0">
            <Sparkles size={15} className="text-white" />
          </div>
          <div>
            <div className="text-[14px] font-bold text-ink">التحرير الذكي</div>
            <div className="text-[11px] text-ink-soft">مدعوم بـ Claude AI</div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* زر 1: توليد ذكي — يستخرج الحقول فقط بدون لمس نص الخبر */}
          <button
            onClick={() => call("smart")}
            disabled={loading !== null}
            className="flex items-center gap-2 bg-paper border-2 border-burgundy text-burgundy px-4 py-2 rounded-xl text-[13px] font-bold hover:bg-rose-cream transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading === "smart" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            توليد ذكي
          </button>

          {/* زر 2: تحرير شامل — يحرر النص + كل الحقول دفعة واحدة */}
          <button
            onClick={() => call("full_edit")}
            disabled={loading !== null}
            className="flex items-center gap-2 bg-burgundy text-white px-4 py-2 rounded-xl text-[13px] font-bold shadow-red hover:bg-burgundy-dark hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            {loading === "full_edit" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            تحرير شامل
          </button>
        </div>
      </div>

      {/* Loading bar */}
      {loading && (
        <div className="mt-3 h-1 bg-bg-2 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-l from-burgundy to-burgundy-soft rounded-full animate-pulse w-3/4" />
        </div>
      )}

      {/* Smart Edit Result */}
      {result && (
        <div className="mt-4 border-t border-line pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-bold text-ink flex items-center gap-1.5">
              <Check size={14} className="text-emerald-600" />
              النتائج جاهزة
            </span>
            <div className="flex gap-2">
              <button
                onClick={applyResult}
                className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[12px] font-bold hover:bg-emerald-700 transition-colors"
              >
                <Check size={12} /> تطبيق الكل
              </button>
              <button
                onClick={() => setExpanded((e) => !e)}
                className="flex items-center gap-1 text-[12px] text-ink-soft hover:text-ink transition-colors"
              >
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {expanded ? "طي" : "عرض"}
              </button>
              <button
                onClick={() => setResult(null)}
                className="w-6 h-6 grid place-items-center rounded-lg text-ink-soft hover:bg-rose-cream hover:text-burgundy transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {expanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ResultField
                label="العنوان الرئيسي"
                value={result.main_title}
                onApply={() => onApply({ title: result.main_title })}
              />
              <ResultField
                label="العنوان الفرعي"
                value={result.sub_title}
                onApply={() => onApply({ subtitle: result.sub_title })}
              />
              <ResultField
                label="الموجز"
                value={result.smart_summary}
                className="md:col-span-2"
                onApply={() => onApply({ excerpt: result.smart_summary })}
              />
              <ResultField
                label="SEO Title"
                value={result.seo.meta_title}
                onApply={() => onApply({ metaTitle: result.seo.meta_title })}
              />
              <ResultField
                label="SEO Description"
                value={result.seo.meta_description}
                onApply={() =>
                  onApply({ metaDescription: result.seo.meta_description })
                }
              />
              <div className="md:col-span-2">
                <div className="text-[11px] font-semibold text-ink-soft mb-1.5">
                  الكلمات المفتاحية
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {result.keywords.map((k, i) => (
                    <span
                      key={i}
                      className="text-[12px] bg-bg-2 px-2.5 py-1 rounded-full text-ink"
                    >
                      {k}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() =>
                    onApply({ metaKeywords: result.keywords.join("، ") })
                  }
                  className="text-[11px] text-burgundy font-semibold hover:underline"
                >
                  تطبيق الكلمات المفتاحية
                </button>
              </div>
              {result.suggested_category && (
                <div>
                  <div className="text-[11px] font-semibold text-ink-soft mb-1">
                    التصنيف المقترح
                  </div>
                  <span className="inline-block bg-rose-cream text-burgundy text-[12px] font-bold px-3 py-1 rounded-full">
                    {result.suggested_category}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Improvements list (auto-hides after 8s) */}
      {improvements.length > 0 && (
        <div className="mt-3 border-t border-line pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-bold text-emerald-700">
              التحسينات المُطبَّقة
            </span>
            <button onClick={() => setImprovements([])}>
              <X size={12} className="text-ink-faint" />
            </button>
          </div>
          <ul className="flex flex-col gap-1">
            {improvements.map((imp, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[12px] text-ink-soft"
              >
                <Check
                  size={11}
                  className="text-emerald-600 mt-0.5 flex-shrink-0"
                />
                {imp}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ResultField({
  label,
  value,
  onApply,
  className = "",
}: {
  label: string;
  value: string;
  onApply: () => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-ink-soft">{label}</span>
        <button
          onClick={onApply}
          className="text-[10px] text-burgundy font-bold hover:underline"
        >
          تطبيق
        </button>
      </div>
      <p className="text-[13px] text-ink bg-bg-2 px-3 py-2 rounded-lg leading-relaxed">
        {value}
      </p>
    </div>
  );
}
