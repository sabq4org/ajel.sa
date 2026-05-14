import Link from "next/link";
import { PenTool, Quote, ArrowLeft, Clock } from "lucide-react";
import { RelativeTime } from "./RelativeTime";

interface OpinionItem {
  slug: string;
  title: string;
  subtitle?: string | null;
  excerpt?: string | null;
  featuredImageUrl?: string | null;
  publishedAt?: Date | null;
  readingTimeMinutes?: number | null;
  viewCount?: number;
  author: {
    id: string;
    slug: string;
    fullName: string;
    position?: string | null;
    avatarUrl?: string | null;
    shortBio?: string | null;
  };
}

interface Props {
  opinions: OpinionItem[];
}

export function OpinionsSection({ opinions }: Props) {
  if (opinions.length === 0) return null;

  const items = opinions.slice(0, 8);
  // كرّر القائمة لإنشاء حركة لانهائية سلسة
  const loop = [...items, ...items];

  return (
    <section className="relative">
      {/* رأس القسم */}
      <div className="flex items-end justify-between mb-5 pb-3 border-b-2 border-burgundy relative">
        <span className="absolute -bottom-[3px] right-0 w-20 h-1 bg-burgundy rounded-t" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-burgundy to-burgundy-dark grid place-items-center shadow-md">
            <PenTool size={16} className="text-rose-cream" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-ink -tracking-[0.02em]">مقالات الرأي</h2>
            <p className="text-[11px] text-ink-soft mt-0.5">آراء كتّابنا · بأقلامهم</p>
          </div>
        </div>
        <Link
          href="/opinions"
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-burgundy hover:text-burgundy-dark transition-colors"
        >
          كل المقالات
          <ArrowLeft size={13} />
        </Link>
      </div>

      {/* شريط متحرك من اليسار لليمين — يتوقف عند المرور بالماوس */}
      <div className="relative overflow-hidden group" dir="ltr">
        {/* تدرّجات على الأطراف لإخفاء انقطاع الحركة */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-bg to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-bg to-transparent z-10" />

        <div className="flex gap-4 animate-ticker-reverse group-hover:[animation-play-state:paused] py-1">
          {loop.map((op, i) => (
            <OpinionCard key={`${op.slug}-${i}`} op={op} />
          ))}
        </div>
      </div>
    </section>
  );
}

function OpinionCard({ op }: { op: OpinionItem }) {
  return (
    <article
      dir="rtl"
      className="group/card relative flex-shrink-0 w-[260px] md:w-[280px] rounded-xl border border-line bg-paper overflow-hidden hover:border-burgundy/40 hover:shadow-md transition-all duration-300"
    >
      <Link href={`/opinion/${op.slug}`} aria-label={op.title} className="absolute inset-0 z-10" />

      {/* الصورة — ارتفاع صغير */}
      <div className="relative h-28 bg-rose-cream overflow-hidden">
        {op.featuredImageUrl ? (
          <img
            src={op.featuredImageUrl}
            alt={op.title}
            className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-burgundy/20 to-rose-cream flex items-center justify-center">
            <Quote size={28} className="text-burgundy/30" />
          </div>
        )}
        <span className="absolute top-2 right-2 inline-flex items-center gap-1 bg-burgundy text-white px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider">
          <PenTool size={9} /> رأي
        </span>
      </div>

      {/* المحتوى */}
      <div className="p-3 space-y-2">
        {/* المؤلف */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-burgundy to-burgundy-soft text-white grid place-items-center font-bold flex-shrink-0 overflow-hidden text-[10px]">
            {op.author.avatarUrl ? (
              <img src={op.author.avatarUrl} alt={op.author.fullName} className="w-full h-full object-cover" />
            ) : (
              op.author.fullName[0]
            )}
          </div>
          <Link
            href={`/opinions/author/${op.author.slug}`}
            className="relative z-20 text-[11px] font-bold text-burgundy hover:text-burgundy-dark transition-colors truncate flex-1 min-w-0"
          >
            {op.author.fullName}
          </Link>
        </div>

        {/* العنوان */}
        <h4 className="text-[13px] font-bold text-ink leading-snug line-clamp-2 group-hover/card:text-burgundy transition-colors -tracking-[0.01em] min-h-[2.4rem]">
          {op.title}
        </h4>

        {/* التاريخ فقط */}
        {op.publishedAt && (
          <div className="text-[10px] text-ink-soft flex items-center gap-1 pt-1.5 border-t border-line-soft">
            <Clock size={9} />
            <RelativeTime date={op.publishedAt} />
          </div>
        )}
      </div>
    </article>
  );
}
