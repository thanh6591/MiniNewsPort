import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { news, newsViewDaily } from "../db/schema";

export const viewRepo = {
  async upsertAndIncrementToday(newsId: number, viewDate: string) {
    const rows = await db
      .insert(newsViewDaily)
      .values({
        newsId,
        viewDate,
        viewCount: 1
      })
      .onConflictDoUpdate({
        target: [newsViewDaily.newsId, newsViewDaily.viewDate],
        set: {
          viewCount: sql`${newsViewDaily.viewCount} + 1`
        }
      })
      .returning();

    return rows[0];
  },

  async topByDate(viewDate: string, limit: number) {
    return db
      .select({
        newsId: newsViewDaily.newsId,
        viewDate: newsViewDaily.viewDate,
        viewCount: newsViewDaily.viewCount,
        totalViewCount: news.viewCount,
        slug: news.slug,
        title: news.title,
        summary: news.summary,
        imageUrl: news.imageUrl,
        publishedAt: news.publishedAt
      })
      .from(newsViewDaily)
      .innerJoin(news, eq(news.id, newsViewDaily.newsId))
      .where(and(eq(newsViewDaily.viewDate, viewDate), eq(news.status, "PUBLISHED")))
      .orderBy(desc(newsViewDaily.viewCount), desc(news.publishedAt), desc(news.id))
      .limit(limit);
  }
};
