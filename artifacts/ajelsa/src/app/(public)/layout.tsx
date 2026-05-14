import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { getBreakingHeadlines, getActiveCategories } from "@/lib/queries/articles";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let headlines: string[] = [];
  let navCategories: Array<{ name: string; slug: string }> = [];

  try {
    const [h, cats] = await Promise.all([
      getBreakingHeadlines(5),
      getActiveCategories(),
    ]);
    headlines = h;
    navCategories = (cats as any[]).map((c: any) => ({ name: c.name, slug: c.slug }));
  } catch {
    // إذا فشل الاستعلام، اترك الشريط مخفياً بدلاً من عرض عناوين تجريبية
    headlines = [];
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader breakingHeadlines={headlines} navCategories={navCategories} />
      <main className="flex-1 relative z-5">{children}</main>
      <SiteFooter />
    </div>
  );
}
