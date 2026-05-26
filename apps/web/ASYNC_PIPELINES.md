# Async pipelines: bulk URL import & view counter

This document covers the two async pipelines added in `async-bulk-import-and-view-pipelines`.

## Overview

Two queue-backed pipelines avoid blocking HTTP handlers:

- **Scraping pipeline** (`news-scraping-queue` → optional `news-scraping-dlq`)
  Admin submits up to 100 URLs via `POST /api/admin/imports/bulk`. The handler
  returns `202 Accepted` immediately. Each URL is enqueued as a job; workers
  fetch + parse + sanitize + insert the news row as `PUBLISHED`. Failures retry
  3 times with exponential backoff (10s base) before going to the DLQ.

- **View-counter pipeline** (`view-counter-queue`)
  `POST /api/news/:id/view` returns `202` after enqueueing the event. A worker
  atomically increments `news.view_count` and upserts `news_view_daily` for the
  current UTC date.

## Queue adapter

`server/queue/index.ts` picks an adapter at runtime:

| Condition | Adapter |
| --- | --- |
| `REDIS_URL` is set and `bullmq` loads | `BullMqQueueAdapter` |
| Otherwise | `InProcessQueueAdapter` (single-process, no broker) |

The in-process adapter implements the same retry, backoff, and DLQ semantics
and is sufficient for local development and tests.

## Running workers

- **Embedded in the Nuxt server (dev convenience):** set `WORKERS_INPROCESS=1`.
  `server/plugins/workers.ts` will start all three workers on boot.
- **Separate process (production):** leave `WORKERS_INPROCESS=0` and run
  `pnpm --filter @mnp/web worker`. This launches `server/workers/run.ts`.

## DLQ email alerts

When the scraping queue exhausts retries, jobs are pushed to
`news-scraping-dlq`. `dlq-notifier.worker.ts` buffers failures and emails the
configured `ADMIN_EMAIL` either every 60s or after 25 failures, listing each
URL, timestamp, and failure reason.

If `SMTP_HOST` is empty the mailer falls back to a no-op transport that logs to
the console — convenient for local dev without an SMTP server.

## Environment variables

See [`.env.example`](./.env.example) for the full list. Required for async
pipelines:

- `REDIS_URL` (optional)
- `WORKERS_INPROCESS` (`1` to run workers inside Nuxt)
- `SCRAPE_MAX_PER_DOMAIN`, `SCRAPE_USER_AGENT`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `ADMIN_EMAIL`

## Endpoints

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/api/news/:id/view` | Returns 202; queues view event. |
| `POST` | `/api/admin/imports/bulk` | Admin-only; returns 202 with `{ batchId, acceptedCount, skippedCount }`. |
| `GET` | `/api/admin/imports/:batchId` | Admin-only; batch + items + per-status counts. |

## Admin UI

- `/admin/imports` — paste up to 100 URLs, pick a category, submit.
- `/admin/imports/:batchId` — auto-refreshing progress table with status badges
  (Pending / Processing / Published / Failed).
