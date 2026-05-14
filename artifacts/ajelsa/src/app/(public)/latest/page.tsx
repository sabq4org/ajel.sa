// تحديث الصفحة كل 30 ثانية (ISR)
export const revalidate = 30;

import type { Metadata } from "next";
import { LatestNewsGrid } from "@/components/public/LatestNewsGrid";
import { getLatestArticles } from "@/lib/queries/articles";

export const metadata: Metadata = {
  title: "آخر الأخبار",
  description: "جميع الأخبار المنشورة في صحيفة عاجل بترتيب النشر.",
};

export default async function LatestPage() {
  const articles = await getLatestArticles(100);

  return (
    <div className="max-w-[1320px] mx-auto px-4 lg:px-8 py-8">
      <LatestNewsGrid articles={articles} />
    </div>
  );
}
