## Why

The current "Bulk Import and Messaging Layer" page visualizes the async pipeline but does not teach backend beginners how each step maps to real code execution. We need a guided learning tab now so new developers can follow the flow from API entrypoint to queue workers, retries, dead-letter handling, and alerting without guessing where logic lives.

## What Changes

- Add a new educational content tab on the existing "Bulk Import and Messaging Layer" page focused on backend onboarding.
- Provide a structured, step-by-step walkthrough of the end-to-end bulk import flow, including request validation, service orchestration, queue enqueue, worker processing, status polling, and notification aggregation.
- Link each walkthrough step to concrete code locations (file paths and function names) and describe runtime behavior, input/output, and persistence side effects.
- Include a "where data is stored" breakdown for each phase (database tables/fields, queue payloads, transient state, logs, and dead-letter records).
- Add beginner-focused explanations for key functions, expected control flow, error paths, and retry/dead-letter behavior.

## Capabilities

### New Capabilities
- `bulk-import-backend-learning-tab`: Adds an in-page tab that teaches the Bulk Import and Messaging Layer implementation in a beginner-friendly, code-linked, step-by-step backend walkthrough.

### Modified Capabilities
- `public-news-site`: Extends the public diagram page behavior to support tabbed educational content and deep-dive instructional sections.

## Impact

- Affected UI/routes: diagram page and related component structure for "Bulk Import and Messaging Layer".
- Affected content architecture: new structured documentation content model for step-by-step backend learning blocks.
- Potential affected backend references: import API handlers, import services, repositories, queue producers/workers, polling endpoints, and mail/alert pipeline (read-only references for teaching content).
- Testing impact: update/add e2e and component tests for tab navigation, content visibility, and accuracy of code-reference rendering.
