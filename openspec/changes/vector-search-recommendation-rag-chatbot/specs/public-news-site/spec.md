## ADDED Requirements

### Requirement: Semantic search UI experience
The public site SHALL provide a natural-language search input and display semantic results that can be narrowed by category.

#### Scenario: User performs semantic search with category filter
- **WHEN** a user enters a free-text query and selects a category filter
- **THEN** the UI displays semantically ranked results constrained to the selected category

### Requirement: Article detail recommendation sections
The public site SHALL render two recommendation sections on article detail pages: in-category similar articles and cross-category similar articles.

#### Scenario: Article detail page shows dual recommendation blocks
- **WHEN** a user opens an article detail page
- **THEN** the page shows separate in-category and global similar-article sections with no duplicate items

### Requirement: Personalized homepage recommendations UI
The public site SHALL display an "Articles you may like" section on the homepage for authenticated users.

#### Scenario: Homepage personalization rendering
- **WHEN** an authenticated user visits the homepage
- **THEN** the page renders personalized recommendations or fallback recommendations if personalization is unavailable

### Requirement: Chatbot interaction UI
The public site SHALL provide chatbot interaction that displays answers, article cards/lists, and exactly three follow-up question actions after each query.

#### Scenario: Chatbot response rendering
- **WHEN** a user submits a chatbot query
- **THEN** the UI renders answer text, article cards/lists (thumbnail and title), and exactly three follow-up questions

### Requirement: Memory controls UI
The public site SHALL provide chatbot memory controls appropriate to the active user state, including chat reset and visibility into the active memory mode.

#### Scenario: User clears active chat memory
- **WHEN** a user activates the chat reset control
- **THEN** the UI clears visible conversation state and subsequent requests use no prior session memory