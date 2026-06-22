function toFlag(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === "") return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export function getFeatureFlags(config: ReturnType<typeof useRuntimeConfig>) {
  return {
    semanticSearch: toFlag(config.featureSemanticSearch as string | undefined, true),
    recommendations: toFlag(config.featureRecommendations as string | undefined, true),
    personalization: toFlag(config.featurePersonalization as string | undefined, true),
    chatbot: toFlag(config.featureChatbot as string | undefined, true),
    memorySession: toFlag(config.featureMemorySession as string | undefined, true),
    memoryPersistent: toFlag(config.featureMemoryPersistent as string | undefined, true),
    memoryAgent: toFlag(config.featureMemoryAgent as string | undefined, true)
  };
}
