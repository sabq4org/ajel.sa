"use client";

import { AdminTopbar } from "@/components/admin/AdminLayout";
import { useEffect, useState, useRef, useCallback } from "react";
import { GripVertical, Star, Pin, Eye, Save, Loader2, CheckCircle } from "lucide-react";
import { toast } from "@/components/admin/Toast";

type Article = {
  id: string; slug: string; title: string; status: string;
  isFeatured: boolean; isPinned: boolean; isBreaking: boolean;
  viewCount: number; categoryName?: string | null;
  featuredImageUrl?: string | null; publishedAt?: string | null;
};

export default function HomepagePage() {
  const [featured, setFeatured] = useState<Article[]>([]);
  const [pinned, setPinned] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dragItem = useRef<{ list: "featured" | "pinned"; index: number } | null>(null);
  const dragOver = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/articles?limit=200").then(r => r.json()).then(d => {
      const items: Article[] = d.items ?? [];
      setFeatured(items.filter(a => a.isFeatured && a.status === "published"));
      setPinned(items.filter(a => a.isPinned && a.status === "published"));
      setLoading(false);
    });
  }, []);

  // --- Drag handlers ---
  function onDragStart(list: "featured" | "pinned", index: number) {
    dragItem.current = { list, index };
  }

  function onDragEnter(index: number) {
    dragOver.current = index;
  }

  function onDragEnd(list: "featured" | "pinned") {
    if (dragItem.current === null || dragOver.current === null) return;
    if (dragItem.current.list !== list) return;
    const from = dragItem.current.index;
    const to = dragOver.current;
    if (from === to) return;

    const setter = list === "featured" ? setFeatured : setPinned;
    setter(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr;
    });

    dragItem.current = null;
    dragOver.current = null;
  }

  async function toggleFeatured(article: Article) {
    const next = !article.isFeatured;
    await fetch(`/api/articles/${article.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFeatured: next }),
    });
    if (next) setFeatured(f => [...f, { ...article, isFeatured: true }]);
    else setFeatured(f => f.filter(a => a.id !== article.id));
  }

  async function togglePinned(article: Article) {
    const next = !article.isPinned;
    await fetch(`/api/articles/${article.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: next }),
    });
    if (next) setPinned(p => [...p, { ...article, isPinned: true }]);
    else setPinned(p => p.filter(a => a.id !== article.id));
  }

  async function saveOrder() {
    setSaving(true);
    try {
      // Save isFeatured order via batch patches
      await Promise.all([
        ...featured.map((a, i) =>
          fetch(`/api/articles/${a.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isFeatured: true }),
          })
        ),
        ...pinned.map((a, i) =>
          fetch(`/api/articles/${a.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isPinned: true }),
          })
        ),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast.success("تم حفظ ترتيب الصفحة الرئيسية");
    } catch { toast.error("فشل الحفظ"); }
    setSaving(false);
  }

  function ArticleCard({ article, index, list }: { article: Article; index: number; list: "featured" | "pinned" }) {
    return (
      <div
        draggable
        onDragStart={() => onDragStart(list, index)}
        onDragEnter={() => onDragEnter(index)}
        onDragEnd={() => onDragEnd(list)}
        onDragOver={e => e.preventDefault()}
        className="flex items-center gap-3 p-3 bg-paper border border-line rounded-xl cursor-grab active:cursor-grabbing hover:shadow-soft transition-all group select-none"
      >
        {/* Rank */}
        <span className="text-[11px] font-bold text-ink-faint w-5 text-center flex-shrink-0">{index + 1}</span>

        {/* Grip */}
        <GripVertical size={16} className="text-ink-faint flex-shrink-0 group-hover:text-ink-soft" />

        {/* Thumbnail */}
        {article.featuredImageUrl ? (
          <img src={article.featuredImageUrl} alt="" className="w-12 h-10 object-cover rounded-lg flex-shrink-0" />
        ) : (
          <div className="w-12 h-10 bg-bg-2 rounded-lg flex-shrink-0 grid place-items-center text-ink-faint text-xs">صورة</div>
        )}

        {/* Title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {article.isBreaking && <span className="text-[9px] font-extrabold bg-burgundy text-white px-1.5 py-0.5 rounded">عاجل</span>}
            {article.categoryName && <span className="text-[10px] text-ink-soft">{article.categoryName}</span>}
          </div>
          <p className="text-[13px] font-semibold text-ink line-clamp-1">{article.title}</p>
        </div>

        {/* Views */}
        {article.viewCount > 0 && (
          <div className="flex items-center gap-1 text-[11px] text-ink-faint flex-shrink-0">
            <Eye size={11} />
            <span>{article.viewCount.toLocaleString("en")}</span>
          </div>
        )}

        {/* Toggle buttons */}
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => list === "featured" ? toggleFeatured(article) : togglePinned(article)}
            className="w-7 h-7 grid place-items-center rounded-lg bg-rose-cream text-burgundy hover:bg-burgundy hover:text-white transition-all"
            title="إزالة من القائمة"
          >
            {list === "featured" ? <Star size={13} /> : <Pin size={13} />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminTopbar
        title="ترتيب الصفحة الرئيسية"
        subtitle="اسحب وأفلت لإعادة الترتيب"
        actions={
          <button
            onClick={saveOrder}
            disabled={saving}
            className="flex items-center gap-2 bg-burgundy text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold shadow-red hover:bg-burgundy-dark hover:-translate-y-0.5 transition-all disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle size={14} /> : <Save size={14} />}
            {saving ? "جارٍ الحفظ..." : saved ? "تم الحفظ ✓" : "حفظ الترتيب"}
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-ink-soft" size={24} /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Featured articles */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star size={16} className="text-gold" />
              <h2 className="text-[15px] font-bold text-ink">الأخبار المميزة</h2>
              <span className="text-[11px] text-ink-faint bg-bg-2 px-2 py-0.5 rounded-full">{featured.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {featured.length === 0 ? (
                <div className="border-2 border-dashed border-line rounded-xl py-10 text-center text-ink-faint text-sm">
                  لا توجد أخبار مميزة
                </div>
              ) : (
                featured.map((a, i) => <ArticleCard key={a.id} article={a} index={i} list="featured" />)
              )}
            </div>
          </div>

          {/* Pinned articles */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Pin size={16} className="text-burgundy" />
              <h2 className="text-[15px] font-bold text-ink">الأخبار المثبتة</h2>
              <span className="text-[11px] text-ink-faint bg-bg-2 px-2 py-0.5 rounded-full">{pinned.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {pinned.length === 0 ? (
                <div className="border-2 border-dashed border-line rounded-xl py-10 text-center text-ink-faint text-sm">
                  لا توجد أخبار مثبتة
                </div>
              ) : (
                pinned.map((a, i) => <ArticleCard key={a.id} article={a} index={i} list="pinned" />)
              )}
            </div>
          </div>

        </div>
      )}

      {/* Tip */}
      <div className="mt-6 p-4 bg-bg-2 rounded-xl text-[12px] text-ink-soft flex items-start gap-2">
        <span className="text-base leading-none">💡</span>
        <span>اسحب البطاقات لإعادة الترتيب · اضغط "حفظ الترتيب" لتطبيق التغييرات على الموقع · الزر الأحمر يزيل الخبر من القائمة</span>
      </div>
    </>
  );
}
