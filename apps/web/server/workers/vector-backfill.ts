import { and, asc, eq, gt } from "drizzle-orm";
import { db } from "../db/client";
import { categories, news } from "../db/schema";
import { resolveIndexerSettings, upsertArticleEmbedding } from "../vector/indexer";
import { logVectorDlq } from "../vector/dlq";

type BackfillRow = {
  id: number;
  title: string;
  summary: string;
  content: string;
  publishedAt: Date | null;
  categorySlug: string;
};

function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(operation: () => Promise<T>, retries: number, retryDelayMs: number) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt > retries) {
        break;
      }
      await sleep(retryDelayMs);
    }
  }

  throw lastError;
}

async function fetchBatch(lastSeenId: number, batchSize: number) {
  return db
    .select({
      id: news.id,
      title: news.title,
      summary: news.summary,
      content: news.content,
      publishedAt: news.publishedAt,
      categorySlug: categories.slug
    })
    .from(news)
    .innerJoin(categories, eq(categories.id, news.categoryId))
    .where(and(eq(news.status, "PUBLISHED"), gt(news.id, lastSeenId)))
    .orderBy(asc(news.id))
    .limit(batchSize) as Promise<BackfillRow[]>;
}

async function run() {
  const batchSize = toPositiveInt(process.env.VECTOR_BACKFILL_BATCH_SIZE, 100);
  const retries = toPositiveInt(process.env.VECTOR_BACKFILL_RETRIES, 2);
  const retryDelayMs = toPositiveInt(process.env.VECTOR_BACKFILL_RETRY_DELAY_MS, 250);

  const settings = resolveIndexerSettings(process.env);
  let lastSeenId = 0;
  let indexed = 0;
  let failed = 0;
  let skipped = 0;
  let wrotePgvector = 0;
  let wroteQdrant = 0;
  let dualWriteAligned = 0;
  let dualWriteDrift = 0;

  console.info(`[vector-backfill] start batchSize=${batchSize} retries=${retries}`);

  while (true) {
    const rows = await fetchBatch(lastSeenId, batchSize);
    if (rows.length === 0) {
      break;
    }

    for (const row of rows) {
      try {
        const result = await withRetry(
          () =>
            upsertArticleEmbedding(
              {
                id: row.id,
                title: row.title,
                summary: row.summary,
                content: row.content,
                publishedAt: row.publishedAt,
                categorySlug: row.categorySlug
              },
              settings
            ),
          retries,
          retryDelayMs
        );

        if (result.skipped) {
          skipped += 1;
        } else {
          if (result.wrotePgvector) {
            wrotePgvector += 1;
          }

          if (result.wroteQdrant) {
            wroteQdrant += 1;
          }

          if (settings.vectorDualWrite) {
            if (result.wrotePgvector && result.wroteQdrant) {
              dualWriteAligned += 1;
            } else {
              dualWriteDrift += 1;
            }
          }
        }

        indexed += 1;
      } catch (error) {
        failed += 1;
        console.error(`[vector-backfill] failed article=${row.id}`, error);
        await logVectorDlq({
          operation: "backfill",
          articleId: row.id,
          reason: error instanceof Error ? error.message : "unknown backfill error",
          context: {
            retries,
            retryDelayMs
          }
        });
      }
      lastSeenId = row.id;
    }

    console.info(
      `[vector-backfill] progress indexed=${indexed} failed=${failed} skipped=${skipped} lastSeenId=${lastSeenId} ` +
        `coverage(pgvector=${wrotePgvector},qdrant=${wroteQdrant}) parity(aligned=${dualWriteAligned},drift=${dualWriteDrift})`
    );
  }

  console.info(
    `[vector-backfill] done indexed=${indexed} failed=${failed} skipped=${skipped} ` +
      `coverage(pgvector=${wrotePgvector},qdrant=${wroteQdrant}) parity(aligned=${dualWriteAligned},drift=${dualWriteDrift})`
  );
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("[vector-backfill] fatal error", error);
    process.exit(1);
  });
