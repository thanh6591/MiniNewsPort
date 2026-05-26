import { importService } from "~/server/services/import.service";
import { AppError, NotFoundError } from "~/server/services/errors";

export default defineEventHandler(async (event) => {
  try {
    await requireAdmin(event);
    const { batchId } = getRouterParams(event);
    const id = Number(batchId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError("VALIDATION_ERROR", "batchId must be a positive integer", 400);
    }
    return await importService.getBatchProgress(id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw createError({
        statusCode: 404,
        statusMessage: error.message,
        data: { code: "IMPORT_BATCH_NOT_FOUND", message: error.message }
      });
    }
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
