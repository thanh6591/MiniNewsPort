import { startDlqNotifierWorker } from "../workers/dlq-notifier.worker";
import { startScrapingWorker } from "../workers/scraping.worker";
import { startViewCounterWorker } from "../workers/view-counter.worker";
import { getQueueAdapter } from "../queue";
import { QUEUE_NAMES, type ScrapeJobData } from "../queue/types";
import { db } from "../db/client";
import { importItems, importBatches } from "../db/schema";
import { eq, inArray } from "drizzle-orm";

async function recoverPendingScrapeJobs() {
  const rows = await db
    .select({
      id: importItems.id,
      batchId: importItems.batchId,
      categoryId: importBatches.categoryId,
      sourceUrl: importItems.sourceUrl,
      sourceDomain: importItems.sourceDomain
    })
    .from(importItems)
    .innerJoin(importBatches, eq(importBatches.id, importItems.batchId))
    .where(inArray(importItems.status, ["PENDING", "PROCESSING"]));
  if (rows.length === 0) return;

  // Reset any PROCESSING rows back to PENDING so attempts start cleanly.
  await db
    .update(importItems)
    .set({ status: "PENDING", updatedAt: new Date() })
    .where(eq(importItems.status, "PROCESSING"));

  const queue = await getQueueAdapter();
  for (const row of rows) {
    const data: ScrapeJobData = {
      importItemId: row.id,
      batchId: row.batchId,
      categoryId: row.categoryId,
      sourceUrl: row.sourceUrl,
      sourceDomain: row.sourceDomain
    };
    await queue.publish(QUEUE_NAMES.scraping, data);
  }
  console.info(`[workers] re-enqueued ${rows.length} pending import item(s) for scraping`);
}

export default defineNitroPlugin(async () => {
  const flag = process.env.WORKERS_INPROCESS ?? "";
  if (flag !== "1") {
    console.info(`[workers] in-process workers disabled (WORKERS_INPROCESS="${flag}")`);
    return;
  }
  console.info("[workers] WORKERS_INPROCESS=1 — starting in-process workers");
  try {
    await Promise.all([
      startScrapingWorker(),
      startViewCounterWorker(),
      startDlqNotifierWorker()
    ]);
    await recoverPendingScrapeJobs();
    console.info("[workers] in-process workers started");
  } catch (err) {
    console.error("[workers] failed to start in-process workers", err);
  }
});
