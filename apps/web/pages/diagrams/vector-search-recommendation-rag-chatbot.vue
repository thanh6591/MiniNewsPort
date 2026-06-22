<template>
  <section class="mx-auto max-w-7xl space-y-4">
    <header class="space-y-2">
      <h1 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Vector Search, Recommendation & RAG Chatbot</h1>
      <p class="text-sm text-slate-600 sm:text-base">
        Semantic search, article recommendations, personalized feed generation, and a grounded chatbot with tiered memory.
      </p>
      <NuxtLink to="/erd" class="inline-flex text-sm font-medium text-blue-700 hover:text-blue-800">Back to Diagram Center</NuxtLink>
    </header>

    <nav class="flex flex-wrap gap-2" aria-label="Vector search diagram tabs" data-testid="vector-search-tabs">
      <button
        v-for="tab in VECTOR_SEARCH_RECOMMENDATION_RAG_CHATBOT_TABS"
        :key="tab.id"
        type="button"
        class="rounded-lg border px-3 py-1.5 text-sm font-medium transition"
        :class="activeTab === tab.id
          ? 'border-blue-600 bg-blue-50 text-blue-700'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'"
        :aria-selected="activeTab === tab.id"
        :aria-controls="`vector-search-panel-${tab.id}`"
        @click="activeTab = tab.id"
        :data-testid="`vector-search-tab-${tab.id}`"
      >
        {{ tab.label }}
      </button>
    </nav>

    <div v-show="activeTab === 'diagram'" id="vector-search-panel-diagram" data-testid="vector-search-panel-diagram" class="space-y-4">
      <div class="overflow-x-auto rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm sm:p-6">
        <div ref="diagramContainer" class="diagram-shell min-h-[760px] min-w-[1200px]"></div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm sm:p-5">
        <p class="font-medium text-slate-900">Read This Diagram</p>
        <ul class="mt-2 list-disc space-y-1 pl-5">
          <li>Embeddings are generated locally with Ollama and stored in Qdrant.</li>
          <li>Semantic search and recommendation endpoints read from the same vector index.</li>
          <li>The chatbot combines article retrieval with session, persistent, and agent memory.</li>
          <li>Chat follow-up questions are always capped at exactly three actions in the UI.</li>
        </ul>
      </div>

      <p v-if="renderError" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ renderError }}
      </p>
    </div>

    <div v-show="activeTab === 'deep-dive'" id="vector-search-panel-deep-dive" data-testid="vector-search-panel-deep-dive" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <header class="space-y-2 border-b border-slate-100 pb-4">
        <h2 class="text-xl font-semibold text-slate-900" data-testid="deep-dive-title">Backend Deep Dive for Beginners</h2>
        <p class="text-sm leading-6 text-slate-600 sm:text-base">
          Follow each stage in order. Every block explains what function runs, what data changes, where it is stored,
          and what happens on failures.
        </p>
      </header>

      <div class="mt-4 grid gap-4">
        <article
          v-for="stage in VECTOR_SEARCH_RECOMMENDATION_RAG_CHATBOT_DEEP_DIVE_STAGES"
          :key="stage.id"
          class="rounded-lg border border-slate-200 bg-slate-50/70 p-4"
          :data-stage-id="stage.id"
          :data-testid="`stage-section-${stage.id}`"
        >
          <h3 class="text-base font-semibold text-slate-900" :data-testid="`stage-title-${stage.id}`">{{ stage.title }}</h3>
          <p class="mt-1 text-sm text-slate-700">
            <span class="font-medium text-slate-900">Objective:</span>
            {{ stage.objective }}
          </p>

          <div class="mt-3 grid gap-3 md:grid-cols-2">
            <section>
              <h4 class="text-sm font-semibold uppercase tracking-wide text-slate-800">Runtime Sequence</h4>
              <ol class="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-700">
                <li v-for="(line, sequenceIndex) in stage.runtimeSequence" :key="`${stage.id}-runtime-${sequenceIndex}`">
                  {{ line }}
                </li>
              </ol>
            </section>

            <section>
              <h4 class="text-sm font-semibold uppercase tracking-wide text-slate-800">Function Walkthrough</h4>
              <ul class="mt-1 space-y-2 text-sm text-slate-700">
                <li
                  v-for="(refItem, referenceIndex) in stage.functionWalkthrough"
                  :key="`${stage.id}-ref-${referenceIndex}`"
                  class="rounded border border-slate-200 bg-white p-2"
                  :data-testid="`stage-code-ref-${stage.id}-${referenceIndex}`"
                >
                  <button
                    type="button"
                    class="w-full text-left"
                    :aria-expanded="isReferenceExpanded(stage.id, referenceIndex)"
                    @click="toggleReferenceCode(stage.id, referenceIndex, refItem)"
                  >
                    <p class="font-medium text-slate-900 break-all">{{ refItem.filePath }}</p>
                    <p class="text-slate-800">Function: {{ refItem.functionName }}</p>
                    <p class="text-slate-600">{{ refItem.explanation }}</p>
                    <p class="mt-1 text-xs font-medium text-blue-700">
                      {{ isReferenceExpanded(stage.id, referenceIndex) ? "Hide code snippet" : "Click to view code snippet" }}
                    </p>
                  </button>

                  <div v-if="isReferenceExpanded(stage.id, referenceIndex)" class="mt-2 rounded-md border border-slate-200 bg-slate-950/95 p-3">
                    <p
                      v-if="getReferenceSnippetState(stage.id, referenceIndex)?.loading"
                      class="text-xs text-slate-200"
                    >
                      Loading code snippet...
                    </p>
                    <p
                      v-else-if="getReferenceSnippetState(stage.id, referenceIndex)?.error"
                      class="text-xs text-red-300"
                    >
                      {{ getReferenceSnippetState(stage.id, referenceIndex)?.error }}
                    </p>
                    <template v-else-if="getReferenceSnippetState(stage.id, referenceIndex)?.data">
                      <p class="mb-2 text-[11px] text-slate-300">
                        {{ getReferenceSnippetState(stage.id, referenceIndex)?.data?.filePath }}
                        (lines {{ getReferenceSnippetState(stage.id, referenceIndex)?.data?.startLine }}-{{ getReferenceSnippetState(stage.id, referenceIndex)?.data?.endLine }})
                      </p>
                      <pre class="overflow-x-auto text-xs leading-5 text-slate-100"><code>{{ getReferenceSnippetState(stage.id, referenceIndex)?.data?.snippet }}</code></pre>
                    </template>
                  </div>
                </li>
              </ul>
            </section>
          </div>

          <div class="mt-3 grid gap-3 md:grid-cols-2">
            <section>
              <h4 class="text-sm font-semibold uppercase tracking-wide text-slate-800">Where Data Is Stored</h4>
              <ul class="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                <li
                  v-for="(storageLine, storageIndex) in stage.storageDetails"
                  :key="`${stage.id}-storage-${storageIndex}`"
                  :data-testid="`stage-storage-${stage.id}-${storageIndex}`"
                >
                  {{ storageLine }}
                </li>
              </ul>
            </section>

            <section>
              <h4 class="text-sm font-semibold uppercase tracking-wide text-slate-800">Failure Path Notes</h4>
              <ul class="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                <li v-for="(failureLine, failureIndex) in stage.failurePathNotes" :key="`${stage.id}-failure-${failureIndex}`">
                  {{ failureLine }}
                </li>
              </ul>
            </section>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import {
  VECTOR_SEARCH_RECOMMENDATION_RAG_CHATBOT_DEEP_DIVE_STAGES,
  VECTOR_SEARCH_RECOMMENDATION_RAG_CHATBOT_TABS,
  resolveVectorSearchRecommendationRagChatbotTab,
  type DeepDiveCodeReference,
  type DeepDiveStageId,
  type DiagramTabId
} from "./vector-search-recommendation-rag-chatbot.deep-dive";

const diagramContainer = ref<HTMLElement | null>(null);
const renderError = ref("");
const activeTab = ref<DiagramTabId>(resolveVectorSearchRecommendationRagChatbotTab("diagram"));
const expandedReferenceKey = ref<string | null>(null);

type FunctionSnippetResponse = {
  filePath: string;
  functionName: string;
  startLine: number;
  endLine: number;
  snippet: string;
};

type SnippetState = {
  loading: boolean;
  error: string;
  data: FunctionSnippetResponse | null;
};

const referenceSnippetState = ref<Record<string, SnippetState>>({});

function getReferenceKey(stageId: DeepDiveStageId, referenceIndex: number): string {
  return `${stageId}:${referenceIndex}`;
}

function isReferenceExpanded(stageId: DeepDiveStageId, referenceIndex: number): boolean {
  return expandedReferenceKey.value === getReferenceKey(stageId, referenceIndex);
}

function getReferenceSnippetState(stageId: DeepDiveStageId, referenceIndex: number): SnippetState | undefined {
  return referenceSnippetState.value[getReferenceKey(stageId, referenceIndex)];
}

function resolveSnippetError(error: unknown): string {
  if (typeof error === "object" && error && "data" in error) {
    const payload = (error as { data?: { message?: string } }).data;
    if (payload?.message) {
      return payload.message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Unable to load code snippet right now.";
}

async function toggleReferenceCode(stageId: DeepDiveStageId, referenceIndex: number, refItem: DeepDiveCodeReference): Promise<void> {
  const key = getReferenceKey(stageId, referenceIndex);
  if (expandedReferenceKey.value === key) {
    expandedReferenceKey.value = null;
    return;
  }

  expandedReferenceKey.value = key;
  const existingState = referenceSnippetState.value[key];
  if (existingState?.loading || existingState?.data) {
    return;
  }

  referenceSnippetState.value[key] = {
    loading: true,
    error: "",
    data: null
  };

  try {
    const query = new URLSearchParams({
      filePath: refItem.filePath,
      functionName: refItem.functionName
    });
    const response = await fetch(`/api/diagrams/function-snippet?${query.toString()}`);
    if (!response.ok) {
      let errorMessage = "Unable to load code snippet.";
      try {
        const errorPayload = (await response.json()) as {
          data?: { message?: string };
          message?: string;
          statusMessage?: string;
        };
        errorMessage = errorPayload?.data?.message ?? errorPayload?.message ?? errorPayload?.statusMessage ?? errorMessage;
      } catch {
        // Keep fallback message.
      }
      throw new Error(errorMessage);
    }
    const snippet = (await response.json()) as FunctionSnippetResponse;
    referenceSnippetState.value[key] = {
      loading: false,
      error: "",
      data: snippet
    };
  } catch (error) {
    referenceSnippetState.value[key] = {
      loading: false,
      error: resolveSnippetError(error),
      data: null
    };
  }
}

const definition = `
flowchart TB
  classDef api fill:#e0f2fe,stroke:#0284c7,color:#0c4a6e
  classDef ai fill:#ede9fe,stroke:#7c3aed,color:#4c1d95
  classDef worker fill:#ecfccb,stroke:#65a30d,color:#365314
  classDef queue fill:#fef3c7,stroke:#d97706,color:#7c2d12
  classDef db fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
  classDef ui fill:#f8fafc,stroke:#94a3b8,color:#0f172a

  Start["AI feature flow"]:::ui

  subgraph Ingest[1. Ingestion and indexing]
    direction TB
    A["Article create/update/delete"]:::api --> B["buildArticleEmbeddingPayload"]:::worker --> C["createEmbeddingProvider\n(Ollama bge-m3)"]:::ai --> D["upsertArticleEmbedding"]:::worker --> E[(Qdrant articles collection)]:::db
    E --> F["vector backfill worker"]:::worker
  end

  subgraph Search[2. Semantic search]
    direction TB
    U1["Search box + category filter"]:::ui --> S1["/api/news/search"]:::api --> S2["newsService.semanticSearch"]:::api --> S3["retrieval.search"]:::worker --> S4["keyword fallback"]:::worker
  end

  subgraph Recommend[3. Recommendations]
    direction TB
    U2["Article detail page"]:::ui --> R1["/api/news/:slug/recommendations"]:::api --> R2["similarRecommendationsBySlug"]:::api --> R3["retrieval.similar"]:::worker --> R4["in-category + global lists"]:::db
  end

  subgraph Personalize[4. Personalized feed]
    direction TB
    U3["Homepage personalized section"]:::ui --> P1["/api/news/recommendations/personalized"]:::api --> P2["personalizedRecommendations"]:::api --> P3["getRecentUserViewArticleIds"]:::worker --> P4["retrieval.recommendForUser"]:::worker
  end

  subgraph Chat[5. RAG chatbot + memory]
    direction TB
    U4["Floating chat launcher"]:::ui --> C1["/api/chat/query"]:::api --> C2["resolveMemoryContext"]:::worker --> C3["chatService.ask"]:::api --> C4["semanticSearch + personalizedRecommendations"]:::api --> C5["appendSessionTurn + addEpisodicEvent"]:::worker --> C6["Ollama answer generation"]:::ai --> C7["exactly 3 follow-up questions"]:::worker
  end

  subgraph Memory[6. Memory controls]
    direction TB
    M1["GET /api/chat/memory"]:::api --> M2["getMemoryPreferences"]:::worker --> M3["Reset session memory"]:::api --> M4["resetSessionMemory"]:::worker --> M5["Preference / deletion endpoints"]:::api --> M6["updateMemoryPreferences + deleteMemoryTiers"]:::worker
  end

  Start --> A
  E --> U1
  S4 --> U2
  R4 --> U3
  P4 --> U4
  C7 --> M1
`;

onMounted(async () => {
  if (!diagramContainer.value) {
    return;
  }

  try {
    const mermaid = (await import("mermaid")).default;
    mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      securityLevel: "loose",
      themeVariables: {
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
        fontSize: "18px",
        primaryTextColor: "#0f172a",
        lineColor: "#64748b",
        tertiaryColor: "#f8fafc"
      },
      flowchart: {
        htmlLabels: true,
        nodeSpacing: 60,
        rankSpacing: 80,
        curve: "basis"
      }
    });

    const { svg } = await mermaid.render("vector-search-recommendation-rag-chatbot", definition);
    diagramContainer.value.innerHTML = svg;
    const svgEl = diagramContainer.value.querySelector("svg");
    if (svgEl) {
      svgEl.style.maxWidth = "none";
      svgEl.style.width = "100%";
      svgEl.style.minWidth = "900px";
      svgEl.style.height = "auto";
    }
  } catch (err) {
    console.error("[diagram:vector-search-recommendation-rag-chatbot] mermaid render failed", err);
    renderError.value = "Unable to render diagram. Please refresh and try again.";
  }
});
</script>

<style scoped>
.diagram-shell :deep(svg) {
  display: block;
}
</style>