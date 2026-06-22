import { requireAdmin } from "~/server/utils/auth";
import { newsService } from "~/server/services/news.service";
import { getFeatureFlags } from "~/server/utils/feature-flags";

export default defineEventHandler(async (event) => {
  const flags = getFeatureFlags(useRuntimeConfig(event));
  if (!flags.personalization) {
    throw createError({ statusCode: 503, statusMessage: "Personalization disabled" });
  }

  const { username } = await requireAdmin(event);
  const query = getQuery(event);

  const rawLimit = typeof query.limit === "string" ? Number(query.limit) : 8;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 12) : 8;

  return newsService.personalizedRecommendations({
    userId: `admin:${username}`,
    limit
  });
});
