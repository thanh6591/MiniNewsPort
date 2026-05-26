import { newsRepo } from "~/server/repositories/news.repo";
import { getQueueAdapter } from "~/server/queue";
import { QUEUE_NAMES, type ViewEventData } from "~/server/queue/types";
import { AppError, NotFoundError } from "~/server/services/errors";

export default defineEventHandler(async (event) => {
  try {
    const { id } = getRouterParams(event);
    const articleId = Number(id);
    if (!Number.isInteger(articleId) || articleId <= 0) {
      throw new AppError("VALIDATION_ERROR", "id must be a positive integer", 400);
    }

    const article = await newsRepo.findById(articleId);
    if (!article || article.status !== "PUBLISHED") {
      throw new NotFoundError("Article", String(articleId));
    }

    const payload: ViewEventData = {
      articleId,
      timestamp: new Date().toISOString()
    };

    const queue = await getQueueAdapter();
    await queue.publish(QUEUE_NAMES.viewCounter, payload);

    setResponseStatus(event, 202);
    return { accepted: true, articleId };
  } catch (error) {
    if (error instanceof AppError) {
      throw createError({
        statusCode: error.statusCode,
        statusMessage: error.message,
        data: { code: error.code === "NOT_FOUND" ? "NEWS_NOT_FOUND" : error.code, message: error.message, details: error.details }
      });
    }
    throw error;
  }
});
