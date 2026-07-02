import { bulkImportSubmitSchema } from "@mnp/shared";
import { importService } from "~/server/services/import.service";
import { AppError } from "~/server/services/errors";

export default defineEventHandler(async (event) => {
  try {
    await requireAdmin(event);
    const { body } = await validate(event, { body: bulkImportSubmitSchema });
    const parsed = body as { urls: string[]; categoryId: number; autoCategory?: boolean };
    const result = await importService.submitBulk(parsed);
    setResponseStatus(event, 202);
    return result;
  } catch (error) {
    if (error instanceof AppError) {
      throw createError({
        statusCode: error.statusCode,
        statusMessage: error.message,
        data: { code: error.code, message: error.message, details: error.details }
      });
    }
    throw error;
  }
});
