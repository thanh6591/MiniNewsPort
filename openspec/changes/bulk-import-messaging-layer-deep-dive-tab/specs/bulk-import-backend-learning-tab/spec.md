## ADDED Requirements

### Requirement: Bulk import deep-dive tab provides beginner-oriented backend execution walkthrough
The system SHALL provide a dedicated "Backend Deep Dive" learning tab on the Bulk Import and Messaging Layer page that presents the end-to-end import pipeline as ordered instructional steps for backend beginners.

#### Scenario: User opens deep-dive tab from bulk import diagram page
- **WHEN** a user visits `/diagrams/bulk-import-messaging` and selects the deep-dive tab
- **THEN** the system displays an ordered list of learning steps that covers submission, validation, queue publishing, worker processing, retry/dead-letter handling, polling, and email alerting

### Requirement: Each deep-dive step maps to concrete code locations and functions
For each instructional step, the system SHALL show concrete code references that include file path and function identifier(s) used by the runtime flow.

#### Scenario: Deep-dive step includes actionable code references
- **WHEN** a user expands or reads a step in the deep-dive content
- **THEN** the step displays one or more references to concrete backend functions (for example service, repository, API handler, queue, or worker functions) and their source file locations

### Requirement: Each deep-dive step explains data storage and state transitions
For each instructional step, the system SHALL describe where data is stored or emitted, including relevant database tables/fields and queue/message payload structure when applicable.

#### Scenario: User reviews storage details for a processing step
- **WHEN** a user reads a step that mutates import state or creates records
- **THEN** the content identifies affected storage targets (such as `import_batches`, `import_items`, `news`, queue payloads, or DLQ payloads) and explains resulting state transitions

### Requirement: Deep-dive content distinguishes happy-path and failure-path behavior
The system SHALL explicitly describe happy-path execution and failure-path behavior (retryability, max attempts, dead-letter transition, and consolidated alerting) for relevant stages.

#### Scenario: User studies failure handling details
- **WHEN** a user views the retry/dead-letter section of the deep-dive tab
- **THEN** the content states retry attempts and backoff behavior, terminal failure conditions, DLQ movement, and consolidated admin email alert behavior
