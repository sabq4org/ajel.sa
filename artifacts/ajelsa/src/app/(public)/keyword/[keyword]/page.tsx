// تحديث الصفحة كل 60 ثانية (ISR)
export const revalidate = 60;

import { notFound } from "next/navigation";
import Link from "next/link";
import { StoryCard } from "@/components/public/StoryCard";
import { getKeywordArticles } from "@/lib/queries/articles";
import { Tag } from "lucide-react";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ keyword: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { keyword } = await params;
  const kw = decodeURIComponent(keyword);
  return {
    title: `أخبار: ${kw}`,
    description: `جميع الأخبار المتعلقة بـ "${kw}"`,
  };
}

export default async function KeywordPage({ params }: Props) {
  const { keyword } = await params;
  const kw = decodeURIComponent(keyword).trim();

  if (!kw) return notFound();

  let articles: any[] = [];
  try {
    articles = await getKeywordArticles(kw, 24);
  } catch (e) {
    console.error("[keyword]", kw, e);
  }

  return (
    <div className="max-w-[1320px] mx-auto px-8 py-9">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-burgundy dark:border-rose-500/60">
        <div className="w-10 h-10 rounded-xl bg-rose-cream dark:bg-rose-500/15 border border-burgundy/20 dark:border-rose-400/30 grid place-items-center text-burgundy dark:text-rose-300">
          <Tag size={18} />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-ink-soft tracking-widest uppercase mb-0.5">كلمة مفتاحية</p>
          <h1 className="text-2xl font-extrabold text-ink">{kw}</h1>
        </div>
        {articles.length > 0 && (
          <span className="mr-auto text-sm text-ink-soft">
            {articles.length} خبر
          </span>
        )}
      </div>

      {articles.length === 0 ? (
        <div className="py-24 text-center text-ink-soft">
          <Tag size={40} className="mx-auto mb-4 opacity-30" />
          <p className="text-xl font-semibold mb-2">لا توجد أخبار بهذه الكلمة</p>
          <Link href="/" className="mt-6 inline-block bg-burgundy dark:bg-rose-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-burgundy-dark dark:hover:bg-rose-400 transition-colors">
            العودة للرئيسية
          </Link>
        </div>
      ) : (
        <>
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

          {articles.length === 1 && (
            <StoryCard article={articles[0]} variant="lead" />
          )}

          {articles.length > 5 && (
            <section>
              <div className="h-px bg-line mb-6" />
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
