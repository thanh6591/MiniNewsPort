import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/client", () => ({
  db: {
    execute: vi.fn()
  }
}));

describe("articleEmbeddingsRepo", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/mini_news_portal";
  });

  it("short-circuits reads on sqlite runtime", async () => {
    process.env.DATABASE_URL = "file:./mini-news-portal.sqlite";

    const { articleEmbeddingsRepo } = await import("./article-embeddings.repo");
    const { db } = await import("../db/client");

    const result = await articleEmbeddingsRepo.topKSimilar({
      queryVector: [0.1, 0.2],
      limit: 3
    });

    expect(result).toEqual([]);
    expect(db.execute).not.toHaveBeenCalled();
  });

  it("maps top-k rows from postgres result", async () => {
    const { articleEmbeddingsRepo } = await import("./article-embeddings.repo");
    const { db } = await import("../db/client");

    vi.mocked(db.execute).mockResolvedValue({
      rows: [
        {
          article_id: 11,
          score: 0.98,
          category_slug: "tech",
          index_version: 1,
          published_at: "2026-06-30T10:00:00.000Z",
          source: "internal",
          language: "vi"
        }
      ]
    } as any);

    const result = await articleEmbeddingsRepo.topKSimilar({
      queryVector: [0.2, 0.3],
      limit: 5,
      categorySlugs: ["tech", "ai"],
      excludeArticleIds: [1, 2]
    });

    expect(db.execute).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      {
        articleId: 11,
        score: 0.98,
        categorySlug: "tech",
        indexVersion: 1,
        publishedAt: "2026-06-30T10:00:00.000Z",
        source: "internal",
        language: "vi"
      }
    ]);
  });

  it("validates vector input for upsert", async () => {
    const { articleEmbeddingsRepo } = await import("./article-embeddings.repo");

    await expect(
      articleEmbeddingsRepo.upsert({
        articleId: 1,
        indexVersion: 1,
        categorySlug: "tech",
        vector: []
      })
    ).rejects.toThrow("vector must be a non-empty numeric array");
  });
});
