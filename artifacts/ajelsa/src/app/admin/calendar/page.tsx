"use client";

import { AdminTopbar } from "@/components/admin/AdminLayout";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, ChevronLeft, CalendarDays } from "lucide-react";

type Article = {
  id: string; slug: string; title: string; isBreaking: boolean;
  status: string; publishedAt: string | null; scheduledAt: string | null;
};

const DAYS_AR = ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/articles?limit=500")
      .then(r => r.json())
      .then(d => setArticles(d.items ?? []));
  }, []);

  function prevMonth() { if (month === 0) { setYear(y => y-1); setMonth(11); } else setMonth(m => m-1); setSelectedDay(null); }
  function nextMonth() { if (month === 11) { setYear(y => y+1); setMonth(0); } else setMonth(m => m+1); setSelectedDay(null); }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();

  function getArticlesForDay(day: number) {
    return articles.filter(a => {
      const d = a.publishedAt ? new Date(a.publishedAt) : a.scheduledAt ? new Date(a.scheduledAt) : null;
      return d && d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  }

  const selectedArticles = selectedDay ? getArticlesForDay(selectedDay) : [];
  const isToday = (day: number) => today.getFullYear()===year && today.getMonth()===month && today.getDate()===day;

  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <>
      <AdminTopbar title="تقويم النشر" subtitle="جدولة الأخبار ومتابعة التوزيع اليومي" />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
        {/* Calendar */}
        <div className="card">
          {/* Nav */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="w-8 h-8 grid place-items-center rounded-xl hover:bg-bg-2 text-ink-soft transition-colors"><ChevronRight size={16}/></button>
            <h2 className="text-[16px] font-bold text-ink">{MONTHS_AR[month]} {year}</h2>
            <button onClick={nextMonth} className="w-8 h-8 grid place-items-center rounded-xl hover:bg-bg-2 text-ink-soft transition-colors"><ChevronLeft size={16}/></button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_AR.map(d => (
              <div key={d} className="text-center text-[11px] font-semibold text-ink-soft py-1">{d.slice(0,2)}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const dayArts = getArticlesForDay(day);
              const breaking = dayArts.filter(a => a.isBreaking);
              const scheduled = dayArts.filter(a => a.status === "scheduled");
              const published = dayArts.filter(a => a.status === "published" && !a.isBreaking);
              const selected = selectedDay === day;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                  className={`relative p-2 rounded-xl text-center transition-all min-h-[56px] flex flex-col items-center gap-1 ${
                    selected ? "bg-burgundy text-white shadow-red" :
                    isToday(day) ? "border-2 border-burgundy text-burgundy font-bold hover:bg-rose-cream" :
                    "hover:bg-bg-2 text-ink"
                  }`}
                >
                  <span className="text-[13px] font-semibold">{day}</span>
                  {dayArts.length > 0 && (
                    <div className="flex gap-0.5 flex-wrap justify-center">
                      {breaking.slice(0,2).map((_, j) => <span key={j} className={`w-1.5 h-1.5 rounded-full ${selected ? "bg-white" : "bg-burgundy"}`} />)}
                      {scheduled.slice(0,2).map((_, j) => <span key={j} className={`w-1.5 h-1.5 rounded-full ${selected ? "bg-white/70" : "bg-blue-400"}`} />)}
                      {published.slice(0,2).map((_, j) => <span key={j} className={`w-1.5 h-1.5 rounded-full ${selected ? "bg-white/50" : "bg-ink-faint"}`} />)}
                      {dayArts.length > 6 && <span className={`text-[8px] font-bold ${selected ? "text-white/70" : "text-ink-faint"}`}>+{dayArts.length-6}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-line text-[11px] text-ink-soft">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-burgundy" /> عاجل</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400" /> مجدول</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-ink-faint" /> منشور</span>
          </div>
        </div>

        {/* Side panel */}
        <div className="card">
          {selectedDay ? (
            <>
              <h3 className="text-[14px] font-bold text-ink mb-4">
                {selectedDay} {MONTHS_AR[month]}
                <span className="text-ink-soft font-normal mr-1.5">({selectedArticles.length} خبر)</span>
              </h3>
              {selectedArticles.length === 0 ? (
                <p className="text-ink-faint text-sm text-center py-8">لا توجد أخبار في هذا اليوم</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {selectedArticles.map(a => (
                    <Link key={a.id} href={`/admin/articles/${a.id}/edit`}
                      className="block p-3 rounded-xl bg-bg-2 hover:bg-line transition-colors">
                      {a.isBreaking && <span className="text-[9px] font-extrabold bg-burgundy text-white px-1.5 py-0.5 rounded mb-1.5 inline-block">عاجل</span>}
                      <p className="text-[12px] font-semibold text-ink line-clamp-2">{a.title}</p>
                      <span className={`text-[10px] mt-1 inline-block px-2 py-0.5 rounded-full ${
                        a.status==="published" ? "bg-emerald-50 text-emerald-700" :
                        a.status==="scheduled" ? "bg-blue-50 text-blue-700" : "bg-bg text-ink-soft"
                      }`}>
                        {a.status==="published"?"منشور":a.status==="scheduled"?"مجدول":"مسودة"}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CalendarDays className="text-ink-faint mb-3" size={32} />
              <p className="text-ink-soft text-sm">اختر يوماً لعرض أخباره</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
