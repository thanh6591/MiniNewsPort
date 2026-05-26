import { viewCounterService } from "../services/view-counter.service";
import { getQueueAdapter } from "../queue";
import { QUEUE_NAMES, type ViewEventData } from "../queue/types";

export async function startViewCounterWorker(opts: { concurrency?: number } = {}) {
  const queue = await getQueueAdapter();
  return queue.consume<ViewEventData>(
    QUEUE_NAMES.viewCounter,
    { concurrency: opts.concurrency ?? 10, maxAttempts: 3, backoffMs: 1000, backoffType: "fixed" },
    async (event) => {
      await viewCounterService.applyViewEvent(event);
    }
  );
}
