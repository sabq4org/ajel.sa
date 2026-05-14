"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * App-wide theme provider.
 *
 * Wraps `next-themes` so we get:
 *   - 3-state theme: light | dark | system
 *   - localStorage key: `theme`  (shared between public site and admin)
 *   - automatic OS `prefers-color-scheme` follow when set to `system`
 *   - no flash on first paint (next-themes injects an inline script in <head>)
 *
 * Toggles `class="dark"` on <html> and the `color-scheme` CSS property,
 * which lets all our `dark:*` Tailwind variants work.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="theme"
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  );
}
