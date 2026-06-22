import { newsService } from "~/server/services/news.service";
import { getFeatureFlags } from "~/server/utils/feature-flags";

export default defineEventHandler(async (event) => {
  const flags = getFeatureFlags(useRuntimeConfig(event));
  if (!flags.semanticSearch) {
    throw createError({ statusCode: 503, statusMessage: "Semantic search disabled" });
  }

  const query = getQuery(event);

  const q = typeof query.q === "string" ? query.q : "";
  const limitRaw = typeof query.limit === "string" ? Number(query.limit) : 20;
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 50) : 20;

  const categoryId = typeof query.categoryId === "string" && query.categoryId.length > 0
    ? Number(query.categoryId)
    : undefined;

  const categorySlug = typeof query.categorySlug === "string" && query.categorySlug.length > 0
    ? query.categorySlug
    : undefined;

  const result = await newsService.semanticSearch({
    query: q,
    limit,
    categoryId: Number.isFinite(categoryId ?? NaN) ? categoryId : undefined,
    categorySlug
  });

  return {
    ...result,
    count: result.items.length
  };
});
