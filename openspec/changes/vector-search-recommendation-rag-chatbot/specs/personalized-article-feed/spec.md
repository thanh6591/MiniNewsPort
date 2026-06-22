## ADDED Requirements

### Requirement: Personalized homepage recommendations
The system SHALL provide an "Articles you may like" feed on the homepage for authenticated users based on their historical article views.

#### Scenario: Show personalized feed for signed-in user
- **WHEN** an authenticated user loads the homepage
- **THEN** the system returns a ranked set of articles computed from the user's view-history signals

### Requirement: Cold-start fallback for personalization
The system MUST provide a non-personalized fallback recommendation list when a user has insufficient view history.

#### Scenario: Insufficient history for personalization
- **WHEN** a user has fewer than the minimum required historical interactions
- **THEN** the system returns fallback recommendations using popularity/recency/category-blend strategy

### Requirement: View-history signal capture
The system SHALL persist user article-view events required for personalization updates.

#### Scenario: Record article view event
- **WHEN** an authenticated user views an article
- **THEN** the system stores a view-history event linked to user and article identifiers