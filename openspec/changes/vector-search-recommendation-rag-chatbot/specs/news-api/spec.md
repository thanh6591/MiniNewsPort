## ADDED Requirements

### Requirement: Semantic article search API
The API SHALL expose an endpoint for semantic free-text article search with optional category filtering.

#### Scenario: Semantic search API request
- **WHEN** a client calls the semantic search endpoint with query text and optional category
- **THEN** the API returns ranked article results and response metadata including fallback indicator

### Requirement: Recommendation API for article detail
The API SHALL expose recommendation endpoints that return in-category similar articles and cross-category similar articles for a given article.

#### Scenario: Fetch dual recommendation sections
- **WHEN** a client requests recommendations for an article detail page
- **THEN** the API returns two distinct recommendation lists: in-category and global

### Requirement: Personalized feed API
The API SHALL expose an authenticated endpoint returning personalized homepage recommendations.

#### Scenario: Request personalized recommendations
- **WHEN** an authenticated client requests the personalized feed endpoint
- **THEN** the API returns user-specific recommendation results or cold-start fallback results

### Requirement: RAG chatbot API contract
The API MUST expose a chatbot endpoint returning answer text, article references for card/list rendering, and exactly three follow-up questions.

#### Scenario: Chatbot API response structure
- **WHEN** a client sends a chat query to the chatbot endpoint
- **THEN** the API returns `answer`, article reference arrays, and exactly three follow-up suggestions

### Requirement: Chat memory state APIs
The API SHALL expose memory-state controls needed to inspect applicable memory mode, reset session memory, and manage user memory preferences.

#### Scenario: Reset chat session memory via API
- **WHEN** a client requests session-memory reset for the active chat session
- **THEN** the API clears session memory and confirms subsequent chat turns will be processed without prior session state