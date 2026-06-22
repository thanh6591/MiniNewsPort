## ADDED Requirements

### Requirement: Semantic free-text article search
The system SHALL accept natural-language search queries and return ranked article results based on semantic similarity across article title, summary, description, and source content.

#### Scenario: Execute semantic search with free text
- **WHEN** a user submits a non-empty natural-language query
- **THEN** the system returns articles ranked by semantic relevance score derived from article embeddings

### Requirement: Category-constrained semantic search
The system SHALL allow semantic search results to be narrowed by category while preserving relevance ordering within the selected category.

#### Scenario: Apply category filter to semantic search
- **WHEN** a user submits a semantic query with a category filter
- **THEN** the system returns only results belonging to the selected category sorted by semantic relevance

### Requirement: Search fallback behavior
The system MUST return a deterministic fallback result set when vector retrieval is unavailable.

#### Scenario: Vector retrieval failure during search
- **WHEN** vector search fails or times out for a search request
- **THEN** the system returns keyword/popularity fallback results and marks the response as fallback-enabled