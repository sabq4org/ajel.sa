// تحديث الصفحة كل 60 ثانية (ISR) — سرعة فائقة في التنقل
export const revalidate = 60;

import { notFound } from "next/navigation";
import Link from "next/link";
import { StoryCard } from "@/components/public/StoryCard";
import { getCategoryArticles, getActiveCategories } from "@/lib/queries/articles";
import { Newspaper } from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;

  let categoryName = "";
  let articles: any[] = [];

  // جلب الأخبار مباشرة
  let items: any[] = [];
  let fetchError = "";
  try {
    items = await getCategoryArticles(slug, 24, 0);
  } catch (e: any) {
    console.error("[category]", slug, e);
    fetchError = e.message;
  }

  // جلب اسم القسم
  try {
    const cats = await getActiveCategories();
    const cat = (cats as any[]).find((c) => c.slug === slug);
    if (!cat) return notFound();
    categoryName = cat.name;
  } catch {
    // لو فشل جلب الأقسام، استخدم السلوج كاسم
    categoryName = slug;
  }

  articles = items;

  return (
    <div className="max-w-[1320px] mx-auto px-8 py-9">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-burgundy dark:border-rose-500/60 relative">
        <h1 className="text-3xl font-extrabold text-ink flex items-center gap-3">
          <span className="text-burgundy dark:text-rose-300">
            <Newspaper size={26} />
          </span>
          {categoryName}
        </h1>
        <span className="text-sm text-ink-soft">
          {articles.length > 0 ? `${articles.length}+ خبر` : ""}
        </span>
      </div>

      {fetchError && (
        <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-300 border border-red-100 dark:border-red-500/20 p-4 rounded-xl mb-6">
          خطأ في جلب البيانات: {fetchError}
        </div>
      )}

      {/* Articles grid */}
      {articles.length === 0 ? (
        <div className="py-24 text-center text-ink-soft">
          <p className="text-xl font-semibold mb-2">لا توجد أخبار في هذا القسم بعد</p>
          <p className="text-sm">ارجع لاحقاً أو تصفح الأقسام الأخرى</p>
          <Link
            href="/"
            className="mt-6 inline-block bg-burgundy dark:bg-rose-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-burgundy-dark dark:hover:bg-rose-400 transition-colors"
          >
            العودة للرئيسية
          </Link>
        </div>
      ) : (
        <>
          {articles.length === 1 && (
            <StoryCard article={articles[0]} variant="lead" />
          )}

          {/* Lead + side */}
          {articles.length >= 2 && (
            <section className="grid lg:grid-cols-[1.6fr_1fr] gap-8 mb-10">
              <StoryCard article={articles[0]} variant="lead" />
              <div className="space-y-5">
                {articles.slice(1, 5).map((a, i) => (
                  <StoryCard key={i} article={a} variant="side" />
                ))}
              </div>
            </section>
          )}

          {/* Rest as rows */}
          {articles.length > 5 && (
            <section>
              <div className="flex items-baseline justify-between mb-6 pb-3 border-b border-line relative">
                <span className="absolute -bottom-px right-0 w-15 h-0.5 bg-burgundy dark:bg-rose-500" style={{ width: 60 }} />
                <h2 className="text-xl font-bold text-ink">المزيد من {categoryName}</h2>
              </div>
              <div>
                {articles.slice(5).map((a, i) => (
                  <StoryCard key={i} article={a} variant="row" />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
