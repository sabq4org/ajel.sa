"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { AdminTopbar } from "@/components/admin/AdminLayout";
import { ArrowRight, Save, Loader2 } from "lucide-react";
import { toast } from "@/components/admin/Toast";
import { AuthorForm, type AuthorFormState } from "@/components/admin/AuthorForm";

export default function EditAuthorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AuthorFormState | null>(null);

  useEffect(() => {
    fetch(`/api/authors/${id}`)
      .then((r) => r.json())
      .then((d) => {
        const a = d.author;
        if (!a) {
          toast.error("الكاتب غير موجود");
          router.push("/admin/authors");
          return;
        }
        setForm({
          fullName: a.fullName ?? "",
          slug: a.slug ?? "",
          position: a.position ?? "",
          shortBio: a.shortBio ?? "",
          bio: a.bio ?? "",
          avatarUrl: a.avatarUrl ?? "",
          twitter: a.twitter ?? "",
          email: a.email ?? "",
          userId: a.userId ?? null,
          isActive: !!a.isActive,
        });
      })
      .catch(() => toast.error("خطأ في التحميل"))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function save() {
    if (!form) return;
    if (!form.fullName.trim() || form.fullName.trim().length < 2) {
      toast.error("الاسم الكامل مطلوب");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/authors/${id}`, {
        method: "PATCH",
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
      if (!res.ok) throw new Error((await res.json()).error || "فشل التحديث");
      toast.success("تم الحفظ");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="animate-spin text-burgundy" />
      </div>
    );
  }

  return (
    <>
      <AdminTopbar
        title="تعديل كاتب"
        subtitle={form.fullName}
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
              حفظ التغييرات
            </button>
          </>
        }
      />
      <AuthorForm form={form} onChange={setForm} />
    </>
  );
}
