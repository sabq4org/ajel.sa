"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { AdminTopbar } from "@/components/admin/AdminLayout";
import { ArrowRight, Save, Loader2 } from "lucide-react";
import { toast } from "@/components/admin/Toast";
import { AuthorForm, type AuthorFormState } from "@/components/admin/AuthorForm";

export default function NewAuthorPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AuthorFormState>({
    fullName: "",
    slug: "",
    position: "",
    shortBio: "",
    bio: "",
    avatarUrl: "",
    twitter: "",
    email: "",
    userId: null,
    isActive: true,
  });

  async function save() {
    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      toast.error("الاسم الكامل مطلوب");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/authors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          slug: form.slug.trim() || undefined,
          position: form.position.trim() || null,
          shortBio: form.shortBio.trim() || null,
          bio: form.bio.trim() || null,
          avatarUrl: form.avatarUrl.trim() || null,
          twitter: form.twitter.trim() || null,
          email: form.email.trim() || null,
          userId: form.userId,
          isActive: form.isActive,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "فشل الحفظ");
      toast.success("تم إنشاء الكاتب");
      router.push("/admin/authors");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminTopbar
        title="كاتب رأي جديد"
        subtitle="أضف ملف كاتب جديد لمنصة مقالات الرأي"
        actions={
          <>
            <Link
              href="/admin/authors"
              className="inline-flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-burgundy px-3 py-2 rounded-xl border border-line"
            >
              <ArrowRight size={13} /> رجوع
            </Link>
            <button
              onClick={save}
              disabled={saving}
              className="bg-burgundy text-white px-4.5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 shadow-red hover:bg-burgundy-dark transition-all disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              حفظ
            </button>
          </>
        }
      />
      <AuthorForm form={form} onChange={setForm} />
    </>
  );
}
