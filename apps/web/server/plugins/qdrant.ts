import { checkQdrantConnection, ensureArticleCollection, getQdrantRuntimeSettings } from "~/server/vector/qdrant";

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig();
  const settings = getQdrantRuntimeSettings(config);

  if (!settings.enabled) {
    console.info("[qdrant] disabled by runtime config");
    return;
  }

  const health = await checkQdrantConnection(settings);
  if (health.ok) {
    try {
      await ensureArticleCollection(settings);
      console.info(
        `[qdrant] connected (${health.latencyMs}ms), collection=${settings.articleCollection}, size=${settings.vectorSize}`
      );
    } catch (error: any) {
      console.warn(`[qdrant] connected but collection bootstrap failed: ${error?.message ?? "unknown error"}`);
    }
    return;
  }

  // Keep app booting in degraded mode; runtime health endpoint reports availability.
  console.warn(`[qdrant] unavailable at startup: ${health.error || "unknown error"}`);
});