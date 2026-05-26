## Context

The current Mini News Portal is a single Nuxt-based application that serves both the public website and the admin panel. Public article detail reads currently own view-counter mutations, and the admin experience only supports direct article CRUD rather than asynchronous ingestion from URL batches. The requested change adds two background-processing flows with different traffic characteristics: high-frequency lightweight view events and lower-frequency but failure-prone scraping jobs. The design must preserve fast public page render, give admins immediate submission feedback with progress visibility, and provide operational reporting for failed scraping work.

## Goals / Non-Goals

**Goals:**
- Decouple public detail rendering from view-counter writes by introducing a dedicated queue-backed view counting pipeline.
- Accept bulk import submissions synchronously only for validation, duplicate checks, and persistence of batch/item records, then move scraping to background workers.
- Provide an admin progress dashboard that reflects item lifecycle transitions from `Pending` to `Processing` to `Published` or `Failed`.
- Add retry, DLQ, and SMTP alerting behavior for scraping failures so operational issues are visible without inspecting logs.
- Keep the change compatible with the current Nuxt server, database access layer, and Playwright-driven validation approach.

**Non-Goals:**
- Building a generic workflow engine for arbitrary background jobs.
- Supporting more than 100 URLs per submission or multi-category submission in a single batch.
- Implementing advanced editorial review for imported articles before publication.
- Replacing existing category/news CRUD flows outside the new import surface.

## Decisions

### Use BullMQ with Redis for both asynchronous pipelines
BullMQ with Redis is the primary messaging choice for this change. The repo already runs as a Node-based server application, and BullMQ gives durable queues, delayed retry with exponential backoff, worker concurrency controls, and queue inspection primitives that map directly to the required scraping and view-counting pipelines.

Alternatives considered:
- QStash: simpler hosted delivery, but it adds an external dependency for every environment and is less natural for domain-concurrency controls and in-process progress projection.
- Database polling jobs: lower infrastructure overhead, but poor fit for bursty view events and retry/DLQ semantics.

### Split transport APIs from worker-side mutation responsibilities
HTTP handlers will validate input and create durable records, but they will not perform scraping or counter updates inline. `GET /api/news/{slug}` becomes read-only. `POST /api/news/{id}/view` accepts and enqueues a lightweight event. `POST /api/admin/imports/bulk` performs validation, duplicate checks, and batch/item inserts, then enqueues scraping jobs and returns `202 Accepted` with a batch identifier.

Alternatives considered:
- Keeping detail reads write-through: rejected because it preserves request-path coupling and blocks on database writes.
- Performing scraping synchronously after validation: rejected because it prevents immediate admin feedback and makes network failures user-facing.

### Model bulk imports explicitly as batches and batch items
The database will store a parent batch record and child item records. Each item tracks the source URL, target category, lifecycle status, timestamps, failure reason, retry metadata, and optional published news id. This gives the admin dashboard a durable source of truth and avoids coupling UI state to ephemeral queue metadata.

Alternatives considered:
- Queue-only progress: rejected because workers and dashboards need a persistent audit trail across restarts.
- Storing one free-form JSON batch blob: rejected because per-item filtering, polling, and status updates become harder to query safely.

### Enforce per-domain scraping concurrency in the worker layer
The scraping worker will normalize each URL to a domain key and coordinate a capped concurrency limit per domain before starting extraction. This protects the target sites from burst overload and reduces correlated timeout failures within a single batch.

Alternatives considered:
- Queue-wide concurrency only: simpler, but it does not prevent one domain from monopolizing worker capacity or triggering throttling.
- No concurrency control: rejected because it increases timeout and ban risk.

### Treat content sanitization and final persistence as part of worker success criteria
The worker only marks an item `Published` after selector extraction succeeds, content is sanitized against XSS, and the article has been saved successfully. Selector mismatches and exhausted retries move the item to `Failed` and publish the failure to the DLQ.

Alternatives considered:
- Persisting raw scraped HTML first and sanitizing later: rejected because it leaks unsafe content into the primary persistence path.

### Use database-backed progress reads with short polling from the admin dashboard
The progress dashboard will read batch and item status from an authenticated endpoint backed by the database. The UI will poll at a short interval to present near-real-time lifecycle updates. This is simpler to deploy inside the current Nuxt stack than introducing WebSockets for the first version.

Alternatives considered:
- WebSockets or SSE: more real-time, but adds connection lifecycle complexity and operational overhead not required by the request.

### Send consolidated DLQ failure notifications through SMTP configuration from environment variables
The email module will read `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `ADMIN_EMAIL` from environment variables. When scraping jobs exhaust retries or fail due to selector mismatch, the failure handler will aggregate failed item details and send a notification email to the configured admin address.

Alternatives considered:
- Logging only: rejected because the requirement explicitly asks for operational email alerts.
- Per-item immediate emails: rejected because batch consolidation reduces alert noise.

## Risks / Trade-offs

- Redis becomes a runtime dependency for public view counting and admin imports -> Mitigation: treat queue publish failures as observable server errors, add health checks, and document local/dev Redis setup alongside Postgres.
- View counts become eventually consistent rather than immediately updated on first page render -> Mitigation: document the async behavior in specs and validate eventual counter updates in automated tests.
- Polling-based progress dashboards increase read traffic during large batches -> Mitigation: keep payloads scoped to a single batch and use modest polling intervals.
- Domain concurrency controls add worker complexity -> Mitigation: keep concurrency configuration small and deterministic, and store domain keys explicitly in job payload metadata.
- Email alerts can be noisy during systemic failures -> Mitigation: consolidate failures per batch/DLQ drain cycle instead of sending one email per failed item.

## Migration Plan

1. Add Redis to local and deployed environments and provision the required queue configuration variables.
2. Introduce the new persistence schema for import batches/items and any retry or failure metadata required for worker bookkeeping.
3. Ship queue producers in the API layer behind the new 202-accepted endpoints.
4. Deploy dedicated workers for `news-scraping-queue`, `view-counter-queue`, and `news-scraping-dlq` handling.
5. Release the admin bulk import submission and dashboard UI after the API and workers are available.
6. Roll back by disabling producers and workers, preserving persisted batch data for inspection; public article reads remain functional because detail fetches are read-only.

## Open Questions

- Which predefined selector catalog will be supported initially, and where will those selectors be configured and versioned?
- Should duplicate detection only reject URLs already present within the same batch, or also reject URLs whose content has already been imported into the news table?
- What polling interval gives acceptable freshness for the admin dashboard without unnecessary database load?