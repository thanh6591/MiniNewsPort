import { defineNuxtConfig } from "nuxt/config";

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
    redisUrl: process.env.REDIS_URL || "",
    workersInProcess: process.env.WORKERS_INPROCESS || "",
    scrapeMaxPerDomain: process.env.SCRAPE_MAX_PER_DOMAIN || "2",
    scrapeUserAgent: process.env.SCRAPE_USER_AGENT || "MiniNewsPortalBot/1.0",
    smtpHost: process.env.SMTP_HOST || "",
    smtpPort: process.env.SMTP_PORT || "587",
    smtpUser: process.env.SMTP_USER || "",
    smtpPass: process.env.SMTP_PASS || "",
    adminEmail: process.env.ADMIN_EMAIL || "",
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
  }
});
