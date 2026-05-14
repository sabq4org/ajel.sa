"use client";

import { AdminTopbar } from "@/components/admin/AdminLayout";
import { useEffect, useState } from "react";
import { Plus, Edit3, Trash2, Loader2, FolderTree } from "lucide-react";
import { Modal, ConfirmDialog } from "@/components/admin/Modal";
import { toast } from "@/components/admin/Toast";

type Category = {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  description: string | null;
  color: string;
  position: number;
  isActive: boolean;
  articleCount: number;
};

const EMPTY: Partial<Category> = {
  name: "",
  nameEn: "",
  description: "",
  color: "#8c1d2b",
  position: 0,
  isActive: true,
};

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<Category>>(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/categories");
      const d = await res.json();
      setItems(d.items ?? []);
    } catch {
      toast.error("فشل تحميل الأقسام");
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setForm(EMPTY);
    setModalOpen(true);
  }

  function openEdit(cat: Category) {
    setForm(cat);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name || form.name.trim().length < 1) {
      toast.error("اسم القسم مطلوب");
      return;
    }
    setSaving(true);
    try {
      const isEdit = "id" in form && form.id;
      const url = isEdit ? `/api/categories/${form.id}` : "/api/categories";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name?.trim(),
          nameEn: form.nameEn || undefined,
          description: form.description || undefined,
          color: form.color,
          position: Number(form.position) || 0,
          isActive: form.isActive,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "فشل الحفظ");
        return;
      }
      toast.success(isEdit ? "تم التحديث" : "تم إنشاء القسم");
      setModalOpen(false);
      void load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cat: Category) {
    try {
      const res = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "فشل الحذف");
      }
      toast.success("تم حذف القسم");
      setItems((prev) => prev.filter((c) => c.id !== cat.id));
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <>
      <AdminTopbar
        title="الأقسام"
        subtitle={`${items.length} قسم · تنظيم محتوى الموقع`}
        actions={
          <button onClick={openNew} className="bg-burgundy text-white px-4.5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 shadow-red hover:bg-burgundy-dark hover:-translate-y-0.5 transition-all">
            <Plus size={14} /> قسم جديد
          </button>
        }
      />

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="py-16 grid place-items-center text-ink-soft"><Loader2 className="animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-ink-soft text-sm flex flex-col items-center gap-3">
            <FolderTree size={32} className="opacity-40" />
            <div>لا توجد أقسام بعد. ابدأ بإضافة أول قسم.</div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-line bg-bg-2">
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-ink-soft tracking-wide w-12"></th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-ink-soft tracking-wide">الاسم</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-ink-soft tracking-wide w-32">المُعرّف (slug)</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-ink-soft tracking-wide w-24">الأخبار</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-ink-soft tracking-wide w-24">الحالة</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((cat) => (
                <tr key={cat.id} className="border-b border-line-soft last:border-b-0 hover:bg-bg-2/40">
                  <td className="px-5 py-3.5">
                    <div className="w-6 h-6 rounded-md" style={{ background: cat.color }} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-[14px] text-ink font-medium">{cat.name}</div>
                    {cat.nameEn && <div className="text-[11px] text-ink-soft">{cat.nameEn}</div>}
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-ink-soft font-mono">{cat.slug}</td>
                  <td className="px-5 py-3.5 text-[13px] text-ink font-semibold tabular-nums">{cat.articleCount}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full ${cat.isActive ? "bg-emerald-50 text-sage" : "bg-bg-2 text-ink-soft"}`}>
                      {cat.isActive ? "نشط" : "معطّل"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(cat)} className="w-7 h-7 rounded-lg grid place-items-center text-ink-soft hover:bg-bg-2 hover:text-burgundy transition-colors" title="تعديل">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => setConfirmDelete(cat)} className="w-7 h-7 rounded-lg grid place-items-center text-ink-soft hover:bg-rose-cream hover:text-burgundy transition-colors" title="حذف">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? "تعديل قسم" : "قسم جديد"}>
        <div className="space-y-4">
          <Field label="الاسم بالعربية *">
            <input type="text" value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="مثل: محليات" />
          </Field>
          <Field label="الاسم بالإنجليزية (اختياري)">
            <input type="text" value={form.nameEn ?? ""} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} className="input" placeholder="Local" />
          </Field>
          <Field label="الوصف">
            <textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" rows={2} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="اللون">
              <div className="flex items-center gap-2">
                <input type="color" value={form.color ?? "#8c1d2b"} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-12 h-10 rounded-lg border border-line cursor-pointer" />
                <input type="text" value={form.color ?? "#8c1d2b"} onChange={(e) => setForm({ ...form, color: e.target.value })} className="input flex-1 font-mono text-xs" />
              </div>
            </Field>
            <Field label="الترتيب">
              <input type="number" value={form.position ?? 0} onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} className="input" />
            </Field>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 accent-burgundy" />
            <span className="text-sm text-ink">القسم نشط</span>
          </label>

          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} disabled={saving} className="bg-burgundy text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-burgundy-dark transition-colors disabled:opacity-50">
              {saving ? "..." : "حفظ"}
            </button>
            <button onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-ink-2 border border-line hover:bg-bg transition-colors">
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => { if (confirmDelete) await handleDelete(confirmDelete); }}
        title="حذف القسم"
        message={`حذف القسم "${confirmDelete?.name}"؟ لن يكون متاحاً إذا كان يحتوي على أخبار.`}
        confirmText="حذف"
        danger
      />
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-ink-soft mb-1.5">{label}</label>
      {children}
    </div>
  );
}
