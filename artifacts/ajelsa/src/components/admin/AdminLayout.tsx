"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Newspaper,
  FileText,
  FolderTree,
  Tag,
  Image as ImageIcon,
  MessageCircle,
  Users,
  TrendingUp,
  Settings,
  Search,
  Bell,
  Menu,
  X,
  CalendarDays,
  Megaphone,
  ClipboardList,
  Zap,
  GitBranch,
  BarChart2,
  Mail,
  LayoutGrid,
  Receipt,
  Wrench,
  Shield,
  PenTool,
  PlusCircle,
  UserSquare,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ToastHost } from "./Toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useMyPermissions } from "@/hooks/useMyPermissions";
import {
  StorageHealthProvider,
  StorageHealthBadge,
  StorageHealthMobileDot,
} from "./StorageHealth";

type MenuItem = {
  icon: typeof LayoutDashboard;
  label: string;
  href: string;
  perms?: string[];
};

type MenuGroup = {
  label: string;
  perms?: string[];
  items: MenuItem[];
};

const MENU_GROUPS: MenuGroup[] = [
  {
    label: "الرئيسية",
    items: [
      { icon: LayoutDashboard, label: "نظرة عامة", href: "/admin" },
      { icon: Newspaper, label: "الأخبار", href: "/admin/articles" },
      { icon: FileText, label: "خبر جديد", href: "/admin/articles/new" },
      { icon: Zap, label: "غرفة العاجل", href: "/admin/breaking" },
      { icon: GitBranch, label: "سير العمل", href: "/admin/workflow" },
      { icon: CalendarDays, label: "تقويم النشر", href: "/admin/calendar" },
      { icon: LayoutGrid, label: "ترتيب الصفحة الرئيسية", href: "/admin/homepage" },
    ],
  },
  {
    label: "المحتوى",
    items: [
      { icon: FolderTree, label: "الأقسام", href: "/admin/categories" },
      { icon: Tag, label: "الوسوم", href: "/admin/tags" },
      { icon: ImageIcon, label: "المكتبة", href: "/admin/media" },
      { icon: MessageCircle, label: "التعليقات", href: "/admin/comments" },
      { icon: BarChart2, label: "استطلاعات الرأي", href: "/admin/polls" },
    ],
  },
  {
    label: "مقالات الرأي",
    perms: ["opinion.view", "opinion.create", "opinion.edit_own", "opinion.edit_any", "opinion.publish", "opinion.delete", "authors.manage"],
    items: [
      { icon: PenTool, label: "كل مقالات الرأي", href: "/admin/opinions", perms: ["opinion.view", "opinion.edit_own", "opinion.edit_any", "opinion.publish", "opinion.delete"] },
      { icon: PlusCircle, label: "مقال رأي جديد", href: "/admin/opinions/new", perms: ["opinion.create"] },
      { icon: UserSquare, label: "كتّاب الرأي", href: "/admin/authors", perms: ["authors.manage"] },
    ],
  },
  {
    label: "إعلانات",
    items: [
      { icon: Megaphone, label: "إدارة الإعلانات", href: "/admin/ads" },
      { icon: Receipt, label: "الفواتير", href: "/admin/invoices" },
    ],
  },
  {
    label: "النشرة",
    items: [
      { icon: Mail, label: "النشرة البريدية", href: "/admin/newsletter" },
    ],
  },
  {
    label: "الفريق",
    items: [
      { icon: UsersRound, label: "منسوبو عاجل", href: "/admin/staff" },
      { icon: UserPlus, label: "إضافة منسوب", href: "/admin/staff/new" },
      { icon: Shield, label: "الأدوار والصلاحيات", href: "/admin/roles" },
    ],
  },
  {
    label: "إدارة",
    items: [
      { icon: TrendingUp, label: "التحليلات", href: "/admin/analytics" },
      { icon: ClipboardList, label: "سجل النشاطات", href: "/admin/audit" },
      { icon: Settings, label: "الإعدادات", href: "/admin/settings" },
      { icon: Wrench, label: "صيانة الصور", href: "/admin/maintenance/inline-images" },
    ],
  },
];

function SidebarContent({
  user,
  pathname,
  onClose,
}: {
  user?: { fullName: string; role: string };
  pathname: string;
  onClose?: () => void;
}) {
  const { can, loading: permsLoading } = useMyPermissions();
  const hasAny = (perms?: string[]) => !perms || perms.length === 0 || perms.some((p) => can(p));
  const visibleGroups = MENU_GROUPS.map((group) => {
    if (!hasAny(group.perms)) return null;
    const items = group.items.filter((item) => hasAny(item.perms));
    if (items.length === 0) return null;
    return { ...group, items };
  }).filter((g): g is MenuGroup => g !== null);

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between pb-6 border-b border-line mb-6">
        <Link
          href="/admin"
          className="flex flex-col items-start gap-1"
          onClick={onClose}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="صحيفة عاجل"
            className="h-10 w-auto object-contain dark:brightness-0 dark:invert no-dark-filter"
          />
          <div className="text-[10px] text-ink-faint tracking-wider">
            لوحة التحكم
          </div>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 grid place-items-center rounded-lg text-ink-soft hover:bg-bg-2 md:hidden"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav
        className={cn(
          "flex-1 overflow-y-auto -mx-1 px-1 transition-opacity",
          permsLoading && "opacity-60"
        )}
      >
        {visibleGroups.map((group) => (
          <div key={group.label} className="mb-6">
            <div className="text-[10px] text-ink-faint tracking-widest mb-2 px-3">
              {group.label}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] mb-0.5 transition-all relative",
                    active
                      ? "bg-rose-cream dark:bg-rose-500/15 text-burgundy dark:text-rose-300 font-semibold before:content-[''] before:absolute before:right-0 before:top-2 before:bottom-2 before:w-1 before:rounded-full before:bg-burgundy dark:before:bg-rose-400"
                      : "text-ink-2 hover:bg-bg-2 hover:text-ink"
                  )}
                >
                  <Icon size={16} className="opacity-85" />
                  <span>{item.label}</span>
                  {("badge" in item) && (item as any).badge != null && (
                    <span className="mr-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-burgundy dark:bg-rose-500 text-white">
                      {(item as any).badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Storage health pill — early warning when uploads are degraded */}
      <div className="mb-2">
        <StorageHealthBadge />
      </div>

      {/* Theme toggle (3-state) */}
      <div className="mb-2">
        <ThemeToggle variant="admin" />
      </div>
      <div className="bg-bg-2 rounded-xl p-3.5 flex items-center gap-2.5 mt-auto">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-burgundy to-burgundy-soft dark:from-rose-500 dark:to-rose-700 text-white grid place-items-center font-bold text-sm flex-shrink-0">
          {user?.fullName?.[0] ?? "م"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-ink truncate">
            {user?.fullName ?? "المستخدم"}
          </div>
          <div className="text-[11px] text-ink-soft">{roleLabel(user?.role)}</div>
        </div>
      </div>
    </div>
  );
}

export function AdminLayout({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: { fullName: string; role: string };
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Prevent body scroll when drawer open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <StorageHealthProvider>
    <div className="min-h-screen flex flex-col md:flex-row relative">
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden md:flex w-[240px] flex-shrink-0 bg-paper border-l border-line p-5 h-screen sticky top-0 flex-col">
        <SidebarContent user={user} pathname={pathname} />
      </aside>

      {/* ── MOBILE OVERLAY DRAWER ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-[260px] bg-paper border-l border-line p-5 flex flex-col transition-transform duration-300 md:hidden",
          drawerOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <SidebarContent
          user={user}
          pathname={pathname}
          onClose={() => setDrawerOpen(false)}
        />
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-paper border-b border-line sticky top-0 z-30">
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-9 h-9 grid place-items-center rounded-xl border border-line text-ink-2 hover:text-burgundy transition-colors"
          >
            <Menu size={18} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="عاجل" className="h-8 w-auto object-contain dark:brightness-0 dark:invert no-dark-filter" />
          <div className="flex items-center gap-1.5">
            <StorageHealthMobileDot />
            <ThemeToggle variant="public" />
            <button className="w-9 h-9 grid place-items-center rounded-xl border border-line text-ink-2 hover:text-burgundy dark:hover:text-rose-300 transition-colors relative">
              <Bell size={16} />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-burgundy dark:bg-rose-400 border-2 border-paper" />
            </button>
          </div>
        </div>

        <main className="flex-1 p-4 md:p-7 md:px-8 overflow-x-hidden">
          {children}
        </main>
      </div>

      <ToastHost />
    </div>
    </StorageHealthProvider>
  );
}

function roleLabel(role?: string) {
  const map: Record<string, string> = {
    super_admin: "مدير عام",
    editor_in_chief: "رئيس التحرير",
    editor: "محرر",
    writer: "كاتب",
    contributor: "مساهم",
  };
  return map[role ?? ""] ?? "مستخدم";
}

export function AdminTopbar({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 mb-6 md:mb-7">
      {/* Title row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-ink mb-1 flex items-center gap-2 -tracking-[0.01em]">
            {title}
            <span className="live-dot" />
          </h1>
          {subtitle && <p className="text-sm text-ink-soft">{subtitle}</p>}
        </div>
        {/* Actions — desktop */}
        {actions && (
          <div className="hidden md:flex gap-2.5 items-center flex-shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Search + actions row */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-paper border border-line rounded-xl px-3 py-2 flex-1 md:max-w-sm">
          <Search size={14} className="text-ink-soft flex-shrink-0" />
          <input
            type="search"
            placeholder="بحث..."
            className="flex-1 bg-transparent outline-none text-sm min-w-0"
          />
        </div>
        {/* Actions — mobile */}
        {actions && (
          <div className="flex md:hidden gap-2 items-center flex-shrink-0">
            {actions}
          </div>
        )}
        {/* Theme toggle — desktop only (mobile has it in topbar) */}
        <div className="hidden md:flex flex-shrink-0">
          <ThemeToggle variant="admin" />
        </div>
        {/* Bell — desktop only (mobile has it in topbar) */}
        <button className="hidden md:grid w-10 h-10 bg-paper border border-line rounded-xl place-items-center text-ink-2 hover:text-burgundy dark:hover:text-rose-300 transition-colors relative flex-shrink-0">
          <Bell size={16} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-burgundy dark:bg-rose-400 border-2 border-paper" />
        </button>
      </div>
    </div>
  );
}
