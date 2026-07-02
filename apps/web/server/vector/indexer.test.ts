import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IndexerSettings } from "./indexer";

vi.mock("../ai/providers", () => ({
  createEmbeddingProvider: vi.fn()
}));

vi.mock("../repositories/article-embeddings.repo", () => ({
  articleEmbeddingsRepo: {
    upsert: vi.fn(),
    deleteByArticleId: vi.fn()
  }
}));

vi.mock("./qdrant", () => ({
  ensureArticleCollection: vi.fn(),
  getQdrantRuntimeSettings: vi.fn(),
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

const baseSettings: IndexerSettings = {
  ai: {
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
  },
  qdrant: {
    enabled: true,
    url: "http://127.0.0.1:6333",
    apiKey: "",
    timeoutMs: 3000,
    articleCollection: "articles",
    vectorSize: 1024,
    distance: "Cosine"
  },
  vectorEngine: "pgvector",
  vectorDualWrite: false
};

describe("vector indexer dual-write", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("writes only pgvector when engine is pgvector and dual-write is disabled", async () => {
    const { createEmbeddingProvider } = await import("../ai/providers");
    const { articleEmbeddingsRepo } = await import("../repositories/article-embeddings.repo");
    const { qdrantRequest } = await import("./qdrant");
    const { upsertArticleEmbedding } = await import("./indexer");

    vi.mocked(createEmbeddingProvider).mockReturnValue({
      provider: "ollama",
      model: "bge-m3",
      embed: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]])
    } as any);

    vi.mocked(articleEmbeddingsRepo.upsert).mockResolvedValue({ skipped: false, articleId: 10 } as any);

    const result = await upsertArticleEmbedding(
      {
        id: 10,
        title: "A",
        summary: "B",
        content: "C",
        categorySlug: "tech"
      },
      baseSettings
    );

    expect(articleEmbeddingsRepo.upsert).toHaveBeenCalledTimes(1);
    expect(qdrantRequest).not.toHaveBeenCalled();
    expect(result).toMatchObject({ wrotePgvector: true, wroteQdrant: false });
  });

  it("writes qdrant and pgvector when dual-write is enabled", async () => {
    const { createEmbeddingProvider } = await import("../ai/providers");
    const { articleEmbeddingsRepo } = await import("../repositories/article-embeddings.repo");
    const { qdrantRequest, ensureArticleCollection } = await import("./qdrant");
    const { upsertArticleEmbedding } = await import("./indexer");

    vi.mocked(createEmbeddingProvider).mockReturnValue({
      provider: "ollama",
      model: "bge-m3",
      embed: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3]])
    } as any);

    vi.mocked(ensureArticleCollection).mockResolvedValue(undefined as any);
    vi.mocked(qdrantRequest).mockResolvedValue({ ok: true } as any);
    vi.mocked(articleEmbeddingsRepo.upsert).mockResolvedValue({ skipped: false, articleId: 20 } as any);

    const result = await upsertArticleEmbedding(
      {
        id: 20,
        title: "A",
        summary: "B",
        content: "C",
        categorySlug: "tech"
      },
      {
        ...baseSettings,
        vectorEngine: "qdrant",
        vectorDualWrite: true
      }
    );

    expect(ensureArticleCollection).toHaveBeenCalledTimes(1);
    expect(qdrantRequest).toHaveBeenCalledTimes(1);
    expect(articleEmbeddingsRepo.upsert).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ wrotePgvector: true, wroteQdrant: true });
  });

  it("deletes in both stores when dual-write is enabled", async () => {
    const { articleEmbeddingsRepo } = await import("../repositories/article-embeddings.repo");
    const { qdrantRequest } = await import("./qdrant");
    const { deleteArticleEmbedding } = await import("./indexer");

    vi.mocked(qdrantRequest).mockResolvedValue({ ok: true } as any);
    vi.mocked(articleEmbeddingsRepo.deleteByArticleId).mockResolvedValue({ skipped: false, articleId: 30 } as any);

    const result = await deleteArticleEmbedding(30, {
      ...baseSettings,
      vectorEngine: "qdrant",
      vectorDualWrite: true
    });

    expect(qdrantRequest).toHaveBeenCalledTimes(1);
    expect(articleEmbeddingsRepo.deleteByArticleId).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ wrotePgvector: true, wroteQdrant: true });
  });
});
