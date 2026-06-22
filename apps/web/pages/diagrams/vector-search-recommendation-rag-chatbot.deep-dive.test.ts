import {
  VECTOR_SEARCH_RECOMMENDATION_RAG_CHATBOT_DEEP_DIVE_STAGES,
  VECTOR_SEARCH_RECOMMENDATION_RAG_CHATBOT_TABS,
  resolveVectorSearchRecommendationRagChatbotTab
} from "./vector-search-recommendation-rag-chatbot.deep-dive";

describe("vector search recommendation rag chatbot deep dive content model", () => {
  it("resolves supported tab ids and falls back safely", () => {
    expect(resolveVectorSearchRecommendationRagChatbotTab("deep-dive")).toBe("deep-dive");
    expect(resolveVectorSearchRecommendationRagChatbotTab("diagram")).toBe("diagram");
    expect(resolveVectorSearchRecommendationRagChatbotTab("unknown")).toBe("diagram");
    expect(resolveVectorSearchRecommendationRagChatbotTab(null)).toBe("diagram");
  });

  it("defines exactly two deterministic tabs", () => {
    expect(VECTOR_SEARCH_RECOMMENDATION_RAG_CHATBOT_TABS).toEqual([
      { id: "diagram", label: "System Diagram" },
      { id: "deep-dive", label: "Backend Deep Dive" }
    ]);
  });

  it("keeps deterministic stage ordering for onboarding flow", () => {
    expect(VECTOR_SEARCH_RECOMMENDATION_RAG_CHATBOT_DEEP_DIVE_STAGES.map((stage) => stage.id)).toEqual([
      "indexing",
      "semantic-search",
      "recommendations",
      "personalization",
      "memory-orchestration",
      "rag-chat",
      "memory-controls"
    ]);
  });

  it("ensures each stage has at least one code reference and one storage detail", () => {
    for (const stage of VECTOR_SEARCH_RECOMMENDATION_RAG_CHATBOT_DEEP_DIVE_STAGES) {
      expect(stage.functionWalkthrough.length).toBeGreaterThan(0);
      expect(stage.storageDetails.length).toBeGreaterThan(0);
    }
  });
});