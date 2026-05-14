"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Variant = "public" | "admin";

interface Props {
  className?: string;
  variant?: Variant;
}

/**
 * 3-state theme toggle: Light → Dark → System.
 * Uses `next-themes` under the hood so it shares state with `ThemeProvider`.
 *
 * - Light  → Sun icon
 * - Dark   → Moon icon
 * - System → Monitor icon
 *
 * `aria-label` reflects the *current* state for screen readers.
 */
export function ThemeToggle({ className, variant = "public" }: Props) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent SSR/CSR mismatch — render an inert placeholder until mounted.
  useEffect(() => setMounted(true), []);

  function cycle() {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  }

  const baseClasses =
    variant === "admin"
      ? "w-9 h-9 grid place-items-center rounded-xl border border-line bg-paper text-ink-2 hover:text-burgundy hover:border-burgundy/40 dark:hover:text-rose-300 dark:hover:border-rose-400/40 transition-colors"
      : "w-10 h-10 rounded-xl border border-line bg-paper grid place-items-center text-ink-2 hover:bg-rose-cream hover:text-burgundy hover:border-rose-soft dark:hover:bg-rose-500/15 dark:hover:text-rose-300 dark:hover:border-rose-400/40 transition-colors";

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="مظهر الموقع"
        className={cn(baseClasses, className)}
        suppressHydrationWarning
      >
        <Monitor size={variant === "admin" ? 16 : 16} className="opacity-60" />
      </button>
    );
  }

  const current = (theme ?? "system") as "light" | "dark" | "system";
  const labelMap: Record<string, string> = {
    light: "الوضع الحالي: نهاري — انقر للتبديل إلى الليلي",
    dark: "الوضع الحالي: ليلي — انقر للتبديل إلى تلقائي",
    system: "الوضع الحالي: تلقائي — انقر للتبديل إلى نهاري",
  };
  const Icon = current === "light" ? Sun : current === "dark" ? Moon : Monitor;

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={labelMap[current]}
      title={labelMap[current]}
      className={cn(baseClasses, className)}
    >
      <Icon size={16} />
    </button>
  );
}
