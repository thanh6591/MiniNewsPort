import { createEmbeddingProvider } from "./providers";
import { type AiRuntimeSettings } from "./runtime";

export type RerankCandidate = {
  articleId: number;
  score: number;
  title?: string;
  summary?: string;
};

function cosineSimilarity(a: number[], b: number[]) {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function toDocumentText(candidate: RerankCandidate) {
  const title = (candidate.title || "").trim();
  const summary = (candidate.summary || "").trim();

  if (!title && !summary) {
    return "";
  }

  return [title, summary].filter(Boolean).join("\n");
}

export async function rerankCandidates(
  queryText: string,
  candidates: RerankCandidate[],
  settings: AiRuntimeSettings
) {
  if (!settings.rerankerEnabled || candidates.length === 0 || !queryText.trim()) {
    return candidates;
  }

  const documents = candidates.map(toDocumentText);
  if (documents.every((doc) => doc.length === 0)) {
    return candidates;
  }

  const provider = createEmbeddingProvider(settings, settings.rerankerModel);
  const embeddings = await provider.embed([queryText, ...documents]);

  const queryEmbedding = embeddings[0] || [];
  const documentEmbeddings = embeddings.slice(1);

  const scored = candidates.map((candidate, index) => {
    const rerankScore = cosineSimilarity(queryEmbedding, documentEmbeddings[index] || []);
    return {
      ...candidate,
      // Blend original ANN score with rerank score to preserve recall while improving ordering.
      score: candidate.score * 0.4 + rerankScore * 0.6
    };
  });

  return scored.sort((a, b) => b.score - a.score);
}
