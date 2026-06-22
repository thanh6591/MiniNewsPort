import { startDlqNotifierWorker } from "../workers/dlq-notifier.worker";
import { startScrapingWorker } from "../workers/scraping.worker";
import { startViewCounterWorker } from "../workers/view-counter.worker";
import { recoverPendingScrapeJobs } from "../workers/recover-pending-imports";

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
