"use client";

import { AdminTopbar } from "@/components/admin/AdminLayout";
import { useEffect, useState, useMemo } from "react";
import { Mail, Loader2, Download, UserMinus, UserCheck } from "lucide-react";
import { toast } from "@/components/admin/Toast";

type Subscriber = {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  source: string | null;
  subscribedAt: string;
  unsubscribedAt: string | null;
};

export default function NewsletterPage() {
  const [items, setItems] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/newsletter");
      const d = await res.json();
      setItems(d.items ?? []);
    } catch {
      toast.error("فشل التحميل");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(sub: Subscriber) {
    try {
      const res = await fetch("/api/newsletter", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sub.id, isActive: !sub.isActive }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setItems((prev) => prev.map((s) => s.id === sub.id ? { ...s, isActive: !s.isActive } : s));
      toast.success(sub.isActive ? "تم إلغاء الاشتراك" : "تم إعادة الاشتراك");
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  function exportCsv() {
    const header = "البريد الإلكتروني,الاسم,المصدر,تاريخ الاشتراك,الحالة";
    const rows = filtered.map((s) => [
      s.email,
      s.name ?? "",
      s.source ?? "",
      new Date(s.subscribedAt).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn"),
      s.isActive ? "نشط" : "ملغى",
    ].map((v) => `"${v}"`).join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = useMemo(
    () => search ? items.filter((s) => s.email.toLowerCase().includes(search.toLowerCase()) || (s.name ?? "").toLowerCase().includes(search.toLowerCase())) : items,
    [items, search]
  );

  const totalActive = items.filter((s) => s.isActive).length;
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const unsubThisMonth = items.filter((s) => !s.isActive && s.unsubscribedAt && new Date(s.unsubscribedAt) >= thisMonthStart).length;

  return (
    <>
      <AdminTopbar
        title="النشرة البريدية"
        subtitle={`${items.length} مشترك`}
        actions={
          <div className="flex gap-2">
            <button
              onClick={exportCsv}
              className="bg-paper border border-line text-ink-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 hover:bg-bg-2 transition-all"
            >
              <Download size={14} /> تصدير CSV
            </button>
            <button
              className="bg-bg-2 border border-line text-ink-soft px-4 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 cursor-default opacity-60"
              title="قريباً: التكامل مع SendGrid / Mailchimp"
            >
              <Mail size={14} /> إرسال النشرة
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card text-center">
          <div className="text-2xl font-bold text-ink">{items.length}</div>
          <div className="text-[12px] text-ink-soft mt-1">إجمالي المشتركين</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-sage">{totalActive}</div>
          <div className="text-[12px] text-ink-soft mt-1">نشطون</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-burgundy">{unsubThisMonth}</div>
          <div className="text-[12px] text-ink-soft mt-1">إلغاء الاشتراك هذا الشهر</div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالبريد أو الاسم..."
          className="input max-w-sm"
        />
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="py-16 grid place-items-center text-ink-soft"><Loader2 className="animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-ink-soft text-sm flex flex-col items-center gap-3">
            <Mail size={32} className="opacity-40" />
            <div>لا يوجد مشتركون</div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-line bg-bg-2">
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-ink-soft tracking-wide">البريد الإلكتروني</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-ink-soft tracking-wide w-36">الاسم</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-ink-soft tracking-wide w-36">تاريخ الاشتراك</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-ink-soft tracking-wide w-24">المصدر</th>
                <th className="text-right px-5 py-3 text-[11px] font-semibold text-ink-soft tracking-wide w-24">الحالة</th>
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sub) => (
                <tr key={sub.id} className="border-b border-line-soft last:border-b-0 hover:bg-bg-2/40">
                  <td className="px-5 py-3.5 text-[13px] text-ink font-medium">{sub.email}</td>
                  <td className="px-5 py-3.5 text-[13px] text-ink-2">{sub.name ?? "—"}</td>
                  <td className="px-5 py-3.5 text-[12px] text-ink-soft">{new Date(sub.subscribedAt).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn")}</td>
                  <td className="px-5 py-3.5 text-[12px] text-ink-soft">{sub.source ?? "—"}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${sub.isActive ? "bg-emerald-50 text-sage" : "bg-bg-2 text-ink-soft"}`}>
                      {sub.isActive ? "نشط" : "ملغى"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => toggleActive(sub)}
                      className="w-7 h-7 rounded-lg grid place-items-center text-ink-soft hover:bg-bg-2 hover:text-burgundy transition-colors"
                      title={sub.isActive ? "إلغاء الاشتراك" : "إعادة الاشتراك"}
                    >
                      {sub.isActive ? <UserMinus size={14} /> : <UserCheck size={14} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Coming Soon Notice */}
      <div className="mt-6 card bg-bg-2/50 border-dashed">
        <div className="flex items-center gap-3 text-ink-soft text-[13px]">
          <Mail size={18} className="text-burgundy opacity-60" />
          <span>
            <strong className="text-ink-2">قريباً:</strong> التكامل مع SendGrid / Mailchimp لإرسال النشرة البريدية مباشرة من النظام.
          </span>
        </div>
      </div>
    </>
  );
}
