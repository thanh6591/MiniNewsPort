import { appendSessionTurn, addEpisodicEvent } from "~/server/chat/memory";
import { resolveMemoryContext } from "~/server/chat/orchestrator";
import { getAiRuntimeSettings } from "~/server/ai/runtime";
import { newsService } from "~/server/services/news.service";
import { logTelemetry } from "../utils/telemetry";

type ChatArticleCard = {
  id: number;
  slug: string;
  title: string;
  thumbnail: string | null;
  summary?: string;
};

function buildFollowUpQuestions(message: string, supporting: ChatArticleCard[]) {
  const seed = message.trim() || "this topic";
  const titleSeed = supporting[0]?.title || "related developments";
  return [
    `Can you summarize ${seed} in 3 key points?`,
    `Which article should I read first to understand ${titleSeed}?`,
    `Show me opposing viewpoints related to this topic.`
  ];
}

function toChatCards(items: any[]): ChatArticleCard[] {
  return items
    .map((item) => ({
      id: item.id ?? item.newsId,
      slug: item.slug,
      title: item.title,
      thumbnail: item.imageUrl ?? null,
      summary: item.summary
    }))
    .filter((item) => Number.isInteger(item.id) && !!item.slug && !!item.title);
}

async function generateAnswer(params: {
  message: string;
  memoryBlocks: string[];
  supportingArticles: ChatArticleCard[];
}) {
  const config = useRuntimeConfig();
  const ai = getAiRuntimeSettings(config);

  const contextText = [
    ...params.memoryBlocks,
    "Supporting articles:",
    ...params.supportingArticles.map((item) => `- ${item.title}: ${item.summary || ""}`)
  ].join("\n\n");

  const prompt = [
    "You are a grounded news assistant.",
    "Use only provided context. If uncertain, say you need more context.",
    contextText,
    `User question: ${params.message}`
  ].join("\n\n");

  if (!ai.enabled) {
    return `I found ${params.supportingArticles.length} related article(s). Please review the suggestions below.`;
  }

  const models = [ai.llmPrimaryModel, ai.llmFallbackModel];
  for (const model of models) {
    try {
      const response = await fetch(`${ai.baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          prompt,
          stream: false
        })
      });

      if (!response.ok) {
        continue;
      }

      const payload = await response.json() as { response?: string };
      if (payload.response && payload.response.trim()) {
        return payload.response.trim();
      }
    } catch {
      // Try fallback model.
    }
  }

  return `I found ${params.supportingArticles.length} related article(s). Please review the suggestions below.`;
}

export const chatService = {
  async ask(params: {
    message: string;
    sessionId: string;
    userId?: string;
    includePersistent?: boolean;
    includeAgent?: boolean;
  }) {
    const startedAt = Date.now();
    const message = params.message.trim();
    if (!message) {
      const response = {
        answer: "Please enter a question.",
        supportingArticles: [],
        recommendedArticles: [],
        followUpQuestions: [
          "What topic are you interested in?",
          "Do you want recent news or deep background?",
          "Should I filter by a specific category?"
        ],
        memoryMode: "session-only",
        sessionId: params.sessionId
      };

      await logTelemetry("chat_query", {
        userId: params.userId || "anonymous",
        usedRetrieval: false,
        generatedFollowUps: response.followUpQuestions.length,
        latencyMs: Date.now() - startedAt
      });

      return response;
    }

    const memory = await resolveMemoryContext({
      userId: params.userId,
      sessionId: params.sessionId,
      includePersistent: params.includePersistent,
      includeAgent: params.includeAgent
    });

    const semantic = await newsService.semanticSearch({
      query: message,
      limit: 6
    });

    const supportingArticles = toChatCards(semantic.items).slice(0, 3);

    let recommendedArticles: ChatArticleCard[] = [];
    if (params.userId) {
      const personalized = await newsService.personalizedRecommendations({
        userId: params.userId,
        limit: 3
      });
      recommendedArticles = toChatCards(personalized.items).slice(0, 3);
    } else {
      const trending = await newsService.mostViewedToday(3);
      recommendedArticles = toChatCards(trending);
    }

    const answer = await generateAnswer({
      message,
      memoryBlocks: memory.contextBlocks,
      supportingArticles
    });

    const followUpQuestions = buildFollowUpQuestions(message, supportingArticles).slice(0, 3);

    appendSessionTurn(params.sessionId, "user", message);
    appendSessionTurn(params.sessionId, "assistant", answer);

    if (params.userId) {
      await addEpisodicEvent(params.userId, {
        kind: "chat",
        source: "chat.ask",
        content: `${message} => ${answer.slice(0, 200)}`
      });
    }

    const response = {
      answer,
      supportingArticles,
      recommendedArticles,
      followUpQuestions,
      memoryMode: memory.mode,
      sessionId: params.sessionId,
      metadata: {
        fallback: semantic.metadata.fallback,
        strategy: semantic.metadata.strategy
      }
    };

    await logTelemetry("chat_query", {
      userId: params.userId || "anonymous",
      usedRetrieval: supportingArticles.length > 0,
      supportingArticles: supportingArticles.length,
      recommendedArticles: recommendedArticles.length,
      generatedFollowUps: followUpQuestions.length,
      memoryMode: memory.mode,
      latencyMs: Date.now() - startedAt
    });

    return response;
  }
};
