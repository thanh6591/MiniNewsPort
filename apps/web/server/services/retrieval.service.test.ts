import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../repositories/article-embeddings.repo", () => ({
  articleEmbeddingsRepo: {
    topKSimilar: vi.fn()
  }
}));

vi.mock("../utils/telemetry", () => ({
  logTelemetry: vi.fn()
}));

vi.mock("../vector/qdrant", () => ({
  getQdrantRuntimeSettings: vi.fn(() => ({
    enabled: true,
    url: "http://127.0.0.1:6333",
    apiKey: "",
    timeoutMs: 3000,
    articleCollection: "articles",
    vectorSize: 1024,
    distance: "Cosine"
  })),
  qdrantRequest: vi.fn(),
  ARTICLE_PAYLOAD_FIELDS: {
    articleId: "articleId",
    title: "title",
    summary: "summary",
    category: "category",
    source: "source",
    language: "language",
    publishedAt: "publishedAt",
    indexVersion: "indexVersion"
  }
}));

vi.mock("../ai/runtime", () => ({
  getAiRuntimeSettings: vi.fn(() => ({
    enabled: true,
    baseUrl: "http://127.0.0.1:11434",
    timeoutMs: 3000,
    llmProvider: "ollama",
    embeddingProvider: "ollama",
    llmPrimaryModel: "qwen2.5:7b-instruct",
    llmFallbackModel: "qwen2.5:3b-instruct",
    embeddingModel: "bge-m3",
    rerankerEnabled: false,
    rerankerModel: "bge-reranker-v2-m3"
  }))
}));

vi.mock("../ai/reranker", () => ({
  rerankCandidates: vi.fn(async (_query: string, items: any[]) => items)
}));

describe("PGVectorRetrievalService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps similar filter semantics to repository query", async () => {
    const { articleEmbeddingsRepo } = await import("../repositories/article-embeddings.repo");
    const { PGVectorRetrievalService } = await import("./retrieval.service");

    vi.mocked(articleEmbeddingsRepo.topKSimilar).mockResolvedValue([
      {
        articleId: 5,
        score: 0.91,
        categorySlug: "tech",
        indexVersion: 1,
        publishedAt: "2026-06-30T10:00:00.000Z",
        source: "internal",
        language: "vi"
      }
    ]);

    const service = new PGVectorRetrievalService();
    const result = await service.similar({
      articleVector: [0.1, 0.2],
      limit: 4,
      category: "tech",
      excludeArticleIds: [1, 2]
    });

    expect(articleEmbeddingsRepo.topKSimilar).toHaveBeenCalledWith({
      queryVector: [0.1, 0.2],
      limit: 4,
      categorySlug: "tech",
      excludeArticleIds: [1, 2]
    });

    expect(result[0]).toMatchObject({
      articleId: 5,
      score: 0.91,
      category: "tech"
    });
  });

  it("maps personalized category allow-list semantics", async () => {
    const { articleEmbeddingsRepo } = await import("../repositories/article-embeddings.repo");
    const { PGVectorRetrievalService } = await import("./retrieval.service");

    vi.mocked(articleEmbeddingsRepo.topKSimilar).mockResolvedValue([]);

    const service = new PGVectorRetrievalService();
    await service.recommendForUser({
      userVector: [0.2, 0.3],
      limit: 6,
      categories: ["tech", "science"],
      excludeArticleIds: [10]
    });

    expect(articleEmbeddingsRepo.topKSimilar).toHaveBeenCalledWith({
      queryVector: [0.2, 0.3],
      limit: 6,
      categorySlugs: ["tech", "science"],
      excludeArticleIds: [10]
    });
  });

  it("creates pgvector engine from runtime config", async () => {
    const { createRetrievalServiceFromRuntimeConfig } = await import("./retrieval.service");
    const { articleEmbeddingsRepo } = await import("../repositories/article-embeddings.repo");
    const { qdrantRequest } = await import("../vector/qdrant");

    vi.mocked(articleEmbeddingsRepo.topKSimilar).mockResolvedValue([]);
    const service = createRetrievalServiceFromRuntimeConfig({ vectorEngine: "pgvector" } as any);
    expect(service).toBeDefined();

    vi.mocked(qdrantRequest).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ result: [] })
    } as any);

    await service.search({ queryVector: [0.1, 0.2], limit: 3 });
    expect(qdrantRequest).not.toHaveBeenCalled();
  });

  it("emits shadow-read telemetry when enabled", async () => {
    const { articleEmbeddingsRepo } = await import("../repositories/article-embeddings.repo");
    const { qdrantRequest } = await import("../vector/qdrant");
    const { logTelemetry } = await import("../utils/telemetry");
    const { createRetrievalServiceFromRuntimeConfig } = await import("./retrieval.service");

    vi.mocked(articleEmbeddingsRepo.topKSimilar).mockResolvedValue([
      {
        articleId: 7,
        score: 0.91,
        categorySlug: "tech",
        indexVersion: 1,
        publishedAt: "2026-06-30T10:00:00.000Z",
        source: "internal",
        language: "vi"
      }
    ]);

    vi.mocked(qdrantRequest).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        result: [
          {
            score: 0.87,
            payload: {
              articleId: 7,
              category: "tech",
              source: "internal",
              language: "vi",
              publishedAt: "2026-06-30T10:00:00.000Z",
              indexVersion: 1
            }
          }
        ]
      })
    } as any);

    const service = createRetrievalServiceFromRuntimeConfig({
      vectorEngine: "pgvector",
      vectorShadowRead: "1",
      qdrantArticleCollection: "articles"
    } as any);

    await service.search({ queryVector: [0.1, 0.2], limit: 3 });

    expect(logTelemetry).toHaveBeenCalledWith(
      "vector_shadow_read",
      expect.objectContaining({
        operation: "search",
        primaryEngine: "pgvector",
        shadowEngine: "qdrant",
        overlapAtK: 1
      })
    );
  });

  it("always returns primary engine results when shadow diverges", async () => {
    const { articleEmbeddingsRepo } = await import("../repositories/article-embeddings.repo");
    const { qdrantRequest } = await import("../vector/qdrant");
    const { createRetrievalServiceFromRuntimeConfig } = await import("./retrieval.service");

    vi.mocked(articleEmbeddingsRepo.topKSimilar).mockResolvedValue([
      {
        articleId: 101,
        score: 0.99,
        categorySlug: "tech",
        indexVersion: 1,
        publishedAt: "2026-07-02T10:00:00.000Z",
        source: "internal",
        language: "vi"
      }
    ]);

    vi.mocked(qdrantRequest).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        result: [
          {
            score: 0.77,
            payload: {
              articleId: 202,
              category: "science"
            }
          }
        ]
      })
    } as any);

    const service = createRetrievalServiceFromRuntimeConfig({
      vectorEngine: "pgvector",
      vectorShadowRead: "1",
      qdrantArticleCollection: "articles"
    } as any);

    const result = await service.search({ queryVector: [0.2, 0.3], limit: 3 });
    expect(result.map((item) => item.articleId)).toEqual([101]);
  });
});
