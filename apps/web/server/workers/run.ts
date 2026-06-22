import { closeQueueAdapter } from "../queue";
import { startDlqNotifierWorker } from "./dlq-notifier.worker";
import { startScrapingWorker } from "./scraping.worker";
import { startViewCounterWorker } from "./view-counter.worker";
import { recoverPendingScrapeJobs } from "./recover-pending-imports";

async function main() {
  console.info("[worker] starting workers...");
  await Promise.all([
    startScrapingWorker(),
    startViewCounterWorker(),
    startDlqNotifierWorker()
  ]);
  await recoverPendingScrapeJobs();
  console.info("[worker] workers running");

  const shutdown = async (signal: string) => {
    console.info(`[worker] received ${signal}, shutting down`);
    await closeQueueAdapter();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

void main().catch((err) => {
  console.error("[worker] fatal error", err);
  process.exit(1);
});
