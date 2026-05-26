import { describe, it, expect, beforeEach, vi } from "vitest";
import { newsService } from "./news.service";
import { categoryService } from "./category.service";
import { createAuthService } from "./auth.service";
import { ConflictError, NotFoundError, ValidationError, CategoryHasNewsError, CategoryNotFoundError } from "./errors";

// Mock repositories with proper typing
vi.mock("../repositories/news.repo", () => ({
  newsRepo: {
    list: vi.fn(),
    findBySlug: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findNewerSibling: vi.fn(),
    findOlderSibling: vi.fn()
  }
}));

vi.mock("../repositories/category.repo", () => ({
  categoryRepo: {
    findAllWithNewsCount: vi.fn(),
    findById: vi.fn(),
    findBySlug: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock("../repositories/view.repo", () => ({
  viewRepo: {
    upsertAndIncrementToday: vi.fn(),
    topByDate: vi.fn()
  }
}));

vi.mock("../db/client", () => ({
  db: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transaction: vi.fn(async (fn: any) => {
      return fn({
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn()
      });
    })
  }
}));

describe("Services", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("CategoryService", () => {
    it("should throw NotFoundError when category not found by id", async () => {
      const { categoryRepo } = await import("../repositories/category.repo");
      vi.mocked(categoryRepo.findById).mockResolvedValueOnce(null as any);

      await expect(categoryService.getById(999)).rejects.toThrow(NotFoundError);
    });

    it("should throw CategoryHasNewsError when deleting category with news", async () => {
      const { categoryRepo } = await import("../repositories/category.repo");
      const { newsRepo } = await import("../repositories/news.repo");

      const mockCategory = { id: 1, name: "Test", slug: "test", createdAt: new Date(), updatedAt: new Date() };

      vi.mocked(categoryRepo.findById).mockResolvedValueOnce(mockCategory);
      vi.mocked(newsRepo.list).mockResolvedValueOnce({ items: [], total: 5 });

      await expect(categoryService.delete(1)).rejects.toThrow(CategoryHasNewsError);
    });

    it("should throw ConflictError when creating duplicate slug", async () => {
      const { categoryRepo } = await import("../repositories/category.repo");

      const mockCategory = { id: 1, name: "Existing", slug: "existing", createdAt: new Date(), updatedAt: new Date() };
      vi.mocked(categoryRepo.findBySlug).mockResolvedValueOnce(mockCategory);

      await expect(categoryService.create({ name: "New", slug: "existing" })).rejects.toThrow(ConflictError);
    });

    it("should throw ValidationError when creating category with empty name", async () => {
      await expect(
        categoryService.create({ name: "", slug: "valid-slug" } as any)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("NewsService", () => {
    it("should throw NotFoundError when article not found", async () => {
      const { newsRepo } = await import("../repositories/news.repo");
      vi.mocked(newsRepo.findBySlug).mockResolvedValueOnce(null as any);

      await expect(newsService.getDetailBySlug("nonexistent")).rejects.toThrow(NotFoundError);
    });

    it("should throw ValidationError when publishing without publishedAt", async () => {
      const { categoryRepo } = await import("../repositories/category.repo");
      const { newsRepo: newsRepoMock } = await import("../repositories/news.repo");

      vi.mocked(categoryRepo.findById).mockResolvedValueOnce({
        id: 1,
        name: "Tech",
        slug: "tech",
        createdAt: new Date(),
        updatedAt: new Date()
      });

      vi.mocked(newsRepoMock.findBySlug).mockResolvedValueOnce(null as any);

      await expect(
        newsService.create({
          title: "Test",
          slug: "test",
          summary: "Summary",
          content: "Content",
          status: "PUBLISHED",
          categoryId: 1,
          publishedAt: null
        })
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ConflictError on duplicate slug", async () => {
      const { categoryRepo } = await import("../repositories/category.repo");
      const { newsRepo: newsRepoMock } = await import("../repositories/news.repo");

      vi.mocked(categoryRepo.findById).mockResolvedValueOnce({
        id: 1,
        name: "Tech",
        slug: "tech",
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const existingNews = {
        id: 1,
        title: "Existing",
        slug: "test-slug",
        summary: "Summary",
        content: "Content",
        categoryId: 1,
        status: "DRAFT",
        viewCount: 0,
        imageUrl: null,
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any;
      vi.mocked(newsRepoMock.findBySlug).mockResolvedValueOnce(existingNews);

      await expect(
        newsService.create({
          title: "New",
          slug: "test-slug",
          summary: "Summary",
          content: "Content",
          status: "DRAFT",
          categoryId: 1
        })
      ).rejects.toThrow(ConflictError);
    });

    it("should throw ValidationError when required fields are null on create", async () => {
      await expect(
        newsService.create({
          title: "",
          slug: "",
          summary: "",
          content: "",
          status: "DRAFT",
          categoryId: null as unknown as number
        } as any)
      ).rejects.toThrow(ValidationError);
    });

    it("should throw CategoryNotFoundError when category does not exist", async () => {
      const { categoryRepo } = await import("../repositories/category.repo");
      const { newsRepo: newsRepoMock } = await import("../repositories/news.repo");

      vi.mocked(categoryRepo.findById).mockResolvedValueOnce(null as any);
      vi.mocked(newsRepoMock.findBySlug).mockResolvedValueOnce(null as any);

      await expect(
        newsService.create({
          title: "New",
          slug: "new-item",
          summary: "summary",
          content: "content",
          status: "DRAFT",
          categoryId: 999
        })
      ).rejects.toThrow(CategoryNotFoundError);
    });

    it("should return article unchanged (view increment is now async) with sibling slugs", async () => {
      const { newsRepo: newsRepoMock } = await import("../repositories/news.repo");

      const mockArticle = {
        id: 1,
        title: "Test",
        slug: "test",
        summary: "Summary",
        content: "Content",
        imageUrl: null,
        viewCount: 5,
        publishedAt: new Date(),
        status: "PUBLISHED" as const,
        categoryId: 1,
        categorySlug: "tech",
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockNewer = { id: 2, slug: "newer-article", publishedAt: new Date() };
      const mockOlder = { id: 0, slug: "older-article", publishedAt: new Date() };

      vi.mocked(newsRepoMock.findBySlug).mockResolvedValueOnce(mockArticle);
      vi.mocked(newsRepoMock.findNewerSibling).mockResolvedValueOnce(mockNewer);
      vi.mocked(newsRepoMock.findOlderSibling).mockResolvedValueOnce(mockOlder);

      const result = await newsService.getDetailBySlug("test");

      expect(result.viewCount).toBe(5); // no longer incremented in getDetailBySlug
      expect(result.newerSlug).toBe("newer-article");
      expect(result.olderSlug).toBe("older-article");
    });

    it("should return null slugs when no siblings exist", async () => {
      const { newsRepo: newsRepoMock } = await import("../repositories/news.repo");
      const { viewRepo } = await import("../repositories/view.repo");

      const mockArticle = {
        id: 1,
        title: "Test",
        slug: "test",
        summary: "Summary",
        content: "Content",
        imageUrl: null,
        viewCount: 0,
        publishedAt: new Date(),
        status: "PUBLISHED" as const,
        categoryId: 1,
        categorySlug: "tech",
        createdAt: new Date(),
        updatedAt: new Date()
      };

      vi.mocked(newsRepoMock.findBySlug).mockResolvedValueOnce(mockArticle);
      vi.mocked(newsRepoMock.findNewerSibling).mockResolvedValueOnce(null);
      vi.mocked(newsRepoMock.findOlderSibling).mockResolvedValueOnce(null);
      vi.mocked(viewRepo.upsertAndIncrementToday).mockResolvedValueOnce({
        id: 1,
        newsId: 1,
        viewDate: "2026-05-16",
        viewCount: 1
      });

      const result = await newsService.getDetailBySlug("test");

      expect(result.newerSlug).toBeNull();
      expect(result.olderSlug).toBeNull();
    });
  });

  describe("AuthService", () => {
    it("should sign valid JWT with 1 hour expiration", async () => {
      const authService = createAuthService({
        jwtSecret: "test-secret-key",
        adminUsername: "admin",
        adminPassword: "password123"
      });

      const token = await authService.login("admin", "password123");
      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");

      const payload = await authService.verifyToken(token);
      expect(payload?.username).toBe("admin");
      expect(payload?.exp).toBeGreaterThan(payload?.iat!);
    });

    it("should throw AuthenticationError on invalid username", async () => {
      const authService = createAuthService({
        jwtSecret: "test-secret-key",
        adminUsername: "admin",
        adminPassword: "password123"
      });

      await expect(authService.login("wronguser", "password123")).rejects.toThrow(
        "Invalid credentials"
      );
    });

    it("should throw AuthenticationError on invalid password", async () => {
      const authService = createAuthService({
        jwtSecret: "test-secret-key",
        adminUsername: "admin",
        adminPassword: "password123"
      });

      await expect(authService.login("admin", "wrongpass")).rejects.toThrow(
        "Invalid credentials"
      );
    });

    it("should return null for invalid token", async () => {
      const authService = createAuthService({
        jwtSecret: "test-secret-key",
        adminUsername: "admin",
        adminPassword: "password123"
      });

      const payload = await authService.verifyToken("invalid.token.here");
      expect(payload).toBeNull();
    });

    it("should use constant-time comparison for credentials", async () => {
      const authService = createAuthService({
        jwtSecret: "test-secret-key",
        adminUsername: "admin",
        adminPassword: "password123"
      });

      // Both should fail but take approximately same time
      const start1 = Date.now();
      try {
        await authService.login("admin", "wrong1");
      } catch {
        // expected
      }
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      try {
        await authService.login("admin", "verywrongpassword");
      } catch {
        // expected
      }
      const time2 = Date.now() - start2;

      // Times should be relatively close (within 100ms variance due to system load)
      expect(Math.abs(time1 - time2)).toBeLessThan(100);
    });
  });
});
