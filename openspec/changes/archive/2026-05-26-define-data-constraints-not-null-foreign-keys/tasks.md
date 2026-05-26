## 1. Schema Constraint Alignment

- [x] 1.1 Review `server/db/schema.ts` and confirm required NOT NULL columns for `categories`, `news`, and `news_view_daily`
- [x] 1.2 Verify FK definitions and delete actions (`news.category_id -> categories.id` restrict, `news_view_daily.news_id -> news.id` cascade)
- [x] 1.3 Generate migration delta for any missing NOT NULL/FK constraints and validate SQL for supported dialects

## 2. Service and Repository Integrity Handling

- [x] 2.1 Ensure create/update service flows validate required fields before persistence and reject null/empty required values
- [x] 2.2 Ensure missing `categoryId` or unknown category references map to deterministic domain errors in news/category services
- [x] 2.3 Confirm delete-category flow preserves FK-restrict semantics and returns `CategoryHasNewsError` consistently

## 3. API Error Mapping and Contract Consistency

- [x] 3.1 Update admin category/news endpoints to return consistent error envelopes for required-field and FK failures
- [x] 3.2 Ensure NOT NULL-related request failures return `VALIDATION_ERROR` (400) with field-level `details` where applicable
- [x] 3.3 Ensure FK-related mutation failures map to `CATEGORY_NOT_FOUND` or `CATEGORY_HAS_NEWS` per operation context

## 4. Test Coverage for Constraints

- [x] 4.1 Add/adjust service tests for required-field null rejection and missing foreign-key references
- [x] 4.2 Add/adjust API tests for create/update payloads missing required fields and invalid `categoryId`
- [x] 4.3 Add/adjust tests for restricted category deletion and news-view cascade behavior

## 5. Verification and Rollout

- [x] 5.1 Run migration, seed, and regression checks (`typecheck`, service tests, API tests)
- [x] 5.2 Verify both dialect modes enforce equivalent NOT NULL/FK behaviors and error semantics
- [x] 5.3 Document any rollout notes or rollback steps discovered during validation

Rollout notes discovered during validation:
- SQLite execution path requires a fallback migration branch because the generated PostgreSQL migration contains enum SQL (`CREATE TYPE`) that SQLite cannot run directly.
- Seed inserts now provide explicit timestamps to avoid reliance on `now()` when running with SQLite.
