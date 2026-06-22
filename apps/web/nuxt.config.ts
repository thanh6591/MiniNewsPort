import { defineNuxtConfig } from "nuxt/config";
import { tmpdir } from "node:os";
import { join } from "node:path";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  ssr: true,
  nitro: {
    preset: process.env.NITRO_PRESET || (process.env.VERCEL ? "vercel" : "node-server")
  },
  modules: ["@pinia/nuxt", "@nuxtjs/tailwindcss"],
  css: ["~/assets/css/main.css"],
  routeRules: {
    "/admin/**": { ssr: false }
  },
  runtimeConfig: {
    // Dev fallbacks prevent accidental empty credentials when .env loading differs by cwd.
    jwtSecret: process.env.JWT_SECRET || "dev-secret-key-32-characters-minimum-required",
    adminUsername: process.env.ADMIN_USERNAME || "admin",
    adminPassword: process.env.ADMIN_PASSWORD || "admin123",
    redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
    workersInProcess: process.env.WORKERS_INPROCESS || "",
    scrapeMaxPerDomain: process.env.SCRAPE_MAX_PER_DOMAIN || "2",
    scrapeUserAgent: process.env.SCRAPE_USER_AGENT || "MiniNewsPortalBot/1.0",
    smtpHost: process.env.SMTP_HOST || "",
    smtpPort: process.env.SMTP_PORT || "587",
    smtpUser: process.env.SMTP_USER || "",
    smtpPass: process.env.SMTP_PASS || "",
    adminEmail: process.env.ADMIN_EMAIL || "",
    qdrantEnabled: process.env.QDRANT_ENABLED || "1",
    qdrantUrl: process.env.QDRANT_URL || "http://127.0.0.1:6333",
    qdrantApiKey: process.env.QDRANT_API_KEY || "",
    qdrantTimeoutMs: process.env.QDRANT_TIMEOUT_MS || "3000",
    qdrantArticleCollection: process.env.QDRANT_ARTICLE_COLLECTION || "articles",
    qdrantVectorSize: process.env.QDRANT_VECTOR_SIZE || "1024",
    qdrantDistance: process.env.QDRANT_DISTANCE || "Cosine",
    ollamaEnabled: process.env.OLLAMA_ENABLED || "1",
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
    ollamaTimeoutMs: process.env.OLLAMA_TIMEOUT_MS || "6000",
    llmProvider: process.env.LLM_PROVIDER || "ollama",
    embeddingProvider: process.env.EMBEDDING_PROVIDER || "ollama",
    llmModelPrimary: process.env.LLM_MODEL_PRIMARY || "qwen2.5:7b-instruct",
    llmModelFallback: process.env.LLM_MODEL_FALLBACK || "qwen2.5:3b-instruct",
    embeddingModelName: process.env.EMBEDDING_MODEL_NAME || "bge-m3",
    rerankerEnabled: process.env.RERANKER_ENABLED || "0",
    rerankerModelName: process.env.RERANKER_MODEL_NAME || "bge-reranker-v2-m3",
    featureSemanticSearch: process.env.FEATURE_SEMANTIC_SEARCH || "1",
    featureRecommendations: process.env.FEATURE_RECOMMENDATIONS || "1",
    featurePersonalization: process.env.FEATURE_PERSONALIZATION || "1",
    featureChatbot: process.env.FEATURE_CHATBOT || "1",
    featureMemorySession: process.env.FEATURE_MEMORY_SESSION || "1",
    featureMemoryPersistent: process.env.FEATURE_MEMORY_PERSISTENT || "1",
    featureMemoryAgent: process.env.FEATURE_MEMORY_AGENT || "1",
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "/api"
    }
  },
  typescript: {
    strict: true,
    typeCheck: false,
    tsConfig: {
      extends: "../../../tsconfig.base.json"
    }
  },
  devServer: {
    port: 3010
  },
  vite: {
    cacheDir: join(tmpdir(), "mini-news-portal-vite-cache"),
    optimizeDeps: {
      include: ["mermaid"]
    }
  }
});
