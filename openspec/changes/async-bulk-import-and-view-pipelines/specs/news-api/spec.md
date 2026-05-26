## MODIFIED Requirements

### Requirement: Public news detail endpoint with view increment
The API SHALL expose `GET /api/news/{slug}` returning the full article plus `newerSlug` and `olderSlug` siblings, and SHALL return persisted view totals without waiting for any view-counter mutation in the response path.

#### Scenario: Fetch published article
- **WHEN** a client calls `GET /api/news/{slug}` for a PUBLISHED article
- **THEN** the response is `200` with the article fields plus `newerSlug` and `olderSlug` (each may be null) and the current persisted `viewCount` and today's view tally

#### Scenario: Article not found or draft
- **WHEN** the slug does not match a PUBLISHED article
- **THEN** the response is `404` with `error.code = "NEWS_NOT_FOUND"`

## ADDED Requirements

### Requirement: Public view increment endpoint
The API SHALL expose `POST /api/news/{id}/view` that accepts view events asynchronously.

#### Scenario: Accepted view event
- **WHEN** a client posts a valid view event for an existing article id
- **THEN** the response is `202 Accepted` and the server immediately enqueues a payload containing `articleId` and `timestamp`

#### Scenario: Article does not exist
- **WHEN** the `id` does not match an existing article
- **THEN** the response is `404` with `error.code = "NEWS_NOT_FOUND"`

### Requirement: Admin bulk import submission endpoint
The API SHALL expose authenticated `POST /api/admin/imports/bulk` for bulk scraping submissions.

#### Scenario: Valid bulk import submission
- **WHEN** an authenticated admin posts 1 to 100 URLs and a valid `categoryId`
- **THEN** the response is `202 Accepted`, the server performs duplicate checks, creates the batch and item records immediately, and enqueues scraping jobs for accepted items

#### Scenario: Submission validation failure
- **WHEN** the request body contains zero URLs, more than 100 URLs, malformed URLs, or a missing category id
- **THEN** the response is `400` with `error.code = "VALIDATION_ERROR"`

#### Scenario: Unauthenticated submission
- **WHEN** no valid admin JWT is supplied
- **THEN** the response is `401` with `error.code = "UNAUTHORIZED"`

### Requirement: Admin bulk import progress endpoint
The API SHALL expose authenticated `GET /api/admin/imports/{batchId}` for progress reporting.

#### Scenario: Fetch batch progress
- **WHEN** an authenticated admin requests an existing batch id
- **THEN** the response is `200` with batch metadata and a per-item list containing each URL, status, timestamps, and optional failure reason

#### Scenario: Batch not found
- **WHEN** the `batchId` does not exist
- **THEN** the response is `404` with `error.code = "IMPORT_BATCH_NOT_FOUND"`