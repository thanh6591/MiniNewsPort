import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../repositories/news.repo", () => ({
  newsRepo: {
    findPublishedByIds: vi.fn(),
    searchPublishedByKeyword: vi.fn()
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

describe("newsService.semanticSearch", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (globalThis as any).useRuntimeConfig = vi.fn(() => ({}));
  });

  it("returns vector-ranked results for query-only search", async () => {
    const { createEmbeddingProvider } = await import("../ai/providers");
    const { createRetrievalServiceFromRuntimeConfig } = await import("./retrieval.service");
    const { newsRepo } = await import("../repositories/news.repo");

    vi.mocked(createEmbeddingProvider).mockReturnValue({
      provider: "ollama",
      model: "bge-m3",
      embed: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]])
    } as any);

    const search = vi.fn().mockResolvedValue([
      { articleId: 10, score: 0.92 }
    ]);

    vi.mocked(createRetrievalServiceFromRuntimeConfig).mockReturnValue({
      search,
      similar: vi.fn(),
      recommendForUser: vi.fn(),
      retrieveContext: vi.fn()
    });

    vi.mocked(newsRepo.findPublishedByIds).mockResolvedValue([
      {
        id: 10,
        title: "Semantic Result",
        slug: "semantic-result",
        summary: "Summary",
        content: "Content",
        imageUrl: null,
        status: "PUBLISHED",
        publishedAt: new Date(),
        viewCount: 0,
        categoryId: 1,
        categorySlug: "tech",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ] as any);

    const { newsService } = await import("./news.service");
    const result = await newsService.semanticSearch({
      query: "ai chips",
      limit: 5
    });

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        queryText: "ai chips",
        limit: 5,
        category: undefined
      })
    );

    expect(result.metadata.fallback).toBe(false);
    expect(result.metadata.strategy).toBe("vector");
    expect(result.metadata.scores[0]).toEqual({ articleId: 10, score: 0.92 });
    expect(result.items).toHaveLength(1);
  });

  it("applies category filter using category id mapping", async () => {
    const { createEmbeddingProvider } = await import("../ai/providers");
    const { createRetrievalServiceFromRuntimeConfig } = await import("./retrieval.service");
    const { categoryService } = await import("./category.service");
    const { newsRepo } = await import("../repositories/news.repo");

    vi.mocked(createEmbeddingProvider).mockReturnValue({
      provider: "ollama",
      model: "bge-m3",
      embed: vi.fn().mockResolvedValue([[0.1, 0.2]])
    } as any);

    const search = vi.fn().mockResolvedValue([]);
    vi.mocked(createRetrievalServiceFromRuntimeConfig).mockReturnValue({
      search,
      similar: vi.fn(),
      recommendForUser: vi.fn(),
      retrieveContext: vi.fn()
    });

    vi.mocked(categoryService.getById).mockResolvedValue({ id: 2, slug: "science" } as any);
    vi.mocked(newsRepo.findPublishedByIds).mockResolvedValue([] as any);

    const { newsService } = await import("./news.service");
    await newsService.semanticSearch({
      query: "space mission",
      limit: 10,
      categoryId: 2
    });

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "science"
      })
    );
  });

  it("falls back to keyword search when vector retrieval fails", async () => {
    const { createEmbeddingProvider } = await import("../ai/providers");
    const { newsRepo } = await import("../repositories/news.repo");

    vi.mocked(createEmbeddingProvider).mockReturnValue({
      provider: "ollama",
      model: "bge-m3",
      embed: vi.fn().mockRejectedValue(new Error("embedding unavailable"))
    } as any);

    vi.mocked(newsRepo.searchPublishedByKeyword).mockResolvedValue([
      {
        id: 5,
        title: "Keyword Result",
        slug: "keyword-result",
        summary: "Summary",
        content: "Content",
        imageUrl: null,
        status: "PUBLISHED",
        publishedAt: new Date(),
        viewCount: 0,
        categoryId: 1,
        categorySlug: "tech",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ] as any);

    const { newsService } = await import("./news.service");
    const result = await newsService.semanticSearch({
      query: "fallback query",
      limit: 10,
      categorySlug: "tech"
    });

    expect(newsRepo.searchPublishedByKeyword).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "fallback query",
        limit: 10,
        categorySlug: "tech"
      })
    );

    expect(result.metadata.fallback).toBe(true);
    expect(result.metadata.strategy).toBe("keyword");
    expect(result.metadata.reason).toContain("embedding unavailable");
    expect(result.items).toHaveLength(1);
  });
});
