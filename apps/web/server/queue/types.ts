export type JobContext = {
  id: string;
  attempt: number;
};

export type JobHandler<T> = (data: T, ctx: JobContext) => Promise<void>;

export type ConsumeOptions = {
  maxAttempts?: number;
  backoffMs?: number;
  backoffType?: "exponential" | "fixed";
  deadLetterQueue?: string;
  concurrency?: number;
};

export interface QueueAdapter {
  readonly kind: "bullmq" | "in-process";
  publish<T>(queue: string, data: T): Promise<string>;
  consume<T>(queue: string, opts: ConsumeOptions, handler: JobHandler<T>): { close: () => Promise<void> };
  drain(queue: string): Promise<void>;
  size(queue: string): Promise<{ pending: number; failed: number }>;
  close(): Promise<void>;
}

export const QUEUE_NAMES = {
  scraping: "news-scraping-queue",
  scrapingDlq: "news-scraping-dlq",
  viewCounter: "view-counter-queue"
} as const;

export const SCRAPING_RETRY = {
  maxAttempts: 3,
  initialBackoffMs: 10_000
} as const;

export type ScrapeJobData = {
  importItemId: number;
  batchId: number;
  categoryId: number;
  sourceUrl: string;
  sourceDomain: string;
};

export type ViewEventData = {
  articleId: number;
  timestamp: string;
};

export type DlqPayload<T> = {
  originalQueue: string;
  reason: string;
  failedAt: string;
  data: T;
};
