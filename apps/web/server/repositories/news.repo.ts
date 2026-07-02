import { and, asc, count, desc, eq, inArray, lt, gt, or, sql } from "drizzle-orm";
import { db } from "../db/client";
import { categories, news, type newsStatusEnum } from "../db/schema";

type NewsStatus = (typeof newsStatusEnum.enumValues)[number];

export type NewsListFilters = {
  page: number;
  limit: number;
  categoryId?: number;
  categorySlug?: string;
  status?: NewsStatus;
};

export type NewsCreateInput = {
  title: string;
  slug: string;
  summary: string;
  content: string;
  imageUrl?: string | null;
  status: NewsStatus;
  publishedAt?: Date | null;
  categoryId: number;
};

export type NewsUpdateInput = Partial<NewsCreateInput>;

function buildFilters(filters: Omit<NewsListFilters, "page" | "limit">) {
  const conditions = [];

  if (filters.status) {
    conditions.push(eq(news.status, filters.status));
  }

  if (filters.categoryId) {
    conditions.push(eq(news.categoryId, filters.categoryId));
  }

  if (filters.categorySlug) {
    conditions.push(eq(categories.slug, filters.categorySlug));
  }

  if (conditions.length === 0) {
    return undefined;
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return and(...conditions);
}

export const newsRepo = {
  async list(filters: NewsListFilters) {
    const where = buildFilters(filters);
    const offset = (Math.max(filters.page, 1) - 1) * filters.limit;

    const [{ total }] = await db
      .select({ total: sql<number>`cast(${count(news.id)} as int)` })
      .from(news)
      .leftJoin(categories, eq(categories.id, news.categoryId))
      .where(where);

    const items = await db
      .select({
        id: news.id,
        title: news.title,
        slug: news.slug,
        summary: news.summary,
        content: news.content,
        imageUrl: news.imageUrl,
        status: news.status,
        publishedAt: news.publishedAt,
        viewCount: news.viewCount,
        categoryId: news.categoryId,
        categorySlug: categories.slug,
        createdAt: news.createdAt,
        updatedAt: news.updatedAt
      })
      .from(news)
      .leftJoin(categories, eq(categories.id, news.categoryId))
      .where(where)
      .orderBy(desc(news.publishedAt), desc(news.id))
      .limit(filters.limit)
      .offset(offset);

    return {
      items,
      total
    };
  },

  async findBySlug(slug: string, status?: NewsStatus) {
    const conditions = [eq(news.slug, slug)];
    if (status) {
      conditions.push(eq(news.status, status));
    }

    const where = conditions.length === 1 ? conditions[0] : and(...conditions);
    const rows = await db.select().from(news).where(where).limit(1);
    return rows[0] ?? null;
  },

  async findById(id: number) {
    const rows = await db.select().from(news).where(eq(news.id, id)).limit(1);
    return rows[0] ?? null;
  },

  async findByIds(ids: number[]) {
    if (ids.length === 0) {
      return [];
    }

    const idList = ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
    if (idList.length === 0) {
      return [];
    }

    return db.select().from(news).where(inArray(news.id, idList));
  },

  async findPublishedByIds(ids: number[]) {
    if (ids.length === 0) {
      return [];
    }

    const idList = ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
    if (idList.length === 0) {
      return [];
    }

    const ordering = sql.join(
      idList.map((id, index) => sql`WHEN ${news.id} = ${id} THEN ${index}`),
      sql.raw(" ")
    );

    return db
      .select({
        id: news.id,
        title: news.title,
        slug: news.slug,
        summary: news.summary,
        content: news.content,
        imageUrl: news.imageUrl,
        status: news.status,
        publishedAt: news.publishedAt,
        viewCount: news.viewCount,
        categoryId: news.categoryId,
        categorySlug: categories.slug,
        createdAt: news.createdAt,
        updatedAt: news.updatedAt
      })
      .from(news)
      .leftJoin(categories, eq(categories.id, news.categoryId))
        .where(and(eq(news.status, "PUBLISHED"), inArray(news.id, idList)))
      .orderBy(sql`CASE ${ordering} ELSE ${idList.length} END`);
  },

  async searchPublishedByKeyword(params: { query: string; limit: number; categoryId?: number; categorySlug?: string }) {
    const query = params.query.trim().toLowerCase();
    if (!query) {
      return [];
    }

    const likePattern = `%${query}%`;
    const conditions = [
      eq(news.status, "PUBLISHED"),
      or(
        sql`LOWER(${news.title}) LIKE ${likePattern}`,
        sql`LOWER(${news.summary}) LIKE ${likePattern}`,
        sql`LOWER(${news.content}) LIKE ${likePattern}`
      )
    ];

    if (params.categoryId !== undefined) {
      conditions.push(eq(news.categoryId, params.categoryId));
    }

    if (params.categorySlug !== undefined) {
      conditions.push(eq(categories.slug, params.categorySlug));
    }

    return db
      .select({
        id: news.id,
        title: news.title,
        slug: news.slug,
        summary: news.summary,
        content: news.content,
        imageUrl: news.imageUrl,
        status: news.status,
        publishedAt: news.publishedAt,
        viewCount: news.viewCount,
        categoryId: news.categoryId,
        categorySlug: categories.slug,
        createdAt: news.createdAt,
        updatedAt: news.updatedAt
      })
      .from(news)
      .leftJoin(categories, eq(categories.id, news.categoryId))
      .where(and(...conditions))
      .orderBy(desc(news.publishedAt), desc(news.id))
      .limit(params.limit);
  },

  async findNewerSibling(current: { id: number; publishedAt: Date | null }) {
    if (!current.publishedAt) {
      return null;
    }

    const rows = await db
      .select({ id: news.id, slug: news.slug, publishedAt: news.publishedAt })
      .from(news)
      .where(
        and(
          eq(news.status, "PUBLISHED"),
          or(
            gt(news.publishedAt, current.publishedAt),
            and(eq(news.publishedAt, current.publishedAt), gt(news.id, current.id))
          )
        )
      )
      .orderBy(asc(news.publishedAt), asc(news.id))
      .limit(1);

    return rows[0] ?? null;
  },

  async findOlderSibling(current: { id: number; publishedAt: Date | null }) {
    if (!current.publishedAt) {
      return null;
    }

    const rows = await db
      .select({ id: news.id, slug: news.slug, publishedAt: news.publishedAt })
      .from(news)
      .where(
        and(
          eq(news.status, "PUBLISHED"),
          or(
            lt(news.publishedAt, current.publishedAt),
            and(eq(news.publishedAt, current.publishedAt), lt(news.id, current.id))
          )
        )
      )
      .orderBy(desc(news.publishedAt), desc(news.id))
      .limit(1);

    return rows[0] ?? null;
  },

  async create(input: NewsCreateInput) {
    const rows = await db.insert(news).values(input).returning();
    return rows[0];
  },

  async update(id: number, input: NewsUpdateInput) {
    const rows = await db
      .update(news)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(news.id, id))
      .returning();

    return rows[0] ?? null;
  },

  async delete(id: number) {
    const rows = await db.delete(news).where(eq(news.id, id)).returning({ id: news.id });
    return rows.length > 0;
  },

  async deleteMany(ids: number[]) {
    if (ids.length === 0) {
      return [];
    }

    const idList = ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
    if (idList.length === 0) {
      return [];
    }

    return db.delete(news).where(inArray(news.id, idList)).returning({ id: news.id });
  },

  async updateCategoryMany(ids: number[], categoryId: number) {
    if (ids.length === 0) {
      return [];
    }

    const idList = ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
    if (idList.length === 0) {
      return [];
    }

    return db
      .update(news)
      .set({ categoryId, updatedAt: new Date() })
      .where(inArray(news.id, idList))
      .returning();
  },

  async incrementViewCount(id: number) {
    const rows = await db
      .update(news)
      .set({ viewCount: sql`${news.viewCount} + 1`, updatedAt: new Date() })
      .where(eq(news.id, id))
      .returning();

    return rows[0] ?? null;
  }
};
