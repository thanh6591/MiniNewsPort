import { categoryRepo } from "../repositories/category.repo";
import { NotFoundError, ConflictError, ValidationError } from "./errors";

function validateCategoryInput(input: { name?: string; slug?: string }, isCreate = false) {
  const details: Array<{ field: string; message: string }> = [];

  if (isCreate || Object.prototype.hasOwnProperty.call(input, "name")) {
    if (typeof input.name !== "string" || input.name.trim().length === 0) {
      details.push({ field: "name", message: "Category name is required" });
    }
  }

  if (isCreate || Object.prototype.hasOwnProperty.call(input, "slug")) {
    if (typeof input.slug !== "string" || input.slug.trim().length === 0) {
      details.push({ field: "slug", message: "Category slug is required" });
    }
  }

  if (details.length > 0) {
    throw new ValidationError("Validation failed", details);
  }
}

export const categoryService = {
  async listWithNewsCount() {
    return categoryRepo.findAllWithNewsCount();
  },

  async getById(id: number) {
    const category = await categoryRepo.findById(id);
    if (!category) {
      throw new NotFoundError("Category", String(id));
    }
    return category;
  },

  async getBySlug(slug: string) {
    const category = await categoryRepo.findBySlug(slug);
    if (!category) {
      throw new NotFoundError("Category", slug);
    }
    return category;
  },

  async create(input: { name: string; slug: string }) {
    validateCategoryInput(input, true);

    const existing = await categoryRepo.findBySlug(input.slug);
    if (existing) {
      throw new ConflictError(`Category slug already exists: ${input.slug}`);
    }

    return categoryRepo.create(input);
  },

  async update(id: number, input: { name?: string; slug?: string }) {
    validateCategoryInput(input);

    const category = await categoryRepo.findById(id);
    if (!category) {
      throw new NotFoundError("Category", String(id));
    }

    if (input.slug && input.slug !== category.slug) {
      const existing = await categoryRepo.findBySlug(input.slug);
      if (existing) {
        throw new ConflictError(`Category slug already exists: ${input.slug}`);
      }
    }

    return categoryRepo.update(id, input);
  },

  async delete(id: number) {
    const category = await categoryRepo.findById(id);
    if (!category) {
      throw new NotFoundError("Category", String(id));
    }

    const deleted = await categoryRepo.delete(id);
    if (!deleted) {
      throw new NotFoundError("Category", String(id));
    }

    return true;
  }
};
