import { getQdrantRuntimeSettings, qdrantRequest, ARTICLE_PAYLOAD_FIELDS, type QdrantRuntimeSettings } from "../vector/qdrant";
import { getAiRuntimeSettings, type AiRuntimeSettings } from "../ai/runtime";
import { articleEmbeddingsRepo } from "../repositories/article-embeddings.repo";
import { rerankCandidates } from "../ai/reranker";
import { logTelemetry } from "../utils/telemetry";

export type RetrievalCandidate = {
  articleId: number;
  score: number;
  title?: string;
  summary?: string;
  category?: string;
  source?: string;
  language?: string;
  publishedAt?: string;
  indexVersion?: number;
};

export type SemanticSearchInput = {
  queryVector: number[];
  queryText?: string;
  limit: number;
  category?: string;
};

export type SimilarArticlesInput = {
  articleVector: number[];
  queryText?: string;
  limit: number;
  category?: string;
  excludeArticleIds?: number[];
};

export type PersonalizedRecommendationsInput = {
  userVector: number[];
  queryText?: string;
  limit: number;
  categories?: string[];
  excludeArticleIds?: number[];
};

export type RetrievalContextInput = {
  queryVector: number[];
  queryText?: string;
  limit: number;
  category?: string;
  excludeArticleIds?: number[];
};

export interface RetrievalService {
  search(input: SemanticSearchInput): Promise<RetrievalCandidate[]>;
  similar(input: SimilarArticlesInput): Promise<RetrievalCandidate[]>;
  recommendForUser(input: PersonalizedRecommendationsInput): Promise<RetrievalCandidate[]>;
  retrieveContext(input: RetrievalContextInput): Promise<RetrievalCandidate[]>;
}

type RetrievalOperation = "search" | "similar" | "recommendForUser" | "retrieveContext";

type QdrantPoint = {
  score?: number;
  payload?: {
    articleId?: number;
    title?: string;
    summary?: string;
    category?: string;
    source?: string;
    language?: string;
    publishedAt?: string;
    indexVersion?: number;
  };
};

function toRetrievalCandidates(points: QdrantPoint[]) {
  return points
    .map((point): RetrievalCandidate | null => {
      const articleId = point.payload?.articleId;
      if (typeof articleId !== "number") {
        return null;
      }

      return {
        articleId,
        score: typeof point.score === "number" ? point.score : 0,
        title: point.payload?.title,
        summary: point.payload?.summary,
        category: point.payload?.category,
        source: point.payload?.source,
        language: point.payload?.language,
        publishedAt: point.payload?.publishedAt,
        indexVersion: point.payload?.indexVersion
      };
    })
    .filter((candidate): candidate is RetrievalCandidate => candidate !== null);
}

function buildMatchFilter(field: string, value: string) {
  return {
    key: field,
    match: {
      value
    }
  };
}

function buildAnyFilter(field: string, values: string[]) {
  return {
    key: field,
    match: {
      any: values
    }
  };
}

function buildExcludeFilter(field: string, values: number[]) {
  return {
    must_not: [
      {
        key: field,
        match: {
          any: values
        }
      }
    ]
  };
}

async function queryCollection(
  settings: QdrantRuntimeSettings,
  vector: number[],
  limit: number,
  filter: Record<string, any> | undefined
) {
  const response = await qdrantRequest(settings, `/collections/${settings.articleCollection}/points/search`, {
    method: "POST",
    body: JSON.stringify({
      vector,
      limit,
      with_payload: true,
      with_vector: false,
      filter
    })
  });

  if (!response.ok) {
    throw new Error(`Qdrant search request failed with HTTP ${response.status}`);
  }

  const payload = await response.json() as { result?: QdrantPoint[] };
  return toRetrievalCandidates(Array.isArray(payload.result) ? payload.result : []);
}

export class QdrantRetrievalService implements RetrievalService {
  constructor(
    private readonly settings: QdrantRuntimeSettings,
    private readonly aiSettings?: AiRuntimeSettings
  ) {}

  private async maybeRerank(results: RetrievalCandidate[], queryText?: string) {
    if (!this.aiSettings || !queryText || !this.aiSettings.rerankerEnabled) {
      return results;
    }

    return rerankCandidates(queryText, results, this.aiSettings);
  }

  async search(input: SemanticSearchInput) {
    const must: Record<string, any>[] = [];
    if (input.category) {
      must.push(buildMatchFilter(ARTICLE_PAYLOAD_FIELDS.category, input.category));
    }

    const filter = must.length > 0 ? { must } : undefined;
    const results = await queryCollection(this.settings, input.queryVector, input.limit, filter);
    return this.maybeRerank(results, input.queryText);
  }

  async similar(input: SimilarArticlesInput) {
    const must: Record<string, any>[] = [];
    const mustNot: Record<string, any>[] = [];

    if (input.category) {
      must.push(buildMatchFilter(ARTICLE_PAYLOAD_FIELDS.category, input.category));
    }
    if (input.excludeArticleIds && input.excludeArticleIds.length > 0) {
      mustNot.push(buildExcludeFilter(ARTICLE_PAYLOAD_FIELDS.articleId, input.excludeArticleIds));
    }

    const filter = {
      ...(must.length > 0 ? { must } : {}),
      ...(mustNot.length > 0 ? { must_not: mustNot.flatMap((item) => item.must_not || []) } : {})
    };

    const results = await queryCollection(
      this.settings,
      input.articleVector,
      input.limit,
      Object.keys(filter).length > 0 ? filter : undefined
    );

    return this.maybeRerank(results, input.queryText);
  }

  async recommendForUser(input: PersonalizedRecommendationsInput) {
    const must: Record<string, any>[] = [];
    const mustNot: Record<string, any>[] = [];

    if (input.categories && input.categories.length > 0) {
      must.push(buildAnyFilter(ARTICLE_PAYLOAD_FIELDS.category, input.categories));
    }

    if (input.excludeArticleIds && input.excludeArticleIds.length > 0) {
      mustNot.push(buildExcludeFilter(ARTICLE_PAYLOAD_FIELDS.articleId, input.excludeArticleIds));
    }

    const filter = {
      ...(must.length > 0 ? { must } : {}),
      ...(mustNot.length > 0 ? { must_not: mustNot.flatMap((item) => item.must_not || []) } : {})
    };

    const results = await queryCollection(
      this.settings,
      input.userVector,
      input.limit,
      Object.keys(filter).length > 0 ? filter : undefined
    );

    return this.maybeRerank(results, input.queryText);
  }

  async retrieveContext(input: RetrievalContextInput) {
    const similarResults = await this.similar({
      articleVector: input.queryVector,
      queryText: input.queryText,
      limit: input.limit,
      category: input.category,
      excludeArticleIds: input.excludeArticleIds
    });

    return similarResults;
  }
}

export class PGVectorRetrievalService implements RetrievalService {
  constructor(private readonly aiSettings?: AiRuntimeSettings) {}

  private async maybeRerank(results: RetrievalCandidate[], queryText?: string) {
    if (!this.aiSettings || !queryText || !this.aiSettings.rerankerEnabled) {
      return results;
    }

    return rerankCandidates(queryText, results, this.aiSettings);
  }

  async search(input: SemanticSearchInput) {
    const candidates = await articleEmbeddingsRepo.topKSimilar({
      queryVector: input.queryVector,
      limit: input.limit,
      categorySlug: input.category
    });

    const mapped = candidates.map((item) => ({
      articleId: item.articleId,
      score: item.score,
      category: item.categorySlug,
      source: item.source,
      language: item.language,
      publishedAt: item.publishedAt ?? undefined,
      indexVersion: item.indexVersion
    }));

    return this.maybeRerank(mapped, input.queryText);
  }

  async similar(input: SimilarArticlesInput) {
    const candidates = await articleEmbeddingsRepo.topKSimilar({
      queryVector: input.articleVector,
      limit: input.limit,
      categorySlug: input.category,
      excludeArticleIds: input.excludeArticleIds
    });

    const mapped = candidates.map((item) => ({
      articleId: item.articleId,
      score: item.score,
      category: item.categorySlug,
      source: item.source,
      language: item.language,
      publishedAt: item.publishedAt ?? undefined,
      indexVersion: item.indexVersion
    }));

    return this.maybeRerank(mapped, input.queryText);
  }

  async recommendForUser(input: PersonalizedRecommendationsInput) {
    const candidates = await articleEmbeddingsRepo.topKSimilar({
      queryVector: input.userVector,
      limit: input.limit,
      categorySlugs: input.categories,
      excludeArticleIds: input.excludeArticleIds
    });

    const mapped = candidates.map((item) => ({
      articleId: item.articleId,
      score: item.score,
      category: item.categorySlug,
      source: item.source,
      language: item.language,
      publishedAt: item.publishedAt ?? undefined,
      indexVersion: item.indexVersion
    }));

    return this.maybeRerank(mapped, input.queryText);
  }

  async retrieveContext(input: RetrievalContextInput) {
    return this.similar({
      articleVector: input.queryVector,
      queryText: input.queryText,
      limit: input.limit,
      category: input.category,
      excludeArticleIds: input.excludeArticleIds
    });
  }
}

function toFlag(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === "") return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function getOverlapAtK(primary: RetrievalCandidate[], shadow: RetrievalCandidate[]) {
  const k = Math.max(1, Math.min(primary.length, shadow.length));
  if (k === 0) {
    return 1;
  }

  const primaryIds = new Set(primary.slice(0, k).map((item) => item.articleId));
  const shadowIds = new Set(shadow.slice(0, k).map((item) => item.articleId));
  let overlap = 0;

  for (const id of primaryIds) {
    if (shadowIds.has(id)) {
      overlap += 1;
    }
  }

  return overlap / k;
}

class ShadowReadRetrievalService implements RetrievalService {
  constructor(
    private readonly primaryEngine: "qdrant" | "pgvector",
    private readonly primary: RetrievalService,
    private readonly shadow: RetrievalService,
    private readonly enabled: boolean
  ) {}

  private async runWithShadow<TInput>(operation: RetrievalOperation, input: TInput) {
    const startedPrimary = Date.now();
    const primaryResult = await this.primary[operation](input as any);
    const primaryLatencyMs = Date.now() - startedPrimary;

    if (!this.enabled) {
      return primaryResult;
    }

    const startedShadow = Date.now();
    let shadowResult: RetrievalCandidate[] = [];
    let shadowError: string | undefined;

    try {
      shadowResult = await this.shadow[operation](input as any);
    } catch (error) {
      shadowError = error instanceof Error ? error.message : "shadow read failed";
    }

    const shadowLatencyMs = Date.now() - startedShadow;
    const overlapAtK = shadowError ? 0 : getOverlapAtK(primaryResult, shadowResult);

    await logTelemetry("vector_shadow_read", {
      operation,
      primaryEngine: this.primaryEngine,
      shadowEngine: this.primaryEngine === "qdrant" ? "pgvector" : "qdrant",
      primaryLatencyMs,
      shadowLatencyMs,
      primaryResultCount: primaryResult.length,
      shadowResultCount: shadowResult.length,
      overlapAtK,
      shadowError
    });

    return primaryResult;
  }

  search(input: SemanticSearchInput) {
    return this.runWithShadow("search", input);
  }

  similar(input: SimilarArticlesInput) {
    return this.runWithShadow("similar", input);
  }

  recommendForUser(input: PersonalizedRecommendationsInput) {
    return this.runWithShadow("recommendForUser", input);
  }

  retrieveContext(input: RetrievalContextInput) {
    return this.runWithShadow("retrieveContext", input);
  }
}

export function createRetrievalServiceFromRuntimeConfig(config: ReturnType<typeof useRuntimeConfig>): RetrievalService {
  const aiSettings = getAiRuntimeSettings(config);
  const engine = config.vectorEngine === "pgvector" ? "pgvector" : "qdrant";
  const shadowReadEnabled = toFlag(config.vectorShadowRead as string | undefined, false);

  const qdrantService = new QdrantRetrievalService(getQdrantRuntimeSettings(config), aiSettings);
  const pgvectorService = new PGVectorRetrievalService(aiSettings);

  if (engine === "pgvector") {
    return new ShadowReadRetrievalService(engine, pgvectorService, qdrantService, shadowReadEnabled);
  }

  return new ShadowReadRetrievalService(engine, qdrantService, pgvectorService, shadowReadEnabled);
}
