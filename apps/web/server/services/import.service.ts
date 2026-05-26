import { eq, inArray } from "drizzle-orm";
import { db } from "../db/client";
import { categories } from "../db/schema";
import { importRepo } from "../repositories/import.repo";
import { getQueueAdapter } from "../queue";
import { QUEUE_NAMES, type ScrapeJobData } from "../queue/types";
import { extractDomain, normalizeUrl } from "../utils/url";
import { CategoryNotFoundError, NotFoundError, ValidationError } from "./errors";

export type BulkImportSubmitInput = {
  urls: string[];
  categoryId: number;
};

export type BulkImportResult = {
  batchId: number;
  acceptedCount: number;
  skippedCount: number;
};

export const importService = {
  async submitBulk(input: BulkImportSubmitInput): Promise<BulkImportResult> {
    if (!Array.isArray(input.urls) || input.urls.length === 0) {
      throw new ValidationError("urls is required", [{ field: "body.urls", message: "At least one URL is required" }]);
    }
    if (input.urls.length > 100) {
      throw new ValidationError("Too many URLs", [{ field: "body.urls", message: "Maximum 100 URLs per submission" }]);
    }

    const category = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, input.categoryId))
      .limit(1);
    if (!category.length) {
      throw new CategoryNotFoundError(input.categoryId);
    }

    const seen = new Set<string>();
    const items: Array<{ sourceUrl: string; sourceDomain: string }> = [];
    const skippedReasons: string[] = [];

    for (const raw of input.urls) {
      const normalized = normalizeUrl(raw);
      if (!normalized) {
        skippedReasons.push(`${raw}: invalid URL`);
        continue;
      }
      if (seen.has(normalized)) {
        skippedReasons.push(`${normalized}: duplicate in submission`);
        continue;
      }
      const domain = extractDomain(normalized);
      if (!domain) {
        skippedReasons.push(`${raw}: domain not extractable`);
        continue;
      }
      seen.add(normalized);
      items.push({ sourceUrl: normalized, sourceDomain: domain });
    }

    if (items.length === 0) {
      throw new ValidationError("No valid URLs in submission", [
        { field: "body.urls", message: skippedReasons.join("; ") || "All URLs were invalid" }
      ]);
    }

    const { batch, items: persisted } = await importRepo.createBatch({
      categoryId: input.categoryId,
      items
    });

    const queue = await getQueueAdapter();
    for (const item of persisted) {
      const data: ScrapeJobData = {
        importItemId: item.id,
        batchId: batch.id,
        categoryId: input.categoryId,
        sourceUrl: item.sourceUrl,
        sourceDomain: item.sourceDomain
      };
      await queue.publish(QUEUE_NAMES.scraping, data);
    }

    return {
      batchId: batch.id,
      acceptedCount: persisted.length,
      skippedCount: input.urls.length - persisted.length
    };
  },

  async getBatchProgress(batchId: number) {
    const batch = await importRepo.findBatchById(batchId);
    if (!batch) {
      throw new NotFoundError("Import batch", String(batchId));
    }
    const items = await importRepo.findItemsByBatchId(batchId);
    const counts = await importRepo.statusCounts(batchId);
    return {
      id: batch.id,
      categoryId: batch.categoryId,
      totalCount: batch.totalCount,
      pendingCount: counts.PENDING,
      processingCount: counts.PROCESSING,
      publishedCount: counts.PUBLISHED,
      failedCount: counts.FAILED,
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
      items: items.map((item) => ({
        id: item.id,
        batchId: item.batchId,
        sourceUrl: item.sourceUrl,
        status: item.status,
        attempts: item.attempts,
        failureReason: item.failureReason,
        newsId: item.newsId,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        startedAt: item.startedAt,
        completedAt: item.completedAt
      }))
    };
  },

  async resolveItemsByIds(ids: number[]) {
    return importRepo.findItemsByIds(ids);
  }
};
