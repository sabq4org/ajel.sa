import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Tajawal"', "system-ui", "sans-serif"],
        serif: ['"Amiri"', "Georgia", "serif"],
      },
      colors: {
        // All theme colors via CSS variables — supports dark mode
        bg: {
          DEFAULT: "var(--bg)",
          2: "var(--bg-2)",
        },
        paper: {
          DEFAULT: "var(--paper)",
          2: "var(--paper)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          2: "var(--ink-2)",
          soft: "var(--ink-soft)",
          faint: "var(--ink-faint)",
        },
        line: {
          DEFAULT: "var(--line)",
          soft: "var(--line-soft)",
        },
        burgundy: {
          DEFAULT: "#8c1d2b",
          dark: "#6b1421",
          soft: "#b53d4a",
        },
        rose: {
          DEFAULT: "#d8a5aa",
          soft: "#f0d4d6",
          cream: "#fce8e9",
        },
        gold: "#b8924a",
        sage: "#7a9081",
        navy: "#3a4a5e",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(31, 26, 28, 0.04), 0 4px 12px rgba(31, 26, 28, 0.04)",
        card: "0 2px 4px rgba(31, 26, 28, 0.06), 0 12px 32px rgba(31, 26, 28, 0.08)",
        red: "0 8px 24px rgba(140, 29, 43, 0.12)",
      },
      animation: {
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        ticker: "ticker 50s linear infinite",
        "ticker-reverse": "ticker-reverse 50s linear infinite",
      },
      keyframes: {
        ticker: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(-100%)" },
        },
        "ticker-reverse": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
} satisfies Config;
