import { SQL, sql } from "drizzle-orm";
import { db } from "../db/client";

export type EmbeddingCandidate = {
  articleId: number;
  score: number;
  categorySlug: string;
  indexVersion: number;
  publishedAt: string | null;
  source: string;
  language: string;
};

type UpsertEmbeddingInput = {
  articleId: number;
  indexVersion: number;
  categorySlug: string;
  publishedAt?: Date | null;
  source?: string | null;
  language?: string | null;
  vector: number[];
};

function isSqliteUrl() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  return databaseUrl.startsWith("file:");
}

function toVectorLiteral(vector: number[]) {
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error("vector must be a non-empty numeric array");
  }

  const normalized = vector.map((value) => Number(value));
  if (normalized.some((value) => !Number.isFinite(value))) {
    throw new Error("vector must contain only finite numeric values");
  }

  return `[${normalized.join(",")}]`;
}

function toExcludeSql(ids: number[]) {
  const normalized = ids.filter((id) => Number.isInteger(id) && id > 0);
  if (normalized.length === 0) {
    return null;
  }

  const values = sql.join(normalized.map((id) => sql`${id}`), sql`, `);
  return sql`article_id NOT IN (${values})`;
}

export const articleEmbeddingsRepo = {
  async upsert(input: UpsertEmbeddingInput) {
    if (isSqliteUrl()) {
      return { skipped: true as const, reason: "sqlite_does_not_support_pgvector" };
    }

    const vectorLiteral = toVectorLiteral(input.vector);
    await db.execute(sql`
      INSERT INTO article_embeddings (
        article_id,
        index_version,
        category_slug,
        published_at,
        source,
        language,
        embedding,
        created_at,
        updated_at
      )
      VALUES (
        ${input.articleId},
        ${input.indexVersion},
        ${input.categorySlug},
        ${input.publishedAt ?? null},
        ${input.source ?? "internal"},
        ${input.language ?? "vi"},
        ${vectorLiteral}::vector,
        now(),
        now()
      )
      ON CONFLICT (article_id)
      DO UPDATE SET
        index_version = EXCLUDED.index_version,
        category_slug = EXCLUDED.category_slug,
        published_at = EXCLUDED.published_at,
        source = EXCLUDED.source,
        language = EXCLUDED.language,
        embedding = EXCLUDED.embedding,
        updated_at = now()
    `);

    return { skipped: false as const, articleId: input.articleId };
  },

  async deleteByArticleId(articleId: number) {
    if (isSqliteUrl()) {
      return { skipped: true as const, reason: "sqlite_does_not_support_pgvector" };
    }

    await db.execute(sql`DELETE FROM article_embeddings WHERE article_id = ${articleId}`);
    return { skipped: false as const, articleId };
  },

  async topKSimilar(params: {
    queryVector: number[];
    limit: number;
    categorySlug?: string;
    categorySlugs?: string[];
    excludeArticleIds?: number[];
  }): Promise<EmbeddingCandidate[]> {
    if (isSqliteUrl()) {
      return [];
    }

    const vectorLiteral = toVectorLiteral(params.queryVector);
    const limit = Math.max(1, Math.min(params.limit, 100));

    const whereParts: SQL[] = [];
    if (params.categorySlug) {
      whereParts.push(sql`category_slug = ${params.categorySlug}`);
    }

    if (params.categorySlugs && params.categorySlugs.length > 0) {
      const normalized = params.categorySlugs
        .map((slug) => slug.trim())
        .filter((slug) => slug.length > 0);

      if (normalized.length > 0) {
        const anyCategory = sql.join(normalized.map((slug) => sql`${slug}`), sql`, `);
        whereParts.push(sql`category_slug IN (${anyCategory})`);
      }
    }

    const excludeClause = toExcludeSql(params.excludeArticleIds || []);
    if (excludeClause) {
      whereParts.push(excludeClause);
    }

    const whereSql = whereParts.length > 0
      ? sql`WHERE ${sql.join(whereParts, sql` AND `)}`
      : sql``;

    const result = await db.execute<{
      article_id: number;
      score: number;
      category_slug: string;
      index_version: number;
      published_at: string | null;
      source: string;
      language: string;
    }>(sql`
      SELECT
        article_id,
        (1 - (embedding <=> ${vectorLiteral}::vector))::float8 AS score,
        category_slug,
        index_version,
        published_at,
        source,
        language
      FROM article_embeddings
      ${whereSql}
      ORDER BY embedding <=> ${vectorLiteral}::vector
      LIMIT ${limit}
    `);

    return result.rows.map((row) => ({
      articleId: row.article_id,
      score: Number(row.score),
      categorySlug: row.category_slug,
      indexVersion: row.index_version,
      publishedAt: row.published_at,
      source: row.source,
      language: row.language
    }));
  }
};
