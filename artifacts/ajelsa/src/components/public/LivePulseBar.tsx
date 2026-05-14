"use client";

import { useEffect, useState } from "react";
import { Activity, Eye, TrendingUp, Users, Zap } from "lucide-react";

const PULSE_MESSAGES = [
  { icon: Eye,        text: "1,247 قارئ يتصفحون عاجل الآن", color: "text-emerald-500" },
  { icon: TrendingUp, text: "محليات — أكثر قسم تفاعلاً اليوم", color: "text-burgundy" },
  { icon: Users,      text: "+340 قارئ جديد اليوم",          color: "text-blue-500" },
  { icon: Zap,        text: "5 أخبار عاجلة نُشرت آخر ساعة",  color: "text-amber-500" },
  { icon: Activity,   text: "تاسي يرتفع بنسبة 1.2%",         color: "text-emerald-500" },
];

export function LivePulseBar() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % PULSE_MESSAGES.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="bg-gradient-to-l from-burgundy/5 via-rose-cream/40 to-burgundy/5 border-y border-burgundy/10 dark:from-rose-500/[0.04] dark:via-zinc-900/40 dark:to-rose-500/[0.04] dark:border-rose-500/10">
      <div className="max-w-[1320px] mx-auto px-8 py-2 flex items-center gap-3 overflow-hidden">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="relative flex w-2 h-2">
            <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" />
            <span className="relative rounded-full bg-emerald-500 w-2 h-2" />
          </span>
          <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 tracking-widest uppercase">LIVE</span>
        </div>

        <div className="w-px h-3 bg-burgundy/20 dark:bg-rose-500/20 flex-shrink-0" />

        <div className="flex-1 overflow-hidden h-5 relative">
          {PULSE_MESSAGES.map((m, i) => {
            const Icon = m.icon;
            const active = i === index;
            return (
              <div
                key={i}
                className={`absolute inset-0 flex items-center gap-2 transition-all duration-700 ${
                  active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
                }`}
              >
                <Icon size={12} className={m.color} />
                <span className="text-[12px] font-medium text-ink-2">{m.text}</span>
              </div>
            );
          })}
        </div>

        <div className="hidden md:flex gap-1 flex-shrink-0">
          {PULSE_MESSAGES.map((_, i) => (
            <span
              key={i}
              className={`w-1 h-1 rounded-full transition-all ${
                i === index ? "bg-burgundy dark:bg-rose-400 w-3" : "bg-burgundy/20 dark:bg-rose-500/20"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
