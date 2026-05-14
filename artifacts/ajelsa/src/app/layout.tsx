import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: {
    default: "عاجل · صحيفة الحدث الأولى",
    template: "%s · عاجل",
  },
  description:
    "صحيفة عاجل الإلكترونية — الخبر السعودي والعربي بمصداقية وعمق. تابع آخر الأخبار العاجلة والاقتصاد والرياضة والتقنية.",
  keywords: ["عاجل", "أخبار السعودية", "صحيفة عاجل", "الخليج", "اقتصاد", "رياضة"],
  authors: [{ name: "صحيفة عاجل" }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://ajelsa.net"),
  openGraph: {
    type: "website",
    locale: "ar_SA",
    siteName: "عاجل",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      style={{ viewTransitionName: "root" }}
    >
      <head>
        {/* Anti-flash: resolve theme before React hydrates so the page
            paints with the right background on first frame. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('theme')||'system';var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=s==='dark'||(s==='system'&&m);var r=document.documentElement;if(d){r.classList.add('dark');r.style.colorScheme='dark';}else{r.classList.remove('dark');r.style.colorScheme='light';}}catch(e){}})();`,
          }}
        />
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@200;300;400;500;700;800;900&family=Amiri:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
