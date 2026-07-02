import { newsRepo, type NewsCreateInput, type NewsUpdateInput } from "../repositories/news.repo";
import { viewRepo } from "../repositories/view.repo";
import { categoryService } from "./category.service";
import { NotFoundError, ConflictError, ValidationError, CategoryNotFoundError } from "./errors";
import { deleteArticleEmbedding, upsertArticleEmbedding } from "../vector/indexer";
import { logVectorDlq } from "../vector/dlq";
import { createEmbeddingProvider } from "../ai/providers";
import { getAiRuntimeSettings } from "../ai/runtime";
import { createRetrievalServiceFromRuntimeConfig } from "./retrieval.service";
import { buildArticleEmbeddingPayload } from "../vector/article-embedding-payload";
import { getRecentUserViewArticleIds } from "../personalization/store";
import { logTelemetry } from "../utils/telemetry";

function hasOwn(obj: object, key: string) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function validateRequiredNewsInput(input: Record<string, unknown>, mode: "create" | "update") {
  const requiredFields = ["title", "slug", "summary", "content", "status", "categoryId"] as const;
  const details: Array<{ field: string; message: string; expected?: string; example?: string }> = [];

  const fieldHints: Partial<Record<(typeof requiredFields)[number], { expected: string; example: string }>> = {
    title: { expected: "non-empty string, max 200 characters", example: "Politics: policy reform insight #1" },
    slug: { expected: "non-empty string, max 220 characters", example: "politics-policy-reform-1" },
    summary: { expected: "non-empty string, max 500 characters", example: "Short summary in one sentence." },
    content: { expected: "non-empty string", example: "Full article content with paragraphs." },
    status: { expected: '"DRAFT" or "PUBLISHED"', example: "PUBLISHED" },
    categoryId: { expected: "positive integer", example: "9" }
  };

  for (const field of requiredFields) {
    if (mode === "update" && !hasOwn(input, field)) {
      continue;
    }

    const value = input[field];
    if (value === null || value === undefined) {
      const hint = fieldHints[field];
      details.push({
        field: `body.${field}`,
        message: `${field} is required`,
        ...(hint ? { expected: hint.expected, example: hint.example } : {})
      });
      continue;
    }

    if (typeof value === "string" && value.trim().length === 0) {
      const hint = fieldHints[field];
      details.push({
        field: `body.${field}`,
        message: `${field} is required`,
        ...(hint ? { expected: hint.expected, example: hint.example } : {})
      });
    }
  }

  if (details.length > 0) {
    throw new ValidationError("Validation failed", details);
  }
}

async function assertCategoryExists(categoryId: unknown) {
  if (typeof categoryId !== "number" || !Number.isInteger(categoryId) || categoryId <= 0) {
    throw new ValidationError("Validation failed", [
      {
        field: "body.categoryId",
        message: "categoryId must be a positive integer",
        expected: "positive integer",
        example: "9"
      }
    ]);
  }

  try {
    await categoryService.getById(categoryId);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new CategoryNotFoundError(categoryId);
    }
    throw error;
  }
}

export const newsService = {
  async listPublished(filters: { page: number; limit: number; categoryId?: number; categorySlug?: string }) {
    return newsRepo.list({
      ...filters,
      status: "PUBLISHED"
    });
  },

  async listAll(filters: { page: number; limit: number; categoryId?: number; status?: "DRAFT" | "PUBLISHED" }) {
    return newsRepo.list(filters);
  },

  async getDetailBySlug(slug: string) {
    const article = await newsRepo.findBySlug(slug, "PUBLISHED");
    if (!article) {
      throw new NotFoundError("Article", slug);
    }

    const [newer, older] = await Promise.all([
      newsRepo.findNewerSibling({ id: article.id, publishedAt: article.publishedAt }),
      newsRepo.findOlderSibling({ id: article.id, publishedAt: article.publishedAt })
    ]);

    return {
      ...article,
      newerSlug: newer?.slug ?? null,
      olderSlug: older?.slug ?? null
    };
  },

  async getById(id: number) {
    const article = await newsRepo.findById(id);
    if (!article) {
      throw new NotFoundError("Article", String(id));
    }
    return article;
  },

  async mostViewedToday(limit: number = 5) {
    const today = new Date();
    const todayValue = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;
    return viewRepo.topByDate(todayValue, limit);
  },

  async semanticSearch(filters: {
    query: string;
    limit: number;
    categoryId?: number;
    categorySlug?: string;
  }) {
    const query = (filters.query || "").trim();
    const limit = Math.max(1, Math.min(filters.limit || 20, 50));

    if (!query) {
      throw new ValidationError("Validation failed", [
        {
          field: "query.q",
          message: "q is required for semantic search"
        }
      ]);
    }

    const categorySlug = filters.categorySlug ??
      (filters.categoryId !== undefined ? (await categoryService.getById(filters.categoryId)).slug : undefined);

    const config = useRuntimeConfig();
    const aiSettings = getAiRuntimeSettings(config);

    const startedAt = Date.now();
    try {
      const embeddingProvider = createEmbeddingProvider(aiSettings);
      const [queryVector] = await embeddingProvider.embed([query]);

      if (!Array.isArray(queryVector) || queryVector.length === 0) {
        throw new Error("Empty query embedding");
      }

      const retrieval = createRetrievalServiceFromRuntimeConfig(config);
      const candidates = await retrieval.search({
        queryVector,
        queryText: query,
        limit,
        category: categorySlug
      });

      const ids = candidates.map((item) => item.articleId);
      const articles = await newsRepo.findPublishedByIds(ids);
      const scoreById = new Map(candidates.map((item) => [item.articleId, item.score]));

      const response = {
        items: articles,
        metadata: {
          fallback: false,
          strategy: "vector",
          scores: articles.map((item) => ({
            articleId: item.id,
            score: scoreById.get(item.id) ?? 0
          }))
        }
      };

      await logTelemetry("semantic_search", {
        strategy: "vector",
        fallback: false,
        latencyMs: Date.now() - startedAt,
        resultCount: articles.length
      });

      return response;
    } catch (error) {
      const items = await newsRepo.searchPublishedByKeyword({
        query,
        limit,
        categoryId: filters.categoryId,
        categorySlug
      });

      const response = {
        items,
        metadata: {
          fallback: true,
          strategy: "keyword",
          reason: error instanceof Error ? error.message : "vector retrieval unavailable",
          scores: items.map((item, index) => ({
            articleId: item.id,
            score: Math.max(0, 1 - index / Math.max(items.length, 1))
          }))
        }
      };

      await logTelemetry("semantic_search", {
        strategy: "keyword",
        fallback: true,
        latencyMs: Date.now() - startedAt,
        resultCount: items.length
      });

      return response;
    }
  },

  async similarRecommendationsBySlug(slug: string, limit: number = 6) {
    const startedAt = Date.now();
    const article = await newsRepo.findBySlug(slug, "PUBLISHED");
    if (!article) {
      throw new NotFoundError("Article", slug);
    }

    const category = await categoryService.getById(article.categoryId);
    const config = useRuntimeConfig();
    const aiSettings = getAiRuntimeSettings(config);
    const embeddingProvider = createEmbeddingProvider(aiSettings);
    const retrieval = createRetrievalServiceFromRuntimeConfig(config);

    const payload = buildArticleEmbeddingPayload({
      articleId: article.id,
      title: article.title,
      summary: article.summary,
      description: article.content,
      source: "internal",
      category: category.slug,
      publishedAt: article.publishedAt,
      indexVersion: 1
    });

    const [vector] = await embeddingProvider.embed([payload.text]);
    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error("Unable to build similarity vector for article");
    }

    const [inCategoryCandidates, globalCandidates] = await Promise.all([
      retrieval.similar({
        articleVector: vector,
        queryText: `${article.title}\n${article.summary}`,
        category: category.slug,
        limit: limit + 3,
        excludeArticleIds: [article.id]
      }),
      retrieval.similar({
        articleVector: vector,
        queryText: `${article.title}\n${article.summary}`,
        limit: limit + 6,
        excludeArticleIds: [article.id]
      })
    ]);

    const inCategoryIds = inCategoryCandidates.map((item) => item.articleId).slice(0, limit);
    const inCategoryArticles = await newsRepo.findPublishedByIds(inCategoryIds);

    const inCategoryMap = new Map<number, (typeof inCategoryArticles)[number]>();
    for (const item of inCategoryArticles) {
      inCategoryMap.set(item.id, item);
    }

    if (inCategoryMap.size < limit) {
      const fallback = await newsRepo.list({
        page: 1,
        limit: limit + 1,
        categoryId: article.categoryId,
        status: "PUBLISHED"
      });

      for (const item of fallback.items) {
        if (item.id === article.id || inCategoryMap.has(item.id)) {
          continue;
        }

        inCategoryMap.set(item.id, item);
        if (inCategoryMap.size >= limit) {
          break;
        }
      }
    }

    const resolvedInCategoryArticles = Array.from(inCategoryMap.values()).slice(0, limit);

    const excluded = new Set<number>([article.id, ...resolvedInCategoryArticles.map((item) => item.id)]);
    const globalIds = globalCandidates
      .map((item) => item.articleId)
      .filter((id) => !excluded.has(id))
      .slice(0, limit);

    const globalArticles = await newsRepo.findPublishedByIds(globalIds);

    const response = {
      sourceArticleId: article.id,
      categorySlug: category.slug,
      inCategory: resolvedInCategoryArticles,
      global: globalArticles
    };

    await logTelemetry("article_recommendations", {
      sourceArticleId: article.id,
      inCategoryCount: resolvedInCategoryArticles.length,
      globalCount: globalArticles.length,
      latencyMs: Date.now() - startedAt
    });

    return response;
  },

  async personalizedRecommendations(params: { userId: string; limit: number }) {
    const startedAt = Date.now();
    const limit = Math.max(1, Math.min(params.limit, 12));
    const historyArticleIds = await getRecentUserViewArticleIds(params.userId, 20);

    const fallbackItems = async () => {
      const fallback = await this.mostViewedToday(limit);
      const fallbackIds = fallback.map((item) => item.newsId).filter((id) => Number.isInteger(id));
      return newsRepo.findPublishedByIds(fallbackIds);
    };

    if (historyArticleIds.length < 3) {
      const fallback = await fallbackItems();
      const response = {
        items: fallback,
        metadata: {
          personalized: false,
          fallback: true,
          reason: "insufficient_history"
        }
      };

      await logTelemetry("personalized_recommendations", {
        userId: params.userId,
        personalized: false,
        reason: "insufficient_history",
        latencyMs: Date.now() - startedAt
      });

      return response;
    }

    const readArticles = await newsRepo.findPublishedByIds(historyArticleIds);
    const combinedProfileText = readArticles
      .map((article) => `${article.title}\n${article.summary}`)
      .join("\n\n");

    if (!combinedProfileText.trim()) {
      const fallback = await fallbackItems();
      return {
        items: fallback,
        metadata: {
          personalized: false,
          fallback: true,
          reason: "empty_profile"
        }
      };
    }

    const config = useRuntimeConfig();
    const aiSettings = getAiRuntimeSettings(config);
    const embeddingProvider = createEmbeddingProvider(aiSettings);
    const retrieval = createRetrievalServiceFromRuntimeConfig(config);

    try {
      const [userVector] = await embeddingProvider.embed([combinedProfileText]);
      if (!Array.isArray(userVector) || userVector.length === 0) {
        throw new Error("empty user vector");
      }

      const candidates = await retrieval.recommendForUser({
        userVector,
        queryText: combinedProfileText,
        limit,
        excludeArticleIds: historyArticleIds
      });

      const items = await newsRepo.findPublishedByIds(candidates.map((item) => item.articleId));
      if (items.length === 0) {
        const fallback = await fallbackItems();
        return {
          items: fallback,
          metadata: {
            personalized: false,
            fallback: true,
            reason: "no_candidates"
          }
        };
      }

      const response = {
        items,
        metadata: {
          personalized: true,
          fallback: false,
          sourceHistoryCount: historyArticleIds.length
        }
      };

      await logTelemetry("personalized_recommendations", {
        userId: params.userId,
        personalized: true,
        fallback: false,
        latencyMs: Date.now() - startedAt,
        resultCount: items.length
      });

      return response;
    } catch (error) {
      const fallback = await fallbackItems();
      const response = {
        items: fallback,
        metadata: {
          personalized: false,
          fallback: true,
          reason: error instanceof Error ? error.message : "personalization_failed"
        }
      };

      await logTelemetry("personalized_recommendations", {
        userId: params.userId,
        personalized: false,
        fallback: true,
        reason: error instanceof Error ? error.message : "personalization_failed",
        latencyMs: Date.now() - startedAt
      });

      return response;
    }
  },

  async create(input: NewsCreateInput) {
    validateRequiredNewsInput(input as unknown as Record<string, unknown>, "create");
    await assertCategoryExists(input.categoryId);

    // Check slug uniqueness
    const existing = await newsRepo.findBySlug(input.slug);
    if (existing) {
      throw new ConflictError(`News slug already exists: ${input.slug}`);
    }

    // If publishing, require publishedAt
    if (input.status === "PUBLISHED" && !input.publishedAt) {
      throw new ValidationError("Validation failed", [
        {
          field: "body.publishedAt",
          message: "publishedAt is required when status is PUBLISHED",
          expected: "ISO date-time string",
          example: "2026-05-21T03:00:00.000Z"
        }
      ]);
    }

    const created = await newsRepo.create(input);
    const category = await categoryService.getById(created.categoryId);

    // Indexing is best-effort here; later tasks add queue retries and DLQ handling.
    try {
      await upsertArticleEmbedding({
        id: created.id,
        title: created.title,
        summary: created.summary,
        content: created.content,
        publishedAt: created.publishedAt,
        categorySlug: category.slug
      });
    } catch (error) {
      console.error(`[vector-index] failed to upsert embedding for article ${created.id}`, error);
      await logVectorDlq({
        operation: "upsert",
        articleId: created.id,
        reason: error instanceof Error ? error.message : "unknown indexing error",
        context: {
          phase: "create"
        }
      });
    }

    return created;
  },

  async update(id: number, input: NewsUpdateInput) {
    validateRequiredNewsInput(input as unknown as Record<string, unknown>, "update");

    const article = await newsRepo.findById(id);
    if (!article) {
      throw new NotFoundError("Article", String(id));
    }

    // If category is being changed, validate it exists
    if (hasOwn(input as object, "categoryId") && input.categoryId !== article.categoryId) {
      await assertCategoryExists(input.categoryId);
    }

    // If slug is being changed, check uniqueness
    if (input.slug && input.slug !== article.slug) {
      const existing = await newsRepo.findBySlug(input.slug);
      if (existing) {
        throw new ConflictError(`News slug already exists: ${input.slug}`);
      }
    }

    // If changing to published, require publishedAt
    if (input.status === "PUBLISHED" && !input.publishedAt && !article.publishedAt) {
      throw new ValidationError("Validation failed", [
        {
          field: "body.publishedAt",
          message: "publishedAt is required when status is PUBLISHED",
          expected: "ISO date-time string",
          example: "2026-05-21T03:00:00.000Z"
        }
      ]);
    }

    const updated = await newsRepo.update(id, input);
    if (!updated) {
      throw new NotFoundError("Article", String(id));
    }

    const category = await categoryService.getById(updated.categoryId);
    try {
      await upsertArticleEmbedding({
        id: updated.id,
        title: updated.title,
        summary: updated.summary,
        content: updated.content,
        publishedAt: updated.publishedAt,
        categorySlug: category.slug
      });
    } catch (error) {
      console.error(`[vector-index] failed to upsert embedding for article ${updated.id}`, error);
      await logVectorDlq({
        operation: "upsert",
        articleId: updated.id,
        reason: error instanceof Error ? error.message : "unknown indexing error",
        context: {
          phase: "update"
        }
      });
    }

    return updated;
  },

  async delete(id: number) {
    const article = await newsRepo.findById(id);
    if (!article) {
      throw new NotFoundError("Article", String(id));
    }

    const deleted = await newsRepo.delete(id);
    if (!deleted) {
      throw new NotFoundError("Article", String(id));
    }

    try {
      await deleteArticleEmbedding(id);
    } catch (error) {
      console.error(`[vector-index] failed to delete embedding for article ${id}`, error);
      await logVectorDlq({
        operation: "delete",
        articleId: id,
        reason: error instanceof Error ? error.message : "unknown indexing error",
        context: {
          phase: "delete"
        }
      });
    }

    return true;
  },

  async bulkDelete(ids: number[]) {
    const normalizedIds = Array.from(new Set(ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)));
    if (normalizedIds.length === 0) {
      throw new ValidationError("Validation failed", [
        {
          field: "body.ids",
          message: "ids must include at least one positive integer"
        }
      ]);
    }

    const existing = await newsRepo.findByIds(normalizedIds);
    const existingIds = new Set(existing.map((item) => item.id));
    const missingIds = normalizedIds.filter((id) => !existingIds.has(id));
    if (missingIds.length > 0) {
      throw new NotFoundError("Article", missingIds.join(","));
    }

    const deletedRows = await newsRepo.deleteMany(normalizedIds);
    const deletedIds = deletedRows.map((row) => row.id);

    for (const articleId of deletedIds) {
      try {
        await deleteArticleEmbedding(articleId);
      } catch (error) {
        console.error(`[vector-index] failed to delete embedding for article ${articleId}`, error);
        await logVectorDlq({
          operation: "delete",
          articleId,
          reason: error instanceof Error ? error.message : "unknown indexing error",
          context: {
            phase: "bulk-delete"
          }
        });
      }
    }

    return {
      deletedCount: deletedIds.length
    };
  },

  async bulkUpdateCategory(ids: number[], categoryId: number) {
    const normalizedIds = Array.from(new Set(ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)));
    if (normalizedIds.length === 0) {
      throw new ValidationError("Validation failed", [
        {
          field: "body.ids",
          message: "ids must include at least one positive integer"
        }
      ]);
    }

    await assertCategoryExists(categoryId);

    const existing = await newsRepo.findByIds(normalizedIds);
    const existingIds = new Set(existing.map((item) => item.id));
    const missingIds = normalizedIds.filter((id) => !existingIds.has(id));
    if (missingIds.length > 0) {
      throw new NotFoundError("Article", missingIds.join(","));
    }

    const updated = await newsRepo.updateCategoryMany(normalizedIds, categoryId);
    const category = await categoryService.getById(categoryId);

    for (const article of updated) {
      try {
        await upsertArticleEmbedding({
          id: article.id,
          title: article.title,
          summary: article.summary,
          content: article.content,
          publishedAt: article.publishedAt,
          categorySlug: category.slug
        });
      } catch (error) {
        console.error(`[vector-index] failed to upsert embedding for article ${article.id}`, error);
        await logVectorDlq({
          operation: "upsert",
          articleId: article.id,
          reason: error instanceof Error ? error.message : "unknown indexing error",
          context: {
            phase: "bulk-category"
          }
        });
      }
    }

    return {
      updatedCount: updated.length
    };
  }
};
