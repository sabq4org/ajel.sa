import { AdminTopbar } from "@/components/admin/AdminLayout";
import { Newspaper, Eye, Users, MessageCircle, TrendingUp, Plus, Zap, HardDrive } from "lucide-react";
import { db, articles, users as usersTable } from "@/lib/db";
import { count, eq, and, gte } from "drizzle-orm";
import { fetchStorageQuota } from "@/lib/objectStorage";

async function getStats() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayArticlesRow] = await db
      .select({ count: count() })
      .from(articles)
      .where(and(eq(articles.status, "published"), gte(articles.publishedAt, today)));

    const [breakingRow] = await db
      .select({ count: count() })
      .from(articles)
      .where(and(eq(articles.status, "published"), eq(articles.isBreaking, true)));

    return {
      todayCount: todayArticlesRow?.count ?? 147,
      breakingCount: breakingRow?.count ?? 23,
      totalViews: 2_400_000,
      liveReaders: 8247,
      engagement: 38_200,
    };
  } catch {
    return {
      todayCount: 147,
      breakingCount: 23,
      totalViews: 2_400_000,
      liveReaders: 8247,
      engagement: 38_200,
    };
  }
}

export default async function AdminDashboard() {
  const [stats, quota] = await Promise.all([getStats(), fetchStorageQuota()]);

  return (
    <>
      <AdminTopbar
        title="أهلاً، سلطان"
        subtitle="إليك ملخص أداء عاجل اليوم"
        actions={
          <button className="bg-burgundy dark:bg-rose-500 text-white px-4.5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 shadow-red hover:bg-burgundy-dark dark:hover:bg-rose-400 hover:-translate-y-0.5 transition-all">
            <Plus size={14} /> خبر جديد
          </button>
        }
      />

      {/* Live ticker */}
      <div className="bg-burgundy dark:bg-gradient-to-l dark:from-rose-600 dark:to-rose-700 text-white px-5 py-2.5 rounded-xl mb-6 flex items-center gap-4 shadow-red overflow-hidden">
        <div className="bg-white text-burgundy dark:text-rose-700 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-widest flex items-center gap-1.5 flex-shrink-0">
          <span className="live-dot" />
          عاجل الآن
        </div>
        <div className="flex-1 overflow-hidden whitespace-nowrap">
          <div className="inline-block animate-ticker">
            <span className="ml-12 text-[13px] font-medium">
              <span className="opacity-50 ml-3 text-[9px]">◆</span>
              وزير المالية: ميزانية 2026 الأكبر في تاريخ المملكة
            </span>
            <span className="ml-12 text-[13px] font-medium">
              <span className="opacity-50 ml-3 text-[9px]">◆</span>
              ارتفاع جماعي للأسواق الخليجية في تعاملات اليوم
            </span>
            <span className="ml-12 text-[13px] font-medium">
              <span className="opacity-50 ml-3 text-[9px]">◆</span>
              الأخضر يصل لربع نهائي كأس آسيا بثلاثية تاريخية
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <KPICard
          featured
          icon={<Newspaper size={14} />}
          label="أخبار اليوم"
          value={stats.todayCount.toString()}
          trend="↑ 12%"
          detail={`عن الأمس · ${stats.breakingCount} عاجل`}
        />
        <KPICard
          icon={<Eye size={14} />}
          label="الزيارات اليوم"
          value="2.4M"
          trend="↑ 8.4%"
          detail="معدل القراءة 3:42 د"
        />
        <KPICard
          icon={<Users size={14} />}
          label="القراء الآن"
          value={stats.liveReaders.toLocaleString("en")}
          detail="في 124 خبر · ذروة 11:30 ص"
        />
        <KPICard
          icon={<MessageCircle size={14} />}
          label="التفاعل"
          value="38.2K"
          trend="↓ 2.1%"
          trendDown
          detail="تعليقات + مشاركات"
        />
      </div>

      {/* Storage Quota */}
      {quota !== null && (
        <StorageQuotaCard quota={quota} />
      )}

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mb-7">
        <div className="card">
          <div className="flex justify-between items-start mb-5">
            <div>
              <div className="text-[15px] font-bold text-ink mb-1">حركة الزيارات</div>
              <div className="text-[11px] text-ink-soft">
                آخر 7 أيام · مقارنة بالأسبوع السابق
              </div>
            </div>
            <div className="flex gap-1 bg-bg-2 p-0.5 rounded-lg">
              {["يومي", "أسبوعي", "شهري"].map((t, i) => (
                <button
                  key={t}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-medium ${
                    i === 1 ? "bg-paper text-burgundy dark:text-rose-300 shadow-soft font-semibold" : "text-ink-soft"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <TrafficChart />
        </div>

        <div className="card">
          <div className="mb-5">
            <div className="text-[15px] font-bold text-ink mb-1">توزيع الأقسام</div>
            <div className="text-[11px] text-ink-soft">نسبة المحتوى المنشور</div>
          </div>
          <CategoryDonut />
        </div>
      </div>

      {/* Top Articles + Editors + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-7">
        <div className="card">
          <div className="mb-4">
            <div className="text-[15px] font-bold text-ink mb-1">الأكثر قراءة اليوم</div>
            <div className="text-[11px] text-ink-soft">آخر تحديث قبل دقيقة</div>
          </div>
          <TopArticles />
        </div>

        <div className="card">
          <div className="mb-4">
            <div className="text-[15px] font-bold text-ink mb-1">أداء المحررين</div>
            <div className="text-[11px] text-ink-soft">عدد الأخبار المنشورة</div>
          </div>
          <EditorsLeaderboard />
        </div>

        <div className="card">
          <div className="mb-4">
            <div className="text-[15px] font-bold text-ink mb-1">آخر النشاطات</div>
            <div className="text-[11px] text-ink-soft">في غرفة الأخبار</div>
          </div>
          <ActivityFeed />
        </div>
      </div>
    </>
  );
}

// =====================================================
// COMPONENTS
// =====================================================

function StorageQuotaCard({
  quota,
}: {
  quota: {
    usedBytes: number;
    maxBytes: number;
    fileCount: number;
    percentUsed: number;
    isNearLimit: boolean;
    isExceeded: boolean;
  };
}) {
  const usedGB = (quota.usedBytes / 1024 / 1024 / 1024).toFixed(2);
  const maxGB = (quota.maxBytes / 1024 / 1024 / 1024).toFixed(1);
  const pct = Math.min(Math.round(quota.percentUsed), 100);

  const barColor = quota.isExceeded
    ? "bg-red-500"
    : quota.isNearLimit
    ? "bg-amber-500"
    : "bg-emerald-500";

  const labelColor = quota.isExceeded
    ? "text-red-600 dark:text-red-300"
    : quota.isNearLimit
    ? "text-amber-600 dark:text-amber-300"
    : "text-sage dark:text-emerald-300";

  const statusLabel = quota.isExceeded
    ? "تجاوز الحد الأقصى"
    : quota.isNearLimit
    ? "قريب من الحد"
    : "طبيعي";

  return (
    <div
      className={`card mb-7 border ${
        quota.isExceeded
          ? "border-red-200 dark:border-red-500/30 bg-red-50/30 dark:bg-red-500/10"
          : quota.isNearLimit
          ? "border-amber-200 dark:border-amber-500/30 bg-amber-50/20 dark:bg-amber-500/10"
          : "border-line"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-bg-2 grid place-items-center text-ink-soft">
            <HardDrive size={15} />
          </span>
          <div>
            <div className="text-[14px] font-bold text-ink">مساحة التخزين</div>
            <div className="text-[11px] text-ink-soft">Object Storage · إجمالي الملفات</div>
          </div>
        </div>
        <div className="text-left">
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              quota.isExceeded
                ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-300"
                : quota.isNearLimit
                ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300"
                : "bg-emerald-50 dark:bg-emerald-500/15 text-sage dark:text-emerald-300"
            }`}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="flex items-end gap-4 mb-3">
        <div className="flex-1">
          <div className="flex justify-between text-[11px] text-ink-soft mb-1.5">
            <span>
              <span className="font-semibold text-ink">{usedGB} GB</span> مستخدم
            </span>
            <span>
              من <span className="font-semibold text-ink">{maxGB} GB</span> · {quota.fileCount.toLocaleString("en")} ملف
            </span>
          </div>
          <div className="h-2 bg-line-soft rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1 text-[10px] text-ink-faint text-left">{pct}% مستخدم</div>
        </div>
        <div className={`text-[28px] font-bold tabular-nums leading-none mb-1 ${labelColor}`}>
          {pct}%
        </div>
      </div>

      {quota.isExceeded && (
        <div className="text-[12px] text-red-600 dark:text-red-300 font-medium bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg px-3 py-2">
          تجاوزت المساحة المخصصة. لن تتمكن من رفع ملفات جديدة حتى تحذف ملفات قديمة أو ترفع الحد الأقصى.
        </div>
      )}
      {!quota.isExceeded && quota.isNearLimit && (
        <div className="text-[12px] text-amber-700 dark:text-amber-300 font-medium bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-lg px-3 py-2">
          المساحة على وشك الامتلاء. يُنصح بمراجعة الملفات القديمة في مكتبة الوسائط.
        </div>
      )}
    </div>
  );
}

function KPICard({
  featured,
  icon,
  label,
  value,
  trend,
  trendDown,
  detail,
}: {
  featured?: boolean;
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: string;
  trendDown?: boolean;
  detail?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 transition-all hover:-translate-y-0.5 ${
        featured
          ? "bg-gradient-to-br from-burgundy to-burgundy-dark dark:from-rose-500 dark:to-rose-700 text-white border border-burgundy-dark dark:border-rose-500/40"
          : "bg-paper border border-line hover:shadow-card dark:hover:shadow-black/40"
      }`}
    >
      <div
        className={`absolute -top-1/2 -left-1/2 w-20 h-20 rounded-full ${
          featured ? "bg-white/8" : "bg-rose-cream/60 dark:bg-rose-500/10"
        } pointer-events-none`}
      />
      <div className="relative">
        <div className={`text-xs mb-2.5 flex items-center gap-1.5 ${featured ? "text-white/70" : "text-ink-soft"}`}>
          <span
            className={`w-7 h-7 rounded-lg grid place-items-center ${
              featured ? "bg-white/20 text-white" : "bg-rose-cream dark:bg-rose-500/15 text-burgundy dark:text-rose-300"
            }`}
          >
            {icon}
          </span>
          <span className="tracking-wide">{label}</span>
        </div>
        <div className="text-[32px] font-bold leading-none mb-2 tabular-nums">
          {value}
        </div>
        <div className={`text-xs flex items-center gap-1.5 ${featured ? "text-white/60" : "text-ink-soft"}`}>
          {trend && (
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                trendDown
                  ? "bg-rose-cream dark:bg-rose-500/15 text-burgundy dark:text-rose-300"
                  : featured
                    ? "bg-white/20 text-white"
                    : "bg-emerald-50 dark:bg-emerald-500/15 text-sage dark:text-emerald-300"
              }`}
            >
              {trend}
            </span>
          )}
          {detail}
        </div>
      </div>
    </div>
  );
}

function TrafficChart() {
  const data = [
    { d: "السبت", v: 1.8, prev: 1.5 },
    { d: "الأحد", v: 2.1, prev: 1.7 },
    { d: "الإثنين", v: 1.95, prev: 1.8 },
    { d: "الثلاثاء", v: 2.4, prev: 2.0 },
    { d: "الأربعاء", v: 2.6, prev: 2.1 },
    { d: "الخميس", v: 2.3, prev: 1.9 },
    { d: "الجمعة", v: 2.8, prev: 2.2 },
  ];
  const W = 800;
  const H = 220;
  const PAD = { t: 20, r: 30, b: 30, l: 40 };
  const max = 3.5;
  const xStep = (W - PAD.l - PAD.r) / (data.length - 1);
  const yScale = (v: number) => H - PAD.b - (v / max) * (H - PAD.t - PAD.b);

  const curPath = data
    .map((p, i) => `${i === 0 ? "M" : "L"} ${PAD.l + i * xStep} ${yScale(p.v)}`)
    .join(" ");
  const prevPath = data
    .map((p, i) => `${i === 0 ? "M" : "L"} ${PAD.l + i * xStep} ${yScale(p.prev)}`)
    .join(" ");
  const areaPath = `${curPath} L ${PAD.l + (data.length - 1) * xStep} ${H - PAD.b} L ${PAD.l} ${H - PAD.b} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[220px]">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--chart-area-from)" />
          <stop offset="100%" stopColor="var(--chart-area-to)" />
        </linearGradient>
      </defs>
      {[0.5, 1.5, 2.5, 3.5].map((yv) => (
        <g key={yv}>
          <line
            x1={PAD.l}
            y1={yScale(yv)}
            x2={W - PAD.r}
            y2={yScale(yv)}
            stroke="var(--chart-grid)"
            strokeDasharray="4,4"
          />
          <text
            x={W - PAD.r + 8}
            y={yScale(yv) + 4}
            fontSize="10"
            fill="var(--chart-axis)"
          >
            {yv}M
          </text>
        </g>
      ))}
      <path d={prevPath} fill="none" stroke="var(--chart-line-prev)" strokeWidth="2" strokeDasharray="6,5" opacity="0.7" />
      <path d={areaPath} fill="url(#areaGrad)" />
      <path d={curPath} fill="none" stroke="var(--chart-line)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((p, i) => (
        <g key={i}>
          <circle cx={PAD.l + i * xStep} cy={yScale(p.v)} r="4" fill="var(--chart-dot-fill)" stroke="var(--chart-line)" strokeWidth="2.5" />
          <text x={PAD.l + i * xStep} y={H - PAD.b + 18} textAnchor="middle" fontSize="11" fill="var(--chart-axis-2)">
            {p.d}
          </text>
        </g>
      ))}
    </svg>
  );
}

function CategoryDonut() {
  const items = [
    { name: "محليات", pct: 30, color: "var(--chart-c1)" },
    { name: "اقتصاد", pct: 22, color: "var(--chart-c2)" },
    { name: "رياضة", pct: 17, color: "var(--chart-c3)" },
    { name: "منوعات", pct: 13, color: "var(--chart-c4)" },
    { name: "عالم", pct: 8, color: "var(--chart-c5)" },
    { name: "تقنية", pct: 10, color: "var(--chart-c6)" },
  ];
  const C = 2 * Math.PI * 40;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <svg width="140" height="140" viewBox="0 0 100 100" className="flex-shrink-0">
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--chart-donut-track)" strokeWidth="14" />
        {items.map((item, i) => {
          const len = (item.pct / 100) * C;
          const circle = (
            <circle
              key={i}
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={item.color}
              strokeWidth="14"
              strokeDasharray={`${len} ${C}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 50 50)"
            />
          );
          offset += len;
          return circle;
        })}
        <text x="50" y="48" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--chart-donut-center)">
          147
        </text>
        <text x="50" y="60" textAnchor="middle" fontSize="6" fill="var(--chart-axis-2)">
          خبر اليوم
        </text>
      </svg>
      <div className="flex-1 flex flex-col gap-2.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2.5 text-xs">
            <span className="w-2.5 h-2.5 rounded" style={{ background: item.color }} />
            <span className="flex-1 text-ink-2">{item.name}</span>
            <span className="text-ink font-semibold tabular-nums">{item.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopArticles() {
  const items = [
    { rank: "١", icon: "⚡", title: "قرارات سعودية جديدة لدعم القطاع الخاص", cat: "محليات", time: "قبل 2س", views: "128K" },
    { rank: "٢", icon: "⚽", title: "الأخضر يكتسح ضيفه ويحجز مقعداً في النصف نهائي", cat: "رياضة", time: "قبل 4س", views: "89K" },
    { rank: "٣", icon: "💵", title: "ارتفاع لافت في تداولات السوق السعودي", cat: "اقتصاد", time: "قبل 5س", views: "67K" },
    { rank: "٤", icon: "🌍", title: "قمة استثنائية تجمع قادة الخليج في الرياض", cat: "عالم", time: "قبل 6س", views: "54K" },
    { rank: "٥", icon: "📱", title: "إطلاق منصة وطنية للذكاء الاصطناعي", cat: "تقنية", time: "قبل 7س", views: "41K" },
  ];
  return (
    <div>
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-center gap-3 py-3 border-b border-line-soft last:border-b-0 cursor-pointer hover:bg-bg-2 transition-colors -mx-3 px-3 rounded-lg"
        >
          <span className="font-serif text-lg font-bold text-burgundy/80 dark:text-rose-300/80 w-6 text-center">{item.rank}</span>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-rose to-rose-soft dark:from-rose-500/20 dark:to-rose-500/10 grid place-items-center text-lg flex-shrink-0">
            {item.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-ink mb-1 line-clamp-1">{item.title}</div>
            <div className="text-[11px] text-ink-soft">
              <span>{item.cat}</span>
              <span className="mx-2 w-1 h-1 rounded-full bg-ink-faint inline-block align-middle" />
              <span>{item.time}</span>
            </div>
          </div>
          <div className="text-left flex-shrink-0">
            <div className="text-sm font-bold text-ink tabular-nums">{item.views}</div>
            <div className="text-[10px] text-ink-soft">قراءة</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EditorsLeaderboard() {
  const editors = [
    { name: "أحمد العمري", count: 28, score: 95, color: "bg-rose-cream dark:bg-rose-500/15", textColor: "text-burgundy dark:text-rose-300", initial: "أ" },
    { name: "ريم الشهري", count: 24, score: 82, color: "bg-amber-50 dark:bg-amber-500/15", textColor: "text-gold dark:text-amber-300", initial: "ر" },
    { name: "خالد القحطاني", count: 19, score: 70, color: "bg-emerald-50 dark:bg-emerald-500/15", textColor: "text-sage dark:text-emerald-300", initial: "خ" },
    { name: "نوف العتيبي", count: 16, score: 58, color: "bg-blue-50 dark:bg-blue-500/15", textColor: "text-navy dark:text-sky-300", initial: "ن" },
    { name: "فهد الدوسري", count: 12, score: 42, color: "bg-bg-2", textColor: "text-ink-2", initial: "ف" },
  ];
  return (
    <div>
      {editors.map((e, i) => (
        <div key={i} className="grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center py-2.5 border-b border-line-soft last:border-b-0">
          <div className={`w-9 h-9 rounded-full ${e.color} ${e.textColor} grid place-items-center font-bold text-[13px]`}>
            {e.initial}
          </div>
          <div>
            <div className="text-[13px] font-semibold text-ink">{e.name}</div>
            <div className="text-[11px] text-ink-soft">{e.count} خبر</div>
          </div>
          <div className="w-20 h-1.5 bg-line-soft rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-l from-burgundy-soft to-burgundy dark:from-rose-400 dark:to-rose-500"
              style={{ width: `${e.score}%` }}
            />
          </div>
          <div className="font-bold text-ink text-[13px] tabular-nums min-w-9 text-left">
            {e.score}
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityFeed() {
  const items = [
    { icon: "✓", color: "bg-emerald-50 dark:bg-emerald-500/15 text-sage dark:text-emerald-300", text: "أحمد العمري نشر خبر \"قرارات سعودية جديدة\" في قسم محليات", time: "2د" },
    { icon: "📈", color: "bg-blue-50 dark:bg-blue-500/15 text-navy dark:text-sky-300", text: "خبر \"الأخضر يكتسح ضيفه\" وصل لـ 89K قراءة", time: "5د" },
    { icon: "✎", color: "bg-amber-50 dark:bg-amber-500/15 text-gold dark:text-amber-300", text: "ريم الشهري عدّلت العنوان والصورة الرئيسية لخبر اقتصادي", time: "12د" },
    { icon: "💬", color: "bg-rose-cream dark:bg-rose-500/15 text-burgundy dark:text-rose-300", text: "28 تعليق جديد بانتظار الموافقة في الأخبار الرياضية", time: "18د" },
    { icon: "⚡", color: "bg-emerald-50 dark:bg-emerald-500/15 text-sage dark:text-emerald-300", text: "خالد القحطاني أطلق خبراً عاجلاً عن قمة الخليج", time: "22د" },
    { icon: "🔥", color: "bg-blue-50 dark:bg-blue-500/15 text-navy dark:text-sky-300", text: "تنبيه: ارتفاع غير اعتيادي في زيارات قسم التقنية", time: "35د" },
  ];
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} className="flex gap-3 py-3 border-b border-line-soft last:border-b-0">
          <div className={`w-8 h-8 rounded-lg ${item.color} grid place-items-center text-sm flex-shrink-0`}>
            {item.icon}
          </div>
          <div className="flex-1 text-xs leading-relaxed text-ink-2">{item.text}</div>
          <div className="text-[11px] text-ink-faint flex-shrink-0">{item.time}</div>
        </div>
      ))}
    </div>
  );
}
