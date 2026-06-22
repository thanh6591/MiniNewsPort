## ADDED Requirements

### Requirement: Article embedding lifecycle
The system SHALL generate and persist embeddings for each article using title, summary, description, and source fields whenever an article is created or updated.

#### Scenario: Upsert article embedding on content change
- **WHEN** an article is created or updated
- **THEN** the system generates a new embedding and upserts it to the vector index with current metadata

### Requirement: Vector index deletion consistency
The system MUST remove vector records for deleted articles.

#### Scenario: Delete embedding on article removal
- **WHEN** an article is deleted
- **THEN** the system deletes the corresponding vector index entry

### Requirement: Backfill and retry support
The system SHALL support asynchronous backfill and retry for embedding/indexing operations.

#### Scenario: Retry failed indexing task
- **WHEN** an embedding/indexing task fails due to transient error
- **THEN** the system retries according to configured retry policy and records terminal failures for operator review