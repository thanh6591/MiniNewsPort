import type { ConsumeOptions, JobContext, JobHandler, QueueAdapter } from "./types";

type Job<T> = {
  id: string;
  data: T;
  attempt: number;
};

type QueueState = {
  pending: Job<unknown>[];
  failed: Job<unknown>[];
  handler?: JobHandler<unknown>;
  opts?: ConsumeOptions;
  inFlight: number;
};

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `${Date.now().toString(36)}-${idCounter}`;
}

export class InProcessQueueAdapter implements QueueAdapter {
  readonly kind = "in-process" as const;
  private queues = new Map<string, QueueState>();
  private closed = false;

  private getOrCreate(name: string): QueueState {
    let q = this.queues.get(name);
    if (!q) {
      q = { pending: [], failed: [], inFlight: 0 };
      this.queues.set(name, q);
    }
    return q;
  }

  async publish<T>(queue: string, data: T): Promise<string> {
    if (this.closed) {
      throw new Error("Queue adapter is closed");
    }
    const job: Job<T> = { id: nextId(), data, attempt: 0 };
    const state = this.getOrCreate(queue);
    state.pending.push(job as Job<unknown>);
    this.scheduleDrain(queue);
    return job.id;
  }

  consume<T>(queue: string, opts: ConsumeOptions, handler: JobHandler<T>) {
    const state = this.getOrCreate(queue);
    state.handler = handler as JobHandler<unknown>;
    state.opts = opts;
    this.scheduleDrain(queue);
    return {
      close: async () => {
        state.handler = undefined;
        state.opts = undefined;
      }
    };
  }

  async drain(queue: string): Promise<void> {
    const state = this.queues.get(queue);
    if (!state) return;
    while (state.pending.length > 0 || state.inFlight > 0) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }

  async size(queue: string): Promise<{ pending: number; failed: number }> {
    const state = this.queues.get(queue);
    if (!state) return { pending: 0, failed: 0 };
    return { pending: state.pending.length, failed: state.failed.length };
  }

  async close(): Promise<void> {
    this.closed = true;
    this.queues.clear();
  }

  private scheduleDrain(queue: string) {
    if (this.closed) return;
    setImmediate(() => {
      void this.tick(queue);
    });
  }

  private async tick(queue: string) {
    const state = this.queues.get(queue);
    if (!state || !state.handler || !state.opts) return;
    const concurrency = state.opts.concurrency ?? 1;

    while (state.inFlight < concurrency && state.pending.length > 0) {
      const job = state.pending.shift()!;
      state.inFlight += 1;
      void this.runJob(queue, state, job);
    }
  }

  private async runJob(queue: string, state: QueueState, job: Job<unknown>) {
    job.attempt += 1;
    const ctx: JobContext = { id: job.id, attempt: job.attempt };
    try {
      await state.handler!(job.data, ctx);
    } catch (err) {
      const maxAttempts = state.opts?.maxAttempts ?? 1;
      const retryable = (err as { retryable?: boolean })?.retryable !== false;
      if (retryable && job.attempt < maxAttempts) {
        const initial = state.opts?.backoffMs ?? 1000;
        const delay =
          state.opts?.backoffType === "exponential"
            ? initial * Math.pow(2, job.attempt - 1)
            : initial;
        setTimeout(() => {
          state.pending.push(job);
          this.scheduleDrain(queue);
        }, delay);
      } else {
        state.failed.push(job);
        const dlq = state.opts?.deadLetterQueue;
        if (dlq) {
          await this.publish(dlq, {
            originalQueue: queue,
            reason: (err as Error)?.message ?? "Unknown error",
            failedAt: new Date().toISOString(),
            data: job.data
          });
        }
      }
    } finally {
      state.inFlight -= 1;
      this.scheduleDrain(queue);
    }
  }
}
