import { z } from "zod";

// ==================== CATEGORY ====================
export const categoryCreateSchema = z.object({
  name: z.string().min(1, "Category name is required").max(100, "Category name must be 100 characters or less"),
  slug: z.string().min(1, "Category slug is required").max(120, "Category slug must be 120 characters or less")
});

export const categoryUpdateSchema = z.object({
  name: z.string().min(1, "Category name is required").max(100).optional(),
  slug: z.string().min(1, "Category slug is required").max(120).optional()
});

export const categorySchema = categoryCreateSchema.extend({
  id: z.number(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const categoryWithNewsCountSchema = categorySchema.extend({
  newsCount: z.number()
});

// ==================== NEWS ====================
export const newsStatusSchema = z.enum(["DRAFT", "PUBLISHED"]);

const nullablePublishedAtSchema = z.preprocess(
  (value) => {
    if (value === "") {
      return null;
    }
    return value;
  },
  z.coerce.date().nullable()
);

export const newsCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  slug: z.string().min(1, "Slug is required").max(220, "Slug must be 220 characters or less"),
  summary: z.string().min(1, "Summary is required").max(500, "Summary must be 500 characters or less"),
  content: z.string().min(1, "Content is required"),
  imageUrl: z.string().url("Image URL must be valid").max(500).nullable().optional(),
  status: newsStatusSchema,
  publishedAt: nullablePublishedAtSchema.optional(),
  categoryId: z.number().int().positive("Category ID must be a positive number")
});

export const newsUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(220).optional(),
  summary: z.string().min(1).max(500).optional(),
  content: z.string().min(1).optional(),
  imageUrl: z.string().url().max(500).nullable().optional(),
  status: newsStatusSchema.optional(),
  publishedAt: nullablePublishedAtSchema.optional(),
  categoryId: z.number().int().positive().optional()
});

export const newsSchema = newsCreateSchema.extend({
  id: z.number(),
  viewCount: z.number(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const newsDetailSchema = newsSchema.extend({
  newerSlug: z.string().nullable(),
  olderSlug: z.string().nullable()
});

// ==================== PAGINATION ====================
export const paginationQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  categoryId: z.number().optional(),
  categorySlug: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional()
});

export const paginationResponseSchema = z.object({
  items: z.array(z.unknown()),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  hasMore: z.boolean()
});

// ==================== AUTHENTICATION ====================
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required")
});

export const jwtPayloadSchema = z.object({
  username: z.string(),
  iat: z.number(),
  exp: z.number()
});

export const authMeSchema = z.object({
  username: z.string(),
  isAuthenticated: z.boolean()
});

// ==================== API RESPONSES ====================
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional()
  })
});

// ==================== BULK IMPORT ====================
export const importItemStatusSchema = z.enum(["PENDING", "PROCESSING", "PUBLISHED", "FAILED"]);

export const bulkImportSubmitSchema = z.object({
  urls: z
    .string()
    .min(1, "At least one URL is required")
    .transform((value) =>
      value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    )
    .pipe(
      z
        .array(z.string().url("Each line must be a valid URL"))
        .min(1, "At least one URL is required")
        .max(100, "Maximum 100 URLs per submission")
    ),
  categoryId: z.number().int().positive("categoryId must be a positive integer")
});

export const bulkImportSubmitResponseSchema = z.object({
  batchId: z.number().int().positive(),
  acceptedCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative()
});

export const importItemSchema = z.object({
  id: z.number(),
  batchId: z.number(),
  sourceUrl: z.string(),
  status: importItemStatusSchema,
  attempts: z.number(),
  failureReason: z.string().nullable(),
  newsId: z.number().nullable(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()]),
  startedAt: z.union([z.string(), z.date()]).nullable(),
  completedAt: z.union([z.string(), z.date()]).nullable()
});

export const importBatchSchema = z.object({
  id: z.number(),
  categoryId: z.number(),
  totalCount: z.number(),
  pendingCount: z.number(),
  processingCount: z.number(),
  publishedCount: z.number(),
  failedCount: z.number(),
  createdAt: z.union([z.string(), z.date()]),
  updatedAt: z.union([z.string(), z.date()])
});

export const importBatchProgressSchema = importBatchSchema.extend({
  items: z.array(importItemSchema)
});

// ==================== TYPE EXPORTS ====================
export type CategoryCreate = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;
export type Category = z.infer<typeof categorySchema>;
export type CategoryWithNewsCount = z.infer<typeof categoryWithNewsCountSchema>;

export type NewsStatus = z.infer<typeof newsStatusSchema>;
export type NewsCreate = z.infer<typeof newsCreateSchema>;
export type NewsUpdate = z.infer<typeof newsUpdateSchema>;
export type News = z.infer<typeof newsSchema>;
export type NewsDetail = z.infer<typeof newsDetailSchema>;

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type PaginationResponse<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export type Login = z.infer<typeof loginSchema>;
export type JWTPayload = z.infer<typeof jwtPayloadSchema>;
export type AuthMe = z.infer<typeof authMeSchema>;

export type ApiError = z.infer<typeof apiErrorSchema>;

export type ImportItemStatus = z.infer<typeof importItemStatusSchema>;
export type BulkImportSubmit = z.input<typeof bulkImportSubmitSchema>;
export type BulkImportSubmitParsed = z.infer<typeof bulkImportSubmitSchema>;
export type BulkImportSubmitResponse = z.infer<typeof bulkImportSubmitResponseSchema>;
export type ImportItem = z.infer<typeof importItemSchema>;
export type ImportBatch = z.infer<typeof importBatchSchema>;
export type ImportBatchProgress = z.infer<typeof importBatchProgressSchema>;
