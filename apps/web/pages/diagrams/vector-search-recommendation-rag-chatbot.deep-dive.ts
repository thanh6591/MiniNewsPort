export type DiagramTabId = "diagram" | "deep-dive";

export type DeepDiveStageId =
  | "indexing"
  | "semantic-search"
  | "recommendations"
  | "personalization"
  | "memory-orchestration"
  | "rag-chat"
  | "memory-controls";

export type DeepDiveCodeReference = {
  filePath: string;
  functionName: string;
  explanation: string;
};

export type DeepDiveStage = {
  id: DeepDiveStageId;
  title: string;
  objective: string;
  runtimeSequence: string[];
  functionWalkthrough: DeepDiveCodeReference[];
  storageDetails: string[];
  failurePathNotes: string[];
};

export const VECTOR_SEARCH_RECOMMENDATION_RAG_CHATBOT_TABS: Array<{ id: DiagramTabId; label: string }> = [
  { id: "diagram", label: "System Diagram" },
  { id: "deep-dive", label: "Backend Deep Dive" }
];

export function resolveVectorSearchRecommendationRagChatbotTab(value?: string | null): DiagramTabId {
  return value === "deep-dive" ? "deep-dive" : "diagram";
}

export const VECTOR_SEARCH_RECOMMENDATION_RAG_CHATBOT_DEEP_DIVE_STAGES: DeepDiveStage[] = [
  {
    id: "indexing",
    title: "1) Embedding Preparation and Qdrant Indexing",
    objective: "Convert article content into embeddings and store them in the local Qdrant index.",
    runtimeSequence: [
      "Article content is normalized into a canonical text payload before embedding.",
      "The Ollama embedding provider generates a vector for the article payload.",
      "Qdrant stores the vector plus article metadata in the articles collection.",
      "Backfill worker replays existing published articles for eventual consistency."
    ],
    functionWalkthrough: [
      {
        filePath: "apps/web/server/vector/article-embedding-payload.ts",
        functionName: "buildArticleEmbeddingPayload",
        explanation: "Builds the canonical text that powers semantic search and recommendation embeddings."
      },
      {
        filePath: "apps/web/server/vector/indexer.ts",
        functionName: "upsertArticleEmbedding",
        explanation: "Writes article vectors and payload data into Qdrant for live content changes."
      },
      {
        filePath: "apps/web/server/workers/vector-backfill.ts",
        functionName: "run",
        explanation: "Backfills all published articles into the vector index when the local collection is empty."
      }
    ],
    storageDetails: [
      "Qdrant collection articles stores vector embeddings and article payload metadata.",
      "Payload fields include articleId, category, publishedAt, source, and indexVersion.",
      "Backfill and indexing failures are recorded in the vector DLQ log for recovery."
    ],
    failurePathNotes: [
      "Missing Ollama embedding model returns a provider error and keeps keyword fallback available.",
      "If Qdrant is unavailable, vector search falls back to the keyword path.",
      "Indexing failures are best-effort and do not block article publication."
    ]
  },
  {
    id: "semantic-search",
    title: "2) Semantic Search API and Retrieval",
    objective: "Turn a natural-language query into ranked article results with fallback behavior.",
    runtimeSequence: [
      "Client submits q and optional category filter to /api/news/search.",
      "newsService.semanticSearch builds the query embedding.",
      "Retrieval service searches Qdrant with category filters and optional reranking.",
      "If vector retrieval fails, the API returns deterministic keyword results instead."
    ],
    functionWalkthrough: [
      {
        filePath: "apps/web/server/services/news.service.ts",
        functionName: "semanticSearch",
        explanation: "Primary service entry that orchestrates embeddings, retrieval, and fallback metadata."
      },
      {
        filePath: "apps/web/server/ai/providers.ts",
        functionName: "createEmbeddingProvider",
        explanation: "Chooses the local Ollama embedding provider used to encode search text."
      },
      {
        filePath: "apps/web/server/services/retrieval.service.ts",
        functionName: "search",
        explanation: "Queries the vector index and applies optional reranking logic."
      }
    ],
    storageDetails: [
      "Search results are read from news records after Qdrant returns matching article IDs.",
      "Response metadata records strategy, fallback state, and score distribution.",
      "Category filters can narrow semantic matches before ranking."
    ],
    failurePathNotes: [
      "If embeddings or Qdrant fail, the API switches to keyword fallback.",
      "Invalid queries are rejected before retrieval starts.",
      "Fallback metadata makes the UI aware of non-vector results."
    ]
  },
  {
    id: "recommendations",
    title: "3) Similar Article Recommendations",
    objective: "Return in-category and cross-category articles related to a news detail page.",
    runtimeSequence: [
      "Article detail page calls /api/news/:slug/recommendations.",
      "Service embeds the article body and asks retrieval for similar items.",
      "In-category candidates are ranked first, followed by global candidates.",
      "The final payload separates same-category and cross-category suggestions."
    ],
    functionWalkthrough: [
      {
        filePath: "apps/web/server/services/news.service.ts",
        functionName: "similarRecommendationsBySlug",
        explanation: "Generates recommendation groups for the detail page."
      },
      {
        filePath: "apps/web/server/services/retrieval.service.ts",
        functionName: "similar",
        explanation: "Queries Qdrant for articles that are close to the source article embedding."
      },
      {
        filePath: "apps/web/server/repositories/news.repo.ts",
        functionName: "findPublishedByIds",
        explanation: "Hydrates recommended article IDs back into ordered published article records."
      }
    ],
    storageDetails: [
      "Detail page response contains sourceArticleId, categorySlug, inCategory, and global arrays.",
      "Recommendation ranking uses embedding distance plus simple category exclusions.",
      "The UI renders the two arrays in separate sections."
    ],
    failurePathNotes: [
      "If the source article cannot be embedded, the page can surface an empty recommendation state.",
      "Duplicate source article IDs are excluded from both recommendation groups.",
      "Recommendation API errors propagate to the page loader."
    ]
  },
  {
    id: "personalization",
    title: "4) Personalized Recommendations",
    objective: "Turn reading history into a personalized feed for authenticated users.",
    runtimeSequence: [
      "User view history is queried from the personalization store.",
      "If history is insufficient, the service falls back to most viewed today.",
      "Otherwise the service builds a user embedding from recent reads.",
      "Retrieval returns ranked candidates that are filtered against already-read articles."
    ],
    functionWalkthrough: [
      {
        filePath: "apps/web/server/services/news.service.ts",
        functionName: "personalizedRecommendations",
        explanation: "Primary personalized feed builder used by the homepage section."
      },
      {
        filePath: "apps/web/server/personalization/store.ts",
        functionName: "getRecentUserViewArticleIds",
        explanation: "Loads recent article views used to construct the user profile vector."
      },
      {
        filePath: "apps/web/server/services/retrieval.service.ts",
        functionName: "recommendForUser",
        explanation: "Searches the vector index using the user profile embedding."
      }
    ],
    storageDetails: [
      "Personalization depends on recent article view signals stored per user.",
      "Response metadata identifies personalized vs fallback results.",
      "Homepage renders the section only when data is returned."
    ],
    failurePathNotes: [
      "Too little history forces a deterministic fallback feed.",
      "Missing embeddings or retrieval failures also fall back gracefully.",
      "The feature can be gated by runtime flags if required."
    ]
  },
  {
    id: "memory-orchestration",
    title: "5) Memory Orchestration and Prompt Assembly",
    objective: "Assemble session, persistent, and agent memory into one safe context bundle.",
    runtimeSequence: [
      "Chat request resolves a session ID and optional authenticated user ID.",
      "resolveMemoryContext decides which tiers are active for this request.",
      "buildMemoryContext assembles session, persistent, episodic, and semantic text blocks.",
      "The resulting context is fed into the RAG answer prompt."
    ],
    functionWalkthrough: [
      {
        filePath: "apps/web/server/chat/orchestrator.ts",
        functionName: "resolveMemoryContext",
        explanation: "Chooses the active memory mode and returns context blocks for the prompt."
      },
      {
        filePath: "apps/web/server/chat/memory.ts",
        functionName: "buildMemoryContext",
        explanation: "Collects the memory tiers into a single prompt-ready context list."
      },
      {
        filePath: "apps/web/server/chat/memory.ts",
        functionName: "addEpisodicEvent",
        explanation: "Stores durable episodic events that can later be summarized into agent memory."
      }
    ],
    storageDetails: [
      "Session memory lives in an in-memory session store with a turn cap.",
      "Persistent and agent memory are stored in the JSON memory database.",
      "Semantic summaries keep provenanceEventIds for traceability."
    ],
    failurePathNotes: [
      "When persistent or agent memory is disabled, those tiers are skipped.",
      "Session memory resets independently from durable memory tiers.",
      "Retention rules prune old events before save."
    ]
  },
  {
    id: "rag-chat",
    title: "6) RAG Chat Response Generation",
    objective: "Ground answers in article search results and return three follow-up questions.",
    runtimeSequence: [
      "chatService.ask loads memory and semantic context for the user message.",
      "The service performs semantic search for supporting articles.",
      "A response is generated with Ollama using the memory and supporting context.",
      "The API returns answer, citations, recommendations, and exactly three follow-ups."
    ],
    functionWalkthrough: [
      {
        filePath: "apps/web/server/services/chat.service.ts",
        functionName: "chatService",
        explanation: "Owns the RAG chat orchestration from memory resolution to final answer payload."
      },
      {
        filePath: "apps/web/server/services/news.service.ts",
        functionName: "semanticSearch",
        explanation: "Finds grounded article context that the answer should cite."
      },
      {
        filePath: "apps/web/server/services/news.service.ts",
        functionName: "personalizedRecommendations",
        explanation: "Adds personalized reading suggestions alongside the chat answer."
      }
    ],
    storageDetails: [
      "Session turns are appended in memory after each chat exchange.",
      "Assistant answers are stored as ephemeral conversation context, not as article content.",
      "The payload returned to the frontend includes followUpQuestions with a 3-item cap."
    ],
    failurePathNotes: [
      "If Ollama is disabled, the service falls back to a lightweight canned reply.",
      "If semantic retrieval fails, the answer still returns with reduced grounding.",
      "The UI must handle empty or disabled chatbot state safely."
    ]
  },
  {
    id: "memory-controls",
    title: "7) Memory APIs and User Controls",
    objective: "Expose memory state, preferences, reset, and deletion controls to the frontend.",
    runtimeSequence: [
      "The chat widget loads memory status with GET /api/chat/memory.",
      "The Reset button clears session memory for the current chat session.",
      "Preference and deletion endpoints update durable memory tiers.",
      "The panel displays the resulting memory mode for transparency."
    ],
    functionWalkthrough: [
      {
        filePath: "apps/web/server/chat/memory.ts",
        functionName: "getMemoryPreferences",
        explanation: "Reads per-user memory preferences that determine which tiers are active."
      },
      {
        filePath: "apps/web/server/chat/memory.ts",
        functionName: "updateMemoryPreferences",
        explanation: "Lets the API persist user consent decisions for persistent and agent memory."
      },
      {
        filePath: "apps/web/server/chat/memory.ts",
        functionName: "deleteMemoryTiers",
        explanation: "Removes selected memory tiers during opt-out or reset flows."
      }
    ],
    storageDetails: [
      "The frontend uses dedicated chat memory endpoints for status and reset.",
      "Persistent memory preferences are stored separately from session memory.",
      "Deletion requests can target session, persistent, and agent tiers independently."
    ],
    failurePathNotes: [
      "If a memory endpoint fails, the widget should continue using session-only mode.",
      "Reset affects only the current session unless explicit durable deletion is requested.",
      "Preference changes take effect on the next request context assembly."
    ]
  }
];