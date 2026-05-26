## Why

The current platform handles article detail view increments inline and does not provide an asynchronous bulk import workflow for admins. This change is needed to keep public detail pages responsive under frequent traffic, let admins submit large URL batches without waiting for scraping to finish, and add operational visibility and alerting around asynchronous failures.

## What Changes

- Update the public article detail experience to keep full-content rendering and newer/older navigation while offloading view-count increments to an asynchronous queue-backed pipeline.
- Add an admin bulk import submission flow with a textarea for up to 100 URLs per request and a required target category selector.
- Add an admin progress dashboard that shows each submitted URL moving through `Pending`, `Processing`, `Published`, or `Failed` states in near real time.
- Add a queue-backed scraping pipeline that accepts bulk import requests with HTTP 202, records pending items immediately, performs duplicate checks, scrapes and sanitizes content in a background worker, and routes exhausted failures to a DLQ.
- Add a queue-backed view counter pipeline that accepts HTTP 202 view events and updates article counters from a detached worker rather than the request path.
- Add SMTP-based failure notification support so DLQ scraping failures generate an email to the configured admin address with URLs, timestamps, and failure reasons.

## Capabilities

### New Capabilities
- `async-job-processing`: Queue-backed background processing for scraping and view counting, retry and DLQ behavior, worker concurrency rules, and SMTP failure notifications.

### Modified Capabilities
- `public-news-site`: Change detail-page behavior so view increments are triggered asynchronously without blocking the page render.
- `backoffice-admin`: Add bulk import submission and a real-time progress dashboard for background ingestion jobs.
- `news-api`: Add 202-accepted endpoints for bulk import submission and asynchronous view-count events, and revise detail-fetch semantics accordingly.
- `news-domain`: Extend persisted models to represent bulk import batches/items and asynchronous processing lifecycle state.
- `e2e-tests`: Extend end-to-end coverage for async detail view counting and admin bulk import progress behavior.

## Impact

- Affected areas include Nuxt public pages, admin UI flows, server API handlers, persistence models, repositories, background worker processes, and Playwright coverage.
- New infrastructure dependencies include a messaging layer implementation for queueing and an SMTP/email integration configured through environment variables.
- API contracts will expand to include async bulk import submission, async view increment submission, and progress-tracking responses.