/**
 * Ajel Newspaper — Database Schema (shared, drizzle-orm ^0.45)
 *
 * Consumed by `artifacts/api-server` (Railway backend, pg Pool client).
 *
 * NOTE: a parallel copy lives at `artifacts/ajelsa/src/lib/db/schema.ts`
 * because ajelsa is currently pinned to drizzle-orm ^0.38.3. Both files
 * MUST stay in sync until ajelsa is bumped to the catalog drizzle version
 * (planned as part of the Vercel/Railway split — once ajelsa imports from
 * `@workspace/db/schema`, the local copy is deleted).
 */

import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  jsonb,
  pgEnum,
  uuid,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// =====================================================
// ENUMS
// =====================================================

export const userRoleEnum = pgEnum("user_role", [
  "super_admin", // مدير عام
  "editor_in_chief", // رئيس تحرير
  "editor", // محرر
  "writer", // كاتب
  "contributor", // مساهم
]);

export const articleStatusEnum = pgEnum("article_status", [
  "draft", // مسودة
  "review", // قيد المراجعة
  "scheduled", // مجدول للنشر
  "published", // منشور
  "archived", // مؤرشف
]);

export const opinionStatusEnum = pgEnum("opinion_status", [
  "draft",
  "review",
  "scheduled",
  "published",
  "archived",
]);

export const articleTypeEnum = pgEnum("article_type", [
  "regular", // عادي
  "breaking", // عاجل
  "exclusive", // حصري
  "investigation", // تحقيق
  "opinion", // رأي
  "video", // فيديو
  "photo", // فوتوغرافي
]);

// =====================================================
// USERS — المحررون والكتّاب
// =====================================================

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),

    fullName: varchar("full_name", { length: 200 }).notNull(),
    displayName: varchar("display_name", { length: 200 }),
    slug: varchar("slug", { length: 200 }),
    bio: text("bio"),
    shortBio: varchar("short_bio", { length: 280 }),
    avatarUrl: text("avatar_url"),
    coverUrl: text("cover_url"),

    /** @deprecated kept for backward compatibility — new code should rely on roleId */
    role: userRoleEnum("role").notNull().default("writer"),

    // new RBAC role FK (nullable until backfilled)
    roleId: uuid("role_id"),

    // per-user permission overrides (jsonb of { add: string[], remove: string[] })
    customPermissions: jsonb("custom_permissions"),

    // contact / org
    phone: varchar("phone", { length: 40 }),
    alternateEmail: varchar("alternate_email", { length: 255 }),
    jobTitle: varchar("job_title", { length: 200 }),
    department: varchar("department", { length: 120 }),

    // social
    twitterHandle: varchar("twitter_handle", { length: 50 }),
    facebookHandle: varchar("facebook_handle", { length: 100 }),
    instagramHandle: varchar("instagram_handle", { length: 100 }),
    linkedinHandle: varchar("linkedin_handle", { length: 100 }),
    youtubeHandle: varchar("youtube_handle", { length: 100 }),
    tiktokHandle: varchar("tiktok_handle", { length: 100 }),
    websiteUrl: text("website_url"),

    // account state
    isActive: boolean("is_active").notNull().default(true),
    isVerified: boolean("is_verified").notNull().default(false),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    /**
     * Monotonic counter bumped to invalidate all of this user's existing JWT
     * sessions. The current value is embedded in the JWT at login; on each
     * authenticated request the value in the cookie is compared to the value
     * in the DB, and any mismatch causes the session to be treated as expired.
     * Bumped by the "force logout" action.
     */
    sessionEpoch: integer("session_epoch").notNull().default(0),
    emailVerifiedAt: timestamp("email_verified_at"),
    lastLoginAt: timestamp("last_login_at"),
    lastSeenAt: timestamp("last_seen_at"),
    loginCount: integer("login_count").notNull().default(0),
    joinedAt: timestamp("joined_at"),
    leftAt: timestamp("left_at"),

    // misc
    preferences: jsonb("preferences"),
    internalNotes: text("internal_notes"),
    createdBy: uuid("created_by"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("users_email_idx").on(t.email),
    index("users_role_idx").on(t.role),
    index("users_role_id_idx").on(t.roleId),
    uniqueIndex("users_slug_idx").on(t.slug),
    index("users_department_idx").on(t.department),
    index("users_active_idx").on(t.isActive),
  ]
);

// =====================================================
// USER ACTIVITY — سجل نشاط المنسوبين
// =====================================================

export const userActivity = pgTable(
  "user_activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 80 }).notNull(),
    actorId: uuid("actor_id"),
    actorName: varchar("actor_name", { length: 200 }),
    details: jsonb("details"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("user_activity_user_idx").on(t.userId),
    index("user_activity_action_idx").on(t.action),
    index("user_activity_created_idx").on(t.createdAt),
    index("user_activity_user_created_idx").on(t.userId, t.createdAt),
  ]
);

export type UserActivity = typeof userActivity.$inferSelect;
export type NewUserActivity = typeof userActivity.$inferInsert;

// =====================================================
// CATEGORIES — الأقسام
// =====================================================

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    nameEn: varchar("name_en", { length: 100 }),
    description: text("description"),

    // hierarchy
    parentId: uuid("parent_id"),

    // visual
    color: varchar("color", { length: 7 }).default("#8c1d2b"),
    icon: varchar("icon", { length: 50 }),

    // SEO
    metaTitle: varchar("meta_title", { length: 200 }),
    metaDescription: text("meta_description"),

    // ordering
    position: integer("position").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("categories_slug_idx").on(t.slug),
    index("categories_parent_idx").on(t.parentId),
  ]
);

// =====================================================
// TAGS — الوسوم
// =====================================================

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    usageCount: integer("usage_count").notNull().default(0),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("tags_slug_idx").on(t.slug)]
);

// =====================================================
// MEDIA — مكتبة الصور والملفات
// =====================================================

export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    filename: varchar("filename", { length: 250 }).notNull(),
    originalFilename: varchar("original_filename", { length: 250 }),
    url: text("url").notNull(),
    mimeType: varchar("mime_type", { length: 100 }),
    sizeBytes: integer("size_bytes"),
    width: integer("width"),
    height: integer("height"),
    altText: varchar("alt_text", { length: 300 }),
    caption: text("caption"),
    storageSource: varchar("storage_source", { length: 50 }).default("local"),
    uploadedBy: uuid("uploaded_by").references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("media_uploaded_by_idx").on(t.uploadedBy),
    index("media_created_idx").on(t.createdAt),
  ]
);

// =====================================================
// ARTICLES — الأخبار والمقالات
// =====================================================

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 250 }).notNull().unique(),

    // content
    title: varchar("title", { length: 300 }).notNull(),
    subtitle: varchar("subtitle", { length: 500 }),
    excerpt: text("excerpt"),
    contentHtml: text("content_html"), // rendered html
    contentJson: jsonb("content_json"), // tiptap json

    // media
    // featuredMediaId — FK to media.id (preferred; survives URL re-renders & media moves)
    // featuredImageUrl — denormalized cached URL + legacy/external fallback
    featuredMediaId: uuid("featured_media_id").references(() => media.id, {
      onDelete: "set null",
    }),
    featuredImageUrl: text("featured_image_url"),
    featuredImageAlt: varchar("featured_image_alt", { length: 300 }),
    featuredImageCaption: text("featured_image_caption"),

    // classification
    type: articleTypeEnum("type").notNull().default("regular"),
    status: articleStatusEnum("status").notNull().default("draft"),

    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),

    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),

    editorId: uuid("editor_id").references(() => users.id),

    // SEO
    metaTitle: varchar("meta_title", { length: 200 }),
    metaDescription: text("meta_description"),
    metaKeywords: text("meta_keywords"),
    canonicalUrl: text("canonical_url"),

    // social
    ogImageUrl: text("og_image_url"),

    // workflow
    isBreaking: boolean("is_breaking").notNull().default(false),
    isFeatured: boolean("is_featured").notNull().default(false),
    isPinned: boolean("is_pinned").notNull().default(false),
    excludeFromHome: boolean("exclude_from_home").notNull().default(false),
    allowComments: boolean("allow_comments").notNull().default(true),

    // scheduling
    publishedAt: timestamp("published_at"),
    scheduledAt: timestamp("scheduled_at"),

    // stats (denormalized for speed)
    viewCount: integer("view_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    shareCount: integer("share_count").notNull().default(0),
    readingTimeMinutes: integer("reading_time_minutes"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("articles_slug_idx").on(t.slug),
    index("articles_status_published_idx").on(t.status, t.publishedAt),
    index("articles_category_idx").on(t.categoryId),
    index("articles_author_idx").on(t.authorId),
    index("articles_type_idx").on(t.type),
    index("articles_breaking_idx").on(t.isBreaking, t.publishedAt),
    index("articles_featured_idx").on(t.isFeatured, t.publishedAt),
    index("articles_scheduled_idx").on(t.status, t.scheduledAt),
    index("articles_featured_media_idx").on(t.featuredMediaId),
  ]
);

// =====================================================
// ARTICLE_TAGS — رابط بين الأخبار والوسوم (M:N)
// =====================================================

export const articleTags = pgTable(
  "article_tags",
  {
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.articleId, t.tagId] })]
);

// =====================================================
// ARTICLE_REVISIONS — مراجعات المقالات
// =====================================================

export const articleRevisions = pgTable(
  "article_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 300 }).notNull(),
    contentJson: jsonb("content_json"),
    revisedBy: uuid("revised_by")
      .notNull()
      .references(() => users.id),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("revisions_article_idx").on(t.articleId)]
);

// =====================================================
// COMMENTS — التعليقات
// =====================================================

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),

    authorName: varchar("author_name", { length: 100 }).notNull(),
    authorEmail: varchar("author_email", { length: 255 }),
    content: text("content").notNull(),

    isApproved: boolean("is_approved").notNull().default(false),
    isSpam: boolean("is_spam").notNull().default(false),

    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("comments_article_idx").on(t.articleId),
    index("comments_approved_idx").on(t.isApproved, t.articleId),
  ]
);

// =====================================================
// PAGE_VIEWS — تتبع الزيارات (مبسط)
// =====================================================

export const pageViews = pgTable(
  "page_views",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id").references(() => articles.id, {
      onDelete: "cascade",
    }),
    sessionHash: varchar("session_hash", { length: 64 }),
    referrer: text("referrer"),
    userAgent: text("user_agent"),
    country: varchar("country", { length: 2 }),
    deviceType: varchar("device_type", { length: 20 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("views_article_date_idx").on(t.articleId, t.createdAt),
    index("views_session_idx").on(t.sessionHash),
  ]
);

// =====================================================
// SETTINGS — إعدادات الموقع
// =====================================================

export const settings = pgTable("settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: jsonb("value"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// =====================================================
// AUTHORS — كتّاب الرأي (المؤلفون المستقلون)
// =====================================================

export const authors = pgTable(
  "authors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 150 }).notNull().unique(),

    // Optional link to a system user (when the columnist also logs in)
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),

    fullName: varchar("full_name", { length: 200 }).notNull(),
    position: varchar("position", { length: 200 }),
    bio: text("bio"),
    shortBio: varchar("short_bio", { length: 300 }),
    avatarUrl: text("avatar_url"),

    email: varchar("email", { length: 255 }),
    twitter: varchar("twitter", { length: 60 }),

    isActive: boolean("is_active").notNull().default(true),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("authors_slug_idx").on(t.slug),
    index("authors_user_idx").on(t.userId),
    index("authors_active_idx").on(t.isActive),
  ]
);

// =====================================================
// OPINION_ARTICLES — مقالات الرأي
// =====================================================

export const opinionArticles = pgTable(
  "opinion_articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 250 }).notNull().unique(),

    // content
    title: varchar("title", { length: 300 }).notNull(),
    subtitle: varchar("subtitle", { length: 500 }),
    excerpt: text("excerpt"),
    contentHtml: text("content_html"),
    contentJson: jsonb("content_json"),

    // media
    featuredMediaId: uuid("featured_media_id").references(() => media.id, {
      onDelete: "set null",
    }),
    featuredImageUrl: text("featured_image_url"),
    featuredImageAlt: varchar("featured_image_alt", { length: 300 }),
    featuredImageCaption: text("featured_image_caption"),

    status: opinionStatusEnum("status").notNull().default("draft"),

    // The columnist (author profile) — required
    authorId: uuid("author_id")
      .notNull()
      .references(() => authors.id, { onDelete: "restrict" }),

    // The user who created/edited the row in admin (for audit)
    createdById: uuid("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),

    // SEO
    metaTitle: varchar("meta_title", { length: 200 }),
    metaDescription: text("meta_description"),
    metaKeywords: text("meta_keywords"),
    canonicalUrl: text("canonical_url"),
    ogImageUrl: text("og_image_url"),

    // workflow flags
    isFeatured: boolean("is_featured").notNull().default(false),
    excludeFromHome: boolean("exclude_from_home").notNull().default(false),
    allowComments: boolean("allow_comments").notNull().default(true),

    publishedAt: timestamp("published_at"),
    scheduledAt: timestamp("scheduled_at"),

    viewCount: integer("view_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    shareCount: integer("share_count").notNull().default(0),
    readingTimeMinutes: integer("reading_time_minutes"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("opinion_slug_idx").on(t.slug),
    index("opinion_author_idx").on(t.authorId),
    index("opinion_status_idx").on(t.status, t.publishedAt),
    index("opinion_featured_idx").on(t.isFeatured, t.publishedAt),
  ]
);

// =====================================================
// RELATIONS
// =====================================================

export const usersRelations = relations(users, ({ many }) => ({
  articles: many(articles),
  uploads: many(media),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
  }),
  articles: many(articles),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
  category: one(categories, {
    fields: [articles.categoryId],
    references: [categories.id],
  }),
  author: one(users, {
    fields: [articles.authorId],
    references: [users.id],
    relationName: "author",
  }),
  editor: one(users, {
    fields: [articles.editorId],
    references: [users.id],
    relationName: "editor",
  }),
  featuredMedia: one(media, {
    fields: [articles.featuredMediaId],
    references: [media.id],
  }),
  tags: many(articleTags),
  revisions: many(articleRevisions),
  comments: many(comments),
}));

export const articleTagsRelations = relations(articleTags, ({ one }) => ({
  article: one(articles, {
    fields: [articleTags.articleId],
    references: [articles.id],
  }),
  tag: one(tags, {
    fields: [articleTags.tagId],
    references: [tags.id],
  }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  articles: many(articleTags),
}));

export const authorsRelations = relations(authors, ({ one, many }) => ({
  user: one(users, {
    fields: [authors.userId],
    references: [users.id],
  }),
  opinions: many(opinionArticles),
}));

export const opinionArticlesRelations = relations(opinionArticles, ({ one }) => ({
  author: one(authors, {
    fields: [opinionArticles.authorId],
    references: [authors.id],
  }),
  createdBy: one(users, {
    fields: [opinionArticles.createdById],
    references: [users.id],
  }),
  featuredMedia: one(media, {
    fields: [opinionArticles.featuredMediaId],
    references: [media.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  article: one(articles, {
    fields: [comments.articleId],
    references: [articles.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
  }),
  replies: many(comments),
}));

// =====================================================
// ADS — الإعلانات
// =====================================================

export const adPositionEnum = pgEnum("ad_position", [
  "header_banner",
  "sidebar_top",
  "sidebar_bottom",
  "article_top",
  "article_middle",
  "article_bottom",
  "footer_banner",
]);

export const ads = pgTable("ads", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 200 }).notNull(),
  position: adPositionEnum("position").notNull(),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  advertiser: varchar("advertiser", { length: 200 }),
  isActive: boolean("is_active").notNull().default(true),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Ad = typeof ads.$inferSelect;

// =====================================================
// AUDIT LOGS — سجل النشاطات
// =====================================================

export const auditActionEnum = pgEnum("audit_action", [
  "article_created", "article_updated", "article_published", "article_deleted",
  "article_archived", "user_created", "user_updated", "comment_approved",
  "comment_deleted", "category_created", "category_updated", "login", "logout",
  "opinion_created", "opinion_updated", "opinion_published", "opinion_deleted",
  "opinion_archived", "author_created", "author_updated", "author_deleted",
]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  userFullName: varchar("user_full_name", { length: 200 }),
  action: auditActionEnum("action").notNull(),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: uuid("entity_id"),
  entityTitle: varchar("entity_title", { length: 300 }),
  details: jsonb("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("audit_user_idx").on(t.userId),
  index("audit_action_idx").on(t.action),
  index("audit_created_idx").on(t.createdAt),
]);

export type AuditLog = typeof auditLogs.$inferSelect;

// =====================================================
// POLLS — استطلاعات الرأي
// =====================================================

export const polls = pgTable("polls", {
  id: uuid("id").primaryKey().defaultRandom(),
  question: varchar("question", { length: 500 }).notNull(),
  articleId: uuid("article_id").references(() => articles.id, { onDelete: "set null" }),
  isActive: boolean("is_active").notNull().default(true),
  endsAt: timestamp("ends_at"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pollOptions = pgTable("poll_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  pollId: uuid("poll_id").notNull().references(() => polls.id, { onDelete: "cascade" }),
  text: varchar("text", { length: 300 }).notNull(),
  votes: integer("votes").notNull().default(0),
  position: integer("position").notNull().default(0),
});

export type Poll = typeof polls.$inferSelect;
export type PollOption = typeof pollOptions.$inferSelect;

// =====================================================
// NEWSLETTER SUBSCRIBERS — النشرة البريدية
// =====================================================

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 200 }),
  isActive: boolean("is_active").notNull().default(true),
  source: varchar("source", { length: 100 }),
  subscribedAt: timestamp("subscribed_at").notNull().defaultNow(),
  unsubscribedAt: timestamp("unsubscribed_at"),
});

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;

// =====================================================
// ROLES & PERMISSIONS — نظام الأدوار والصلاحيات
// =====================================================

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: varchar("key", { length: 60 }).notNull().unique(),
    nameAr: varchar("name_ar", { length: 100 }).notNull(),
    nameEn: varchar("name_en", { length: 100 }),
    description: text("description"),
    level: integer("level").notNull().default(10),
    isSystem: boolean("is_system").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("roles_key_idx").on(t.key),
    index("roles_level_idx").on(t.level),
  ]
);

export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: varchar("key", { length: 80 }).notNull().unique(),
    category: varchar("category", { length: 40 }).notNull(),
    labelAr: varchar("label_ar", { length: 200 }).notNull(),
    labelEn: varchar("label_en", { length: 200 }),
    description: text("description"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("permissions_key_idx").on(t.key),
    index("permissions_category_idx").on(t.category),
  ]
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.roleId, t.permissionId] }),
    index("role_permissions_role_idx").on(t.roleId),
    index("role_permissions_perm_idx").on(t.permissionId),
  ]
);

export const rolesRelations = relations(roles, ({ many }) => ({
  permissions: many(rolePermissions),
  users: many(users),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  roles: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

// =====================================================
// TYPE EXPORTS
// =====================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Media = typeof media.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
export type Permission = typeof permissions.$inferSelect;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type Author = typeof authors.$inferSelect;
export type NewAuthor = typeof authors.$inferInsert;
export type OpinionArticle = typeof opinionArticles.$inferSelect;
export type NewOpinionArticle = typeof opinionArticles.$inferInsert;
