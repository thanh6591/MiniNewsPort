export default defineEventHandler(() => {
  return {
    openapi: "3.0.0",
    info: {
      title: "Mini News Portal API",
      version: "1.0.0",
      description: "API for managing news categories, articles, and admin functions"
    },
    paths: {
      "/api/health": {
        get: {
          tags: ["Ops"],
          summary: "Health check for DB connectivity and migration state",
          responses: {
            "200": { description: "Service is healthy" },
            "503": { description: "Service is unhealthy (DB or migration issue)" }
          }
        }
      },
      "/api/categories": {
        get: {
          tags: ["Public"],
          summary: "List all categories with news counts",
          responses: {
            "200": {
              description: "Success",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "number" },
                        name: { type: "string" },
                        slug: { type: "string" },
                        newsCount: { type: "number" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/api/news": {
        get: {
          tags: ["Public"],
          summary: "List published news with pagination",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
            { name: "categoryId", in: "query", schema: { type: "integer" } },
            { name: "categorySlug", in: "query", schema: { type: "string" } }
          ],
          responses: {
            "200": { description: "List of published news" }
          }
        }
      },
      "/api/news/most-viewed-today": {
        get: {
          tags: ["Public"],
          summary: "Get top 5 most viewed articles today",
          responses: {
            "200": { description: "List of top viewed articles" }
          }
        }
      },
      "/api/news/{slug}": {
        get: {
          tags: ["Public"],
          summary: "Get article detail by slug (increments view count)",
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "Article detail with neighboring article slugs" },
            "404": { description: "Article not found" }
          }
        }
      },
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Admin login (returns JWT)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    username: { type: "string" },
                    password: { type: "string" }
                  },
                  required: ["username", "password"]
                }
              }
            }
          },
          responses: {
            "200": { description: "Login successful, JWT in mnp_token cookie" },
            "401": { description: "Invalid credentials" }
          }
        }
      },
      "/api/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Logout (clears mnp_token cookie)",
          responses: {
            "200": { description: "Logout successful" }
          }
        }
      },
      "/api/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Get current admin info (requires auth)",
          responses: {
            "200": { description: "Current admin info" },
            "401": { description: "Not authenticated" }
          }
        }
      },
      "/api/admin/categories": {
        get: {
          tags: ["Admin"],
          summary: "List all categories (admin)",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20 } }
          ],
          responses: {
            "200": { description: "Paginated categories" },
            "401": { description: "Unauthorized" }
          }
        },
        post: {
          tags: ["Admin"],
          summary: "Create category (admin)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    slug: { type: "string" }
                  },
                  required: ["name", "slug"]
                }
              }
            }
          },
          responses: {
            "200": { description: "Category created" },
            "401": { description: "Unauthorized" },
            "409": { description: "Slug already exists" }
          }
        }
      },
      "/api/admin/categories/{id}": {
        get: {
          tags: ["Admin"],
          summary: "Get category by id (admin)",
          responses: {
            "200": { description: "Category" },
            "404": { description: "Not found" }
          }
        },
        put: {
          tags: ["Admin"],
          summary: "Update category (admin)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    slug: { type: "string" }
                  }
                }
              }
            }
          },
          responses: {
            "200": { description: "Category updated" },
            "404": { description: "Not found" }
          }
        },
        delete: {
          tags: ["Admin"],
          summary: "Delete category (admin)",
          responses: {
            "200": { description: "Category deleted" },
            "409": { description: "Category has news items" }
          }
        }
      },
      "/api/admin/news": {
        get: {
          tags: ["Admin"],
          summary: "List all news (admin)",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
            { name: "categoryId", in: "query", schema: { type: "integer" } }
          ],
          responses: {
            "200": { description: "News list" }
          }
        },
        post: {
          tags: ["Admin"],
          summary: "Create news (admin)",
          responses: {
            "200": { description: "News created" }
          }
        }
      },
      "/api/admin/news/{id}": {
        get: {
          tags: ["Admin"],
          summary: "Get news by id (admin)",
          responses: {
            "200": { description: "News" }
          }
        },
        put: {
          tags: ["Admin"],
          summary: "Update news (admin)",
          responses: {
            "200": { description: "News updated" }
          }
        },
        delete: {
          tags: ["Admin"],
          summary: "Delete news (admin)",
          responses: {
            "200": { description: "News deleted" }
          }
        }
      }
    }
  };
});
