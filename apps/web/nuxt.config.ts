import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  ssr: true,
  nitro: {
    preset: process.env.NITRO_PRESET || "node-server"
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
