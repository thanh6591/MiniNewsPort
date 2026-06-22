import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../repositories/news.repo", () => ({
  newsRepo: {
    findBySlug: vi.fn(),
    findPublishedByIds: vi.fn()
  }
}));

vi.mock("./category.service", () => ({
  categoryService: {
    getById: vi.fn()
  }
}));

vi.mock("../ai/providers", () => ({
  createEmbeddingProvider: vi.fn()
}));

vi.mock("./retrieval.service", () => ({
  createRetrievalServiceFromRuntimeConfig: vi.fn()
}));

vi.mock("../ai/runtime", () => ({
  getAiRuntimeSettings: vi.fn(() => ({
    enabled: true,
    embeddingProvider: "ollama",
    embeddingModel: "bge-m3",
    rerankerEnabled: false,
    rerankerModel: "bge-reranker-v2-m3",
    llmProvider: "ollama",
    llmPrimaryModel: "qwen2.5:7b-instruct",
    llmFallbackModel: "qwen2.5:3b-instruct",
    baseUrl: "http://127.0.0.1:11434",
    timeoutMs: 3000
  }))
}));

describe("newsService.similarRecommendationsBySlug", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (globalThis as any).useRuntimeConfig = vi.fn(() => ({}));
  });

  it("returns in-category and global sections with deduplication", async () => {
    const { newsRepo } = await import("../repositories/news.repo");
    const { categoryService } = await import("./category.service");
    const { createEmbeddingProvider } = await import("../ai/providers");
    const { createRetrievalServiceFromRuntimeConfig } = await import("./retrieval.service");

    vi.mocked(newsRepo.findBySlug).mockResolvedValue({
      id: 1,
      title: "A",
      slug: "a",
      summary: "S",
      content: "C",
      imageUrl: null,
      status: "PUBLISHED",
      publishedAt: new Date(),
      viewCount: 0,
      categoryId: 10,
      createdAt: new Date(),
      updatedAt: new Date()
    } as any);

    vi.mocked(categoryService.getById).mockResolvedValue({ id: 10, slug: "tech" } as any);

    vi.mocked(createEmbeddingProvider).mockReturnValue({
      provider: "ollama",
      model: "bge-m3",
      embed: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]])
    } as any);

    const similar = vi
      .fn()
      .mockResolvedValueOnce([
        { articleId: 2, score: 0.95 },
        { articleId: 3, score: 0.9 }
      ])
      .mockResolvedValueOnce([
        { articleId: 3, score: 0.88 },
        { articleId: 4, score: 0.87 },
        { articleId: 5, score: 0.86 }
      ]);

    vi.mocked(createRetrievalServiceFromRuntimeConfig).mockReturnValue({
      search: vi.fn(),
      similar,
      recommendForUser: vi.fn(),
      retrieveContext: vi.fn()
    });

    vi.mocked(newsRepo.findPublishedByIds)
      .mockResolvedValueOnce([{ id: 2 }, { id: 3 }] as any)
      .mockResolvedValueOnce([{ id: 4 }, { id: 5 }] as any);

    const { newsService } = await import("./news.service");
    const result = await newsService.similarRecommendationsBySlug("a", 2);

    expect(result.sourceArticleId).toBe(1);
    expect(result.categorySlug).toBe("tech");
    expect(result.inCategory.map((item: any) => item.id)).toEqual([2, 3]);
    expect(result.global.map((item: any) => item.id)).toEqual([4, 5]);
  });
});
