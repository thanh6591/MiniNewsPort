type RuntimeConfigLike = {
  ollamaEnabled?: string;
  ollamaBaseUrl?: string;
  ollamaTimeoutMs?: string;
  llmProvider?: string;
  embeddingProvider?: string;
  llmModelPrimary?: string;
  llmModelFallback?: string;
  embeddingModelName?: string;
  rerankerEnabled?: string;
  rerankerModelName?: string;
};

export type AiRuntimeSettings = {
  enabled: boolean;
  baseUrl: string;
  timeoutMs: number;
  llmProvider: "ollama";
  embeddingProvider: "ollama";
  llmPrimaryModel: string;
  llmFallbackModel: string;
  embeddingModel: string;
  rerankerEnabled: boolean;
  rerankerModel: string;
};

function normalizeProvider(_value: string | undefined): "ollama" {
  // Current local baseline supports Ollama only; keep typed so additional providers can be added later.
  return "ollama";
}

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

export function getAiRuntimeSettings(config: RuntimeConfigLike): AiRuntimeSettings {
  return {
    enabled: toBooleanFlag(config.ollamaEnabled, true),
    baseUrl: trimTrailingSlash(config.ollamaBaseUrl || "http://127.0.0.1:11434"),
    timeoutMs: toPositiveNumber(config.ollamaTimeoutMs, 6000),
    llmProvider: normalizeProvider(config.llmProvider),
    embeddingProvider: normalizeProvider(config.embeddingProvider),
    llmPrimaryModel: (config.llmModelPrimary || "qwen2.5:7b-instruct").trim() || "qwen2.5:7b-instruct",
    llmFallbackModel: (config.llmModelFallback || "qwen2.5:3b-instruct").trim() || "qwen2.5:3b-instruct",
    embeddingModel: (config.embeddingModelName || "bge-m3").trim() || "bge-m3",
    rerankerEnabled: toBooleanFlag(config.rerankerEnabled, false),
    rerankerModel: (config.rerankerModelName || "bge-reranker-v2-m3").trim() || "bge-reranker-v2-m3"
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

export async function checkOllamaConnection(settings: AiRuntimeSettings) {
  const startedAt = Date.now();
  const { signal, cleanup } = withTimeoutSignal(settings.timeoutMs);

  try {
    const response = await fetch(`${settings.baseUrl}/api/tags`, {
      method: "GET",
      signal
    });

    if (!response.ok) {
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        statusCode: response.status,
        error: `Ollama responded with HTTP ${response.status}`
      };
    }

    return {
      ok: true,
      latencyMs: Date.now() - startedAt,
      models: {
        llmProvider: settings.llmProvider,
        embeddingProvider: settings.embeddingProvider,
        llmPrimaryModel: settings.llmPrimaryModel,
        llmFallbackModel: settings.llmFallbackModel,
        embeddingModel: settings.embeddingModel,
        rerankerEnabled: settings.rerankerEnabled,
        rerankerModel: settings.rerankerModel
      }
    };
  } catch (error: any) {
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: error?.name === "AbortError" ? "Ollama health check timed out" : (error?.message ?? "Ollama health check failed")
    };
  } finally {
    cleanup();
  }
}

export function withOllamaRequestTimeout(timeoutMs: number) {
  return withTimeoutSignal(timeoutMs);
}