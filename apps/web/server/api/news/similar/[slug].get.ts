import { newsService } from "~/server/services/news.service";
import { getFeatureFlags } from "~/server/utils/feature-flags";

export default defineEventHandler(async (event) => {
  const flags = getFeatureFlags(useRuntimeConfig(event));
  if (!flags.recommendations) {
    throw createError({ statusCode: 503, statusMessage: "Recommendations disabled" });
  }

  const { slug } = getRouterParams(event);
  const query = getQuery(event);

  const rawLimit = typeof query.limit === "string" ? Number(query.limit) : 6;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 12) : 6;

  return newsService.similarRecommendationsBySlug(slug, limit);
});
