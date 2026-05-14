"use client";

import { useEffect, useState } from "react";
import { Image as ImageIcon, Upload, Loader2, X, Link2, UserCircle2 } from "lucide-react";
import { toast } from "@/components/admin/Toast";
import {
  checkUploadSize,
  readUploadErrorMessage,
  readUploadThrownMessage,
} from "@/lib/uploadErrors";

export type AuthorFormState = {
  fullName: string;
  slug: string;
  position: string;
  shortBio: string;
  bio: string;
  avatarUrl: string;
  twitter: string;
  email: string;
  userId: string | null;
  isActive: boolean;
};

type UserOption = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatarUrl: string | null;
};

const ROLE_LABEL: Record<string, string> = {
  super_admin: "مدير عام",
  editor_in_chief: "رئيس التحرير",
  editor: "محرر",
  writer: "كاتب",
  contributor: "مساهم",
};

interface Props {
  form: AuthorFormState;
  onChange: (next: AuthorFormState) => void;
  /** When true, hides the slug field (e.g. on the create form before the
   *  fullName is finalized — the server will autogenerate). */
  hideSlug?: boolean;
}

export function AuthorForm({ form, onChange, hideSlug = false }: Props) {
  const [uploading, setUploading] = useState(false);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUsersLoading(true);
    fetch("/api/users/options")
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(r.status === 403 ? "صلاحيات غير كافية لعرض المستخدمين" : "تعذّر تحميل قائمة المستخدمين");
        }
        return r.json();
      })
      .then((d) => {
        if (cancelled) return;
        setUserOptions(Array.isArray(d.items) ? d.items : []);
        setUsersError(null);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setUsersError(e.message);
      })
      .finally(() => {
        if (!cancelled) setUsersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const set = <K extends keyof AuthorFormState>(k: K, v: AuthorFormState[K]) =>
    onChange({ ...form, [k]: v });

  const linkedUser = form.userId
    ? userOptions.find((u) => u.id === form.userId) ?? null
    : null;

  async function pickAvatar() {
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
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          toast.error(await readUploadErrorMessage(res));
          return;
        }
        const { media } = await res.json();
        set("avatarUrl", media.url);
        toast.success("تم رفع الصورة");
      } catch (err: unknown) {
        toast.error(readUploadThrownMessage(err));
      } finally {
        setUploading(false);
      }
    };
    input.click();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
      <div className="space-y-5">
        <div className="card p-5 space-y-4">
          <Field label="الاسم الكامل *">
            <input
              value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              placeholder="د. خالد الحريري"
              className="input"
            />
          </Field>

          {!hideSlug && (
            <Field label="رابط الكاتب (slug)">
              <input
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
                placeholder="d-khald-alhryry"
                className="input ltr:text-left rtl:text-left text-[12px]"
                dir="ltr"
              />
              <div className="text-[10px] text-ink-faint mt-1">
                يستخدم في رابط صفحة الكاتب: /opinions/author/&lt;الرابط&gt;. اتركه فارغاً ليتم توليده تلقائياً.
              </div>
            </Field>
          )}

          <Field label="الموقع / الصفة">
            <input
              value={form.position}
              onChange={(e) => set("position", e.target.value)}
              placeholder="كاتب اقتصادي · مستشار تخطيط استراتيجي"
              className="input"
            />
          </Field>

          <Field label="نبذة قصيرة (300 حرف)">
            <textarea
              value={form.shortBio}
              onChange={(e) => set("shortBio", e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="جملة أو جملتان تعرّفان بالكاتب — تظهر في كرت الكاتب."
              className="input min-h-[64px]"
            />
            <div className="text-[10px] text-ink-faint text-left mt-1">{form.shortBio.length}/300</div>
          </Field>

          <Field label="السيرة الذاتية الكاملة">
            <textarea
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
              rows={5}
              maxLength={4000}
              placeholder="نبذة موسّعة عن الكاتب: تخصصه، خبراته، وأبرز اهتماماته. تظهر في صفحة الكاتب."
              className="input min-h-[140px]"
            />
          </Field>
        </div>
      </div>

      <div className="space-y-5">
        <div className="card p-5 space-y-4">
          <div className="text-[12px] font-bold text-ink mb-2">الصورة الشخصية</div>
          {form.avatarUrl ? (
            <div className="relative aspect-square w-full max-w-[200px] mx-auto rounded-2xl overflow-hidden border border-line group">
              <img src={form.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => set("avatarUrl", "")}
                title="إزالة الصورة"
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-paper/95 grid place-items-center text-rose-600 hover:bg-rose-50 shadow-sm"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={pickAvatar}
              disabled={uploading}
              className="aspect-square w-full max-w-[200px] mx-auto rounded-2xl bg-bg-2 border border-dashed border-line grid place-items-center text-ink-soft hover:border-burgundy hover:bg-rose-cream/30 transition-all disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 size={28} className="animate-spin" />
              ) : (
                <div className="text-center">
                  <ImageIcon size={28} className="mx-auto mb-2 opacity-60" />
                  <span className="text-xs font-semibold">اضغط لرفع صورة</span>
                </div>
              )}
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={pickAvatar}
              disabled={uploading}
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-rose-cream/40 text-burgundy text-[12px] font-bold hover:bg-rose-cream transition-colors disabled:opacity-60"
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {form.avatarUrl ? "تغيير الصورة" : "رفع صورة"}
            </button>
            <input
              value={form.avatarUrl}
              onChange={(e) => set("avatarUrl", e.target.value)}
              placeholder="أو ألصق رابطاً..."
              className="input text-[11px]"
              dir="ltr"
            />
          </div>
        </div>

        <div className="card p-5 space-y-4">
          <div className="text-[12px] font-bold text-ink mb-2">روابط التواصل</div>
          <Field label="حساب X (تويتر) — بدون @">
            <input
              value={form.twitter}
              onChange={(e) => set("twitter", e.target.value)}
              placeholder="k_alhariri"
              className="input"
            />
          </Field>
          <Field label="البريد الإلكتروني">
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="author@example.com"
              className="input"
            />
          </Field>
        </div>

        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2 text-[12px] font-bold text-ink">
            <Link2 size={13} className="text-burgundy" />
            ربط بحساب مستخدم
          </div>
          <div className="text-[11px] text-ink-soft leading-relaxed">
            عند الربط، يستطيع هذا المستخدم تحرير مقالات الرأي المنسوبة إليه عبر صلاحية
            <span className="font-bold mx-1">opinion.edit_own</span>. اختياري.
          </div>

          {usersLoading ? (
            <div className="flex items-center gap-2 text-[11px] text-ink-soft py-2">
              <Loader2 size={12} className="animate-spin" />
              جاري تحميل المستخدمين...
            </div>
          ) : usersError ? (
            <div className="text-[11px] text-rose-600 bg-rose-50 rounded-lg p-2.5">
              {usersError}
            </div>
          ) : (
            <>
              <select
                value={form.userId ?? ""}
                onChange={(e) => set("userId", e.target.value || null)}
                className="input w-full"
                aria-label="ربط الكاتب بحساب مستخدم"
              >
                <option value="">— بدون ربط —</option>
                {userOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} · {ROLE_LABEL[u.role] ?? u.role} · {u.email}
                  </option>
                ))}
              </select>
              {linkedUser ? (
                <div className="flex items-center gap-2 bg-rose-cream/40 rounded-lg p-2">
                  <div className="w-8 h-8 rounded-full bg-burgundy text-white grid place-items-center text-[11px] font-bold flex-shrink-0 overflow-hidden">
                    {linkedUser.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={linkedUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      linkedUser.fullName[0]
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-[11px]">
                    <div className="font-bold text-ink truncate">{linkedUser.fullName}</div>
                    <div className="text-ink-soft truncate">
                      {ROLE_LABEL[linkedUser.role] ?? linkedUser.role} · {linkedUser.email}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => set("userId", null)}
                    className="text-ink-soft hover:text-rose-600 p-1"
                    title="إلغاء الربط"
                    aria-label="إلغاء الربط"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : form.userId ? (
                <div className="flex items-center gap-2 text-[11px] text-amber-700 bg-amber-50 rounded-lg p-2">
                  <UserCircle2 size={13} />
                  المستخدم المرتبط غير نشط أو محذوف
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="card p-5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="w-4 h-4 accent-burgundy"
            />
            <div>
              <div className="text-[13px] font-bold text-ink">نشط</div>
              <div className="text-[10px] text-ink-soft">يظهر للعموم في صفحة مقالات الرأي</div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-ink-2 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
