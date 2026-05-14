import Link from "next/link";
import { Twitter, Facebook, Instagram, Youtube, Send } from "lucide-react";
import { getActiveCategories } from "@/lib/queries/articles";

const SOCIAL_LINKS = [
  { name: "تويتر",    icon: Twitter,   url: "https://twitter.com/ajelsa", color: "hover:bg-sky-500" },
  { name: "فيسبوك",   icon: Facebook,  url: "#",                          color: "hover:bg-blue-600" },
  { name: "إنستغرام", icon: Instagram, url: "#",                          color: "hover:bg-pink-500" },
  { name: "يوتيوب",   icon: Youtube,   url: "#",                          color: "hover:bg-red-600" },
  { name: "تيك توك",  icon: Send,      url: "#",                          color: "hover:bg-black" },
];

export async function SiteFooter() {
  let categories: any[] = [];
  try {
    categories = (await getActiveCategories()) as any[];
  } catch {}

  return (
    <footer className="relative bg-gradient-to-l from-burgundy-dark via-[#5a141d] to-burgundy-dark dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950 text-white border-t dark:border-rose-500/15">
      <div className="max-w-[1320px] mx-auto px-6 py-5">
        {/* صف واحد مدمج: الشعار + الأقسام + الاجتماعية */}
        <div className="flex flex-col md:flex-row items-center md:items-center justify-between gap-4">
          {/* الشعار */}
          <Link href="/" className="flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="صحيفة عاجل"
              className="h-8 w-auto object-contain brightness-0 invert opacity-90 no-dark-filter"
            />
          </Link>

          {/* الأقسام كروابط أفقية */}
          {categories.length > 0 && (
            <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[12px]">
              {categories.slice(0, 6).map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className="opacity-75 hover:opacity-100 hover:text-rose-cream dark:hover:text-rose-200 transition-all"
                >
                  {cat.name}
                </Link>
              ))}
              <span className="opacity-30">|</span>
              <Link href="/about" className="opacity-75 hover:opacity-100 transition-all">من نحن</Link>
              <Link href="/privacy" className="opacity-75 hover:opacity-100 transition-all">الخصوصية</Link>
            </nav>
          )}

          {/* الاجتماعية */}
          <div className="flex gap-1.5 flex-shrink-0">
            {SOCIAL_LINKS.map(({ name, icon: Icon, url, color }) => (
              <a
                key={name}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                title={name}
                className={`w-7 h-7 rounded-lg bg-white/10 backdrop-blur-sm grid place-items-center transition-all hover:scale-110 ${color}`}
              >
                <Icon size={12} />
              </a>
            ))}
          </div>
        </div>

        {/* خط حقوق الملكية */}
        <div className="mt-4 pt-3 border-t border-white/10 dark:border-white/[0.06] text-center text-[11px] opacity-70">
          © 2026 صحيفة عاجل — جميع الحقوق محفوظة
        </div>
      </div>
    </footer>
  );
}
