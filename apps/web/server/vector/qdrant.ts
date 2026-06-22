type RuntimeConfigLike = {
  qdrantEnabled?: string;
  qdrantUrl?: string;
  qdrantApiKey?: string;
  qdrantTimeoutMs?: string;
  qdrantArticleCollection?: string;
  qdrantVectorSize?: string;
  qdrantDistance?: string;
};

export type QdrantRuntimeSettings = {
  enabled: boolean;
  url: string;
  apiKey: string;
  timeoutMs: number;
  articleCollection: string;
  vectorSize: number;
  distance: "Cosine" | "Dot" | "Euclid" | "Manhattan";
};

export const ARTICLE_PAYLOAD_FIELDS = {
  articleId: "articleId",
  indexVersion: "indexVersion",
  category: "category",
  publishedAt: "publishedAt",
  source: "source",
  language: "language"
} as const;

function toBooleanFlag(value: string | undefined, defaultValue: boolean) {
  if (value === undefined || value === "") return defaultValue;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function toPositiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function trimTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

function normalizeDistance(value: string | undefined): QdrantRuntimeSettings["distance"] {
  if (!value) return "Cosine";
  const normalized = value.trim();
  if (normalized === "Dot" || normalized === "Euclid" || normalized === "Manhattan") {
    return normalized;
  }
  return "Cosine";
}

export function getQdrantRuntimeSettings(config: RuntimeConfigLike): QdrantRuntimeSettings {
  const url = trimTrailingSlash(config.qdrantUrl || "http://127.0.0.1:6333");
  const timeoutMs = toPositiveNumber(config.qdrantTimeoutMs, 3000);
  const vectorSize = toPositiveNumber(config.qdrantVectorSize, 1024);

  return {
    enabled: toBooleanFlag(config.qdrantEnabled, true),
    url,
    apiKey: config.qdrantApiKey || "",
    timeoutMs,
    articleCollection: (config.qdrantArticleCollection || "articles").trim() || "articles",
    vectorSize,
    distance: normalizeDistance(config.qdrantDistance)
  };
}

function withTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer)
  };
}

export async function checkQdrantConnection(settings: QdrantRuntimeSettings) {
  const startedAt = Date.now();
  const { signal, cleanup } = withTimeoutSignal(settings.timeoutMs);

  try {
    const headers: Record<string, string> = {};
    if (settings.apiKey) {
      headers["api-key"] = settings.apiKey;
    }

    const response = await fetch(`${settings.url}/collections`, {
      method: "GET",
      headers,
      signal
    });

    if (!response.ok) {
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        statusCode: response.status,
        error: `Qdrant responded with HTTP ${response.status}`
      };
    }

    return {
      ok: true,
      latencyMs: Date.now() - startedAt
    };
  } catch (error: any) {
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: error?.name === "AbortError" ? "Qdrant health check timed out" : (error?.message ?? "Qdrant health check failed")
    };
  } finally {
    cleanup();
  }
}

export async function qdrantRequest(
  settings: QdrantRuntimeSettings,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const { signal, cleanup } = withTimeoutSignal(settings.timeoutMs);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> | undefined)
    };
    if (settings.apiKey) {
      headers["api-key"] = settings.apiKey;
    }

    return await fetch(`${settings.url}${path}`, {
      ...init,
      headers,
      signal
    });
  } finally {
    cleanup();
  }
}

async function ensurePayloadIndex(
  settings: QdrantRuntimeSettings,
  fieldName: string,
  fieldSchema: "keyword" | "integer" | "datetime"
) {
  const response = await qdrantRequest(settings, `/collections/${settings.articleCollection}/index`, {
    method: "PUT",
    body: JSON.stringify({
      field_name: fieldName,
      field_schema: fieldSchema
    })
  });

  // Qdrant may return 409 if the index already exists.
  if (!response.ok && response.status !== 409) {
    throw new Error(`Failed to ensure Qdrant payload index ${fieldName} (${response.status})`);
  }
}

export async function ensureArticleCollection(settings: QdrantRuntimeSettings) {
  const createResponse = await qdrantRequest(settings, `/collections/${settings.articleCollection}`, {
    method: "PUT",
    body: JSON.stringify({
      vectors: {
        size: settings.vectorSize,
        distance: settings.distance
      }
    })
  });

  // 409 means collection exists; safe to continue with index checks.
  if (!createResponse.ok && createResponse.status !== 409) {
    throw new Error(`Failed to ensure Qdrant collection ${settings.articleCollection} (${createResponse.status})`);
  }

  await Promise.all([
    ensurePayloadIndex(settings, ARTICLE_PAYLOAD_FIELDS.articleId, "integer"),
    ensurePayloadIndex(settings, ARTICLE_PAYLOAD_FIELDS.indexVersion, "integer"),
    ensurePayloadIndex(settings, ARTICLE_PAYLOAD_FIELDS.category, "keyword"),
    ensurePayloadIndex(settings, ARTICLE_PAYLOAD_FIELDS.publishedAt, "datetime"),
    ensurePayloadIndex(settings, ARTICLE_PAYLOAD_FIELDS.source, "keyword"),
    ensurePayloadIndex(settings, ARTICLE_PAYLOAD_FIELDS.language, "keyword")
  ]);
}