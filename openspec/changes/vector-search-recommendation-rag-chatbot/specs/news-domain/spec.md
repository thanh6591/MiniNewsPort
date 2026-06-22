## ADDED Requirements

### Requirement: Recommendation relevance policy
The domain model SHALL define recommendation ranking rules that combine semantic similarity with category affinity and freshness signals.

#### Scenario: Rank in-category recommendations
- **WHEN** recommendation candidates are scored for the in-category section
- **THEN** the ranking policy applies category affinity as a primary factor while preserving semantic relevance ordering

### Requirement: User view-history domain events
The domain SHALL define and persist user article-view events for personalization features.

#### Scenario: Emit and persist view event
- **WHEN** a user opens an article
- **THEN** a domain event representing the view interaction is recorded with user, article, and timestamp attributes

### Requirement: Chat grounding integrity rule
The domain MUST enforce that chatbot recommendations and cited articles come from retrievable article entities.

#### Scenario: Validate chat article references
- **WHEN** chatbot output includes supporting or recommended articles
- **THEN** each referenced item maps to a valid article entity available to the current user

### Requirement: Tiered memory domain policy
The domain SHALL define separate entities and policies for session memory, persistent user memory, episodic memory, and semantic memory.

#### Scenario: Route memory write to correct tier
- **WHEN** a memory-eligible interaction is processed
- **THEN** the domain policy determines which memory tier receives the write based on interaction type, user state, and feature configuration

### Requirement: Memory consent and deletion policy
The domain MUST enforce consent, retention, and deletion rules for persistent and agent memory tiers.

#### Scenario: Deny persistent memory write for opted-out user
- **WHEN** an authenticated user has disabled persistent memory collection
- **THEN** the domain blocks writes to persistent, episodic, and semantic memory tiers while still allowing session-only chat memory if enabled