/**
 * SiteHeader — صحيفة عاجل (تصميم احترافي 2026)
 * - شريط علوي بمعلومات سياقية (هجري + ميلادي)
 * - ترويسة (Masthead) كلاسيكية مع زخارف عنابية
 * - شريط أقسام مع تأثير Hover Underline أنيق
 * - شريط عاجل مع نبضة هادئة
 */

import Link from "next/link";
import { Search, Bell, Menu } from "lucide-react";
import { HeaderDateBar } from "./HeaderDateBar";
import { ThemeToggle } from "@/components/ThemeToggle";

const STATIC_NAV: Array<{ label: string; href: string }> = [
  { label: "الرئيسية", href: "/" },
  { label: "آخر الأخبار", href: "/latest" },
  { label: "مقالات الرأي", href: "/opinions" },
];

export function SiteHeader({
  breakingHeadlines = [],
  navCategories = [],
}: {
  breakingHeadlines?: string[];
  navCategories?: Array<{ name: string; slug: string }>;
}) {
  const navItems = [
    ...STATIC_NAV,
    ...navCategories.map((c) => ({ label: c.name, href: `/category/${c.slug}` })),
  ];

  return (
    <>
      {/* ━━━━━━━━━━━━ شريط علوي رفيع وأنيق ━━━━━━━━━━━━ */}
      <div className="bg-ink text-ink-faint dark:bg-zinc-950 dark:text-zinc-400 text-[11px] py-2.5 relative z-10 border-b border-burgundy/40 dark:border-rose-500/30">
        <div className="max-w-[1320px] mx-auto px-8 flex justify-between items-center">
          <HeaderDateBar />
          <div className="flex gap-5 items-center">
            <Link href="/notifications" className="hover:text-white dark:hover:text-zinc-100 transition-colors">الإشعارات</Link>
            <Link href="/newsletter" className="hover:text-white dark:hover:text-zinc-100 transition-colors">النشرة</Link>
            <Link href="/login" className="hover:text-white dark:hover:text-zinc-100 transition-colors font-semibold">تسجيل الدخول</Link>
          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━ الترويسة الفخمة (Masthead) ━━━━━━━━━━━━ */}
      <header className="bg-paper dark:bg-zinc-900 py-8 relative z-10">
        <div className="max-w-[1320px] mx-auto px-8">
          <div className="flex items-center justify-between gap-6">

            {/* الشعار — على اليمين في RTL */}
            <Link href="/" className="group inline-flex items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="صحيفة عاجل"
                className="h-20 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.03] dark:brightness-0 dark:invert no-dark-filter"
              />
            </Link>

            {/* أيقونات أنيقة — على اليسار في RTL */}
            <div className="flex items-center gap-2">
              <button className="w-10 h-10 rounded-xl border border-line bg-paper grid place-items-center text-ink-2 hover:bg-rose-cream hover:text-burgundy hover:border-rose-soft dark:hover:bg-rose-500/15 dark:hover:text-rose-300 dark:hover:border-rose-400/40 transition-colors">
                <Search size={16} />
              </button>
              <button className="w-10 h-10 rounded-xl border border-line bg-paper grid place-items-center text-ink-2 hover:bg-rose-cream hover:text-burgundy hover:border-rose-soft dark:hover:bg-rose-500/15 dark:hover:text-rose-300 dark:hover:border-rose-400/40 transition-colors">
                <Bell size={16} />
              </button>
              <ThemeToggle variant="public" />
              <button className="w-10 h-10 rounded-xl border border-line bg-paper grid place-items-center text-ink-2 hover:bg-rose-cream hover:text-burgundy hover:border-rose-soft dark:hover:bg-rose-500/15 dark:hover:text-rose-300 dark:hover:border-rose-400/40 transition-colors md:hidden">
                <Menu size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ━━━━━━━━━━━━ شريط الأقسام مع خط فاصل واحد ━━━━━━━━━━━━ */}
      <nav className="bg-paper dark:bg-zinc-900 sticky top-0 z-40 shadow-soft dark:shadow-none dark:border-b dark:border-white/[0.06] relative">
        {/* خط فاصل علوي واحد */}
        <div className="absolute top-0 inset-x-0 h-px bg-burgundy/40 dark:bg-rose-500/30" />
        <div className="absolute bottom-0 inset-x-0 h-[2px] bg-burgundy dark:bg-rose-500" />

        <div className="max-w-[1320px] mx-auto px-8">
          <div className="flex items-center justify-between gap-2">
            <ul className="flex">
              {navItems.map((item) => (
                <li key={item.href} className="relative group">
                  <Link
                    href={item.href}
                    className="block py-4 px-4 text-[14px] font-bold text-ink hover:text-burgundy dark:hover:text-rose-300 transition-colors"
                  >
                    {item.label}
                  </Link>
                  {/* خط ينمو من الوسط عند Hover */}
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] w-0 bg-burgundy dark:bg-rose-500 rounded-t group-hover:w-[70%] transition-all duration-300 ease-out z-10" />
                </li>
              ))}
            </ul>

            <form className="flex items-center gap-2 bg-bg dark:bg-zinc-800/60 border border-line rounded-xl px-3.5 py-1.5 w-60 hover:border-burgundy/40 dark:hover:border-rose-400/40 transition-colors">
              <Search size={14} className="text-ink-soft" />
              <input
                type="search"
                placeholder="ابحث في عاجل..."
                className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-ink-faint"
              />
            </form>
          </div>
        </div>
      </nav>

      {/* ━━━━━━━━━━━━ شريط عاجل ━━━━━━━━━━━━ */}
      {breakingHeadlines.length > 0 && (
        <div className="bg-burgundy dark:bg-rose-600 text-white py-2.5 overflow-hidden shadow-red relative">
          {/* تأثير ضوء يتحرك خفيف */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          <div className="max-w-[1320px] mx-auto px-8 flex items-center gap-4 relative">
            <div className="bg-white text-burgundy dark:bg-zinc-100 dark:text-rose-700 px-3.5 py-1 rounded-full text-xs font-extrabold tracking-wider flex items-center gap-1.5 flex-shrink-0 shadow-sm">
              <span className="live-dot" />
              عاجل
            </div>
            <div className="flex-1 overflow-hidden whitespace-nowrap group">
              <div className="inline-block animate-ticker-reverse group-hover:[animation-play-state:paused]">
                {breakingHeadlines.map((h, i) => (
                  <span key={i} className="ml-12 text-sm font-medium">
                    <span className="opacity-40 ml-3.5 text-[10px]">◆</span>
                    {h}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
