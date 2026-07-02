import { createEmbeddingProvider } from "../ai/providers";
import { articleEmbeddingsRepo } from "../repositories/article-embeddings.repo";
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
  return resolveIndexerSettings({
    aiEnabled: config.ollamaEnabled,
    ollamaBaseUrl: config.ollamaBaseUrl,
    ollamaTimeoutMs: config.ollamaTimeoutMs,
    embeddingProvider: config.embeddingProvider,
    embeddingModelName: config.embeddingModelName,
    qdrantEnabled: config.qdrantEnabled,
    qdrantUrl: config.qdrantUrl,
    qdrantApiKey: config.qdrantApiKey,
    qdrantTimeoutMs: config.qdrantTimeoutMs,
    qdrantArticleCollection: config.qdrantArticleCollection,
    qdrantVectorSize: config.qdrantVectorSize,
    qdrantDistance: config.qdrantDistance,
    vectorEngine: config.vectorEngine,
    vectorDualWrite: config.vectorDualWrite
  });
}

export type IndexerSettings = {
  ai: AiRuntimeSettings;
  qdrant: QdrantRuntimeSettings;
  vectorEngine: "qdrant" | "pgvector";
  vectorDualWrite: boolean;
};

type RuntimeConfigInput = Record<string, string | undefined>;

export function resolveIndexerSettings(config: RuntimeConfigInput): IndexerSettings {
  const vectorEngine = config.vectorEngine === "pgvector" ? "pgvector" : "qdrant";
  const vectorDualWrite = config.vectorDualWrite === "1" || config.vectorDualWrite === "true";

  return {
    ai: getAiRuntimeSettings(config),
    qdrant: getQdrantRuntimeSettings(config),
    vectorEngine,
    vectorDualWrite
  };
}

function shouldWriteQdrant(settings: IndexerSettings) {
  return settings.qdrant.enabled && (settings.vectorEngine === "qdrant" || settings.vectorDualWrite);
}

function shouldWritePgvector(settings: IndexerSettings) {
  return settings.vectorEngine === "pgvector" || settings.vectorDualWrite;
}

async function upsertQdrantPoint(
  articleId: number,
  vector: number[],
  payload: ReturnType<typeof buildArticleEmbeddingPayload>["payload"],
  settings: QdrantRuntimeSettings
) {
  await ensureArticleCollection(settings);
  const response = await qdrantRequest(settings, `/collections/${settings.articleCollection}/points`, {
    method: "PUT",
    body: JSON.stringify({
      points: [
        {
          id: articleId,
          vector,
          payload
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Qdrant upsert failed with HTTP ${response.status}`);
  }
}

async function deleteQdrantPoint(articleId: number, settings: QdrantRuntimeSettings) {
  const response = await qdrantRequest(settings, `/collections/${settings.articleCollection}/points/delete`, {
    method: "POST",
    body: JSON.stringify({
      points: [articleId]
    })
  });

  if (!response.ok) {
    throw new Error(`Qdrant delete failed with HTTP ${response.status}`);
  }
}

export async function upsertArticleEmbedding(article: IndexableArticle, settings?: IndexerSettings) {
  const activeSettings = settings || getRuntimeSettings();
  const { ai } = activeSettings;
  const writeQdrant = shouldWriteQdrant(activeSettings);
  const writePgvector = shouldWritePgvector(activeSettings);

  if ((!writeQdrant && !writePgvector) || !ai.enabled) {
    return { skipped: true as const };
  }

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

  if (writeQdrant) {
    await upsertQdrantPoint(article.id, vector, payload.payload, activeSettings.qdrant);
  }

  if (writePgvector) {
    await articleEmbeddingsRepo.upsert({
      articleId: article.id,
      indexVersion: payload.payload.indexVersion,
      categorySlug: payload.payload.category,
      publishedAt: article.publishedAt ?? null,
      source: payload.payload.source,
      language: payload.payload.language,
      vector
    });
  }

  return {
    skipped: false as const,
    articleId: article.id,
    vectorSize: vector.length,
    wroteQdrant: writeQdrant,
    wrotePgvector: writePgvector
  };
}

export async function deleteArticleEmbedding(articleId: number, settings?: IndexerSettings) {
  const activeSettings = settings || getRuntimeSettings();
  const writeQdrant = shouldWriteQdrant(activeSettings);
  const writePgvector = shouldWritePgvector(activeSettings);

  if (!writeQdrant && !writePgvector) {
    return { skipped: true as const };
  }

  if (writeQdrant) {
    await deleteQdrantPoint(articleId, activeSettings.qdrant);
  }

  if (writePgvector) {
    await articleEmbeddingsRepo.deleteByArticleId(articleId);
  }

  return {
    skipped: false as const,
    articleId,
    wroteQdrant: writeQdrant,
    wrotePgvector: writePgvector
  };
}