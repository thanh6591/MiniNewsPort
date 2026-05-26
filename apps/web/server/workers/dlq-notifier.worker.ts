import { getMailer, getAdminEmail } from "../mail/mailer";
import { importRepo } from "../repositories/import.repo";
import { getQueueAdapter } from "../queue";
import { QUEUE_NAMES, type DlqPayload, type ScrapeJobData } from "../queue/types";

type BufferedFailure = {
  url: string;
  reason: string;
  timestamp: string;
};

const FLUSH_INTERVAL_MS = 60_000;
const FLUSH_THRESHOLD = 25;

export async function startDlqNotifierWorker() {
  const adminEmail = getAdminEmail();
  if (!adminEmail) {
    console.warn("[dlq-notifier] ADMIN_EMAIL not configured; DLQ alerts disabled");
  }
  const mailer = getMailer();
  const queue = await getQueueAdapter();
  const buffer: BufferedFailure[] = [];

  const flush = async () => {
    if (buffer.length === 0 || !adminEmail) return;
    const items = buffer.splice(0, buffer.length);
    const subject = `[MNP] ${items.length} bulk-import URL(s) failed`;
    const lines = items.map(
      (f) => `- ${f.url}\n  reason: ${f.reason}\n  failedAt: ${f.timestamp}`
    );
    const text = `The following bulk-import URLs exhausted retries and were sent to the DLQ:\n\n${lines.join("\n\n")}`;
    try {
      await mailer.send({ to: adminEmail, subject, text });
    } catch (err) {
      console.error("[dlq-notifier] failed to send alert email", err);
    }
  };

  const interval = setInterval(() => {
    void flush();
  }, FLUSH_INTERVAL_MS);
  if (typeof interval.unref === "function") interval.unref();

  await queue.consume<DlqPayload<ScrapeJobData>>(
    QUEUE_NAMES.scrapingDlq,
    { concurrency: 1 },
    async (payload) => {
      const reason = payload.reason ?? "unknown";
      const timestamp = payload.failedAt ?? new Date().toISOString();
      buffer.push({ url: payload.data.sourceUrl, reason, timestamp });
      // Also ensure import item is marked FAILED if it wasn't already
      try {
        const current = await importRepo.findItemById(payload.data.importItemId);
        if (current && current.status !== "FAILED") {
          await importRepo.markItemFailed(payload.data.importItemId, reason);
        }
      } catch (err) {
        console.error("[dlq-notifier] failed to mark item failed", err);
      }
      if (buffer.length >= FLUSH_THRESHOLD) {
        await flush();
      }
    }
  );

  return { flush };
}
