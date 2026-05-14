import type { NextConfig } from "next";

const replitDomain = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim() ?? "";

const config: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "ajelsa.net" },
      { protocol: "https", hostname: "cdn.ajelsa.net" },
      ...(replitDomain
        ? [{ protocol: "https" as const, hostname: replitDomain }]
        : []),
    ],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
    // Wraps router navigations in document.startViewTransition() so old/new
    // routes cross-fade via the rules in globals.css instead of hard-cutting.
    // Native API (Chrome 111+, Safari 18+); Next falls back to instant nav.
    viewTransition: true,
  },
  poweredByHeader: false,
  compress: true,
};

export default config;
