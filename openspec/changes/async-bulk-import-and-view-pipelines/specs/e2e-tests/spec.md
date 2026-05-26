## MODIFIED Requirements

### Requirement: Playwright project covers public site flows
The system SHALL include a Playwright test suite verifying public site happy paths at representative mobile and desktop viewports, including asynchronous detail-page view reporting.

#### Scenario: Home page renders sections and most-viewed widget on mobile
- **WHEN** the test opens `/` using a mobile viewport profile
- **THEN** at least one category section and the "Most Viewed Today" widget are visible with no horizontal page overflow

#### Scenario: Home page renders sections and most-viewed widget on desktop
- **WHEN** the test opens `/` using a desktop viewport profile
- **THEN** at least one category section and the "Most Viewed Today" widget are visible with multi-column layout behavior

#### Scenario: Category page infinite scroll loads more items
- **WHEN** the test scrolls to the bottom of a seeded category page with > 10 items
- **THEN** additional items are appended without a full navigation and the URL stays the same

#### Scenario: Detail page shows newer/older links and reports view count asynchronously
- **WHEN** the test opens a published article and triggers a second visit or poll after the asynchronous view report is accepted
- **THEN** the article content renders before waiting on counter mutation, the displayed view count eventually increases, and clicking "Newer Post" or "Older Post" navigates to the expected sibling

## ADDED Requirements

### Requirement: Playwright project covers async admin import flows
The system SHALL include Playwright coverage for admin bulk import submission and progress tracking.

#### Scenario: Admin submits a bulk import batch and sees progress
- **WHEN** the test logs in, submits a valid URL batch, and lands on the progress dashboard
- **THEN** a success notification is shown immediately and at least one imported item status transitions through the expected lifecycle states without blocking the redirect