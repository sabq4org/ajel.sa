"use client";

import { AdminTopbar } from "@/components/admin/AdminLayout";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowRight, Loader2, Edit3, BadgeCheck, Mail, Phone, Globe, Shield, Briefcase,
  Calendar, LogIn, Newspaper, History, Activity as ActivityIcon, RefreshCw,
} from "lucide-react";
import { ACTIVITY_LABELS_AR, type ActivityAction } from "@/lib/activity-labels";

type Tab = "overview" | "articles" | "activity" | "performance";

export default function StaffProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const [user, setUser] = useState<any>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>(null);
  const [activity, setActivity] = useState<Array<{ id: string; action: ActivityAction; createdAt: string; actorName: string | null; ipAddress: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    let m = true;
    (async () => {
      try {
        const [u, a, ac] = await Promise.all([
          fetch(`/api/staff/${id}`).then((r) => r.json()),
          fetch(`/api/staff/${id}/articles?limit=20`).then((r) => r.json()),
          fetch(`/api/staff/${id}/activity?limit=50`).then((r) => r.json()).catch(() => ({ items: [] })),
        ]);
        if (!m) return;
        setUser(u.user);
        setArticles(a.items ?? []);
        setCounts(a.counts ?? null);
        setActivity(ac.items ?? []);
      } finally {
        if (m) setLoading(false);
      }
    })();
    return () => {
      m = false;
    };
  }, [id]);

  if (loading) return <div className="py-20 grid place-items-center text-ink-soft"><Loader2 className="animate-spin" /></div>;
  if (!user) return <div className="card p-8 text-center text-ink-soft">غير موجود</div>;

  return (
    <>
      <AdminTopbar
        title="الملف الشخصي"
        subtitle="معاينة سريعة قبل التعديل"
        actions={
          <div className="flex gap-2">
            <Link href={`/admin/staff/${id}`} className="bg-burgundy text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 shadow-red hover:bg-burgundy-dark">
              <Edit3 size={14} /> تعديل
            </Link>
            <Link href="/admin/staff" className="bg-paper border border-line text-ink-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 hover:bg-bg-2">
              <ArrowRight size={14} /> القائمة
            </Link>
          </div>
        }
      />

      {/* Cover + avatar */}
      <div className="card p-0 overflow-hidden">
        <div className="aspect-[4/1] bg-gradient-to-br from-burgundy/20 to-rose-cream relative">
          {user.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.coverUrl} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="px-6 pb-6 -mt-12 relative">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="w-24 h-24 rounded-full ring-4 ring-paper bg-rose-cream dark:bg-rose-500/15 text-burgundy grid place-items-center font-bold text-3xl overflow-hidden">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
              ) : (
                user.fullName.charAt(0)
              )}
            </div>
            <div className="pb-2 flex-1 min-w-0">
              <h2 className="text-xl font-bold text-ink flex items-center gap-2">
                {user.displayName || user.fullName}
                {user.isVerified && <BadgeCheck size={18} className="text-sky-500" />}
              </h2>
              <p className="text-sm text-ink-soft mt-0.5">{user.jobTitle || "—"}{user.department ? ` · ${user.department}` : ""}</p>
              {user.shortBio && <p className="text-sm text-ink-2 mt-2">{user.shortBio}</p>}
            </div>
            <div className="pb-2">
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${user.isActive ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" : "bg-bg-2 text-ink-soft"}`}>
                {user.isActive ? "نشط" : "معطّل"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-5 border-b border-line flex items-center gap-1 overflow-x-auto">
        {([
          { id: "overview", label: "نظرة عامة", icon: BadgeCheck },
          { id: "articles", label: "مقالاته", icon: Newspaper },
          { id: "activity", label: "السجل", icon: History },
          { id: "performance", label: "الأداء", icon: ActivityIcon },
        ] as const).map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-[13px] font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                active
                  ? "border-burgundy text-burgundy"
                  : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              <Icon size={13} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            <div className="card p-5 space-y-3">
              <h3 className="font-bold text-ink">معلومات الاتصال</h3>
              <InfoRow icon={Mail} label="البريد" value={user.email} />
              {user.alternateEmail && <InfoRow icon={Mail} label="بريد بديل" value={user.alternateEmail} />}
              {user.phone && <InfoRow icon={Phone} label="الهاتف" value={user.phone} />}
              {user.websiteUrl && <InfoRow icon={Globe} label="الموقع" value={user.websiteUrl} link />}
              {user.roleNameAr && <InfoRow icon={Shield} label="الدور" value={user.roleNameAr} />}
              {user.jobTitle && <InfoRow icon={Briefcase} label="المنصب" value={user.jobTitle} />}
            </div>
            <div className="card p-5 space-y-3">
              <h3 className="font-bold text-ink">إحصاءات الحساب</h3>
              <InfoRow icon={Calendar} label="انضم" value={user.joinedAt ? new Date(user.joinedAt).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn") : "—"} />
              <InfoRow icon={LogIn} label="آخر دخول" value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("ar-SA-u-ca-gregory-nu-latn") : "—"} />
              <InfoRow icon={LogIn} label="آخر ظهور" value={user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString("ar-SA-u-ca-gregory-nu-latn") : "—"} />
              <InfoRow icon={LogIn} label="عدد مرات الدخول" value={String(user.loginCount ?? 0)} />
              {counts && (
                <InfoRow icon={Newspaper} label="الأخبار" value={`${counts.total} (منشور: ${counts.published} · مسودة: ${counts.draft} · مراجعة: ${counts.review})`} />
              )}
            </div>
          </div>

          {user.bio && (
            <div className="card p-5 mt-4">
              <h3 className="font-bold text-ink mb-2">السيرة</h3>
              <p className="text-sm text-ink-2 leading-relaxed whitespace-pre-line">{user.bio}</p>
            </div>
          )}
        </>
      )}

      {tab === "articles" && (
        <div className="card p-0 mt-5 overflow-hidden">
          <div className="px-5 py-4 border-b border-line flex items-center justify-between">
            <h3 className="font-bold text-ink">جميع الأخبار</h3>
            <span className="text-xs text-ink-soft">{articles.length} خبر</span>
          </div>
          {articles.length === 0 ? (
            <div className="py-10 text-center text-ink-soft text-sm">لا توجد أخبار بعد</div>
          ) : (
            <ul className="divide-y divide-line-soft">
              {articles.map((a) => (
                <li key={a.id} className="px-5 py-3 flex items-center justify-between hover:bg-bg-2/40">
                  <div className="min-w-0">
                    <Link href={`/admin/articles/${a.id}`} className="text-[14px] text-ink hover:text-burgundy font-medium truncate block">
                      {a.title}
                    </Link>
                    <div className="text-[11px] text-ink-soft flex items-center gap-2 mt-0.5">
                      <span>{a.categoryNameAr || "—"}</span>
                      <span>·</span>
                      <span>{new Date(a.createdAt).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn")}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    a.status === "published" ? "bg-emerald-50 text-emerald-600" : a.status === "review" ? "bg-amber-50 text-amber-700" : "bg-bg-2 text-ink-soft"
                  }`}>
                    {a.status === "published" ? "منشور" : a.status === "review" ? "مراجعة" : a.status === "draft" ? "مسودة" : a.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "activity" && (
        <div className="card p-0 mt-5 overflow-hidden">
          <div className="px-5 py-4 border-b border-line flex items-center justify-between">
            <h3 className="font-bold text-ink flex items-center gap-2"><History size={14} /> آخر النشاط</h3>
            <span className="text-xs text-ink-soft">{activity.length} حدث</span>
          </div>
          {activity.length === 0 ? (
            <div className="py-10 text-center text-ink-soft text-sm">لا يوجد نشاط مسجَّل</div>
          ) : (
            <ul className="divide-y divide-line-soft">
              {activity.map((it) => (
                <li key={it.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-rose-cream dark:bg-rose-500/15 text-burgundy dark:text-rose-300 grid place-items-center flex-shrink-0">
                    <RefreshCw size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-ink">{ACTIVITY_LABELS_AR[it.action] ?? it.action}</div>
                    <div className="text-[11px] text-ink-soft mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>{new Date(it.createdAt).toLocaleString("ar-SA-u-ca-gregory-nu-latn")}</span>
                      {it.actorName && <span>· بواسطة {it.actorName}</span>}
                      {it.ipAddress && <span>· {it.ipAddress}</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "performance" && (
        <PerformanceTab counts={counts} activity={activity} />
      )}
    </>
  );
}

function PerformanceTab({ counts, activity }: { counts: any; activity: Array<{ createdAt: string; action: string }> }) {
  // Aggregate activity per day for the last 30 days (simple bar chart).
  const days = 30;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets: Array<{ date: string; count: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    buckets.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  for (const a of activity) {
    const key = new Date(a.createdAt).toISOString().slice(0, 10);
    const b = buckets.find((x) => x.date === key);
    if (b) b.count++;
  }
  const max = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <div className="space-y-4 mt-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label="إجمالي الأخبار" value={counts?.total ?? 0} />
        <StatBox label="منشور" value={counts?.published ?? 0} tone="emerald" />
        <StatBox label="مراجعة" value={counts?.review ?? 0} tone="amber" />
        <StatBox label="مسودة" value={counts?.draft ?? 0} />
      </div>

      <div className="card p-5">
        <h3 className="font-bold text-ink mb-4 flex items-center gap-2"><ActivityIcon size={14} /> النشاط آخر 30 يومًا</h3>
        <div className="flex items-end gap-1 h-32" dir="ltr">
          {buckets.map((b) => {
            const h = Math.round((b.count / max) * 100);
            return (
              <div
                key={b.date}
                className="flex-1 bg-rose-cream dark:bg-rose-500/15 rounded-t hover:bg-burgundy/40 transition-colors"
                style={{ height: `${Math.max(h, 4)}%` }}
                title={`${b.date}: ${b.count}`}
              />
            );
          })}
        </div>
        <div className="text-[11px] text-ink-soft mt-2 flex justify-between" dir="ltr">
          <span>{buckets[0]?.date}</span>
          <span>{buckets[buckets.length - 1]?.date}</span>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, tone }: { label: string; value: number; tone?: "emerald" | "amber" }) {
  const cls = tone === "emerald"
    ? "text-emerald-700 dark:text-emerald-300"
    : tone === "amber"
    ? "text-amber-700 dark:text-amber-300"
    : "text-ink";
  return (
    <div className="card p-4">
      <div className={`text-2xl font-bold ${cls}`}>{value}</div>
      <div className="text-[11px] text-ink-soft mt-1">{label}</div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, link }: { icon: any; label: string; value: string; link?: boolean }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon size={14} className="text-ink-soft mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-ink-soft">{label}</div>
        {link ? (
          <a href={value} target="_blank" rel="noreferrer" className="text-ink-2 hover:text-burgundy break-all">{value}</a>
        ) : (
          <div className="text-ink-2 break-all">{value}</div>
        )}
      </div>
    </div>
  );
}
