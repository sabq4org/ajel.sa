/**
 * Ajel — Centralized formatting utilities
 * - Gregorian calendar (ميلادي)
 * - Latin numerals: 1 2 3 (not ١ ٢ ٣)
 * - Arabic month/day names where applicable
 */

// Locale: Arabic language + Gregorian calendar + Latin numerals
const LOCALE = "ar-SA-u-ca-gregory-nu-latn";

/** Full date: "2 مايو 2026" */
export function fDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(LOCALE, { day: "numeric", month: "long", year: "numeric" });
}

/** Short date: "2 مايو" */
export function fDateShort(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(LOCALE, { day: "numeric", month: "short" });
}

/** Date + time: "2 مايو 2026، 14:30" */
export function fDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(LOCALE, {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

/** Relative time: "منذ 5 دقائق" */
export function fRelative(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `منذ ${diff} ث`;
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
  if (diff < 2592000) return `منذ ${Math.floor(diff / 86400)} يوم`;
  return fDateShort(d);
}

/** Number with commas: 1,234,567 */
export function fNum(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en");
}

/** Compact number: 1.2M / 45.3K */
export function fNumCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** Percentage: "45.3%" */
export function fPct(num: number, den: number): string {
  if (!den) return "0%";
  return `${((num / den) * 100).toFixed(1)}%`;
}
