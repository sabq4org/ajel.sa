"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArticleEditor } from "@/components/admin/ArticleEditor";
import { ArrowRight, Save, Eye, Calendar, Image as ImageIcon, Zap, Loader2, Trash2, History, Sparkles, Camera, Palette, AlertTriangle } from "lucide-react";
import { toast } from "@/components/admin/Toast";
import { ConfirmDialog } from "@/components/admin/Modal";
import { SeoSection } from "@/components/admin/SeoSection";
import { SmartEditBar } from "@/components/admin/SmartEditBar";
import { ArticlePreviewModal } from "@/components/admin/ArticlePreviewModal";
import { AiImagePreviewModal, type AiImageResult } from "@/components/admin/AiImagePreviewModal";
import { VersionHistoryPanel } from "@/components/admin/VersionHistoryPanel";
import { useStorageHealth } from "@/components/admin/StorageHealth";
import { useMyPermissions } from "@/hooks/useMyPermissions";
import {
  readUploadErrorMessage,
  readUploadThrownMessage,
  checkUploadSize,
} from "@/lib/uploadErrors";

export default function EditArticlePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { can: canPerm, loading: permsLoading } = useMyPermissions();
  const canPublish = canPerm("articles.publish");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [contentJson, setContentJson] = useState<any>(null);
  const [categoryId, setCategoryId] = useState("");
  const [type, setType] = useState("regular");
  const [status, setStatus] = useState<string>("draft");
  const [isBreaking, setIsBreaking] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [excludeFromHome, setExcludeFromHome] = useState(false);
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [featuredMediaId, setFeaturedMediaId] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [initialContent, setInitialContent] = useState<any>(null);
  const [authorId, setAuthorId] = useState<string>("");
  const [authors, setAuthors] = useState<Array<{ id: string; fullName: string; jobTitle?: string | null }>>([]);
  const canEditAny = canPerm("articles.edit_any");

  // SEO fields
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");
  const [ogImageUrl, setOgImageUrl] = useState("");

  // Preview modal
  const [previewOpen, setPreviewOpen] = useState(false);

  // Version history panel
  const [historyOpen, setHistoryOpen] = useState(false);

  // AI image generation
  const [generatingImage, setGeneratingImage] = useState(false);
  const [isAiImage, setIsAiImage] = useState(false);
  const [aiImageStyle, setAiImageStyle] = useState<"photorealistic"|"illustration">("photorealistic");

  // AI image preview modal — staff reviews the freshly generated image
  // before it's attached to the draft.
  const [aiPreview, setAiPreview] = useState<AiImageResult | null>(null);
  const [aiPreviewOpen, setAiPreviewOpen] = useState(false);
  const [aiRegenerating, setAiRegenerating] = useState(false);

  // Storage health — disable AI image generation up-front when no provider
  // is currently usable, instead of letting the user click and fail.
  // While the first health probe is in-flight (loading && no data) we
  // pessimistically block the button to avoid a brief race window where
  // the user could click before we know storage is unavailable.
  const { health: storageHealth, loading: storageLoading } = useStorageHealth();
  const storageBlocked =
    storageHealth?.canUpload === false || (storageLoading && !storageHealth);
  const storageDegraded = storageHealth?.status === "degraded";

  const categoryName = categories.find((c) => c.id === categoryId)?.name ?? "";

  useEffect(() => {
    void Promise.all([
      fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.items ?? [])),
      fetch(`/api/articles/${id}`).then((r) => r.json()).then((d) => {
        const a = d.article;
        if (!a) {
          toast.error("الخبر غير موجود");
          router.push("/admin/articles");
          return;
        }
        setTitle(a.title || "");
        setSubtitle(a.subtitle || "");
        setExcerpt(a.excerpt || "");
        setContentHtml(a.contentHtml || "");
        setContentJson(a.contentJson);
        setInitialContent(a.contentJson || a.contentHtml || "");
        setCategoryId(a.categoryId || "");
        setType(a.type || "regular");
        setStatus(a.status || "draft");
        setIsBreaking(!!a.isBreaking);
        setIsFeatured(!!a.isFeatured);
        setExcludeFromHome(!!a.excludeFromHome);
        setFeaturedImageUrl(a.featuredImageUrl || "");
        setFeaturedMediaId(a.featuredMediaId ?? null);
        setMetaTitle(a.metaTitle || "");
        setMetaDescription(a.metaDescription || "");
        setMetaKeywords(a.metaKeywords || "");
        setOgImageUrl(a.ogImageUrl || "");
        setAuthorId(a.authorId || "");
        if (a.scheduledAt) {
          const d2 = new Date(a.scheduledAt);
          setScheduledAt(d2.toISOString().slice(0, 16));
        }
      }),
    ])
      .catch(() => toast.error("خطأ في التحميل"))
      .finally(() => setLoading(false));
  }, [id, router]);

  useEffect(() => {
    if (!canEditAny) return;
    // Filter author dropdown by article type:
    //  - regular: editorial chain + reporters (excludes columnists)
    //  - opinion: editorial chain + columnists (excludes reporters)
    const roleParam =
      type === "opinion"
        ? "system_admin,supervisor,content_manager,columnist"
        : "system_admin,supervisor,content_manager,reporter";
    fetch(`/api/staff/options?role=${encodeURIComponent(roleParam)}`)
      .then((r) => r.json())
      .then((d) => setAuthors(d.items ?? []))
      .catch(() => {});
  }, [canEditAny, type]);

  async function handleSave(newStatus?: string) {
    if (!title.trim() || title.trim().length < 5) {
      toast.error("العنوان مطلوب (5 أحرف على الأقل)");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/articles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          subtitle: subtitle.trim() || undefined,
          excerpt: excerpt.trim() || undefined,
          contentHtml,
          contentJson,
          categoryId,
          type,
          status: newStatus ?? status,
          isBreaking,
          isFeatured,
          excludeFromHome,
          featuredImageUrl: featuredImageUrl || null,
          featuredMediaId: featuredMediaId,
          authorId: canEditAny ? (authorId || null) : undefined,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
          metaTitle: metaTitle.trim() || undefined,
          metaDescription: metaDescription.trim() || undefined,
          metaKeywords: metaKeywords.trim() || undefined,
          ogImageUrl: ogImageUrl.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error("فشل الحفظ: " + (err.error || "خطأ"));
        return;
      }
      const d = await res.json();
      setStatus(d.article.status);
      toast.success("تم حفظ التعديلات");
    } catch (e: any) {
      toast.error("خطأ: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/articles/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "فشل الحذف");
      toast.success("تم حذف الخبر");
      router.push("/admin/articles");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function callGenerateImageApi(): Promise<AiImageResult | null> {
    try {
      const res = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          excerpt: excerpt.trim() || undefined,
          category: categories.find((c) => c.id === categoryId)?.name || undefined,
          style: aiImageStyle,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "فشل توليد الصورة");
        return null;
      }
      const data = await res.json();
      // Defense in depth: never accept an inline data: URL — it would only
      // render in the editor preview and would be stripped on the public site.
      if (typeof data.url !== "string" || data.url.startsWith("data:")) {
        toast.error("تعذّر حفظ الصورة، حاول مجدداً");
        return null;
      }
      return {
        url: data.url,
        model: data.model || "AI",
        width: Number(data.width) || 0,
        height: Number(data.height) || 0,
        sizeKB: typeof data.sizeKB === "number" ? data.sizeKB : undefined,
      };
    } catch (e: any) {
      toast.error("خطأ: " + e.message);
      return null;
    }
  }

  async function handleGenerateImage() {
    if (!title.trim()) {
      toast.error("أضف العنوان أولاً لتوليد الصورة");
      return;
    }
    if (storageBlocked) {
      toast.error(storageHealth?.message || "تخزين الصور غير متاح حالياً");
      return;
    }
    setGeneratingImage(true);
    const result = await callGenerateImageApi();
    setGeneratingImage(false);
    if (result) {
      setAiPreview(result);
      setAiPreviewOpen(true);
    }
  }

  async function handleAiRegenerate() {
    setAiRegenerating(true);
    const result = await callGenerateImageApi();
    setAiRegenerating(false);
    if (result) setAiPreview(result);
  }

  function handleAiConfirm() {
    if (!aiPreview) return;
    setFeaturedImageUrl(aiPreview.url);
    setFeaturedMediaId(null);
    setIsAiImage(true);
    setAiPreviewOpen(false);
    setAiPreview(null);
    toast.success("تم استخدام الصورة المولّدة ✨");
  }

  function handleAiCancel() {
    setAiPreviewOpen(false);
    setAiPreview(null);
  }

  async function handleImageUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const sizeErr = checkUploadSize(file);
      if (sizeErr) {
        toast.error(sizeErr);
        return;
      }
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          toast.error(await readUploadErrorMessage(res));
          return;
        }
        const { media } = await res.json();
        setFeaturedImageUrl(media.url);
        setFeaturedMediaId(media.id);
        setIsAiImage(false);
        toast.success("تم رفع الصورة");
      } catch (err: unknown) {
        toast.error(readUploadThrownMessage(err));
      }
    };
    input.click();
  }

  function handleRestore(restoredTitle: string, restoredContentJson: any) {
    setTitle(restoredTitle);
    if (restoredContentJson) {
      setContentJson(restoredContentJson);
      setInitialContent(restoredContentJson);
    }
    toast.success("تم استعادة النسخة — لا تنسَ الحفظ");
  }

  if (loading) {
    return (
      <div className="py-20 grid place-items-center text-ink-soft">
        <Loader2 className="animate-spin" size={24} />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-7">
        <div className="flex items-center gap-4">
          <Link href="/admin/articles" className="w-10 h-10 rounded-xl border border-line bg-paper grid place-items-center hover:bg-bg-2 transition-colors">
            <ArrowRight size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-ink -tracking-[0.01em]">تعديل خبر</h1>
            <p className="text-sm text-ink-soft">
              الحالة الحالية: <span className="font-semibold text-ink">{statusLabel(status)}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setHistoryOpen(true)}
            className="bg-paper border border-line px-4 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 hover:bg-bg-2 transition-colors"
          >
            <History size={14} /> السجل
          </button>
          <button
            onClick={() => setPreviewOpen(true)}
            className="bg-paper border border-line px-4 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 hover:bg-bg-2 transition-colors"
          >
            <Eye size={14} /> معاينة
          </button>
          <button onClick={() => setConfirmDelete(true)} className="bg-paper border border-rose-200 text-rose-700 px-4 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 hover:bg-rose-50 transition-colors">
            <Trash2 size={14} /> حذف
          </button>
          <button onClick={() => handleSave("draft")} disabled={saving} className="bg-paper border border-line px-4.5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 hover:bg-bg-2 transition-colors disabled:opacity-50">
            <Save size={14} /> حفظ كمسودة
          </button>
          {status !== "published" ? (
            !permsLoading && canPublish ? (
              <button onClick={() => handleSave("published")} disabled={saving} className="bg-burgundy text-white px-4.5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 shadow-red hover:bg-burgundy-dark hover:-translate-y-0.5 transition-all disabled:opacity-50">
                {saving ? "جاري..." : "نشر الآن"}
              </button>
            ) : (
              <button onClick={() => handleSave("review")} disabled={saving} className="bg-burgundy text-white px-4.5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 shadow-red hover:bg-burgundy-dark hover:-translate-y-0.5 transition-all disabled:opacity-50">
                {saving ? "جاري..." : "إرسال للمراجعة"}
              </button>
            )
          ) : (
            <button onClick={() => handleSave()} disabled={saving} className="bg-burgundy text-white px-4.5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 shadow-red hover:bg-burgundy-dark hover:-translate-y-0.5 transition-all disabled:opacity-50">
              {saving ? "جاري..." : "حفظ التعديلات"}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-5">
          <div className="card">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="العنوان الرئيسي للخبر..." className="w-full text-3xl font-extrabold text-ink outline-none bg-transparent placeholder:text-ink-faint -tracking-[0.02em] leading-tight mb-3" dir="rtl" />
            <input type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="عنوان فرعي (اختياري)..." className="w-full text-base text-ink-2 outline-none bg-transparent placeholder:text-ink-faint" dir="rtl" />
          </div>

          <div className="card">
            <label className="block text-[11px] font-semibold text-ink-soft tracking-wide mb-2">المقتطف</label>
            <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="مقدمة..." rows={2} className="w-full text-sm text-ink outline-none bg-transparent resize-none leading-relaxed" dir="rtl" />
          </div>

          {/* ✨ Smart Edit Bar */}
          <SmartEditBar
            contentHtml={contentHtml}
            onApply={(data) => {
              if (data.title !== undefined) setTitle(data.title);
              if (data.subtitle !== undefined) setSubtitle(data.subtitle);
              if (data.excerpt !== undefined) setExcerpt(data.excerpt);
              if (data.metaTitle !== undefined) setMetaTitle(data.metaTitle);
              if (data.metaDescription !== undefined) setMetaDescription(data.metaDescription);
              if (data.metaKeywords !== undefined) setMetaKeywords(data.metaKeywords);
              if (data.contentHtml !== undefined) setContentHtml(data.contentHtml);
            }}
          />

          <ArticleEditor
            placeholder="ابدأ كتابة محتوى الخبر..."
            initialContent={initialContent}
            onChange={({ html, json }) => {
              setContentHtml(html);
              setContentJson(json);
            }}
          />

          {/* SEO Section */}
          <SeoSection
            articleTitle={title}
            metaTitle={metaTitle}
            setMetaTitle={setMetaTitle}
            metaDescription={metaDescription}
            setMetaDescription={setMetaDescription}
            metaKeywords={metaKeywords}
            setMetaKeywords={setMetaKeywords}
            ogImageUrl={ogImageUrl}
            setOgImageUrl={setOgImageUrl}
          />
        </div>

        <div className="space-y-5">
          <div className="card">
            <h3 className="text-[14px] font-bold text-ink mb-3">الصورة الرئيسية</h3>
            {featuredImageUrl ? (
              <div className="relative aspect-video rounded-xl overflow-hidden bg-bg-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={featuredImageUrl} alt="" className="w-full h-full object-cover" />
                {isAiImage && (
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[11px] font-semibold">
                    <Sparkles size={11} />
                    مولدة بالذكاء الاصطناعي
                  </div>
                )}
                <button onClick={() => { setFeaturedImageUrl(""); setFeaturedMediaId(null); setIsAiImage(false); }} className="absolute top-2 left-2 bg-paper text-ink-2 px-3 py-1 rounded-md text-xs font-semibold">إزالة</button>
              </div>
            ) : (
              <button onClick={handleImageUpload} className="w-full aspect-video rounded-xl border-2 border-dashed border-line bg-bg-2 hover:border-burgundy hover:bg-rose-cream/30 transition-all grid place-items-center text-ink-soft">
                <div className="text-center">
                  <ImageIcon size={28} className="mx-auto mb-2 opacity-60" />
                  <span className="text-xs">اضغط لرفع الصورة</span>
                </div>
              </button>
            )}

            {/* توليد الصورة بالذكاء الاصطناعي */}
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                <button type="button" onClick={() => setAiImageStyle("photorealistic")}
                  className={`py-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    aiImageStyle === "photorealistic" ? "bg-burgundy text-white" : "bg-bg-2 text-ink-2 hover:bg-line"}`}>
                  <Camera size={11} /> واقعية
                </button>
                <button type="button" onClick={() => setAiImageStyle("illustration")}
                  className={`py-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    aiImageStyle === "illustration" ? "bg-burgundy text-white" : "bg-bg-2 text-ink-2 hover:bg-line"}`}>
                  <Palette size={11} /> رسومية
                </button>
              </div>
              <button onClick={handleGenerateImage} disabled={generatingImage || storageBlocked}
                title={storageBlocked ? storageHealth?.message : undefined}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-burgundy/40 bg-rose-cream/30 text-burgundy text-[13px] font-semibold hover:bg-rose-cream/60 hover:border-burgundy transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                {generatingImage ? (
                  <><Loader2 size={14} className="animate-spin" /> جاري توليد...</>
                ) : storageBlocked ? (
                  <><AlertTriangle size={14} /> التخزين غير متاح</>
                ) : (
                  <><Sparkles size={14} /> توليد صورة بالذكاء الاصطناعي</>
                )}
              </button>
              {storageBlocked && (
                <div className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-2.5 py-2 flex items-start gap-1.5">
                  <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{storageHealth?.message}</span>
                </div>
              )}
              {!storageBlocked && storageDegraded && (
                <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2 flex items-start gap-1.5">
                  <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{storageHealth?.message}</span>
                </div>
              )}
            </div>
          </div>

          {canEditAny && authors.length > 0 && (
            <div className="card">
              <h3 className="text-[14px] font-bold text-ink mb-3">الكاتب</h3>
              <select value={authorId} onChange={(e) => setAuthorId(e.target.value)} className="input" dir="rtl">
                <option value="">— بدون تغيير —</option>
                {authors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullName}{a.jobTitle ? ` · ${a.jobTitle}` : ""}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-ink-soft mt-2">
                تغيير الكاتب إلى مراسل أو كاتب رأي يعيد الخبر إلى المسودة تلقائيًا.
              </p>
            </div>
          )}

          <div className="card">
            <h3 className="text-[14px] font-bold text-ink mb-3">القسم</h3>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input" dir="rtl">
              <option value="">اختر القسم...</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="card space-y-4">
            <div>
              <h3 className="text-[14px] font-bold text-ink mb-3">نوع الخبر</h3>
              <select value={type} onChange={(e) => setType(e.target.value)} className="input">
                <option value="regular">عادي</option>
                <option value="breaking">عاجل</option>
                <option value="exclusive">حصري</option>
                <option value="investigation">تحقيق</option>
                <option value="opinion">رأي</option>
                <option value="video">فيديو</option>
              </select>
            </div>

            <label className="flex items-center gap-3 p-3 bg-bg-2 rounded-xl cursor-pointer hover:bg-rose-cream/40 transition-colors">
              <input type="checkbox" checked={isBreaking} onChange={(e) => setIsBreaking(e.target.checked)} className="w-4 h-4 accent-burgundy" />
              <Zap size={14} className="text-burgundy" />
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-ink">عاجل</div>
                <div className="text-[11px] text-ink-soft">يظهر في شريط الأخبار</div>
              </div>
            </label>

            {/* ظهور في الصفحة الرئيسية */}
            <div>
              <p className="text-[12px] font-semibold text-ink-soft mb-2">الصفحة الرئيسية</p>
              <div className="space-y-1.5">
                <label className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border transition-all ${
                  isFeatured ? "border-burgundy bg-rose-cream/40" : "border-line bg-bg-2 hover:bg-rose-cream/20"
                }`}>
                  <input type="radio" name="homeVisibility" checked={isFeatured}
                    onChange={() => { setIsFeatured(true); setExcludeFromHome(false); }}
                    className="accent-burgundy" />
                  <div>
                    <div className="text-[12px] font-bold text-ink">⭐ مميز</div>
                    <div className="text-[11px] text-ink-soft">يظهر في الأخبار البارزة أعلى الصفحة</div>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border transition-all ${
                  !isFeatured && !excludeFromHome ? "border-burgundy bg-rose-cream/40" : "border-line bg-bg-2 hover:bg-rose-cream/20"
                }`}>
                  <input type="radio" name="homeVisibility" checked={!isFeatured && !excludeFromHome}
                    onChange={() => { setIsFeatured(false); setExcludeFromHome(false); }}
                    className="accent-burgundy" />
                  <div>
                    <div className="text-[12px] font-bold text-ink">📰 عادي</div>
                    <div className="text-[11px] text-ink-soft">يظهر في قائمة آخر الأخبار</div>
                  </div>
                </label>
                <label className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border transition-all ${
                  excludeFromHome ? "border-burgundy bg-rose-cream/40" : "border-line bg-bg-2 hover:bg-rose-cream/20"
                }`}>
                  <input type="radio" name="homeVisibility" checked={excludeFromHome}
                    onChange={() => { setIsFeatured(false); setExcludeFromHome(true); }}
                    className="accent-burgundy" />
                  <div>
                    <div className="text-[12px] font-bold text-ink">🚫 لا يظهر في الرئيسية</div>
                    <div className="text-[11px] text-ink-soft">يظهر في قسمه فقط</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-[14px] font-bold text-ink mb-3 flex items-center gap-2">
              <Calendar size={14} /> جدولة النشر
            </h3>
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="input" />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="حذف الخبر"
        message={`هل أنت متأكد من حذف "${title}"؟ لا يمكن التراجع عن هذه العملية.`}
        confirmText="حذف نهائي"
        danger
      />

      {/* Article Preview Modal */}
      <ArticlePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={title}
        subtitle={subtitle}
        contentHtml={contentHtml}
        featuredImageUrl={featuredImageUrl}
        isBreaking={isBreaking}
        categoryName={categoryName}
      />

      {/* Version History Panel */}
      <VersionHistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        articleId={id}
        onRestore={handleRestore}
      />

      {/* AI Image Preview Modal */}
      <AiImagePreviewModal
        open={aiPreviewOpen}
        result={aiPreview}
        regenerating={aiRegenerating}
        onConfirm={handleAiConfirm}
        onRegenerate={handleAiRegenerate}
        onCancel={handleAiCancel}
      />
    </>
  );
}

function statusLabel(s: string) {
  return ({ draft: "مسودة", review: "قيد المراجعة", scheduled: "مجدول", published: "منشور", archived: "مؤرشف" } as Record<string, string>)[s] ?? s;
}
