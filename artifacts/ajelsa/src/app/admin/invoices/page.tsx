"use client";

import { useMemo, useState } from "react";
import { AdminTopbar } from "@/components/admin/AdminLayout";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FilePlus2,
  Mail,
  MoreHorizontal,
  Receipt,
  Search,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

type InvoiceStatus = "paid" | "unpaid" | "overdue" | "draft";

type Invoice = {
  id: string;
  number: string;
  client: string;
  campaign: string;
  status: InvoiceStatus;
  amount: number;
  vat: number;
  issueDate: string;
  dueDate: string;
  owner: string;
};

const invoicesSeed: Invoice[] = [
  {
    id: "inv_001",
    number: "INV-2026-1042",
    client: "شركة مدار الإعلام",
    campaign: "بانر الصفحة الرئيسية",
    status: "paid",
    amount: 42000,
    vat: 6300,
    issueDate: "2026-04-26",
    dueDate: "2026-05-06",
    owner: "سلطان المالكي",
  },
  {
    id: "inv_002",
    number: "INV-2026-1041",
    client: "وكالة وهج",
    campaign: "رعاية قسم الاقتصاد",
    status: "unpaid",
    amount: 18500,
    vat: 2775,
    issueDate: "2026-04-29",
    dueDate: "2026-05-09",
    owner: "ريم الشهري",
  },
  {
    id: "inv_003",
    number: "INV-2026-1038",
    client: "نخبة التقنية",
    campaign: "إعلان مقال مميز",
    status: "overdue",
    amount: 9600,
    vat: 1440,
    issueDate: "2026-04-10",
    dueDate: "2026-04-25",
    owner: "أحمد العمري",
  },
  {
    id: "inv_004",
    number: "INV-2026-1035",
    client: "مؤسسة آفاق",
    campaign: "حملة النشرة البريدية",
    status: "draft",
    amount: 12200,
    vat: 1830,
    issueDate: "2026-05-01",
    dueDate: "2026-05-15",
    owner: "سلطان المالكي",
  },
  {
    id: "inv_005",
    number: "INV-2026-1032",
    client: "شركة روافد",
    campaign: "إعلانات جانبية أسبوعية",
    status: "paid",
    amount: 27750,
    vat: 4162.5,
    issueDate: "2026-04-18",
    dueDate: "2026-04-28",
    owner: "ريم الشهري",
  },
];

const statusMeta: Record<InvoiceStatus, { label: string; tone: string; icon: typeof Receipt }> = {
  paid: { label: "مدفوعة", tone: "bg-emerald-50 text-sage", icon: CheckCircle2 },
  unpaid: { label: "بانتظار السداد", tone: "bg-amber-50 text-amber-700", icon: Clock3 },
  overdue: { label: "متأخرة", tone: "bg-rose-50 text-burgundy", icon: AlertCircle },
  draft: { label: "مسودة", tone: "bg-bg-2 text-ink-soft", icon: Receipt },
};

const filters: Array<{ label: string; value: "all" | InvoiceStatus }> = [
  { label: "الكل", value: "all" },
  { label: "مدفوعة", value: "paid" },
  { label: "بانتظار السداد", value: "unpaid" },
  { label: "متأخرة", value: "overdue" },
  { label: "مسودات", value: "draft" },
];

function money(value: number) {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 0,
  }).format(value);
}

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function InvoicesPage() {
  const [items, setItems] = useState(invoicesSeed);
  const [status, setStatus] = useState<"all" | InvoiceStatus>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(invoicesSeed[0]?.id ?? "");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((invoice) => {
      const matchesStatus = status === "all" || invoice.status === status;
      const matchesQuery =
        !q ||
        invoice.number.toLowerCase().includes(q) ||
        invoice.client.toLowerCase().includes(q) ||
        invoice.campaign.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [items, query, status]);

  const selected = items.find((invoice) => invoice.id === selectedId) ?? filtered[0] ?? items[0];
  const totalDue = items
    .filter((invoice) => invoice.status === "unpaid" || invoice.status === "overdue")
    .reduce((sum, invoice) => sum + invoice.amount + invoice.vat, 0);
  const paidTotal = items
    .filter((invoice) => invoice.status === "paid")
    .reduce((sum, invoice) => sum + invoice.amount + invoice.vat, 0);
  const overdueCount = items.filter((invoice) => invoice.status === "overdue").length;

  function markPaid(invoice: Invoice) {
    setItems((prev) => prev.map((item) => item.id === invoice.id ? { ...item, status: "paid" } : item));
  }

  function createDraft() {
    const nextNumber = `INV-2026-${1043 + items.length}`;
    const draft: Invoice = {
      id: `inv_${Date.now()}`,
      number: nextNumber,
      client: "عميل جديد",
      campaign: "حملة إعلانية جديدة",
      status: "draft",
      amount: 0,
      vat: 0,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      owner: "سلطان المالكي",
    };
    setItems((prev) => [draft, ...prev]);
    setSelectedId(draft.id);
    setStatus("all");
  }

  function exportCsv() {
    const rows = filtered.map((invoice) => [
      invoice.number,
      invoice.client,
      invoice.campaign,
      statusMeta[invoice.status].label,
      invoice.amount,
      invoice.vat,
      invoice.amount + invoice.vat,
      invoice.issueDate,
      invoice.dueDate,
    ]);
    const csv = [
      "رقم الفاتورة,العميل,الحملة,الحالة,المبلغ,الضريبة,الإجمالي,تاريخ الإصدار,تاريخ الاستحقاق",
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ajel-invoices-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <AdminTopbar
        title="الفواتير"
        subtitle="إدارة فواتير الإعلانات والرعايات والتحصيل"
        actions={
          <div className="flex gap-2">
            <button onClick={exportCsv} className="btn-secondary gap-2">
              <Download size={14} />
              تصدير
            </button>
            <button onClick={createDraft} className="btn-primary gap-2">
              <FilePlus2 size={15} />
              فاتورة جديدة
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Metric label="قيد التحصيل" value={money(totalDue)} helper="غير مدفوعة + متأخرة" />
        <Metric label="المحصّل" value={money(paidTotal)} helper="فواتير مدفوعة" />
        <Metric label="فواتير متأخرة" value={overdueCount.toString()} helper="تحتاج متابعة" danger={overdueCount > 0} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
        <section className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-line flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 bg-bg-2 border border-line rounded-xl px-3 py-2 lg:w-80">
              <Search size={14} className="text-ink-soft" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="بحث بالعميل أو رقم الفاتورة..."
                className="bg-transparent outline-none text-sm flex-1 min-w-0"
              />
            </div>
            <div className="flex flex-wrap gap-1 bg-bg-2 border border-line rounded-xl p-1">
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setStatus(filter.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all",
                    status === filter.value ? "bg-paper text-burgundy shadow-sm" : "text-ink-soft hover:text-burgundy"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-20 text-center text-ink-soft">
              <Receipt size={34} className="mx-auto mb-3 opacity-35" />
              <div className="text-sm">لا توجد فواتير مطابقة</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-line bg-bg-2/70">
                    {["الفاتورة", "العميل", "الحملة", "الحالة", "الإجمالي", "الاستحقاق", ""].map((head) => (
                      <th key={head} className="text-right px-5 py-3 text-[11px] text-ink-soft font-semibold whitespace-nowrap">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((invoice) => {
                    const meta = statusMeta[invoice.status];
                    const Icon = meta.icon;
                    return (
                      <tr
                        key={invoice.id}
                        onClick={() => setSelectedId(invoice.id)}
                        className={cn(
                          "border-b border-line-soft last:border-0 hover:bg-bg-2/50 cursor-pointer transition-colors",
                          selected?.id === invoice.id && "bg-rose-cream/35"
                        )}
                      >
                        <td className="px-5 py-4 font-bold text-ink whitespace-nowrap">{invoice.number}</td>
                        <td className="px-5 py-4 text-ink-2 whitespace-nowrap">{invoice.client}</td>
                        <td className="px-5 py-4 text-ink-soft min-w-52">{invoice.campaign}</td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold", meta.tone)}>
                            <Icon size={12} />
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-semibold text-ink whitespace-nowrap">{money(invoice.amount + invoice.vat)}</td>
                        <td className="px-5 py-4 text-ink-soft whitespace-nowrap">{dateLabel(invoice.dueDate)}</td>
                        <td className="px-5 py-4">
                          <button className="w-8 h-8 rounded-lg grid place-items-center text-ink-soft hover:bg-paper hover:text-burgundy">
                            <MoreHorizontal size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selected && (
          <aside className="card p-0 overflow-hidden">
            <div className="p-5 border-b border-line bg-bg-2/60">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-ink-soft mb-1">تفاصيل الفاتورة</div>
                  <h2 className="text-lg font-extrabold text-ink">{selected.number}</h2>
                </div>
                <span className={cn("px-2.5 py-1 rounded-full text-[11px] font-bold", statusMeta[selected.status].tone)}>
                  {statusMeta[selected.status].label}
                </span>
              </div>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <div className="text-[11px] text-ink-faint mb-1">العميل</div>
                <div className="font-bold text-ink">{selected.client}</div>
                <div className="text-sm text-ink-soft mt-1">{selected.campaign}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Info label="الإصدار" value={dateLabel(selected.issueDate)} />
                <Info label="الاستحقاق" value={dateLabel(selected.dueDate)} />
                <Info label="المبلغ" value={money(selected.amount)} />
                <Info label="الضريبة" value={money(selected.vat)} />
              </div>

              <div className="rounded-2xl bg-rose-cream/45 border border-burgundy/10 p-4">
                <div className="text-[11px] text-ink-soft mb-1">الإجمالي شامل الضريبة</div>
                <div className="text-2xl font-extrabold text-burgundy">{money(selected.amount + selected.vat)}</div>
              </div>

              <div className="space-y-2">
                <button className="w-full btn-primary justify-center gap-2">
                  <Send size={14} />
                  إرسال للعميل
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button className="btn-secondary justify-center gap-2">
                    <Eye size={14} />
                    معاينة
                  </button>
                  <button className="btn-secondary justify-center gap-2">
                    <Mail size={14} />
                    تذكير
                  </button>
                </div>
                {selected.status !== "paid" && (
                  <button
                    onClick={() => markPaid(selected)}
                    className="w-full border border-emerald-200 bg-emerald-50 text-sage px-4 py-2.5 rounded-xl text-[13px] font-bold hover:bg-emerald-100 transition-colors"
                  >
                    تسجيلها كمدفوعة
                  </button>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
    </>
  );
}

function Metric({
  label,
  value,
  helper,
  danger,
}: {
  label: string;
  value: string;
  helper: string;
  danger?: boolean;
}) {
  return (
    <div className="card">
      <div className={cn("text-2xl font-extrabold mb-1", danger ? "text-burgundy" : "text-ink")}>{value}</div>
      <div className="text-[12px] font-semibold text-ink-2">{label}</div>
      <div className="text-[11px] text-ink-faint mt-0.5">{helper}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-2 border border-line rounded-xl p-3">
      <div className="text-[10px] text-ink-faint mb-1">{label}</div>
      <div className="text-[13px] font-bold text-ink">{value}</div>
    </div>
  );
}
