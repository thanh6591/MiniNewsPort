import { type AiRuntimeSettings, withOllamaRequestTimeout } from "~/server/ai/runtime";

export type EmbeddingProviderName = "ollama";

export interface EmbeddingProvider {
  readonly provider: EmbeddingProviderName;
  readonly model: string;
  embed(input: string[]): Promise<number[][]>;
}

class OllamaEmbeddingProvider implements EmbeddingProvider {
  readonly provider: EmbeddingProviderName = "ollama";
  readonly model: string;

  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs: number,
    model: string
  ) {
    this.model = model;
  }

  async embed(input: string[]) {
    if (input.length === 0) {
      return [];
    }

    const { signal, cleanup } = withOllamaRequestTimeout(this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}/api/embed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: this.model,
          input
        }),
        signal
      });

      if (!response.ok) {
        throw new Error(`Ollama embedding request failed with HTTP ${response.status}`);
      }

      const payload = await response.json() as { embeddings?: number[][] };
      if (!Array.isArray(payload.embeddings)) {
        throw new Error("Ollama embedding response did not contain embeddings");
      }

      return payload.embeddings;
    } finally {
      cleanup();
    }
  }
}

export function createEmbeddingProvider(settings: AiRuntimeSettings, modelOverride?: string): EmbeddingProvider {
  switch (settings.embeddingProvider) {
    case "ollama":
    default:
      return new OllamaEmbeddingProvider(
        settings.baseUrl,
        settings.timeoutMs,
        modelOverride || settings.embeddingModel
      );
  }
}