## 1. Queue and environment setup

- [x] 1.1 Add BullMQ, Redis client, and SMTP mailer dependencies plus configuration helpers for queue and email environment variables.
- [x] 1.2 Extend local and deployment configuration to provide Redis connectivity and document the required `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `ADMIN_EMAIL` settings.

## 2. Persistence and domain modeling

- [x] 2.1 Add database schema and migrations for bulk import batches and per-URL import items, including lifecycle status, timestamps, failure reason, and published article linkage.
- [x] 2.2 Add repository and service-layer support for creating import batches, recording duplicate-check outcomes, reading batch progress, and updating item state transitions.
- [x] 2.3 Refactor view-count domain logic so queued events can atomically update `News.view_count` and `NewsViewDaily` outside the public detail read path.

## 3. API transport layer

- [x] 3.1 Update `GET /api/news/{slug}` to return article detail data without performing synchronous counter mutation.
- [x] 3.2 Implement `POST /api/news/{id}/view` to validate the article, enqueue a view event payload, and return `202 Accepted`.
- [x] 3.3 Implement authenticated `POST /api/admin/imports/bulk` with textarea-style URL validation, 100-line max enforcement, duplicate checks, batch creation, and queue publishing.
- [x] 3.4 Implement authenticated `GET /api/admin/imports/{batchId}` to return batch summary and per-item progress data for the dashboard.

## 4. Background workers and failure handling

- [x] 4.1 Implement the scraping worker for `news-scraping-queue`, including per-domain concurrency control, selector-based extraction, XSS sanitization, and published-article persistence.
- [x] 4.2 Implement exponential backoff retry behavior, DLQ routing to `news-scraping-dlq`, and deterministic failure-state updates for exhausted retries and selector mismatches.
- [x] 4.3 Implement the view-counter worker for `view-counter-queue`, including transactional updates for total and daily counters.
- [x] 4.4 Implement DLQ email alerting that consolidates failed URLs, timestamps, and reasons and sends them to `ADMIN_EMAIL`.

## 5. Public and admin UI

- [x] 5.1 Update the public article detail page to trigger the asynchronous view-report request without blocking full-content rendering or newer/older navigation.
- [x] 5.2 Add the admin bulk import submission screen with a multi-line URL textarea, required category dropdown, inline validation, and immediate success toast behavior.
- [x] 5.3 Add the admin bulk import progress dashboard with authenticated polling and per-item `Pending`, `Processing`, `Published`, and `Failed` status presentation.

## 6. Verification and rollout

- [x] 6.1 Add or update automated server tests covering async detail view reporting, bulk import validation, progress responses, retry behavior, and failure-state persistence.
- [x] 6.2 Extend Playwright coverage for async public detail view counting and admin bulk import submission plus progress tracking.
- [x] 6.3 Update developer and operations documentation for Redis, worker startup, queue monitoring, and SMTP alert configuration.