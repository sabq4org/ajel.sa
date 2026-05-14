"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArticleEditor } from "@/components/admin/ArticleEditor";
import { ArrowRight, Save, Calendar, Image as ImageIcon, Loader2, Sparkles, Camera, Palette, AlertTriangle, PenTool, Trash2 } from "lucide-react";
import { toast } from "@/components/admin/Toast";
import { ConfirmDialog } from "@/components/admin/Modal";
import { SeoSection } from "@/components/admin/SeoSection";
import { SmartEditBar } from "@/components/admin/SmartEditBar";
import { AiImagePreviewModal, type AiImageResult } from "@/components/admin/AiImagePreviewModal";
import { useStorageHealth } from "@/components/admin/StorageHealth";
import { useMyPermissions } from "@/hooks/useMyPermissions";
import { AuthorSelect, type AuthorOption } from "@/components/admin/AuthorSelect";

export default function EditOpinionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { can: canPerm, loading: permsLoading } = useMyPermissions();
  const canPublish = canPerm("opinion.publish");
  const canDelete = canPerm("opinion.delete");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // When the editor changes the author of an existing piece, prompt for
  // confirmation before applying. We hold the proposed new author here while
  // the dialog is open and only commit it on confirm.
  const [pendingAuthorId, setPendingAuthorId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [contentJson, setContentJson] = useState<any>(null);
  const [authorId, setAuthorId] = useState("");
  // Snapshot of the original author (set when the piece is first loaded) so
  // we can detect a real change vs. just clicking the same author again.
  const [initialAuthorId, setInitialAuthorId] = useState("");
  const [status, setStatus] = useState<string>("draft");
  const [isFeatured, setIsFeatured] = useState(false);
  const [excludeFromHome, setExcludeFromHome] = useState(false);
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [featuredMediaId, setFeaturedMediaId] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [authorsList, setAuthorsList] = useState<AuthorOption[]>([]);
  const [initialContent, setInitialContent] = useState<any>(null);

  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");
  const [ogImageUrl, setOgImageUrl] = useState("");

  const [generatingImage, setGeneratingImage] = useState(false);
  const [isAiImage, setIsAiImage] = useState(false);
  const [aiImageStyle, setAiImageStyle] = useState<"photorealistic" | "illustration">("photorealistic");

  // AI image preview modal — staff reviews the freshly generated image
  // before it's attached to the draft.
  const [aiPreview, setAiPreview] = useState<AiImageResult | null>(null);
  const [aiPreviewOpen, setAiPreviewOpen] = useState(false);
  const [aiRegenerating, setAiRegenerating] = useState(false);

  const { health: storageHealth, loading: storageLoading } = useStorageHealth();
  const storageBlocked =
    storageHealth?.canUpload === false || (storageLoading && !storageHealth);
  const storageDegraded = storageHealth?.status === "degraded";

  useEffect(() => {
    void Promise.all([
      fetch("/api/authors/options").then((r) => r.json()).then((d) => {
        setAuthorsList(d.items ?? []);
      }),
      fetch(`/api/opinions/${id}`).then((r) => r.json()).then((d) => {
        const a = d.opinion;
        if (!a) {
          toast.error("المقال غير موجود");
          router.push("/admin/opinions");
          return;
        }
        setTitle(a.title || "");
        setSubtitle(a.subtitle || "");
        setExcerpt(a.excerpt || "");
        setContentHtml(a.contentHtml || "");
        setContentJson(a.contentJson);
        setInitialContent(a.contentJson || a.contentHtml || "");
        setAuthorId(a.authorId || "");
        setInitialAuthorId(a.authorId || "");
        setStatus(a.status || "draft");
        setIsFeatured(!!a.isFeatured);
        setExcludeFromHome(!!a.excludeFromHome);
        setFeaturedImageUrl(a.featuredImageUrl || "");
        setFeaturedMediaId(a.featuredMediaId ?? null);
        setMetaTitle(a.metaTitle || "");
        setMetaDescription(a.metaDescription || "");
        setMetaKeywords(a.metaKeywords || "");
        setOgImageUrl(a.ogImageUrl || "");
        if (a.scheduledAt) {
          setScheduledAt(new Date(a.scheduledAt).toISOString().slice(0, 16));
        }
      }),
    ])
      .catch(() => toast.error("خطأ في التحميل"))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleSave(newStatus?: string) {
    if (!title.trim() || title.trim().length < 5) {
      toast.error("العنوان مطلوب (5 أحرف على الأقل)");
      return;
    }
    if (!authorId) {
      toast.error("اختر كاتب الرأي");
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        excerpt: excerpt.trim() || undefined,
        contentHtml,
        contentJson,
        authorId,
        isFeatured,
        excludeFromHome,
        featuredImageUrl: featuredImageUrl || null,
        featuredMediaId: featuredMediaId,
        metaTitle: metaTitle.trim() || undefined,
        metaDescription: metaDescription.trim() || undefined,
        metaKeywords: metaKeywords.trim() || undefined,
        ogImageUrl: ogImageUrl.trim() || undefined,
      };
      if (newStatus) body.status = newStatus;
      if (scheduledAt) body.scheduledAt = new Date(scheduledAt).toISOString();

      const res = await fetch(`/api/opinions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error("فشل الحفظ: " + (err.error || "خطأ غير معروف"));
        return;
      }
      const data = await res.json();
      setStatus(data.opinion.status);
      toast.success("تم الحفظ");
    } catch (e: any) {
      toast.error("خطأ: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/opinions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "فشل الحذف");
      toast.success("تم الحذف");
      router.push("/admin/opinions");
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
          category: "مقال رأي",
          style: aiImageStyle,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "فشل توليد الصورة");
        return null;
      }
      const data = await res.json();
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
      toast.error("أضف العنوان أولاً");
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
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { media } = await res.json();
        setFeaturedImageUrl(media.url);
        setFeaturedMediaId(media.id);
        setIsAiImage(false);
      }
    };
    input.click();
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="animate-spin text-burgundy" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-7 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/opinions"
            className="w-10 h-10 rounded-xl border border-line bg-paper grid place-items-center hover:bg-bg-2 transition-colors"
          >
            <ArrowRight size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-ink -tracking-[0.01em] flex items-center gap-2">
              <PenTool size={20} className="text-burgundy" />
              تعديل مقال رأي
            </h1>
            <p className="text-sm text-ink-soft">
              الحالة: <span className="font-bold text-burgundy">{statusLabel(status)}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="bg-paper border border-rose-200 text-rose-600 px-3 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 hover:bg-rose-50 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="bg-paper border border-line px-4.5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 hover:bg-bg-2 transition-colors disabled:opacity-50"
          >
            <Save size={14} /> حفظ
          </button>
          {status !== "review" && (
            <button
              onClick={() => handleSave("review")}
              disabled={saving}
              className="bg-paper border border-line px-4.5 py-2.5 rounded-xl text-[13px] font-semibold hover:bg-bg-2 transition-colors disabled:opacity-50"
            >
              إرسال للمراجعة
            </button>
          )}
          {!permsLoading && canPublish && status !== "published" && (
            <button
              onClick={() => handleSave("published")}
              disabled={saving}
              className="bg-burgundy text-white px-4.5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 shadow-red hover:bg-burgundy-dark transition-all disabled:opacity-50"
            >
              {saving ? "..." : "نشر الآن"}
            </button>
          )}
          {status === "published" && (
            <button
              onClick={() => handleSave("draft")}
              disabled={saving}
              className="bg-bg-2 text-ink-2 px-4.5 py-2.5 rounded-xl text-[13px] font-semibold hover:bg-line transition-colors disabled:opacity-50"
            >
              إلغاء النشر
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-5">
          <div className="card">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-3xl font-extrabold text-ink outline-none bg-transparent placeholder:text-ink-faint -tracking-[0.02em] leading-tight mb-3"
              dir="rtl"
            />
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="عنوان فرعي..."
              className="w-full text-base text-ink-2 outline-none bg-transparent placeholder:text-ink-faint"
              dir="rtl"
            />
          </div>

          <div className="card">
            <label className="block text-[11px] font-semibold text-ink-soft tracking-wide mb-2">
              المقتطف
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              className="w-full text-sm text-ink outline-none bg-transparent resize-none leading-relaxed"
              dir="rtl"
            />
          </div>

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
            initialContent={initialContent}
            placeholder="اكتب المقال..."
            onChange={({ html, json }) => {
              setContentHtml(html);
              setContentJson(json);
            }}
          />

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
                <img src={featuredImageUrl} alt="" className="w-full h-full object-cover" />
                {isAiImage && (
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[11px] font-semibold">
                    <Sparkles size={11} /> ذكاء اصطناعي
                  </div>
                )}
                <button
                  onClick={() => { setFeaturedImageUrl(""); setFeaturedMediaId(null); setIsAiImage(false); }}
                  className="absolute top-2 left-2 bg-paper text-ink-2 px-3 py-1 rounded-md text-xs font-semibold"
                >
                  إزالة
                </button>
              </div>
            ) : (
              <button
                onClick={handleImageUpload}
                className="w-full aspect-video rounded-xl border-2 border-dashed border-line bg-bg-2 hover:border-burgundy hover:bg-rose-cream/30 transition-all grid place-items-center text-ink-soft"
              >
                <div className="text-center">
                  <ImageIcon size={28} className="mx-auto mb-2 opacity-60" />
                  <span className="text-xs">اضغط لرفع الصورة</span>
                </div>
              </button>
            )}
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                <button type="button" onClick={() => setAiImageStyle("photorealistic")}
                  className={`py-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    aiImageStyle === "photorealistic" ? "bg-burgundy text-white" : "bg-bg-2 text-ink-2 hover:bg-line"
                  }`}>
                  <Camera size={11} /> واقعية
                </button>
                <button type="button" onClick={() => setAiImageStyle("illustration")}
                  className={`py-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    aiImageStyle === "illustration" ? "bg-burgundy text-white" : "bg-bg-2 text-ink-2 hover:bg-line"
                  }`}>
                  <Palette size={11} /> رسومية
                </button>
              </div>
              <button
                onClick={handleGenerateImage}
                disabled={generatingImage || storageBlocked}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-burgundy/40 bg-rose-cream/30 text-burgundy text-[13px] font-semibold hover:bg-rose-cream/60 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {generatingImage ? <><Loader2 size={14} className="animate-spin" /> جاري...</> :
                 storageBlocked ? <><AlertTriangle size={14} /> التخزين غير متاح</> :
                 <><Sparkles size={14} /> توليد بالذكاء الاصطناعي</>}
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="text-[14px] font-bold text-ink mb-3">الكاتب *</h3>
            <AuthorSelect
              value={authorId}
              options={authorsList}
              onChange={(nextId) => {
                // Confirm before reassigning the piece to a different author —
                // ownership of opinion pieces matters for permissions and the
                // public-facing byline, so this should never be a one-click
                // accident.
                if (nextId !== authorId && initialAuthorId && nextId !== initialAuthorId) {
                  setPendingAuthorId(nextId);
                  return;
                }
                setAuthorId(nextId);
              }}
              placeholder="اختر الكاتب..."
            />
            {authorId !== initialAuthorId && (
              <p className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                سيتم تغيير كاتب هذا المقال عند الحفظ.
              </p>
            )}
          </div>

          <div className="card space-y-4">
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
                  <div className="text-[11px] text-ink-soft">يظهر في صدارة قسم الرأي</div>
                </div>
              </label>
              <label className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border transition-all ${
                !isFeatured && !excludeFromHome ? "border-burgundy bg-rose-cream/40" : "border-line bg-bg-2 hover:bg-rose-cream/20"
              }`}>
                <input type="radio" name="homeVisibility" checked={!isFeatured && !excludeFromHome}
                  onChange={() => { setIsFeatured(false); setExcludeFromHome(false); }}
                  className="accent-burgundy" />
                <div>
                  <div className="text-[12px] font-bold text-ink">📝 عادي</div>
                  <div className="text-[11px] text-ink-soft">ضمن أحدث المقالات</div>
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
                  <div className="text-[11px] text-ink-soft">في صفحة المقالات فقط</div>
                </div>
              </label>
            </div>
          </div>

          <div className="card">
            <h3 className="text-[14px] font-bold text-ink mb-3 flex items-center gap-2">
              <Calendar size={14} /> جدولة النشر
            </h3>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="input"
            />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="حذف المقال؟"
        message={`هل أنت متأكد من حذف "${title}"؟ لا يمكن التراجع.`}
        confirmText="حذف"
        danger
        onConfirm={() => { void handleDelete(); }}
        onClose={() => setConfirmDelete(false)}
      />

      <ConfirmDialog
        open={!!pendingAuthorId}
        title="تغيير كاتب المقال؟"
        message={(() => {
          const from = authorsList.find((a) => a.id === initialAuthorId)?.fullName ?? "—";
          const to = authorsList.find((a) => a.id === pendingAuthorId)?.fullName ?? "—";
          return `سيتم نسب هذا المقال إلى "${to}" بدلاً من "${from}". هذا يغيّر المؤلف الظاهر للقراء وقد يؤثر على صلاحيات التعديل اللاحقة. هل تريد المتابعة؟`;
        })()}
        confirmText="نعم، غيّر الكاتب"
        onConfirm={() => {
          if (pendingAuthorId) setAuthorId(pendingAuthorId);
          setPendingAuthorId(null);
        }}
        onClose={() => setPendingAuthorId(null)}
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

function statusLabel(s: string): string {
  return ({
    draft: "مسودة",
    review: "قيد المراجعة",
    scheduled: "مجدول",
    published: "منشور",
    archived: "مؤرشف",
  } as Record<string, string>)[s] ?? s;
}
