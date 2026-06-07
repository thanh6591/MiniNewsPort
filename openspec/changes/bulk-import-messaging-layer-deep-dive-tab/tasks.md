## 1. Page Structure and Tab Navigation

- [ ] 1.1 Refactor `apps/web/pages/diagrams/bulk-import-messaging.vue` to add a tab state model and tab controls for "System Diagram" and "Backend Deep Dive" while preserving existing route and Mermaid rendering behavior.
- [ ] 1.2 Keep existing diagram container and render lifecycle under the diagram tab so current visual flow and error fallback remain unchanged.
- [ ] 1.3 Add stable test markers (for example data attributes or deterministic headings) for tab controls and each deep-dive stage section.

## 2. Deep-Dive Content Model and Rendering

- [ ] 2.1 Create a typed deep-dive content structure (in-page constant or extracted module) that defines ordered backend stages: intake, validation, enqueue, processing, retry/dead-letter, polling, and email notification.
- [ ] 2.2 For each stage, include beginner-focused fields: objective, runtime sequence, function-by-function explanation, and common failure-path notes.
- [ ] 2.3 For each stage, include explicit code references with file path and function names aligned to current backend implementation.
- [ ] 2.4 For each stage, include a "where data is stored" block covering relevant tables/fields, queue payload structures, and notification artifacts.
- [ ] 2.5 Render deep-dive stages in a responsive, readable layout (mobile-first) without horizontal overflow for long code references.

## 3. Accuracy Alignment with Backend Flow

- [ ] 3.1 Verify referenced intake and polling handlers against `apps/web/server/api/admin/imports/bulk.post.ts` and `apps/web/server/api/admin/imports/[batchId].get.ts`.
- [ ] 3.2 Verify orchestration and state mapping against `apps/web/server/services/import.service.ts` and `apps/web/server/repositories/import.repo.ts`.
- [ ] 3.3 Verify retry and DLQ explanations against `apps/web/server/queue/types.ts`, `apps/web/server/queue/bullmq.ts`, `apps/web/server/workers/scraping.worker.ts`, and `apps/web/server/workers/dlq-notifier.worker.ts`.
- [ ] 3.4 Add short maintainer notes in content source so future code changes can update affected learning steps quickly.

## 4. Test Coverage

- [ ] 4.1 Add/update component-level tests to assert tab switching behavior and deterministic rendering of all deep-dive stages.
- [ ] 4.2 Add/update e2e coverage (under `apps/web/e2e/`) to verify deep-dive tab visibility and key instructional markers on both desktop and mobile projects.
- [ ] 4.3 Add assertions that at least one code reference and one storage detail block appear per stage to keep educational depth from regressing.

## 5. Documentation and Final Validation

- [ ] 5.1 Update relevant docs (for example diagram center or architecture docs) to mention the new backend learning tab and intended audience.
- [ ] 5.2 Run targeted test commands for modified unit/component/e2e suites and fix regressions introduced by the tab/content changes.
- [ ] 5.3 Perform final QA pass on `/diagrams/bulk-import-messaging` for tab UX, content clarity, and parity between diagram and deep-dive narratives.
