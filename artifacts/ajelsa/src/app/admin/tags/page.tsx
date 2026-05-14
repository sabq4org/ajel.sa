"use client";

import { AdminTopbar } from "@/components/admin/AdminLayout";
import { useEffect, useState } from "react";
import { Plus, Edit3, Trash2, Loader2, Tag as TagIcon, Search } from "lucide-react";
import { Modal, ConfirmDialog } from "@/components/admin/Modal";
import { toast } from "@/components/admin/Toast";

type Tag = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  usageCount: number;
  articleCount: number;
};

export default function TagsPage() {
  const [items, setItems] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<Tag>>({});
  const [confirmDelete, setConfirmDelete] = useState<Tag | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/tags");
      const d = await res.json();
      setItems(d.items ?? []);
    } catch {
      toast.error("فشل التحميل");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!form.name || form.name.trim().length < 1) {
      toast.error("اسم الوسم مطلوب");
      return;
    }
    setSaving(true);
    try {
      const isEdit = !!form.id;
      const url = isEdit ? `/api/tags/${form.id}` : "/api/tags";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), description: form.description || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "فشل الحفظ");
        return;
      }
      toast.success(isEdit ? "تم التحديث" : "تم إنشاء الوسم");
      setModalOpen(false);
      setForm({});
      void load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(t: Tag) {
    try {
      const res = await fetch(`/api/tags/${t.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "فشل");
      toast.success("تم الحذف");
      setItems((prev) => prev.filter((x) => x.id !== t.id));
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const filtered = search.trim()
    ? items.filter((t) => t.name.toLowerCase().includes(search.trim().toLowerCase()))
    : items;

  return (
    <>
      <AdminTopbar
        title="الوسوم"
        subtitle={`${items.length} وسم · لتصنيف الأخبار`}
        actions={
          <button onClick={() => { setForm({}); setModalOpen(true); }} className="bg-burgundy text-white px-4.5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 shadow-red hover:bg-burgundy-dark transition-all">
            <Plus size={14} /> وسم جديد
          </button>
        }
      />

      <div className="card mb-5 p-4">
        <div className="flex items-center gap-2 bg-bg border border-line rounded-xl px-3 py-2">
          <Search size={14} className="text-ink-soft" />
          <input type="search" placeholder="ابحث عن وسم..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" />
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="py-16 grid place-items-center text-ink-soft"><Loader2 className="animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-ink-soft text-sm flex flex-col items-center gap-3">
            <TagIcon size={32} className="opacity-40" />
            <div>{items.length === 0 ? "لا توجد وسوم" : "لا نتائج"}</div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 p-4">
            {filtered.map((t) => (
              <div key={t.id} className="group flex items-center gap-2 bg-bg-2 hover:bg-rose-cream/40 transition-colors rounded-xl px-3 py-2 border border-line">
                <TagIcon size={12} className="text-ink-soft" />
                <span className="text-[13px] font-medium text-ink">{t.name}</span>
                <span className="text-[11px] text-ink-soft tabular-nums px-1.5 py-0.5 bg-paper rounded-md">{t.articleCount}</span>
                <button onClick={() => { setForm(t); setModalOpen(true); }} className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded grid place-items-center text-ink-soft hover:text-burgundy transition-all">
                  <Edit3 size={11} />
                </button>
                <button onClick={() => setConfirmDelete(t)} className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded grid place-items-center text-ink-soft hover:text-burgundy transition-all">
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? "تعديل وسم" : "وسم جديد"}>
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-ink-soft mb-1.5">الاسم *</label>
            <input type="text" value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="مثل: السعودية" />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-ink-soft mb-1.5">الوصف</label>
            <textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" rows={2} />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} disabled={saving} className="bg-burgundy text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-burgundy-dark disabled:opacity-50">{saving ? "..." : "حفظ"}</button>
            <button onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-ink-2 border border-line hover:bg-bg">إلغاء</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => { if (confirmDelete) await handleDelete(confirmDelete); }}
        title="حذف الوسم"
        message={`حذف الوسم "${confirmDelete?.name}"؟`}
        confirmText="حذف"
        danger
      />
    </>
  );
}
