import { newsRepo, type NewsCreateInput, type NewsUpdateInput } from "../repositories/news.repo";
import { viewRepo } from "../repositories/view.repo";
import { categoryService } from "./category.service";
import { NotFoundError, ConflictError, ValidationError, CategoryNotFoundError } from "./errors";

function hasOwn(obj: object, key: string) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function validateRequiredNewsInput(input: Record<string, unknown>, mode: "create" | "update") {
  const requiredFields = ["title", "slug", "summary", "content", "status", "categoryId"] as const;
  const details: Array<{ field: string; message: string; expected?: string; example?: string }> = [];

  const fieldHints: Partial<Record<(typeof requiredFields)[number], { expected: string; example: string }>> = {
    title: { expected: "non-empty string, max 200 characters", example: "Politics: policy reform insight #1" },
    slug: { expected: "non-empty string, max 220 characters", example: "politics-policy-reform-1" },
    summary: { expected: "non-empty string, max 500 characters", example: "Short summary in one sentence." },
    content: { expected: "non-empty string", example: "Full article content with paragraphs." },
    status: { expected: '"DRAFT" or "PUBLISHED"', example: "PUBLISHED" },
    categoryId: { expected: "positive integer", example: "9" }
  };

  for (const field of requiredFields) {
    if (mode === "update" && !hasOwn(input, field)) {
      continue;
    }

    const value = input[field];
    if (value === null || value === undefined) {
      const hint = fieldHints[field];
      details.push({
        field: `body.${field}`,
        message: `${field} is required`,
        ...(hint ? { expected: hint.expected, example: hint.example } : {})
      });
      continue;
    }

    if (typeof value === "string" && value.trim().length === 0) {
      const hint = fieldHints[field];
      details.push({
        field: `body.${field}`,
        message: `${field} is required`,
        ...(hint ? { expected: hint.expected, example: hint.example } : {})
      });
    }
  }

  if (details.length > 0) {
    throw new ValidationError("Validation failed", details);
  }
}

async function assertCategoryExists(categoryId: unknown) {
  if (typeof categoryId !== "number" || !Number.isInteger(categoryId) || categoryId <= 0) {
    throw new ValidationError("Validation failed", [
      {
        field: "body.categoryId",
        message: "categoryId must be a positive integer",
        expected: "positive integer",
        example: "9"
      }
    ]);
  }

  try {
    await categoryService.getById(categoryId);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new CategoryNotFoundError(categoryId);
    }
    throw error;
  }
}

export const newsService = {
  async listPublished(filters: { page: number; limit: number; categoryId?: number; categorySlug?: string }) {
    return newsRepo.list({
      ...filters,
      status: "PUBLISHED"
    });
  },

  async getDetailBySlug(slug: string) {
    const article = await newsRepo.findBySlug(slug, "PUBLISHED");
    if (!article) {
      throw new NotFoundError("Article", slug);
    }

    const [newer, older] = await Promise.all([
      newsRepo.findNewerSibling({ id: article.id, publishedAt: article.publishedAt }),
      newsRepo.findOlderSibling({ id: article.id, publishedAt: article.publishedAt })
    ]);

    return {
      ...article,
      newerSlug: newer?.slug ?? null,
      olderSlug: older?.slug ?? null
    };
  },

  async getById(id: number) {
    const article = await newsRepo.findById(id);
    if (!article) {
      throw new NotFoundError("Article", String(id));
    }
    return article;
  },

  async mostViewedToday(limit: number = 5) {
    const today = new Date();
    const todayValue = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;
    return viewRepo.topByDate(todayValue, limit);
  },

  async create(input: NewsCreateInput) {
    validateRequiredNewsInput(input as unknown as Record<string, unknown>, "create");
    await assertCategoryExists(input.categoryId);

    // Check slug uniqueness
    const existing = await newsRepo.findBySlug(input.slug);
    if (existing) {
      throw new ConflictError(`News slug already exists: ${input.slug}`);
    }

    // If publishing, require publishedAt
    if (input.status === "PUBLISHED" && !input.publishedAt) {
      throw new ValidationError("Validation failed", [
        {
          field: "body.publishedAt",
          message: "publishedAt is required when status is PUBLISHED",
          expected: "ISO date-time string",
          example: "2026-05-21T03:00:00.000Z"
        }
      ]);
    }

    return newsRepo.create(input);
  },

  async update(id: number, input: NewsUpdateInput) {
    validateRequiredNewsInput(input as unknown as Record<string, unknown>, "update");

    const article = await newsRepo.findById(id);
    if (!article) {
      throw new NotFoundError("Article", String(id));
    }

    // If category is being changed, validate it exists
    if (hasOwn(input as object, "categoryId") && input.categoryId !== article.categoryId) {
      await assertCategoryExists(input.categoryId);
    }

    // If slug is being changed, check uniqueness
    if (input.slug && input.slug !== article.slug) {
      const existing = await newsRepo.findBySlug(input.slug);
      if (existing) {
        throw new ConflictError(`News slug already exists: ${input.slug}`);
      }
    }

    // If changing to published, require publishedAt
    if (input.status === "PUBLISHED" && !input.publishedAt && !article.publishedAt) {
      throw new ValidationError("Validation failed", [
        {
          field: "body.publishedAt",
          message: "publishedAt is required when status is PUBLISHED",
          expected: "ISO date-time string",
          example: "2026-05-21T03:00:00.000Z"
        }
      ]);
    }

    return newsRepo.update(id, input);
  },

  async delete(id: number) {
    const article = await newsRepo.findById(id);
    if (!article) {
      throw new NotFoundError("Article", String(id));
    }

    const deleted = await newsRepo.delete(id);
    if (!deleted) {
      throw new NotFoundError("Article", String(id));
    }

    return true;
  }
};
