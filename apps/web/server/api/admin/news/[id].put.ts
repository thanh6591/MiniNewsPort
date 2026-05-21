import { newsService } from "~/server/services/news.service";
import { newsUpdateSchema } from "@mnp/shared";
import { AppError } from "~/server/services/errors";

export default defineEventHandler(async (event) => {
  try {
    await requireAdmin(event);
    const { id } = getRouterParams(event);
    const { body } = await validate(event, { body: newsUpdateSchema });
    return newsService.update(Number(id), body as any);
  } catch (error) {
    if (error instanceof AppError) {
      throw createError({
        statusCode: error.statusCode,
        statusMessage: error.message,
        data: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      });
    }

    throw error;
  }
});
