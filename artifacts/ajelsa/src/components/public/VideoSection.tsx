import Link from "next/link";
import { Play, Clock, Eye, ArrowLeft, Video as VideoIcon } from "lucide-react";

// فيديوهات تجريبية (يمكن استبدالها لاحقاً ببيانات من DB)
const MOCK_VIDEOS = [
  {
    id: 1,
    title: "تغطية مباشرة: افتتاح موسم الرياض 2026 بحضور دولي رفيع",
    thumbnail: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=450&fit=crop",
    duration: "12:34",
    views: 245000,
    publishedAt: "منذ 3 ساعات",
    category: "تغطية حية",
    slug: "riyadh-season-2026-opening",
  },
  {
    id: 2,
    title: "مقابلة حصرية مع وزير الاستثمار حول رؤية 2030",
    thumbnail: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=450&fit=crop",
    duration: "08:21",
    views: 132000,
    publishedAt: "منذ 5 ساعات",
    category: "حوار",
    slug: "investment-minister-interview",
  },
  {
    id: 3,
    title: "تقرير: مشاريع نيوم الجديدة تكشف عن مفاجآت تقنية",
    thumbnail: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800&h=450&fit=crop",
    duration: "15:08",
    views: 198000,
    publishedAt: "منذ 8 ساعات",
    category: "تقرير",
    slug: "neom-projects-tech",
  },
  {
    id: 4,
    title: "ملخص أهداف نهائي كأس الملك في 90 ثانية",
    thumbnail: "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&h=450&fit=crop",
    duration: "01:32",
    views: 423000,
    publishedAt: "منذ 12 ساعة",
    category: "رياضة",
    slug: "kings-cup-final-highlights",
  },
];

function formatViews(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function VideoSection() {
  const featured = MOCK_VIDEOS[0];
  const others = MOCK_VIDEOS.slice(1);

  return (
    <section className="relative w-screen left-1/2 right-1/2 -mx-[50vw]">
      {/* خلفية أنيقة كريمية مع لمسة خفيفة */}
      <div className="relative bg-gradient-to-br from-bg via-paper to-rose-cream/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-900 overflow-hidden border-y border-line">
        {/* زخارف ضبابية */}
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-burgundy/[0.04] dark:bg-rose-500/[0.06] blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-burgundy/[0.04] dark:bg-rose-500/[0.06] blur-3xl" />

        <div className="relative max-w-[1320px] mx-auto px-4 lg:px-8 py-12">

          {/* العنوان */}
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-burgundy to-burgundy-dark dark:from-rose-500 dark:to-rose-700 grid place-items-center shadow-lg shadow-burgundy/30 dark:shadow-rose-900/40">
                <VideoIcon size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl lg:text-3xl font-extrabold text-ink -tracking-[0.02em] flex items-center gap-2">
                  فيديو عاجل
                  <span className="text-[10px] bg-burgundy dark:bg-rose-500 text-white px-2 py-0.5 rounded-full font-bold tracking-widest">
                    LIVE
                  </span>
                </h2>
                <p className="text-[12px] text-ink-soft mt-0.5">
                  تقارير ومقابلات وتغطيات حية
                </p>
              </div>
            </div>

            <Link
              href="/category/video"
              className="inline-flex items-center gap-2 bg-burgundy hover:bg-burgundy-dark dark:bg-rose-500 dark:hover:bg-rose-400 text-white px-5 py-2 rounded-xl text-[13px] font-bold transition-all hover:gap-3 shadow-md"
            >
              كل الفيديوهات
              <ArrowLeft size={14} />
            </Link>
          </div>

          {/* الشبكة */}
          <div className="grid lg:grid-cols-[1.6fr_1fr] gap-5">

            {/* الفيديو الكبير (Featured) */}
            <Link
              href={`/article/${featured.slug}`}
              className="group block relative overflow-hidden rounded-2xl bg-paper border border-line hover:border-burgundy/30 dark:hover:border-rose-400/30 hover:shadow-xl dark:hover:shadow-black/50 transition-all duration-500"
            >
              <div className="relative aspect-video overflow-hidden bg-ink">
                <img
                  src={featured.thumbnail}
                  alt={featured.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />

                {/* Overlay داكن قوي لإظهار النص الأبيض بوضوح */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/10" />

                {/* زر التشغيل المتوسط */}
                <div className="absolute inset-0 grid place-items-center">
                  <div className="relative">
                    {/* نبضة الحلقة */}
                    <span className="absolute inset-0 rounded-full bg-burgundy/40 animate-ping" />
                    {/* الزر */}
                    <div className="relative w-20 h-20 rounded-full bg-burgundy/90 backdrop-blur-md grid place-items-center text-white shadow-2xl group-hover:scale-110 group-hover:bg-burgundy transition-all">
                      <Play size={28} className="fill-white mr-1" />
                    </div>
                  </div>
                </div>

                {/* المدة */}
                <div className="absolute top-4 left-4 bg-ink/85 backdrop-blur-sm text-white px-3 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5">
                  <Clock size={10} />
                  {featured.duration}
                </div>

                {/* التصنيف */}
                <div className="absolute top-4 right-4 bg-burgundy dark:bg-rose-500 text-white px-3 py-1 rounded-md text-[10px] font-extrabold tracking-widest shadow-lg">
                  {featured.category}
                </div>

                {/* المعلومات في الأسفل */}
                <div className="absolute bottom-0 inset-x-0 p-5 lg:p-6">
                  <h3
                    className="text-lg lg:text-2xl font-extrabold text-white leading-tight mb-2 group-hover:text-rose-cream transition-colors -tracking-[0.01em]"
                    style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.95)" }}
                  >
                    {featured.title}
                  </h3>
                  <div
                    className="flex items-center gap-3 text-[11px] text-white/90"
                    style={{ textShadow: "0 1px 6px rgba(0,0,0,0.85)" }}
                  >
                    <span className="flex items-center gap-1">
                      <Eye size={11} />
                      {formatViews(featured.views)} مشاهدة
                    </span>
                    <span className="w-1 h-1 rounded-full bg-white/60" />
                    <span>{featured.publishedAt}</span>
                  </div>
                </div>
              </div>
            </Link>

            {/* الفيديوهات الصغيرة */}
            <div className="space-y-3">
              {others.map((v) => (
                <Link
                  key={v.id}
                  href={`/article/${v.slug}`}
                  className="group flex gap-3 p-3 rounded-xl bg-paper border border-line hover:border-burgundy/30 dark:hover:border-rose-400/30 hover:shadow-md dark:hover:shadow-black/40 transition-all"
                >
                  <div className="relative w-32 h-20 lg:w-36 lg:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-ink">
                    <img
                      src={v.thumbnail}
                      alt={v.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-ink/30 group-hover:bg-ink/10 transition-colors" />

                    {/* زر تشغيل صغير */}
                    <div className="absolute inset-0 grid place-items-center">
                      <div className="w-9 h-9 rounded-full bg-burgundy/90 backdrop-blur-sm grid place-items-center text-white shadow-lg group-hover:scale-110 group-hover:bg-burgundy transition-all">
                        <Play size={13} className="fill-white mr-0.5" />
                      </div>
                    </div>

                    {/* المدة */}
                    <div className="absolute bottom-1 left-1 bg-ink/85 text-white px-1.5 py-0.5 rounded text-[9px] font-bold">
                      {v.duration}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <span className="text-[10px] font-bold text-burgundy dark:text-rose-300 uppercase tracking-widest mb-1 block">
                        {v.category}
                      </span>
                      <h3 className="text-[13px] font-bold text-ink leading-snug line-clamp-2 group-hover:text-burgundy dark:group-hover:text-rose-300 transition-colors -tracking-[0.01em]">
                        {v.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-ink-soft mt-1.5">
                      <span className="flex items-center gap-1">
                        <Eye size={9} />
                        {formatViews(v.views)}
                      </span>
                      <span className="w-0.5 h-0.5 rounded-full bg-ink-faint" />
                      <span>{v.publishedAt}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
