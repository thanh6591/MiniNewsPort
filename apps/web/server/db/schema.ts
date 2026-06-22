import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar
} from "drizzle-orm/pg-core";

export const newsStatusEnum = pgEnum("news_status", ["DRAFT", "PUBLISHED"]);
export const importItemStatusEnum = pgEnum("import_item_status", [
  "PENDING",
  "PROCESSING",
  "PUBLISHED",
  "FAILED"
]);

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    slugUnique: uniqueIndex("categories_slug_unique").on(table.slug)
  })
);

export const news = pgTable(
  "news",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull(),
    summary: varchar("summary", { length: 500 }).notNull(),
    content: text("content").notNull(),
    imageUrl: varchar("image_url", { length: 500 }),
    status: newsStatusEnum("status").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    viewCount: integer("view_count").default(0).notNull(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    slugUnique: uniqueIndex("news_slug_unique").on(table.slug),
    categoryPublishedIdx: index("idx_news_category_published").on(table.categoryId, table.publishedAt),
    publishedIdx: index("idx_news_published").on(table.publishedAt)
  })
);

export const newsViewDaily = pgTable(
  "news_view_daily",
  {
    id: serial("id").primaryKey(),
    newsId: integer("news_id")
      .notNull()
      .references(() => news.id, { onDelete: "cascade" }),
    viewDate: date("view_date").notNull(),
    viewCount: integer("view_count").default(0).notNull()
  },
  (table) => ({
    newsDateUnique: uniqueIndex("news_view_daily_news_id_view_date_unique").on(table.newsId, table.viewDate),
    viewDateCountIdx: index("idx_news_view_daily_date_count").on(table.viewDate, table.viewCount)
  })
);

export const importBatches = pgTable("import_batches", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  totalCount: integer("total_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const importItems = pgTable(
  "import_items",
  {
    id: serial("id").primaryKey(),
    batchId: integer("batch_id")
      .notNull()
      .references(() => importBatches.id, { onDelete: "cascade" }),
    sourceUrl: varchar("source_url", { length: 2048 }).notNull(),
    sourceDomain: varchar("source_domain", { length: 255 }).notNull(),
    status: importItemStatusEnum("status").notNull().default("PENDING"),
    attempts: integer("attempts").notNull().default(0),
    failureReason: varchar("failure_reason", { length: 500 }),
    newsId: integer("news_id").references(() => news.id, { onDelete: "set null" }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    batchIdx: index("idx_import_items_batch").on(table.batchId),
    batchStatusIdx: index("idx_import_items_batch_status").on(table.batchId, table.status)
  })
);
