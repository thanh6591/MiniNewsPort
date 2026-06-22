import { eq, inArray } from "drizzle-orm";
import { db } from "../db/client";
import { importBatches, importItems } from "../db/schema";
import { getQueueAdapter } from "../queue";
import { QUEUE_NAMES, type ScrapeJobData } from "../queue/types";

export async function recoverPendingScrapeJobs() {
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

  if (rows.length === 0) {
    return 0;
  }

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
  return rows.length;
}