import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { importBatches, importItems, news, type importItemStatusEnum } from "../db/schema";

export type ImportItemStatus = (typeof importItemStatusEnum.enumValues)[number];

export type CreateBatchInput = {
  categoryId: number;
  items: Array<{ sourceUrl: string; sourceDomain: string }>;
};

export const importRepo = {
  async createBatch(input: CreateBatchInput) {
    return db.transaction(async (tx) => {
      const [batch] = await tx
        .insert(importBatches)
        .values({
          categoryId: input.categoryId,
          totalCount: input.items.length
        })
        .returning();

      const items = input.items.length
        ? await tx
            .insert(importItems)
            .values(
              input.items.map((i) => ({
                batchId: batch!.id,
                sourceUrl: i.sourceUrl,
                sourceDomain: i.sourceDomain,
                status: "PENDING" as ImportItemStatus
              }))
            )
            .returning()
        : [];

      return { batch: batch!, items };
    });
  },

  async findBatchById(batchId: number) {
    const rows = await db.select().from(importBatches).where(eq(importBatches.id, batchId)).limit(1);
    return rows[0] ?? null;
  },

  async findItemsByBatchId(batchId: number) {
    const rows = await db
      .select({
        item: importItems,
        newsSlug: news.slug,
        newsTitle: news.title
      })
      .from(importItems)
      .leftJoin(news, eq(news.id, importItems.newsId))
      .where(eq(importItems.batchId, batchId))
      .orderBy(importItems.id);
    return rows.map((r) => ({ ...r.item, newsSlug: r.newsSlug, newsTitle: r.newsTitle }));
  },

  async findItemById(itemId: number) {
    const rows = await db.select().from(importItems).where(eq(importItems.id, itemId)).limit(1);
    return rows[0] ?? null;
  },

  async markItemProcessing(itemId: number) {
    await db
      .update(importItems)
      .set({
        status: "PROCESSING",
        attempts: sql`${importItems.attempts} + 1`,
        startedAt: sql`COALESCE(${importItems.startedAt}, now())`,
        updatedAt: new Date()
      })
      .where(eq(importItems.id, itemId));
  },

  async markItemPublished(itemId: number, newsId: number) {
    await db
      .update(importItems)
      .set({
        status: "PUBLISHED",
        newsId,
        failureReason: null,
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(importItems.id, itemId));
  },

  async markItemFailed(itemId: number, reason: string) {
    await db
      .update(importItems)
      .set({
        status: "FAILED",
        failureReason: reason.slice(0, 500),
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(importItems.id, itemId));
  },

  async resetItemToPending(itemId: number, reason: string | null) {
    await db
      .update(importItems)
      .set({
        status: "PENDING",
        failureReason: reason ? reason.slice(0, 500) : null,
        updatedAt: new Date()
      })
      .where(eq(importItems.id, itemId));
  },

  async statusCounts(batchId: number) {
    const rows = await db
      .select({ status: importItems.status, count: sql<number>`cast(count(*) as int)` })
      .from(importItems)
      .where(eq(importItems.batchId, batchId))
      .groupBy(importItems.status);

    const result = { PENDING: 0, PROCESSING: 0, PUBLISHED: 0, FAILED: 0 };
    for (const row of rows) {
      result[row.status as ImportItemStatus] = Number(row.count);
    }
    return result;
  },

  async findFailedSince(since: Date) {
    return db
      .select()
      .from(importItems)
      .where(and(eq(importItems.status, "FAILED"), sql`${importItems.completedAt} >= ${since}`))
      .orderBy(importItems.completedAt);
  },

  async findItemsByIds(ids: number[]) {
    if (ids.length === 0) return [];
    return db.select().from(importItems).where(inArray(importItems.id, ids));
  }
};
