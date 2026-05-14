"use client";

import { useEffect, useState } from "react";
import { formatArabicDate } from "@/lib/utils";

function formatHijriDate(d: Date): string {
  try {
    const formatter = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return formatter.format(d).replace("هـ", "").trim() + " هـ";
  } catch {
    return "";
  }
}

export function HeaderDateBar() {
  const [dates, setDates] = useState<{ gregorian: string; hijri: string } | null>(null);

  useEffect(() => {
    const today = new Date(new Date().toDateString());
    setDates({
      gregorian: formatArabicDate(today),
      hijri: formatHijriDate(today),
    });
  }, []);

  if (!dates) {
    return (
      <div className="flex gap-5 items-center">
        <span className="w-28 h-3 rounded bg-white/10 dark:bg-white/[0.06] animate-pulse" />
        <span className="w-px h-3 bg-white/15 dark:bg-white/10" />
        <span className="w-32 h-3 rounded bg-white/10 dark:bg-white/[0.06] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex gap-5 items-center">
      <span className="font-medium">{dates.gregorian}</span>
      {dates.hijri && (
        <>
          <span className="w-px h-3 bg-white/15 dark:bg-white/10" />
          <span className="opacity-80">{dates.hijri}</span>
        </>
      )}
    </div>
  );
}
