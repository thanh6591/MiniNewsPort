import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../db/client", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    transaction: vi.fn(),
    update: vi.fn()
  }
}));

vi.mock("../repositories/import.repo", () => ({
  importRepo: {
    createBatch: vi.fn(),
    findBatchById: vi.fn(),
    findItemsByBatchId: vi.fn(),
    statusCounts: vi.fn(),
    findItemsByIds: vi.fn()
  }
}));

vi.mock("../queue", () => ({
  getQueueAdapter: vi.fn()
}));

import { importService } from "./import.service";
import { db } from "../db/client";
import { importRepo } from "../repositories/import.repo";
import { getQueueAdapter } from "../queue";
import { ValidationError, CategoryNotFoundError, NotFoundError } from "./errors";

function mockCategoryFound(id: number) {
  // db.select().from().where().limit() returns rows
  const limit = vi.fn().mockResolvedValue([{ id }]);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (db.select as any).mockReturnValue({ from });
}

function mockCategoryMissing() {
  const limit = vi.fn().mockResolvedValue([]);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (db.select as any).mockReturnValue({ from });
}

describe("importService.submitBulk", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects empty urls list", async () => {
    await expect(importService.submitBulk({ urls: [], categoryId: 1 })).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects over 100 urls", async () => {
    const urls = Array.from({ length: 101 }, (_, i) => `https://e.com/${i}`);
    await expect(importService.submitBulk({ urls, categoryId: 1 })).rejects.toBeInstanceOf(ValidationError);
  });

  it("throws CategoryNotFoundError when category missing", async () => {
    mockCategoryMissing();
    await expect(
      importService.submitBulk({ urls: ["https://e.com/a"], categoryId: 99 })
    ).rejects.toBeInstanceOf(CategoryNotFoundError);
  });

  it("deduplicates URLs in submission and skips invalid ones", async () => {
    mockCategoryFound(1);
    vi.mocked(importRepo.createBatch).mockResolvedValue({
      batch: { id: 7, categoryId: 1, totalCount: 1, createdAt: new Date(), updatedAt: new Date() } as never,
      items: [
        {
          id: 100,
          batchId: 7,
          sourceUrl: "https://e.com/a",
          sourceDomain: "e.com",
          status: "PENDING",
          attempts: 0,
          failureReason: null,
          newsId: null,
          startedAt: null,
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        } as never
      ]
    });
    const publish = vi.fn().mockResolvedValue("job-id");
    vi.mocked(getQueueAdapter).mockResolvedValue({ publish, kind: "in-process" } as never);

    const result = await importService.submitBulk({
      urls: ["https://e.com/a", "https://e.com/a", "not-a-url"],
      categoryId: 1
    });

    expect(result.batchId).toBe(7);
    expect(result.acceptedCount).toBe(1);
    expect(result.skippedCount).toBe(2);
    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith(
      "news-scraping-queue",
      expect.objectContaining({ importItemId: 100, batchId: 7, categoryId: 1 })
    );
  });

  it("throws ValidationError when no valid URLs remain", async () => {
    mockCategoryFound(1);
    await expect(
      importService.submitBulk({ urls: ["ftp://x", "not-a-url"], categoryId: 1 })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("importService.getBatchProgress", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns aggregated counts and items", async () => {
    vi.mocked(importRepo.findBatchById).mockResolvedValue({
      id: 1,
      categoryId: 2,
      totalCount: 3,
      createdAt: new Date(),
      updatedAt: new Date()
    } as never);
    vi.mocked(importRepo.findItemsByBatchId).mockResolvedValue([
      { id: 1, batchId: 1, sourceUrl: "u1", status: "PUBLISHED", attempts: 1, failureReason: null, newsId: 50, createdAt: new Date(), updatedAt: new Date(), startedAt: null, completedAt: null } as never
    ]);
    vi.mocked(importRepo.statusCounts).mockResolvedValue({ PENDING: 1, PROCESSING: 0, PUBLISHED: 1, FAILED: 1 });

    const out = await importService.getBatchProgress(1);
    expect(out.pendingCount).toBe(1);
    expect(out.publishedCount).toBe(1);
    expect(out.failedCount).toBe(1);
    expect(out.items).toHaveLength(1);
  });

  it("throws NotFoundError when batch missing", async () => {
    vi.mocked(importRepo.findBatchById).mockResolvedValue(null);
    await expect(importService.getBatchProgress(999)).rejects.toBeInstanceOf(NotFoundError);
  });
});
