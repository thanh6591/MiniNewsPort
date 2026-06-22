import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/server/services/news.service", () => ({
  newsService: {
    semanticSearch: vi.fn(),
    personalizedRecommendations: vi.fn(),
    mostViewedToday: vi.fn()
  }
}));

vi.mock("~/server/chat/orchestrator", () => ({
  resolveMemoryContext: vi.fn()
}));

vi.mock("~/server/chat/memory", () => ({
  appendSessionTurn: vi.fn(),
  addEpisodicEvent: vi.fn()
}));

vi.mock("~/server/ai/runtime", () => ({
  getAiRuntimeSettings: vi.fn(() => ({
    enabled: false,
    baseUrl: "http://127.0.0.1:11434",
    llmPrimaryModel: "qwen2.5:7b-instruct",
    llmFallbackModel: "qwen2.5:3b-instruct"
  }))
}));

describe("chatService.ask", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (globalThis as any).useRuntimeConfig = vi.fn(() => ({}));
  });

  it("returns structured response with exactly three follow-up questions", async () => {
    const { newsService } = await import("~/server/services/news.service");
    const { resolveMemoryContext } = await import("~/server/chat/orchestrator");
    const { chatService } = await import("./chat.service");

    vi.mocked(resolveMemoryContext).mockResolvedValue({
      mode: "session-only",
      contextBlocks: []
    } as any);

    vi.mocked(newsService.semanticSearch).mockResolvedValue({
      items: [
        { id: 1, slug: "a", title: "A", imageUrl: null, summary: "S" },
        { id: 2, slug: "b", title: "B", imageUrl: null, summary: "S" }
      ],
      metadata: { fallback: false, strategy: "vector" }
    } as any);

    vi.mocked(newsService.mostViewedToday).mockResolvedValue([
      { newsId: 3, slug: "c", title: "C", imageUrl: null, summary: "S" }
    ] as any);

    const result = await chatService.ask({
      message: "latest ai news",
      sessionId: "s1"
    });

    expect(result.answer.length).toBeGreaterThan(0);
    expect(result.followUpQuestions).toHaveLength(3);
    expect(result.supportingArticles.length).toBeGreaterThan(0);
    expect(result.recommendedArticles.length).toBeGreaterThan(0);
  });
});
