import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../repositories/news.repo", () => ({
  newsRepo: {
    findPublishedByIds: vi.fn()
  }
}));

vi.mock("../personalization/store", () => ({
  getRecentUserViewArticleIds: vi.fn()
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

describe("newsService.personalizedRecommendations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (globalThis as any).useRuntimeConfig = vi.fn(() => ({}));
  });

  it("returns cold-start fallback when history is insufficient", async () => {
    const { getRecentUserViewArticleIds } = await import("../personalization/store");
    vi.mocked(getRecentUserViewArticleIds).mockResolvedValue([1, 2]);

    const { newsService } = await import("./news.service");
    const mostViewedSpy = vi.spyOn(newsService, "mostViewedToday").mockResolvedValue([{ newsId: 99 }] as any);

    const result = await newsService.personalizedRecommendations({ userId: "admin:admin", limit: 5 });

    expect(mostViewedSpy).toHaveBeenCalledWith(5);
    expect(result.metadata.fallback).toBe(true);
    expect(result.metadata.reason).toBe("insufficient_history");
  });

  it("returns personalized results when profile and vector retrieval are available", async () => {
    const { getRecentUserViewArticleIds } = await import("../personalization/store");
    const { newsRepo } = await import("../repositories/news.repo");
    const { createEmbeddingProvider } = await import("../ai/providers");
    const { createRetrievalServiceFromRuntimeConfig } = await import("./retrieval.service");

    vi.mocked(getRecentUserViewArticleIds).mockResolvedValue([1, 2, 3, 4]);

    vi.mocked(newsRepo.findPublishedByIds)
      .mockResolvedValueOnce([
        { id: 1, title: "A", summary: "A sum" },
        { id: 2, title: "B", summary: "B sum" },
        { id: 3, title: "C", summary: "C sum" }
      ] as any)
      .mockResolvedValueOnce([{ id: 8 }, { id: 9 }] as any);

    vi.mocked(createEmbeddingProvider).mockReturnValue({
      provider: "ollama",
      model: "bge-m3",
      embed: vi.fn().mockResolvedValue([[0.11, 0.22]])
    } as any);

    vi.mocked(createRetrievalServiceFromRuntimeConfig).mockReturnValue({
      search: vi.fn(),
      similar: vi.fn(),
      retrieveContext: vi.fn(),
      recommendForUser: vi.fn().mockResolvedValue([
        { articleId: 8, score: 0.9 },
        { articleId: 9, score: 0.8 }
      ])
    });

    const { newsService } = await import("./news.service");
    const result = await newsService.personalizedRecommendations({ userId: "admin:admin", limit: 6 });

    expect(result.metadata.personalized).toBe(true);
    expect(result.metadata.fallback).toBe(false);
    expect(result.items).toHaveLength(2);
  });

  it("falls back deterministically when retrieval raises an error", async () => {
    const { getRecentUserViewArticleIds } = await import("../personalization/store");
    const { newsRepo } = await import("../repositories/news.repo");
    const { createEmbeddingProvider } = await import("../ai/providers");
    const { createRetrievalServiceFromRuntimeConfig } = await import("./retrieval.service");

    vi.mocked(getRecentUserViewArticleIds).mockResolvedValue([1, 2, 3, 4]);
    vi.mocked(newsRepo.findPublishedByIds)
      .mockResolvedValueOnce([
        { id: 1, title: "A", summary: "A sum" },
        { id: 2, title: "B", summary: "B sum" },
        { id: 3, title: "C", summary: "C sum" }
      ] as any)
      .mockResolvedValueOnce([{ id: 42 }] as any);

    vi.mocked(createEmbeddingProvider).mockReturnValue({
      provider: "ollama",
      model: "bge-m3",
      embed: vi.fn().mockResolvedValue([[0.11, 0.22]])
    } as any);

    vi.mocked(createRetrievalServiceFromRuntimeConfig).mockReturnValue({
      search: vi.fn(),
      similar: vi.fn(),
      retrieveContext: vi.fn(),
      recommendForUser: vi.fn().mockRejectedValue(new Error("retrieval_down"))
    });

    const { newsService } = await import("./news.service");
    vi.spyOn(newsService, "mostViewedToday").mockResolvedValue([{ newsId: 42 }] as any);

    const result = await newsService.personalizedRecommendations({ userId: "admin:admin", limit: 4 });
    expect(result.metadata.fallback).toBe(true);
    expect(result.metadata.reason).toContain("retrieval_down");
    expect(result.items.map((item: any) => item.id)).toEqual([42]);
  });
});
