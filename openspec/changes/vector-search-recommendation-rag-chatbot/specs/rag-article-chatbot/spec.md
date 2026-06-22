## ADDED Requirements

### Requirement: Article-grounded chatbot responses
The system SHALL answer user chat queries using retrieval-augmented generation over all indexed article content.

#### Scenario: Answer grounded question
- **WHEN** a user submits a chatbot question
- **THEN** the system returns an answer generated from retrieved article context

### Requirement: Article card and recommendation rendering data
The system SHALL include structured article references in chatbot responses to allow UI rendering of thumbnail and title cards or recommended article lists.

#### Scenario: Return article cards in chatbot response
- **WHEN** the chatbot returns an answer with supporting or recommended content
- **THEN** the response includes article identifiers and presentation fields including thumbnail and title

### Requirement: Follow-up question suggestions
The system MUST return exactly three follow-up question suggestions after each chatbot response.

#### Scenario: Provide follow-up suggestions
- **WHEN** a chatbot response is generated for a user query
- **THEN** the response includes exactly three follow-up question suggestions

### Requirement: Memory-aware chat orchestration
The system SHALL assemble chatbot context from enabled memory tiers in addition to retrieved article knowledge.

#### Scenario: Include enabled memory tiers in chat context
- **WHEN** a chat request is processed with session or user memory available
- **THEN** the chatbot orchestration includes only the enabled memory tiers permitted for that request