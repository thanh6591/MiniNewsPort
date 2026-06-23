import { importRepo } from "../repositories/import.repo";
import { newsRepo } from "../repositories/news.repo";
import { categoryRepo } from "../repositories/category.repo";
import { upsertArticleEmbedding } from "../vector/indexer";
import { logVectorDlq } from "../vector/dlq";
import { getQueueAdapter } from "../queue";
import { QUEUE_NAMES, SCRAPING_RETRY, type ScrapeJobData } from "../queue/types";
import { HttpFetchError, SelectorMismatchError } from "./errors";
import { extractFromHtml, fetchHtml, slugify } from "./scraper";

class DomainSemaphore {
  private inFlight = new Map<string, number>();
  private waiters = new Map<string, Array<() => void>>();
  constructor(private readonly maxPerDomain: number) {}

  async acquire(domain: string): Promise<() => void> {
    const current = this.inFlight.get(domain) ?? 0;
    if (current < this.maxPerDomain) {
      this.inFlight.set(domain, current + 1);
      return () => this.release(domain);
    }
    return new Promise<() => void>((resolve) => {
      const queue = this.waiters.get(domain) ?? [];
      queue.push(() => {
        this.inFlight.set(domain, (this.inFlight.get(domain) ?? 0) + 1);
        resolve(() => this.release(domain));
      });
      this.waiters.set(domain, queue);
    });
  }

  private release(domain: string) {
    const current = this.inFlight.get(domain) ?? 1;
    this.inFlight.set(domain, Math.max(0, current - 1));
    const queue = this.waiters.get(domain);
    if (queue && queue.length > 0) {
      const next = queue.shift()!;
      if (queue.length === 0) this.waiters.delete(domain);
      next();
    }
  }
}

async function uniqueSlug(base: string): Promise<string> {
  let candidate = base;
  let suffix = 2;
  while (await newsRepo.findBySlug(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
    if (suffix > 100) {
      candidate = `${base}-${Date.now()}`;
      break;
    }
  }
  return candidate;
}

export async function startScrapingWorker(opts: { concurrency?: number } = {}) {
  const maxPerDomain = Math.max(1, Number(process.env.SCRAPE_MAX_PER_DOMAIN ?? "2"));
  const userAgent = String(process.env.SCRAPE_USER_AGENT ?? "MiniNewsPortalBot/1.0");
  const concurrency = opts.concurrency ?? Math.max(2, maxPerDomain * 2);
  const semaphore = new DomainSemaphore(maxPerDomain);
  const queue = await getQueueAdapter();
  console.info(`[scraping-worker] starting (concurrency=${concurrency}, maxPerDomain=${maxPerDomain}, adapter=${queue.kind})`);

  return queue.consume<ScrapeJobData>(QUEUE_NAMES.scraping, {
    concurrency,
    maxAttempts: SCRAPING_RETRY.maxAttempts,
    backoffMs: SCRAPING_RETRY.initialBackoffMs,
    backoffType: "exponential",
    deadLetterQueue: QUEUE_NAMES.scrapingDlq
  }, async (data) => {
    const release = await semaphore.acquire(data.sourceDomain);
    try {
      await importRepo.markItemProcessing(data.importItemId);

      const html = await fetchHtml(data.sourceUrl, userAgent);
      const extracted = extractFromHtml(html);

      const slug = await uniqueSlug(slugify(extracted.title));
      const created = await newsRepo.create({
        title: extracted.title,
        slug,
        summary: extracted.summary,
        content: extracted.content,
        imageUrl: extracted.imageUrl,
        status: "PUBLISHED",
        publishedAt: new Date(),
        categoryId: data.categoryId
      });

      if (!created) {
        throw new Error("Failed to insert news row");
      }
      await importRepo.markItemPublished(data.importItemId, created.id);

      // Index embedding (best-effort) so imported articles are searchable via vector search.
      try {
        const category = await categoryRepo.findById(data.categoryId);
        await upsertArticleEmbedding({
          id: created.id,
          title: created.title,
          summary: created.summary,
          content: created.content,
          publishedAt: created.publishedAt,
          categorySlug: category?.slug ?? null
        });
      } catch (indexError) {
        console.error(`[vector-index] failed to upsert embedding for article ${created.id}`, indexError);
        await logVectorDlq({
          operation: "upsert",
          articleId: created.id,
          reason: indexError instanceof Error ? indexError.message : "unknown indexing error",
          context: {
            phase: "scrape-import"
          }
        });
      }
    } catch (err) {
      const error = err as Error & { retryable?: boolean };
      if (error instanceof SelectorMismatchError) {
        await importRepo.markItemFailed(data.importItemId, `Selector mismatch: ${error.message}`);
        const e = new Error(error.message) as Error & { retryable?: boolean };
        e.retryable = false;
        throw e;
      }
      if (error instanceof HttpFetchError && error.retryable === false) {
        await importRepo.markItemFailed(data.importItemId, error.message);
        const e = new Error(error.message) as Error & { retryable?: boolean };
        e.retryable = false;
        throw e;
      }
      throw err;
    } finally {
      release();
    }
  });
}
