import { newsBulkDeleteSchema } from "@mnp/shared";
import { newsService } from "~/server/services/news.service";
import { AppError } from "~/server/services/errors";

export default defineEventHandler(async (event) => {
  try {
    await requireAdmin(event);
    const { body } = await validate(event, { body: newsBulkDeleteSchema });
    return newsService.bulkDelete(body.ids);
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
