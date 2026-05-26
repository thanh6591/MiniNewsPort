## ADDED Requirements

### Requirement: News scraping queue pipeline
The system SHALL publish accepted bulk import items to a `news-scraping-queue` and process them in detached workers rather than in the request thread.

#### Scenario: Accepted bulk import enqueues pending jobs
- **WHEN** the bulk import transport layer accepts a valid batch submission
- **THEN** each accepted URL is persisted with status `Pending` and a corresponding job is pushed to `news-scraping-queue`

#### Scenario: Worker processes a queued scraping job
- **WHEN** a scraping worker claims a pending job
- **THEN** it transitions the item to `Processing`, applies predefined selectors, sanitizes the extracted content against XSS, and persists the article with status `Published` before marking the import item `Published`

#### Scenario: Per-domain concurrency is enforced
- **WHEN** multiple queued jobs target the same source domain
- **THEN** the worker enforces the configured maximum concurrent job count for that domain before starting extraction

### Requirement: Scraping retry and dead-letter handling
The system SHALL retry transient scraping failures with exponential backoff and route terminal failures to `news-scraping-dlq`.

#### Scenario: Retry on transient failure
- **WHEN** a scraping job fails because of a retryable network or timeout error
- **THEN** the system retries the job up to 3 times using exponential backoff starting at 10 seconds

#### Scenario: Dead-letter after retries are exhausted
- **WHEN** a scraping job still fails after the third retry attempt
- **THEN** the job is routed to `news-scraping-dlq` and the related import item is marked `Failed`

#### Scenario: Selector mismatch skips retries
- **WHEN** scraping fails because required selectors do not match the source content
- **THEN** the job is routed directly to `news-scraping-dlq` without consuming retry attempts and the related import item is marked `Failed`

### Requirement: View counter queue pipeline
The system SHALL publish article view events to a dedicated `view-counter-queue` and consume them outside the public request path.

#### Scenario: Accepted view event is enqueued immediately
- **WHEN** the transport layer receives a valid `POST /api/news/{id}/view` request
- **THEN** it returns `202 Accepted` and pushes a payload containing `articleId` and `timestamp` to `view-counter-queue` without waiting for a database update

#### Scenario: View worker persists queued increments
- **WHEN** the view counter worker consumes one or more queued events
- **THEN** it updates `News.view_count` and the corresponding daily counter records for each event outside the originating API request

### Requirement: Operational failure email alerts
The system SHALL send operational alert emails for scraping jobs that land in the DLQ.

#### Scenario: DLQ failures are emailed to the admin address
- **WHEN** one or more scraping jobs are placed on `news-scraping-dlq`
- **THEN** the email integration sends a notification to `ADMIN_EMAIL` listing the failed URLs, timestamps, and specific failure reasons

#### Scenario: SMTP settings come from environment variables
- **WHEN** the email integration initializes
- **THEN** it loads `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `ADMIN_EMAIL` from environment variables rather than hardcoded configuration