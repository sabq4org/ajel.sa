"use client";

import { AdminTopbar } from "@/components/admin/AdminLayout";
import { useEffect, useState } from "react";
import { Loader2, TrendingUp, Eye, MessageCircle, FileText, Users as UsersIcon, Zap } from "lucide-react";
import { toast } from "@/components/admin/Toast";

type Summary = {
  totals: {
    articles: number;
    published: number;
    draft: number;
    breaking: number;
    totalViews: number;
    totalComments: number;
    users: number;
    pendingComments: number;
  };
  topArticles: Array<{ id: string; title: string; slug: string; viewCount: number; categoryName: string | null }>;
  byCategory: Array<{ name: string; count: number; views: number }>;
  dailyViews: Array<{ day: string; count: number }>;
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/summary")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => toast.error("فشل التحميل"))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <>
        <AdminTopbar title="التحليلات" subtitle="إحصائيات المحتوى والقراء" />
        <div className="card py-16 grid place-items-center text-ink-soft"><Loader2 className="animate-spin" /></div>
      </>
    );
  }

  const maxDaily = Math.max(...data.dailyViews.map((d) => d.count), 1);
  const maxCat = Math.max(...data.byCategory.map((c) => c.count), 1);

  return (
    <>
      <AdminTopbar title="التحليلات" subtitle="إحصائيات المحتوى والقراء" />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Kpi icon={<FileText size={16} />} label="إجمالي الأخبار" value={data.totals.articles} sub={`${data.totals.published} منشور · ${data.totals.draft} مسودة`} />
        <Kpi icon={<Eye size={16} />} label="إجمالي القراءات" value={data.totals.totalViews.toLocaleString("en")} accent />
        <Kpi icon={<Zap size={16} />} label="أخبار عاجلة" value={data.totals.breaking} />
        <Kpi icon={<MessageCircle size={16} />} label="التعليقات" value={data.totals.totalComments} sub={`${data.totals.pendingComments} في الانتظار`} />
        <Kpi icon={<UsersIcon size={16} />} label="فريق التحرير" value={data.totals.users} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Articles */}
        <div className="card">
          <h2 className="text-[15px] font-bold text-ink mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-burgundy" />
            أكثر الأخبار قراءة
          </h2>
          {data.topArticles.length === 0 ? (
            <div className="py-8 text-center text-ink-soft text-sm">لا توجد بيانات</div>
          ) : (
            <ol className="space-y-2">
              {data.topArticles.map((a, i) => (
                <li key={a.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-2/40 transition-colors">
                  <span className="w-7 h-7 rounded-full bg-rose-cream text-burgundy grid place-items-center text-[12px] font-bold shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-ink font-medium truncate">{a.title}</div>
                    <div className="text-[11px] text-ink-soft">{a.categoryName ?? "—"}</div>
                  </div>
                  <div className="text-[12px] text-ink-2 font-semibold tabular-nums shrink-0">
                    {a.viewCount.toLocaleString("en")}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* By Category */}
        <div className="card">
          <h2 className="text-[15px] font-bold text-ink mb-4">حسب القسم</h2>
          {data.byCategory.length === 0 ? (
            <div className="py-8 text-center text-ink-soft text-sm">لا توجد بيانات</div>
          ) : (
            <div className="space-y-3">
              {data.byCategory.map((c) => (
                <div key={c.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] text-ink font-medium">{c.name}</span>
                    <span className="text-[12px] text-ink-soft tabular-nums">{c.count} خبر</span>
                  </div>
                  <div className="h-2 bg-bg-2 rounded-full overflow-hidden">
                    <div className="h-full bg-burgundy rounded-full transition-all" style={{ width: `${(c.count / maxCat) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Daily Views */}
        <div className="card lg:col-span-2">
          <h2 className="text-[15px] font-bold text-ink mb-4">القراءات اليومية (آخر ١٤ يوم)</h2>
          {data.dailyViews.length === 0 ? (
            <div className="py-8 text-center text-ink-soft text-sm">لا توجد بيانات بعد. ستظهر بمجرد بدء الزيارات.</div>
          ) : (
            <div className="flex items-end gap-2 h-40">
              {data.dailyViews.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-burgundy/80 rounded-t hover:bg-burgundy transition-colors" style={{ height: `${(d.count / maxDaily) * 100}%`, minHeight: 2 }} title={`${d.day}: ${d.count}`} />
                  <div className="text-[9px] text-ink-soft">{d.day.slice(5)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Kpi({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: number | string; sub?: string; accent?: boolean }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 text-ink-soft text-[12px] mb-2">{icon} <span className="font-semibold">{label}</span></div>
      <div className={`text-2xl font-black tabular-nums ${accent ? "text-burgundy" : "text-ink"}`}>{value}</div>
      {sub && <div className="text-[11px] text-ink-soft mt-1">{sub}</div>}
    </div>
  );
}
