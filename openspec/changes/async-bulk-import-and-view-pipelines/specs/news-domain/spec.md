## MODIFIED Requirements

### Requirement: View-count service logic
The service layer SHALL persist queued view events outside the public detail request path while still incrementing both `News.view_count` and `NewsViewDaily.view_count` atomically for each accepted event.

#### Scenario: Queued view event increments counters atomically
- **WHEN** the view-counter worker handles an accepted event for a published article
- **THEN** within a single transaction it increments `News.view_count` by 1 and upserts `NewsViewDaily(news_id, today)` incrementing its counter by 1

#### Scenario: Missing or unpublished article does not increment counters
- **WHEN** the worker receives a queued view event for an article that is missing or not published
- **THEN** no counter is incremented for that event

## ADDED Requirements

### Requirement: Bulk import batch persistence
The persistence layer SHALL define durable entities for bulk import batches and their item-level processing state.

#### Scenario: Batch and items are created immediately
- **WHEN** a valid bulk import submission is accepted
- **THEN** the database stores a batch record and one child item per submitted URL before background processing begins

#### Scenario: Item lifecycle status is persisted
- **WHEN** background processing advances an import item
- **THEN** the corresponding record is updated to `Pending`, `Processing`, `Published`, or `Failed` with timestamps and any failure reason needed by the admin dashboard

#### Scenario: Duplicate URLs are captured deterministically
- **WHEN** duplicate checks detect that a submitted URL cannot proceed
- **THEN** the related item record is persisted with a terminal failure reason instead of being silently dropped