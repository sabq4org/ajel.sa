"use client";

import { useState } from "react";
import { Sparkles, RefreshCw, AlignLeft, ChevronDown, ChevronUp, Loader2, Check, X } from "lucide-react";
import { toast } from "./Toast";

interface SmartEditResult {
  main_title: string;
  sub_title: string;
  smart_summary: string;
  keywords: string[];
  seo: { meta_title: string; meta_description: string };
  suggested_category: string;
}

interface AlternativeTitles {
  titles: string[];
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
  onTitlesGenerated?: (titles: string[]) => void;
}

export function SmartEditBar({ contentHtml, onApply, onTitlesGenerated }: Props) {
  const [loading, setLoading] = useState<"smart" | "rewrite" | "titles" | null>(null);
  const [result, setResult] = useState<SmartEditResult | null>(null);
  const [improvements, setImprovements] = useState<string[]>([]);
  const [altTitles, setAltTitles] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);

  const plainText = contentHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  async function call(mode: "smart" | "rewrite" | "titles") {
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
      } else if (mode === "rewrite") {
        onApply({ contentHtml: data.enhanced_content });
        setImprovements(data.improvements_summary ?? []);
        toast.success("تم إعادة تحرير النص");
      } else if (mode === "titles") {
        setAltTitles(data.titles ?? []);
        onTitlesGenerated?.(data.titles ?? []);
        toast.success("تم توليد 3 عناوين بديلة");
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
          {/* Main: Smart Edit */}
          <button
            onClick={() => call("smart")}
            disabled={loading !== null}
            className="flex items-center gap-2 bg-burgundy text-white px-4 py-2 rounded-xl text-[13px] font-bold shadow-red hover:bg-burgundy-dark hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            {loading === "smart"
              ? <Loader2 size={14} className="animate-spin" />
              : <Sparkles size={14} />}
            تحرير ذكي شامل
          </button>

          {/* Rewrite */}
          <button
            onClick={() => call("rewrite")}
            disabled={loading !== null}
            className="flex items-center gap-2 bg-paper border border-line text-ink-2 px-3.5 py-2 rounded-xl text-[13px] font-semibold hover:bg-bg-2 transition-all disabled:opacity-60"
          >
            {loading === "rewrite"
              ? <Loader2 size={14} className="animate-spin" />
              : <RefreshCw size={14} />}
            إعادة تحرير النص
          </button>

          {/* Alt Titles */}
          <button
            onClick={() => call("titles")}
            disabled={loading !== null}
            className="flex items-center gap-2 bg-paper border border-line text-ink-2 px-3.5 py-2 rounded-xl text-[13px] font-semibold hover:bg-bg-2 transition-all disabled:opacity-60"
          >
            {loading === "titles"
              ? <Loader2 size={14} className="animate-spin" />
              : <AlignLeft size={14} />}
            عناوين بديلة
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
                onClick={() => setExpanded(e => !e)}
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
              <ResultField label="العنوان الرئيسي" value={result.main_title}
                onApply={() => onApply({ title: result.main_title })} />
              <ResultField label="العنوان الفرعي" value={result.sub_title}
                onApply={() => onApply({ subtitle: result.sub_title })} />
              <ResultField label="الموجز" value={result.smart_summary} className="md:col-span-2"
                onApply={() => onApply({ excerpt: result.smart_summary })} />
              <ResultField label="SEO Title" value={result.seo.meta_title}
                onApply={() => onApply({ metaTitle: result.seo.meta_title })} />
              <ResultField label="SEO Description" value={result.seo.meta_description}
                onApply={() => onApply({ metaDescription: result.seo.meta_description })} />
              <div className="md:col-span-2">
                <div className="text-[11px] font-semibold text-ink-soft mb-1.5">الكلمات المفتاحية</div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {result.keywords.map((k, i) => (
                    <span key={i} className="text-[12px] bg-bg-2 px-2.5 py-1 rounded-full text-ink">{k}</span>
                  ))}
                </div>
                <button
                  onClick={() => onApply({ metaKeywords: result.keywords.join("، ") })}
                  className="text-[11px] text-burgundy font-semibold hover:underline"
                >
                  تطبيق الكلمات المفتاحية
                </button>
              </div>
              {result.suggested_category && (
                <div>
                  <div className="text-[11px] font-semibold text-ink-soft mb-1">التصنيف المقترح</div>
                  <span className="inline-block bg-rose-cream text-burgundy text-[12px] font-bold px-3 py-1 rounded-full">
                    {result.suggested_category}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Alternative Titles */}
      {altTitles.length > 0 && (
        <div className="mt-4 border-t border-line pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-bold text-ink">3 عناوين بديلة</span>
            <button onClick={() => setAltTitles([])} className="text-ink-faint hover:text-ink-soft">
              <X size={14} />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {altTitles.map((t, i) => (
              <div key={i} className="flex items-center justify-between gap-3 p-3 bg-bg-2 rounded-xl group hover:bg-line-soft transition-colors">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-[11px] font-extrabold text-burgundy/60 w-4 flex-shrink-0">{i + 1}</span>
                  <span className="text-[13px] text-ink leading-snug">{t}</span>
                </div>
                <button
                  onClick={() => { onApply({ title: t }); toast.success("تم تطبيق العنوان"); }}
                  className="flex-shrink-0 text-[11px] font-bold text-burgundy bg-rose-cream px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-burgundy hover:text-white"
                >
                  تطبيق
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improvements list */}
      {improvements.length > 0 && (
        <div className="mt-3 border-t border-line pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-bold text-emerald-700">التحسينات المُطبَّقة</span>
            <button onClick={() => setImprovements([])}><X size={12} className="text-ink-faint" /></button>
          </div>
          <ul className="flex flex-col gap-1">
            {improvements.map((imp, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-ink-soft">
                <Check size={11} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                {imp}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Small helper ──────────────────────────────────────────────────────────
function ResultField({ label, value, onApply, className = "" }: {
  label: string; value: string; onApply: () => void; className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-ink-soft">{label}</span>
        <button onClick={onApply} className="text-[10px] text-burgundy font-bold hover:underline">
          تطبيق
        </button>
      </div>
      <p className="text-[13px] text-ink bg-bg-2 px-3 py-2 rounded-lg leading-relaxed">{value}</p>
    </div>
  );
}
