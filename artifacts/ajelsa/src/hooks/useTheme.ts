"use client";

/**
 * Backwards-compatible thin wrapper around `next-themes` so existing
 * `useTheme()` callers in the admin layout keep working.
 *
 * Prefer `useTheme()` from `next-themes` directly in new code.
 */
import { useEffect, useState } from "react";
import { useTheme as useNextTheme } from "next-themes";

export function useTheme() {
  const { theme, resolvedTheme, setTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Resolve "system" → actual rendered theme so consumers can render the
  // correct icon/state without flicker.
  const dark = mounted ? resolvedTheme === "dark" : false;

  function toggle() {
    setTheme(dark ? "light" : "dark");
  }

  return { dark, toggle, theme, setTheme };
}
