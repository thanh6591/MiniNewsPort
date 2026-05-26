import type { ConsumeOptions, JobHandler, QueueAdapter } from "./types";

type BullModule = typeof import("bullmq");

let cachedModule: BullModule | null = null;
async function loadBullMQ(): Promise<BullModule> {
  if (!cachedModule) {
    cachedModule = await import("bullmq");
  }
  return cachedModule;
}

export class BullMqQueueAdapter implements QueueAdapter {
  readonly kind = "bullmq" as const;
  private connection: { host: string; port: number; username?: string; password?: string; db?: number };
  private queues = new Map<string, import("bullmq").Queue>();
  private workers: Array<import("bullmq").Worker> = [];

  constructor(redisUrl: string) {
    const url = new URL(redisUrl);
    const port = url.port ? Number(url.port) : 6379;
    const db = url.pathname && url.pathname !== "/" ? Number(url.pathname.replace("/", "")) : 0;
    this.connection = {
      host: url.hostname,
      port,
      ...(url.username ? { username: url.username } : {}),
      ...(url.password ? { password: url.password } : {}),
      ...(Number.isFinite(db) ? { db } : {})
    };
  }

  private async getQueue(name: string) {
    let q = this.queues.get(name);
    if (!q) {
      const { Queue } = await loadBullMQ();
      q = new Queue(name, { connection: this.connection });
      this.queues.set(name, q);
    }
    return q;
  }

  async publish<T>(queueName: string, data: T): Promise<string> {
    const q = await this.getQueue(queueName);
    const job = await q.add("job", data, { removeOnComplete: 1000, removeOnFail: 5000 });
    return String(job.id ?? "");
  }

  consume<T>(queueName: string, opts: ConsumeOptions, handler: JobHandler<T>) {
    let worker: import("bullmq").Worker | null = null;
    void loadBullMQ().then(({ Worker }) => {
      worker = new Worker<T>(
        queueName,
        async (job) => {
          await handler(job.data as T, {
            id: String(job.id ?? ""),
            attempt: job.attemptsMade + 1
          });
        },
        {
          connection: this.connection,
          concurrency: opts.concurrency ?? 1
        }
      );
      this.workers.push(worker);

      const maxAttempts = opts.maxAttempts ?? 1;
      const dlq = opts.deadLetterQueue;
      worker.on("failed", async (job, err) => {
        if (!job) return;
        if (job.attemptsMade < maxAttempts && (err as { retryable?: boolean })?.retryable !== false) {
          const initial = opts.backoffMs ?? 1000;
          const delay =
            opts.backoffType === "exponential" ? initial * Math.pow(2, job.attemptsMade) : initial;
          await job.moveToDelayed(Date.now() + delay, job.token ?? "");
          return;
        }
        if (dlq) {
          const dlqQueue = await this.getQueue(dlq);
          await dlqQueue.add("dlq", {
            originalQueue: queueName,
            reason: err?.message ?? "Unknown error",
            failedAt: new Date().toISOString(),
            data: job.data
          });
        }
      });
    });
    return {
      close: async () => {
        if (worker) await worker.close();
      }
    };
  }

  async drain(queueName: string): Promise<void> {
    const q = await this.getQueue(queueName);
    await q.drain(true);
  }

  async size(queueName: string): Promise<{ pending: number; failed: number }> {
    const q = await this.getQueue(queueName);
    const counts = await q.getJobCounts("waiting", "delayed", "failed");
    return {
      pending: (counts.waiting ?? 0) + (counts.delayed ?? 0),
      failed: counts.failed ?? 0
    };
  }

  async close(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.close()));
    await Promise.all([...this.queues.values()].map((q) => q.close()));
    this.workers = [];
    this.queues.clear();
  }
}
