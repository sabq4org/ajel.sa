import { Clock, Eye, MessageCircle, Calendar } from "lucide-react";
import { formatNumber, formatArabicDate } from "@/lib/utils";

interface Props {
  publishedAt: Date | null;
  readingTimeMinutes: number | null;
  viewCount: number;
  commentCount: number;
}

export function ArticleStats({
  publishedAt,
  readingTimeMinutes,
  viewCount,
  commentCount,
}: Props) {
  const stats = [
    {
      icon: Clock,
      label: "وقت القراءة",
      value: readingTimeMinutes ? `${readingTimeMinutes} دقيقة` : "—",
    },
    {
      icon: Eye,
      label: "قراءة",
      value: formatNumber(viewCount),
    },
    {
      icon: MessageCircle,
      label: "تعليق",
      value: formatNumber(commentCount),
    },
  ];

  return (
    <div className="bg-paper rounded-2xl border border-line p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-line-soft">
        <div className="w-7 h-7 rounded-lg bg-rose-cream dark:bg-rose-500/15 grid place-items-center">
          <Calendar size={13} className="text-burgundy dark:text-rose-300" />
        </div>
        <h3 className="text-[13px] font-extrabold text-ink">معلومات الخبر</h3>
      </div>

      {publishedAt && (
        <p className="text-[11px] text-ink-soft mb-3 pb-3 border-b border-line-soft">
          {formatArabicDate(publishedAt)}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {stats.map(({ icon: Icon, label, value }, i) => (
          <div key={i} className="text-center bg-bg-2 rounded-xl py-2.5 px-1">
            <Icon size={14} className="mx-auto text-burgundy dark:text-rose-300 mb-1" />
            <div className="text-[12px] font-extrabold text-ink leading-tight">{value}</div>
            <div className="text-[10px] text-ink-soft mt-0.5">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
