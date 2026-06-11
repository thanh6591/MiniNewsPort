export type DiagramTabId = "diagram" | "deep-dive";

export type DeepDiveStageId =
  | "intake"
  | "validation"
  | "enqueue"
  | "processing"
  | "retry-dlq"
  | "polling"
  | "email-notification";

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

export const BULK_IMPORT_TABS: Array<{ id: DiagramTabId; label: string }> = [
  { id: "diagram", label: "System Diagram" },
  { id: "deep-dive", label: "Backend Deep Dive" }
];

export function resolveBulkImportTab(value?: string | null): DiagramTabId {
  return value === "deep-dive" ? "deep-dive" : "diagram";
}

// Maintainer note: keep this list aligned with backend flow updates in:
// server/api/admin/imports/*, server/services/import.service.ts,
// server/repositories/import.repo.ts, server/queue/*, server/workers/*
export const BULK_IMPORT_DEEP_DIVE_STAGES: DeepDiveStage[] = [
  {
    id: "intake",
    title: "1) API Intake and Authorization",
    objective: "Accept admin URL submissions and quickly acknowledge the batch request.",
    runtimeSequence: [
      "Admin UI submits URLs and categoryId to POST /api/admin/imports/bulk.",
      "Route enforces admin authentication before processing request body.",
      "Validated payload is handed off to service layer for orchestration.",
      "API returns HTTP 202 Accepted with batchId and accepted/skipped counts."
    ],
    functionWalkthrough: [
      {
        filePath: "apps/web/server/api/admin/imports/bulk.post.ts",
        functionName: "defineEventHandler",
        explanation: "Entry handler that runs requireAdmin, validate, and importService.submitBulk in order."
      },
      {
        filePath: "apps/web/server/utils/auth.ts",
        functionName: "requireAdmin",
        explanation: "Guards the endpoint so only authenticated admins can submit bulk imports."
      },
      {
        filePath: "apps/web/server/services/import.service.ts",
        functionName: "submitBulk",
        explanation: "Starts core orchestration and returns the response payload for 202 acknowledgement."
      }
    ],
    storageDetails: [
      "Request payload is transient in memory until validation succeeds.",
      "No persistent writes happen in route layer; persistence begins in service/repository transaction.",
      "Response body exposes batchId, acceptedCount, skippedCount for client polling state."
    ],
    failurePathNotes: [
      "Auth failure rejects request before validation/service call.",
      "Schema validation errors map to AppError payload with HTTP 400 semantics.",
      "Unexpected errors are rethrown to Nuxt error handling middleware."
    ]
  },
  {
    id: "validation",
    title: "2) URL Validation and Batch Preparation",
    objective: "Normalize URLs, reject invalid entries, and prepare clean import items.",
    runtimeSequence: [
      "Service validates urls array size and category existence.",
      "Each URL is normalized and de-duplicated within submission.",
      "Invalid or duplicate URLs are tracked as skipped reasons.",
      "At least one valid URL is required before creating a batch."
    ],
    functionWalkthrough: [
      {
        filePath: "apps/web/server/services/import.service.ts",
        functionName: "submitBulk",
        explanation: "Performs length checks, category lookup, URL normalization, and dedupe logic."
      },
      {
        filePath: "apps/web/server/utils/url.ts",
        functionName: "normalizeUrl",
        explanation: "Canonicalizes URL input and rejects unsupported/unsafe URL forms."
      },
      {
        filePath: "apps/web/server/utils/url.ts",
        functionName: "extractDomain",
        explanation: "Extracts source domain used later by per-domain worker semaphore."
      }
    ],
    storageDetails: [
      "Valid URLs are held in memory as items with sourceUrl and sourceDomain.",
      "Skipped reasons are temporary diagnostics in service scope.",
      "Category lookup reads categories table to ensure foreign key safety before insertion."
    ],
    failurePathNotes: [
      "If all URLs are invalid, service throws ValidationError with aggregated reasons.",
      "Unknown categoryId triggers CategoryNotFoundError and aborts batch creation.",
      "Validation failures stop flow before any queue publish occurs."
    ]
  },
  {
    id: "enqueue",
    title: "3) Batch Persistence and Queue Enqueue",
    objective: "Persist batch/items and enqueue scraping jobs for asynchronous processing.",
    runtimeSequence: [
      "Repository transaction inserts import_batches record.",
      "Repository inserts one import_items row per valid URL with PENDING status.",
      "Service obtains queue adapter and publishes one ScrapeJobData payload per item.",
      "Client receives 202 and starts dashboard polling by batchId."
    ],
    functionWalkthrough: [
      {
        filePath: "apps/web/server/repositories/import.repo.ts",
        functionName: "createBatch",
        explanation: "Atomic transaction that creates parent batch and child import items."
      },
      {
        filePath: "apps/web/server/services/import.service.ts",
        functionName: "getQueueAdapter",
        explanation: "Publishes each persisted item into news-scraping-queue asynchronously."
      },
      {
        filePath: "apps/web/server/queue/types.ts",
        functionName: "ScrapeJobData",
        explanation: "Defines payload contract passed from service producer to scraping worker consumer."
      }
    ],
    storageDetails: [
      "Postgres table import_batches stores batch metadata and total_count.",
      "Postgres table import_items stores source URL, domain, status, attempts, and timestamps.",
      "Queue message body stores importItemId, batchId, categoryId, sourceUrl, sourceDomain."
    ],
    failurePathNotes: [
      "Transaction errors prevent partial persistence of batch and items.",
      "Queue adapter failures surface as service errors after persistence, requiring operator retry.",
      "Skipped URLs never become import_items rows and are counted in skippedCount."
    ]
  },
  {
    id: "processing",
    title: "4) Worker Processing and Publish Transition",
    objective: "Fetch source HTML, extract article data, and publish successful news records.",
    runtimeSequence: [
      "Scraping worker consumes queue jobs with configured concurrency.",
      "Item is marked PROCESSING and attempts counter increments.",
      "Worker fetches HTML, extracts content, creates unique slug, inserts published news row.",
      "Item is marked PUBLISHED and linked to news_id."
    ],
    functionWalkthrough: [
      {
        filePath: "apps/web/server/workers/scraping.worker.ts",
        functionName: "startScrapingWorker",
        explanation: "Main consumer pipeline that coordinates semaphore, scraping, persistence, and retries."
      },
      {
        filePath: "apps/web/server/repositories/import.repo.ts",
        functionName: "markItemProcessing",
        explanation: "Tracks runtime transitions and links import item to created news row."
      },
      {
        filePath: "apps/web/server/repositories/news.repo.ts",
        functionName: "create",
        explanation: "Persists final PUBLISHED news article generated from scraped content."
      }
    ],
    storageDetails: [
      "import_items status transitions: PENDING -> PROCESSING -> PUBLISHED.",
      "news table stores title, slug, summary, content, imageUrl, and publishedAt.",
      "import_items.news_id references news.id for progress dashboard joins."
    ],
    failurePathNotes: [
      "SelectorMismatchError is treated as non-retryable and item is marked FAILED immediately.",
      "Non-retryable HttpFetchError also marks item FAILED before exception rethrow.",
      "Retryable failures bubble up so queue adapter can schedule next attempt."
    ]
  },
  {
    id: "retry-dlq",
    title: "5) Retry Policy and Dead-Letter Queue",
    objective: "Retry transient scraping failures and route exhausted jobs into DLQ.",
    runtimeSequence: [
      "Consumer uses maxAttempts=3 with exponential backoff from queue retry config.",
      "Retryable errors are re-thrown so adapter schedules another run.",
      "After max attempts, payload is wrapped into DlqPayload and moved to scraping DLQ.",
      "Failed item reason is persisted for operator visibility."
    ],
    functionWalkthrough: [
      {
        filePath: "apps/web/server/queue/types.ts",
        functionName: "SCRAPING_RETRY",
        explanation: "Declares max attempts and initial backoff used by scraping consumer."
      },
      {
        filePath: "apps/web/server/queue/bullmq.ts",
        functionName: "consume",
        explanation: "Implements retry decision, exponential delay, and dead-letter publishing behavior."
      },
      {
        filePath: "apps/web/server/workers/errors.ts",
        functionName: "HttpFetchError",
        explanation: "Encodes retryable vs non-retryable error semantics consumed by adapter logic."
      }
    ],
    storageDetails: [
      "DLQ queue name is news-scraping-dlq.",
      "DlqPayload includes originalQueue, reason, failedAt, and original ScrapeJobData.",
      "import_items.failure_reason stores concise terminal reason for dashboard and audits."
    ],
    failurePathNotes: [
      "Retry stops early for errors flagged retryable=false.",
      "DLQ message is terminal path after retries are exhausted.",
      "Operators should inspect both import_items.failure_reason and DLQ alert logs."
    ]
  },
  {
    id: "polling",
    title: "6) Progress Polling and Batch Status View",
    objective: "Expose near-real-time batch progress for admin dashboard polling.",
    runtimeSequence: [
      "Admin dashboard calls GET /api/admin/imports/:batchId repeatedly.",
      "Route validates positive integer batchId and checks admin authorization.",
      "Service loads batch, item rows, and grouped status counts.",
      "Response returns totals and per-item detail needed for UI progress tables."
    ],
    functionWalkthrough: [
      {
        filePath: "apps/web/server/api/admin/imports/[batchId].get.ts",
        functionName: "defineEventHandler",
        explanation: "Validates batchId input and maps service/domain errors to API response errors."
      },
      {
        filePath: "apps/web/server/services/import.service.ts",
        functionName: "getBatchProgress",
        explanation: "Aggregates batch metadata, status counters, and enriched item list payload."
      },
      {
        filePath: "apps/web/server/repositories/import.repo.ts",
        functionName: "findItemsByBatchId",
        explanation: "Provides joined rows and grouped status numbers used by dashboard polling."
      }
    ],
    storageDetails: [
      "Reads import_batches for overall batch metadata.",
      "Reads import_items plus joined news.slug/title when available.",
      "Returns counts for PENDING, PROCESSING, PUBLISHED, FAILED states."
    ],
    failurePathNotes: [
      "Unknown batch returns NotFoundError mapped to 404 IMPORT_BATCH_NOT_FOUND.",
      "Invalid batchId format returns validation AppError with 400 status.",
      "Transient DB errors propagate through error middleware for observability."
    ]
  },
  {
    id: "email-notification",
    title: "7) DLQ Consolidation and Email Alerting",
    objective: "Aggregate failed URLs from DLQ and send consolidated alerts to admins.",
    runtimeSequence: [
      "DLQ notifier consumes news-scraping-dlq messages serially.",
      "Failures are buffered in memory and flushed at threshold (25) or timer (60s).",
      "Flush builds one consolidated report with URL, reason, and failed timestamp.",
      "Mailer sends report to ADMIN_EMAIL (or logs noop path in local mode)."
    ],
    functionWalkthrough: [
      {
        filePath: "apps/web/server/workers/dlq-notifier.worker.ts",
        functionName: "startDlqNotifierWorker",
        explanation: "Owns DLQ consume loop, buffer lifecycle, and flush trigger policy."
      },
      {
        filePath: "apps/web/server/mail/mailer.ts",
        functionName: "getMailer",
        explanation: "Chooses SMTP or noop transport and resolves target admin mailbox."
      },
      {
        filePath: "apps/web/server/repositories/import.repo.ts",
        functionName: "markItemFailed",
        explanation: "Ensures item status is persisted as FAILED when notifier sees DLQ payload."
      }
    ],
    storageDetails: [
      "In-memory buffer stores pending failure summaries before flush.",
      "Email message payload includes subject and multiline failure report text.",
      "import_items table remains source of truth for persisted terminal item status."
    ],
    failurePathNotes: [
      "If ADMIN_EMAIL is missing, worker logs warning and skips outbound alerts.",
      "Mailer send failures are logged but do not crash worker consume loop.",
      "Buffer is cleared only when flush starts; repeated failures can be retried on next flush cycle."
    ]
  }
];
