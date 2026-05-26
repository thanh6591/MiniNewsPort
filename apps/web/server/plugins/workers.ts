import { startDlqNotifierWorker } from "../workers/dlq-notifier.worker";
import { startScrapingWorker } from "../workers/scraping.worker";
import { startViewCounterWorker } from "../workers/view-counter.worker";

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig();
  if (String(config.workersInProcess ?? "") !== "1") {
    return;
  }
  try {
    await Promise.all([
      startScrapingWorker(),
      startViewCounterWorker(),
      startDlqNotifierWorker()
    ]);
    console.info("[workers] in-process workers started");
  } catch (err) {
    console.error("[workers] failed to start in-process workers", err);
  }
});
