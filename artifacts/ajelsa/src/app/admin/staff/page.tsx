"use client";

import { AdminTopbar } from "@/components/admin/AdminLayout";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus, Loader2, Users as UsersIcon, Search, Filter, LayoutGrid, Table as TableIcon,
  CheckCircle2, XCircle, Mail, Phone, Edit3, Eye, Shield, Briefcase, BadgeCheck,
} from "lucide-react";
import { toast } from "@/components/admin/Toast";

type StaffItem = {
  id: string;
  fullName: string;
  displayName: string | null;
  email: string;
  slug: string | null;
  phone: string | null;
  jobTitle: string | null;
  department: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  isVerified: boolean;
  lastLoginAt: string | null;
  loginCount: number;
  joinedAt: string | null;
  createdAt: string;
  roleId: string | null;
  roleKey: string | null;
  roleNameAr: string | null;
  articlesCount: number;
};

type RoleOption = { id: string; key: string; nameAr: string };

type Stats = {
  totals: {
    total: number;
    active: number;
    inactive: number;
    verified: number;
    joinedThisMonth: number;
    loggedInThisWeek: number;
  };
  byRole: Array<{ roleId: string | null; roleNameAr: string | null; count: number }>;
  byDepartment: Array<{ department: string | null; count: number }>;
};

export default function StaffListPage() {
  const [items, setItems] = useState<StaffItem[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"table" | "cards">("table");
  const [q, setQ] = useState("");
  const [roleId, setRoleId] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [sort, setSort] = useState<"createdAt" | "fullName" | "lastLoginAt">("createdAt");

  useEffect(() => {
    void load();
    void loadRoles();
    void loadStats();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, roleId, department, status, sort]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (roleId) params.set("roleId", roleId);
      if (department) params.set("department", department);
      if (status !== "all") params.set("status", status);
      params.set("sort", sort);
      const res = await fetch(`/api/staff?${params.toString()}`);
      if (!res.ok) throw new Error("فشل التحميل");
      const d = await res.json();
      setItems(d.items ?? []);
    } catch (e: any) {
      toast.error(e.message ?? "فشل التحميل");
    } finally {
      setLoading(false);
    }
  }

  async function loadRoles() {
    try {
      const res = await fetch("/api/roles");
      const d = await res.json();
      setRoles((d.items ?? []).map((r: any) => ({ id: r.id, key: r.key, nameAr: r.nameAr })));
    } catch {}
  }

  async function loadStats() {
    try {
      const res = await fetch("/api/staff/stats");
      if (!res.ok) return;
      setStats(await res.json());
    } catch {}
  }

  const departments = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.department && set.add(i.department));
    return Array.from(set).sort();
  }, [items]);

  return (
    <>
      <AdminTopbar
        title="منسوبو عاجل"
        subtitle={`${items.length} منسوب · إدارة كاملة لفريق التحرير والإدارة`}
        actions={
          <Link
            href="/admin/staff/new"
            className="bg-burgundy text-white px-4.5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 shadow-red hover:bg-burgundy-dark transition-all"
          >
            <Plus size={14} /> إضافة منسوب
          </Link>
        }
      />

      {/* ── Stats ── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-5">
          <StatCard label="الإجمالي" value={stats.totals.total} icon={UsersIcon} />
          <StatCard label="نشطون" value={stats.totals.active} icon={CheckCircle2} tone="emerald" />
          <StatCard label="معطّلون" value={stats.totals.inactive} icon={XCircle} tone="rose" />
          <StatCard label="موثَّقون" value={stats.totals.verified} icon={BadgeCheck} tone="sky" />
          <StatCard label="انضموا هذا الشهر" value={stats.totals.joinedThisMonth} icon={Plus} />
          <StatCard label="نشطون هذا الأسبوع" value={stats.totals.loggedInThisWeek} icon={Eye} />
        </div>
      )}

      {/* ── Filters ── */}
      <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-bg-2 border border-line rounded-xl px-3 py-2 flex-1 min-w-[220px]">
          <Search size={14} className="text-ink-soft" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="بحث بالاسم أو البريد..."
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
        <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className="input !w-auto">
          <option value="">كل الأدوار</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>{r.nameAr}</option>
          ))}
        </select>
        <select value={department} onChange={(e) => setDepartment(e.target.value)} className="input !w-auto">
          <option value="">كل الأقسام</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "all" | "active" | "inactive")}
          className="input !w-auto"
        >
          <option value="all">كل الحالات</option>
          <option value="active">نشط فقط</option>
          <option value="inactive">معطّل فقط</option>
        </select>
        <select
          value={sort}
          onChange={(e) =>
            setSort(e.target.value as "createdAt" | "fullName" | "lastLoginAt")
          }
          className="input !w-auto"
        >
          <option value="createdAt">الأحدث إنشاءً</option>
          <option value="fullName">بالاسم</option>
          <option value="lastLoginAt">آخر دخول</option>
        </select>
        <div className="flex items-center gap-1 bg-bg-2 border border-line rounded-xl p-1">
          <button
            onClick={() => setView("table")}
            className={`w-8 h-8 grid place-items-center rounded-lg ${view === "table" ? "bg-paper text-burgundy shadow-sm" : "text-ink-soft"}`}
            title="جدول"
          >
            <TableIcon size={14} />
          </button>
          <button
            onClick={() => setView("cards")}
            className={`w-8 h-8 grid place-items-center rounded-lg ${view === "cards" ? "bg-paper text-burgundy shadow-sm" : "text-ink-soft"}`}
            title="بطاقات"
          >
            <LayoutGrid size={14} />
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="py-16 grid place-items-center text-ink-soft"><Loader2 className="animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="card py-16 text-center text-ink-soft text-sm flex flex-col items-center gap-3">
          <UsersIcon size={32} className="opacity-40" />
          <div>لا يوجد منسوبون يطابقون التصفية</div>
        </div>
      ) : view === "table" ? (
        <StaffTable items={items} />
      ) : (
        <StaffCards items={items} />
      )}
    </>
  );
}

function StatCard({
  label, value, icon: Icon, tone = "burgundy",
}: { label: string; value: number; icon: any; tone?: "burgundy" | "emerald" | "rose" | "sky" }) {
  const tones: Record<string, string> = {
    burgundy: "text-burgundy bg-rose-cream dark:bg-rose-500/15 dark:text-rose-300",
    emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/15 dark:text-emerald-300",
    rose: "text-rose-600 bg-rose-50 dark:bg-rose-500/15 dark:text-rose-300",
    sky: "text-sky-600 bg-sky-50 dark:bg-sky-500/15 dark:text-sky-300",
  };
  return (
    <div className="card p-3.5">
      <div className="flex items-center gap-2.5">
        <div className={`w-9 h-9 rounded-xl grid place-items-center ${tones[tone]}`}><Icon size={16} /></div>
        <div className="min-w-0">
          <div className="text-xs text-ink-soft truncate">{label}</div>
          <div className="text-lg font-bold text-ink">{value.toLocaleString("ar-EG")}</div>
        </div>
      </div>
    </div>
  );
}

function StaffTable({ items }: { items: StaffItem[] }) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-line bg-bg-2">
              <th className="text-right px-5 py-3 text-[11px] font-semibold text-ink-soft tracking-wide">المنسوب</th>
              <th className="text-right px-5 py-3 text-[11px] font-semibold text-ink-soft tracking-wide">المنصب</th>
              <th className="text-right px-5 py-3 text-[11px] font-semibold text-ink-soft tracking-wide">الدور</th>
              <th className="text-right px-5 py-3 text-[11px] font-semibold text-ink-soft tracking-wide">الحالة</th>
              <th className="text-right px-5 py-3 text-[11px] font-semibold text-ink-soft tracking-wide">الأخبار</th>
              <th className="text-right px-5 py-3 text-[11px] font-semibold text-ink-soft tracking-wide">آخر دخول</th>
              <th className="w-28"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id} className="border-b border-line-soft last:border-b-0 hover:bg-bg-2/40">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar url={u.avatarUrl} name={u.fullName} />
                    <div className="min-w-0">
                      <div className="text-[14px] text-ink font-medium flex items-center gap-1.5">
                        {u.displayName || u.fullName}
                        {u.isVerified && <BadgeCheck size={13} className="text-sky-500" />}
                      </div>
                      <div className="text-[11px] text-ink-soft truncate">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-[13px] text-ink-2">
                  {u.jobTitle ? (
                    <span className="flex items-center gap-1.5"><Briefcase size={11} className="text-ink-soft" />{u.jobTitle}</span>
                  ) : "—"}
                  {u.department && <div className="text-[11px] text-ink-soft mt-0.5">{u.department}</div>}
                </td>
                <td className="px-5 py-3.5">
                  {u.roleNameAr ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-rose-cream dark:bg-rose-500/15 text-burgundy dark:text-rose-300">
                      <Shield size={10} /> {u.roleNameAr}
                    </span>
                  ) : <span className="text-[11px] text-ink-soft">—</span>}
                </td>
                <td className="px-5 py-3.5">
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${u.isActive ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" : "bg-bg-2 text-ink-soft"}`}>
                    {u.isActive ? "نشط" : "معطّل"}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-[13px] text-ink-2">{u.articlesCount.toLocaleString("ar-EG")}</td>
                <td className="px-5 py-3.5 text-[12px] text-ink-soft">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("ar-SA-u-ca-gregory-nu-latn") : "—"}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-1 justify-end">
                    <Link href={`/admin/staff/${u.id}/profile`} className="w-7 h-7 rounded-lg grid place-items-center text-ink-soft hover:bg-bg-2 hover:text-burgundy transition-colors" title="عرض الملف">
                      <Eye size={14} />
                    </Link>
                    <Link href={`/admin/staff/${u.id}`} className="w-7 h-7 rounded-lg grid place-items-center text-ink-soft hover:bg-bg-2 hover:text-burgundy transition-colors" title="تعديل">
                      <Edit3 size={14} />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StaffCards({ items }: { items: StaffItem[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((u) => (
        <div key={u.id} className="card p-5 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <Avatar url={u.avatarUrl} name={u.fullName} size={48} />
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-bold text-ink truncate flex items-center gap-1.5">
                {u.displayName || u.fullName}
                {u.isVerified && <BadgeCheck size={13} className="text-sky-500" />}
              </div>
              <div className="text-[12px] text-ink-soft truncate">{u.jobTitle || "—"}</div>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${u.isActive ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" : "bg-bg-2 text-ink-soft"}`}>
              {u.isActive ? "نشط" : "معطّل"}
            </span>
          </div>
          <div className="space-y-1.5 text-[12px] text-ink-2 mb-4">
            <div className="flex items-center gap-2"><Mail size={11} className="text-ink-soft" /><span className="truncate">{u.email}</span></div>
            {u.phone && <div className="flex items-center gap-2"><Phone size={11} className="text-ink-soft" />{u.phone}</div>}
            {u.roleNameAr && <div className="flex items-center gap-2"><Shield size={11} className="text-ink-soft" />{u.roleNameAr}</div>}
          </div>
          <div className="flex items-center justify-between text-[11px] text-ink-soft mt-auto pt-3 border-t border-line">
            <span>{u.articlesCount.toLocaleString("ar-EG")} خبر</span>
            <div className="flex gap-1">
              <Link href={`/admin/staff/${u.id}/profile`} className="px-2 py-1 rounded-lg hover:bg-bg-2 hover:text-burgundy">عرض</Link>
              <Link href={`/admin/staff/${u.id}`} className="px-2 py-1 rounded-lg hover:bg-bg-2 hover:text-burgundy">تعديل</Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Avatar({ url, name, size = 36 }: { url: string | null; name: string; size?: number }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <div className="rounded-full bg-rose-cream dark:bg-rose-500/15 text-burgundy dark:text-rose-300 grid place-items-center font-bold shrink-0" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {name.charAt(0)}
    </div>
  );
}
