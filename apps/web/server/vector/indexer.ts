import { createEmbeddingProvider } from "../ai/providers";
import { getAiRuntimeSettings, type AiRuntimeSettings } from "../ai/runtime";
import { buildArticleEmbeddingPayload } from "./article-embedding-payload";
import {
  ensureArticleCollection,
  getQdrantRuntimeSettings,
  qdrantRequest,
  type QdrantRuntimeSettings
} from "./qdrant";

export type IndexableArticle = {
  id: number;
  title: string;
  summary: string;
  content: string;
  publishedAt?: Date | null;
  categorySlug?: string | null;
  source?: string | null;
};

function getRuntimeSettings() {
  const config = useRuntimeConfig();
  return {
    ai: getAiRuntimeSettings(config),
    qdrant: getQdrantRuntimeSettings(config)
  };
}

export type IndexerSettings = {
  ai: AiRuntimeSettings;
  qdrant: QdrantRuntimeSettings;
};

type RuntimeConfigInput = Record<string, string | undefined>;

export function resolveIndexerSettings(config: RuntimeConfigInput): IndexerSettings {
  return {
    ai: getAiRuntimeSettings(config),
    qdrant: getQdrantRuntimeSettings(config)
  };
}

export async function upsertArticleEmbedding(article: IndexableArticle, settings?: IndexerSettings) {
  const activeSettings = settings || getRuntimeSettings();
  const { ai, qdrant } = activeSettings;
  if (!qdrant.enabled || !ai.enabled) {
    return { skipped: true as const };
  }

  await ensureArticleCollection(qdrant);

  const embeddingProvider = createEmbeddingProvider(ai);
  const payload = buildArticleEmbeddingPayload({
    articleId: article.id,
    title: article.title,
    summary: article.summary,
    description: article.content,
    source: article.source || "internal",
    category: article.categorySlug || "uncategorized",
    publishedAt: article.publishedAt,
    indexVersion: 1
  });

  const embeddings = await embeddingProvider.embed([payload.text]);
  const vector = embeddings[0];
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error("Embedding provider returned an empty vector");
  }

  const response = await qdrantRequest(qdrant, `/collections/${qdrant.articleCollection}/points`, {
    method: "PUT",
    body: JSON.stringify({
      points: [
        {
          id: article.id,
          vector,
          payload: payload.payload
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Qdrant upsert failed with HTTP ${response.status}`);
  }

  return {
    skipped: false as const,
    articleId: article.id,
    vectorSize: vector.length
  };
}

export async function deleteArticleEmbedding(articleId: number, settings?: IndexerSettings) {
  const activeSettings = settings || getRuntimeSettings();
  const { qdrant } = activeSettings;
  if (!qdrant.enabled) {
    return { skipped: true as const };
  }

  const response = await qdrantRequest(qdrant, `/collections/${qdrant.articleCollection}/points/delete`, {
    method: "POST",
    body: JSON.stringify({
      points: [articleId]
    })
  });

  if (!response.ok) {
    throw new Error(`Qdrant delete failed with HTTP ${response.status}`);
  }

  return {
    skipped: false as const,
    articleId
  };
}