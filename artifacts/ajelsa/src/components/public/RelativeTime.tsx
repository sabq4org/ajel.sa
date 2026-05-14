"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime, formatArabicDate } from "@/lib/utils";

interface Props {
  date: Date | string | number | null | undefined;
  fallback?: string;
}

export function RelativeTime({ date, fallback = "" }: Props) {
  const [label, setLabel] = useState<string>(() => {
    if (!date) return fallback;
    try { return formatArabicDate(new Date(date)); } catch { return fallback; }
  });

  useEffect(() => {
    if (!date) return;
    setLabel(formatRelativeTime(date));
    const t = setInterval(() => setLabel(formatRelativeTime(date)), 60_000);
    return () => clearInterval(t);
  }, [date]);

  if (!date) return null;
  return <>{label}</>;
}
