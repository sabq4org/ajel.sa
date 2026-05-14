"use client";

import { AskTheArticle } from "./AskTheArticle";
import { KeyPoints } from "./KeyPoints";
import { ShareWidget } from "./ShareWidget";
import { ArticleStats } from "./ArticleStats";

interface Props {
  articleId: string;
  articleTitle: string;
  articleSlug: string;
  articleContent: string;
  publishedAt: Date | null;
  readingTimeMinutes: number | null;
  viewCount: number;
  commentCount: number;
  /**
   * Public route segment used to build the share URL, e.g. "article" for
   * news pieces or "opinion" for opinion pieces. Defaults to "article" so
   * existing call sites keep working unchanged.
   */
  shareBasePath?: string;
}

export function ArticleSidebar({
  articleId,
  articleTitle,
  articleSlug,
  articleContent,
  publishedAt,
  readingTimeMinutes,
  viewCount,
  commentCount,
  shareBasePath = "article",
}: Props) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
      {/* النقاط الرئيسية — أهم شي للقارئ المستعجل */}
      <KeyPoints
        articleId={articleId}
        articleTitle={articleTitle}
        articleContent={articleContent}
      />

      {/* اسأل الخبر — الميزة النجمة */}
      <AskTheArticle
        articleTitle={articleTitle}
        articleContent={articleContent}
      />

      {/* معلومات الخبر */}
      <ArticleStats
        publishedAt={publishedAt}
        readingTimeMinutes={readingTimeMinutes}
        viewCount={viewCount}
        commentCount={commentCount}
      />

      {/* المشاركة */}
      <ShareWidget
        url={`/${shareBasePath}/${articleSlug}`}
        title={articleTitle}
      />
    </aside>
  );
}
