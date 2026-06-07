## Context

The existing diagram page at `/diagrams/bulk-import-messaging` visualizes the async pipeline with Mermaid and a short bullet list. It does not provide the backend-oriented instructional depth requested for onboarding new developers.

Relevant runtime flow already exists in code:
- API intake: `server/api/admin/imports/bulk.post.ts`
- Progress polling: `server/api/admin/imports/[batchId].get.ts`
- Orchestration and enqueue: `server/services/import.service.ts`
- Persistence and status transitions: `server/repositories/import.repo.ts`
- Retry/dead-letter semantics: `server/queue/types.ts` and `server/queue/bullmq.ts`
- Scraping worker execution: `server/workers/scraping.worker.ts`
- DLQ consolidated email alerting: `server/workers/dlq-notifier.worker.ts`

The change must keep the existing visual diagram while adding a tabbed educational mode that explains end-to-end execution, function-by-function, including where state is stored.

## Goals / Non-Goals

**Goals:**
- Add an additional content tab on the existing Bulk Import and Messaging page.
- Provide a beginner-friendly backend walkthrough with ordered steps that map to real code files and functions.
- For each step, explain inputs, outputs, side effects, and storage locations (DB tables/columns, queue payloads, and DLQ email behavior).
- Preserve existing diagram behavior and existing route URL.
- Ensure content is testable and discoverable in desktop and mobile layouts.

**Non-Goals:**
- No changes to import business logic, queue retry policy, or worker runtime behavior.
- No schema migrations, queue topology changes, or API contract changes.
- No replacement of Mermaid diagram with a different rendering stack.

## Decisions

1. Use in-page tab switching instead of a new route.
- Decision: Keep `/diagrams/bulk-import-messaging` as single route with tabs (e.g., "System Diagram" and "Backend Deep Dive").
- Rationale: Preserves existing links and context while allowing progressive disclosure for beginners.
- Alternative considered: A separate route for educational content. Rejected to avoid duplication and navigation fragmentation.

2. Represent the deep-dive as structured, typed step data in the page layer.
- Decision: Create a typed content structure (array of ordered steps) that includes: step title, objective, execution path, function list, storage details, error/retry behavior, and troubleshooting notes.
- Rationale: Enables deterministic rendering, easy test assertions, and future reuse for other diagrams.
- Alternative considered: Free-form markdown block. Rejected because line-by-line function mapping and storage metadata become hard to validate.

3. Build explicit code-reference fields (file + function) and render them as readable references.
- Decision: Each step includes canonical file path references and function names (for example: `importService.submitBulk`, `importRepo.markItemProcessing`, `startDlqNotifierWorker`).
- Rationale: The user asked for detailed guidance tied to concrete code; this structure supports onboarding and reduces guesswork.
- Alternative considered: Narrative text only. Rejected because it is less actionable for newcomers.

4. Include a dedicated "Where data is stored" subsection in every step.
- Decision: Every step must enumerate persistent and transient storage:
  - Postgres: `import_batches`, `import_items`, `news`
  - Queue payloads: `ScrapeJobData`, `DlqPayload<ScrapeJobData>`
  - Operational channels: mail send payload via mailer implementation
- Rationale: New backend developers need data lineage visibility.
- Alternative considered: One global storage section. Rejected because it disconnects storage from runtime step context.

5. Keep backend code references read-only and defensively versioned in content tests.
- Decision: Do not introspect source code at runtime. Persist curated references in static page data, with tests asserting key references exist.
- Rationale: Avoid runtime file-system coupling and keep rendering deterministic in Nuxt SSR/client.
- Alternative considered: Runtime parsing of source files. Rejected due to complexity and fragility.

## Risks / Trade-offs

- [Risk] Code references in educational content can become stale if files/functions are renamed.
  → Mitigation: Add focused unit/component assertions for expected references and add a maintenance checklist in the content data comments.

- [Risk] The page may become visually dense for small screens.
  → Mitigation: Use collapsible step cards or compact sections with clear hierarchy and responsive spacing.

- [Risk] Beginners may misread explanation as exact execution order in failure paths.
  → Mitigation: Explicitly separate happy-path, retry-path, and terminal-failure path inside each relevant step.

- [Trade-off] Static curated content is simpler and stable but requires manual updates when backend code evolves.
  → Mitigation: Keep references centralized in one content structure and validate via tests.
