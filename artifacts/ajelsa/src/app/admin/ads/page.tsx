"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminLayout, AdminTopbar } from "@/components/admin/AdminLayout";
import { Plus, Pencil, Trash2, X, ToggleLeft, ToggleRight, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface Ad {
  id: string;
  title: string;
  position: string;
  imageUrl: string | null;
  linkUrl: string | null;
  advertiser: string | null;
  isActive: boolean;
  impressions: number;
  clicks: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

const POSITION_LABELS: Record<string, string> = {
  header_banner: "بانر الرأسية",
  sidebar_top: "جانبي علوي",
  sidebar_bottom: "جانبي سفلي",
  article_top: "أعلى المقال",
  article_middle: "وسط المقال",
  article_bottom: "أسفل المقال",
  footer_banner: "بانر التذييل",
};

const POSITIONS = Object.keys(POSITION_LABELS);

const emptyForm = {
  title: "",
  position: "header_banner",
  imageUrl: "",
  linkUrl: "",
  advertiser: "",
  startDate: "",
  endDate: "",
};

function ctr(impressions: number, clicks: number): string {
  if (impressions === 0) return "0%";
  return ((clicks / impressions) * 100).toFixed(2) + "%";
}

export default function AdsPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchAds = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/ads");
      const data = await r.json();
      setAds(Array.isArray(data) ? data : []);
    } catch {
      setAds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAds(); }, [fetchAds]);

  function openCreate() {
    setEditingAd(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(ad: Ad) {
    setEditingAd(ad);
    setForm({
      title: ad.title,
      position: ad.position,
      imageUrl: ad.imageUrl ?? "",
      linkUrl: ad.linkUrl ?? "",
      advertiser: ad.advertiser ?? "",
      startDate: ad.startDate ? ad.startDate.slice(0, 10) : "",
      endDate: ad.endDate ? ad.endDate.slice(0, 10) : "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.title || !form.position) return;
    setSaving(true);
    try {
      const body = {
        title: form.title,
        position: form.position,
        imageUrl: form.imageUrl || null,
        linkUrl: form.linkUrl || null,
        advertiser: form.advertiser || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      };

      if (editingAd) {
        await fetch(`/api/ads/${editingAd.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/ads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      setShowModal(false);
      await fetchAds();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(ad: Ad) {
    await fetch(`/api/ads/${ad.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !ad.isActive }),
    });
    await fetchAds();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/ads/${id}`, { method: "DELETE" });
    setDeleteId(null);
    await fetchAds();
  }

  // Stats
  const activeCount = ads.filter((a) => a.isActive).length;
  const totalImpressions = ads.reduce((s, a) => s + a.impressions, 0);
  const totalClicks = ads.reduce((s, a) => s + a.clicks, 0);
  const avgCtr = totalImpressions > 0
    ? ((totalClicks / totalImpressions) * 100).toFixed(2) + "%"
    : "0%";

  return (
    <AdminLayout>
      <AdminTopbar
        title="إدارة الإعلانات"
        subtitle="تحكم في مواضع الإعلانات وأداء الحملات"
        actions={
          <button onClick={openCreate} className="btn-primary gap-2">
            <Plus size={15} />
            إعلان جديد
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "إعلانات نشطة", value: activeCount, sub: `من ${ads.length} إجمالي` },
          { label: "إجمالي المشاهدات", value: totalImpressions.toLocaleString("en"), sub: "مشاهدة" },
          { label: "إجمالي النقرات", value: totalClicks.toLocaleString("en"), sub: "نقرة" },
          { label: "معدل النقر", value: avgCtr, sub: "متوسط CTR" },
        ].map((s) => (
          <div key={s.label} className="bg-paper border border-line rounded-2xl p-4">
            <div className="text-2xl font-bold text-ink mb-0.5">{s.value}</div>
            <div className="text-[12px] text-ink-soft">{s.label}</div>
            <div className="text-[11px] text-ink-faint mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-paper border border-line rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-ink-soft text-sm">جاري التحميل...</div>
        ) : ads.length === 0 ? (
          <div className="py-16 text-center">
            <Megaphone size={32} className="mx-auto text-ink-faint mb-3" />
            <div className="text-ink-soft text-sm">لا توجد إعلانات بعد</div>
            <button onClick={openCreate} className="btn-primary mt-4 text-sm">إضافة أول إعلان</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line">
                  {["العنوان", "الموضع", "المعلن", "الحالة", "المشاهدات", "النقرات", "CTR", "التواريخ", ""].map((h) => (
                    <th key={h} className="text-right text-ink-soft font-semibold px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ads.map((ad) => (
                  <tr key={ad.id} className="border-b border-line last:border-0 hover:bg-bg-2/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-ink max-w-[200px] truncate">{ad.title}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 rounded-lg bg-bg-2 text-ink-2 text-[11px] font-semibold">
                        {POSITION_LABELS[ad.position] ?? ad.position}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{ad.advertiser ?? "—"}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(ad)}
                        className={cn(
                          "flex items-center gap-1.5 text-[12px] font-semibold transition-colors",
                          ad.isActive ? "text-green-600" : "text-ink-faint"
                        )}
                      >
                        {ad.isActive
                          ? <ToggleRight size={18} className="text-green-600" />
                          : <ToggleLeft size={18} />}
                        {ad.isActive ? "نشط" : "متوقف"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-ink-2">{ad.impressions.toLocaleString("en")}</td>
                    <td className="px-4 py-3 text-ink-2">{ad.clicks.toLocaleString("en")}</td>
                    <td className="px-4 py-3 font-semibold text-burgundy">{ctr(ad.impressions, ad.clicks)}</td>
                    <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                      {ad.startDate
                        ? new Date(ad.startDate).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn")
                        : "—"}
                      {ad.endDate ? ` ← ${new Date(ad.endDate).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn")}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(ad)}
                          className="w-7 h-7 grid place-items-center rounded-lg hover:bg-bg-2 text-ink-soft hover:text-ink transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteId(ad.id)}
                          className="w-7 h-7 grid place-items-center rounded-lg hover:bg-rose-cream text-ink-soft hover:text-burgundy transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-paper rounded-2xl border border-line w-full max-w-lg shadow-card max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line sticky top-0 bg-paper">
              <h2 className="font-bold text-ink">{editingAd ? "تعديل الإعلان" : "إعلان جديد"}</h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 grid place-items-center rounded-lg hover:bg-bg-2 text-ink-soft"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-[12px] font-semibold text-ink-soft mb-1.5 block">عنوان الإعلان *</label>
                <input
                  className="input"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="اسم الحملة الإعلانية"
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-ink-soft mb-1.5 block">الموضع *</label>
                <select
                  className="input"
                  value={form.position}
                  onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                >
                  {POSITIONS.map((p) => (
                    <option key={p} value={p}>{POSITION_LABELS[p]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[12px] font-semibold text-ink-soft mb-1.5 block">المعلن</label>
                <input
                  className="input"
                  value={form.advertiser}
                  onChange={(e) => setForm((f) => ({ ...f, advertiser: e.target.value }))}
                  placeholder="اسم الشركة أو الجهة"
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-ink-soft mb-1.5 block">رابط الصورة</label>
                <input
                  className="input"
                  value={form.imageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  placeholder="https://..."
                  dir="ltr"
                />
              </div>

              <div>
                <label className="text-[12px] font-semibold text-ink-soft mb-1.5 block">رابط الوجهة</label>
                <input
                  className="input"
                  value={form.linkUrl}
                  onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
                  placeholder="https://..."
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-semibold text-ink-soft mb-1.5 block">تاريخ البداية</label>
                  <input
                    type="date"
                    className="input"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-ink-soft mb-1.5 block">تاريخ الانتهاء</label>
                  <input
                    type="date"
                    className="input"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !form.title || !form.position}
                  className="btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "جاري الحفظ..." : (editingAd ? "حفظ التعديلات" : "إنشاء الإعلان")}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-shrink-0"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-paper rounded-2xl border border-line p-6 w-full max-w-sm shadow-card">
            <h3 className="font-bold text-ink mb-2">حذف الإعلان</h3>
            <p className="text-sm text-ink-soft mb-5">هل أنت متأكد من حذف هذا الإعلان؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteId)}
                className="btn flex-1 justify-center bg-burgundy text-white hover:bg-burgundy-dark"
              >
                نعم، احذف
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="btn-secondary flex-shrink-0"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
