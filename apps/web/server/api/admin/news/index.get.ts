import { newsService } from "~/server/services/news.service";
import { paginationQuerySchema } from "@mnp/shared";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const query = getQuery(event);

  const page = query.page ? Number(query.page) : 1;
  const limit = query.limit ? Number(query.limit) : 20;
  const categoryId = query.categoryId ? Number(query.categoryId as string) : undefined;
  const status = (query.status as "DRAFT" | "PUBLISHED") || undefined;

  const filterObj: Record<string, unknown> = { page, limit };
  if (categoryId) filterObj.categoryId = categoryId;
  if (status) filterObj.status = status;

  const result = await newsService.listAll(filterObj as any);

  return {
    ...result,
    hasMore: (page * limit) < result.total
  };
});
