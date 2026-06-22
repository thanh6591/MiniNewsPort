## ADDED Requirements

### Requirement: In-category similar articles section
The system SHALL provide a similar-articles section for article detail views that prioritizes articles from the same category as the viewed article using category-aware re-ranking.

#### Scenario: Render in-category similar articles
- **WHEN** a user opens an article detail page
- **THEN** the system returns similar articles ranked with category match as a primary re-ranking factor

### Requirement: Cross-category similar articles section
The system SHALL provide a secondary similar-articles section that can include any category from the corpus.

#### Scenario: Render global similar articles
- **WHEN** a user opens an article detail page
- **THEN** the system returns semantically similar articles from any category as a separate list

### Requirement: Recommendation deduplication
The system MUST avoid duplicate articles across recommendation sections for the same page render.

#### Scenario: Remove duplicate recommendation entries
- **WHEN** the candidate pools for in-category and cross-category sections overlap
- **THEN** the system excludes duplicates so each article appears at most once across both sections