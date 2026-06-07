<template>
  <section class="mx-auto max-w-7xl space-y-4">
    <header class="space-y-2">
      <h1 class="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Bulk Import and Messaging Layer</h1>
      <p class="text-sm text-slate-600 sm:text-base">
        End-to-end async flow from admin URL submission to scrape retries, dead-letter handling, and consolidated email alerts.
      </p>
      <NuxtLink to="/erd" class="inline-flex text-sm font-medium text-blue-700 hover:text-blue-800">Back to Diagram Center</NuxtLink>
    </header>

    <nav class="flex flex-wrap gap-2" aria-label="Bulk import diagram tabs" data-testid="bulk-import-tabs">
      <button
        v-for="tab in BULK_IMPORT_TABS"
        :key="tab.id"
        type="button"
        class="rounded-lg border px-3 py-1.5 text-sm font-medium transition"
        :class="activeTab === tab.id
          ? 'border-blue-600 bg-blue-50 text-blue-700'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'"
        :aria-selected="activeTab === tab.id"
        :aria-controls="`bulk-import-panel-${tab.id}`"
        @click="activeTab = tab.id"
        :data-testid="`bulk-import-tab-${tab.id}`"
      >
        {{ tab.label }}
      </button>
    </nav>

    <div
      v-show="activeTab === 'diagram'"
      id="bulk-import-panel-diagram"
      data-testid="bulk-import-panel-diagram"
      class="space-y-4"
    >
      <div class="overflow-x-auto rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm sm:p-6">
        <div ref="diagramContainer" class="diagram-shell min-h-[760px] min-w-[1040px]"></div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm sm:p-5">
        <p class="font-medium text-slate-900">Read This Diagram</p>
        <ul class="mt-2 list-disc space-y-1 pl-5">
          <li>Accepted bulk imports return 202 immediately after enqueuing scrape jobs.</li>
          <li>Scraper worker retries transient failures with exponential backoff (3 attempts, 10s base).</li>
          <li>Exhausted jobs move to DLQ and failed items are marked in import item state.</li>
          <li>DLQ notifier batches failures and sends one consolidated email to ADMIN_EMAIL.</li>
        </ul>
      </div>

      <p v-if="renderError" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ renderError }}
      </p>
    </div>

    <div
      v-show="activeTab === 'deep-dive'"
      id="bulk-import-panel-deep-dive"
      data-testid="bulk-import-panel-deep-dive"
      class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <header class="space-y-2 border-b border-slate-100 pb-4">
        <h2 class="text-xl font-semibold text-slate-900" data-testid="deep-dive-title">Backend Deep Dive for Beginners</h2>
        <p class="text-sm leading-6 text-slate-600 sm:text-base">
          Follow each stage in order. Every block explains what function runs, what data changes, where it is stored,
          and what happens on failures.
        </p>
      </header>

      <div class="mt-4 grid gap-4">
        <article
          v-for="stage in BULK_IMPORT_DEEP_DIVE_STAGES"
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
                  <p class="font-medium text-slate-900 break-all">{{ refItem.filePath }}</p>
                  <p class="text-slate-800">Function: {{ refItem.functionName }}</p>
                  <p class="text-slate-600">{{ refItem.explanation }}</p>
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
  BULK_IMPORT_DEEP_DIVE_STAGES,
  BULK_IMPORT_TABS,
  resolveBulkImportTab,
  type DiagramTabId
} from "./bulk-import-messaging.deep-dive";

const diagramContainer = ref<HTMLElement | null>(null);
const renderError = ref("");
const activeTab = ref<DiagramTabId>(resolveBulkImportTab("diagram"));

const definition = `
flowchart TB
  classDef api fill:#e0f2fe,stroke:#0284c7,color:#0c4a6e
  classDef worker fill:#ecfccb,stroke:#65a30d,color:#365314
  classDef queue fill:#fef3c7,stroke:#d97706,color:#7c2d12
  classDef db fill:#ede9fe,stroke:#7c3aed,color:#4c1d95
  classDef ops fill:#fee2e2,stroke:#dc2626,color:#7f1d1d

  subgraph Submit[1. Submission and acceptance]
    A["Admin Import UI<br/>URLs + category"]:::api --> B["POST /api/admin/imports/bulk"]:::api
    B --> V["validate + requireAdmin"]:::api
    V --> C["importService.submitBulk"]:::api
    C --> D[(import_batches)]:::db
    C --> E[(import_items PENDING)]:::db
    C --> Q1[["news-scraping-queue"]]:::queue
    B --> R202["202 Accepted<br/>batchId + counts"]:::api
  end

  subgraph Scrape[2. Scraping worker and retries]
    Q1 --> W1["Scraping Worker<br/>per-domain semaphore"]:::worker
    W1 --> S1["fetch + parse + sanitize"]:::worker
    S1 --> N[(news PUBLISHED)]:::db
    W1 --> I1[(import_items PUBLISHED<br/>news_id linked)]:::db
    W1 --> TFail{"Transient failure?"}:::worker
    TFail -- yes --> Retry["retry: 3 attempts<br/>exponential, base 10s"]:::queue
    Retry --> Q1
    TFail -- no or exhausted --> IFail[(import_items FAILED<br/>failure_reason)]:::db
    IFail --> QDLQ[["news-scraping-dlq"]]:::queue
  end

  subgraph Alerting[3. DLQ handling and email alert]
    QDLQ --> W2["DLQ notifier worker"]:::worker
    W2 --> Buf{"flush now?<br/>25 items OR 60s timer"}:::worker
    Buf --> Msg["build consolidated report<br/>url + reason + failedAt"]:::ops
    Msg --> Mailer["mailer: SMTP or Noop"]:::ops
    Mailer --> Admin["send to ADMIN_EMAIL"]:::ops
  end

  subgraph Progress[4. Dashboard polling]
    Dash["GET /api/admin/imports/:batchId<br/>poll every 3s"]:::api --> Prog["counts + per-item states<br/>Pending, Processing, Published, Failed"]:::api
    Prog --> E
  end
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

    const { svg } = await mermaid.render("bulk-import-messaging", definition);
    diagramContainer.value.innerHTML = svg;
    const svgEl = diagramContainer.value.querySelector("svg");
    if (svgEl) {
      svgEl.style.maxWidth = "none";
      svgEl.style.width = "100%";
      svgEl.style.minWidth = "1020px";
      svgEl.style.height = "auto";
    }
  } catch (err) {
    console.error("[diagram:bulk-import-messaging] mermaid render failed", err);
    renderError.value = "Unable to render diagram. Please refresh and try again.";
  }
});
</script>

<style scoped>
.diagram-shell :deep(svg) {
  display: block;
}
</style>
