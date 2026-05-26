## MODIFIED Requirements

### Requirement: Playwright project covers public site flows
The system SHALL include a Playwright test suite verifying public site happy paths at representative mobile and desktop viewports.

#### Scenario: Home page renders sections and most-viewed widget on mobile
- **WHEN** the test opens `/` using a mobile viewport profile
- **THEN** at least one category section and the "Most Viewed Today" widget are visible with no horizontal page overflow

#### Scenario: Home page renders sections and most-viewed widget on desktop
- **WHEN** the test opens `/` using a desktop viewport profile
- **THEN** at least one category section and the "Most Viewed Today" widget are visible with multi-column layout behavior

#### Scenario: Category page infinite scroll loads more items
- **WHEN** the test scrolls to the bottom of a seeded category page with > 10 items
- **THEN** additional items are appended without a full navigation and the URL stays the same

#### Scenario: Detail page shows newer/older links and increments view count
- **WHEN** the test opens a published article and refreshes once
- **THEN** the displayed view count increases by 1 between visits, and clicking "Newer Post" or "Older Post" navigates to the expected sibling

### Requirement: Playwright project covers back-office flows
The system SHALL include a Playwright test suite verifying back-office authentication, CRUD, and responsive shell behavior.

#### Scenario: Invalid login shows error
- **WHEN** the test submits wrong credentials on `/admin/login`
- **THEN** an error message is visible and the URL remains `/admin/login`

#### Scenario: Valid login lands on admin dashboard
- **WHEN** the test submits valid credentials
- **THEN** the URL becomes `/admin` and the JWT cookie is present

#### Scenario: Category CRUD round-trip
- **WHEN** the test creates a unique category, edits its name, and deletes it
- **THEN** each step is visible in the list with the expected values

#### Scenario: News CRUD round-trip with validation
- **WHEN** the test attempts to create a news article with an empty title
- **THEN** a 400 validation error is shown inline; on retry with valid data the news appears in the list; subsequent edit and delete succeed

#### Scenario: Logout invalidates access
- **WHEN** the test clicks Logout and then navigates to `/admin/news`
- **THEN** it is redirected to `/admin/login`

#### Scenario: Admin navigation works on mobile viewport
- **WHEN** the test opens `/admin` on a mobile viewport and toggles navigation
- **THEN** admin navigation actions are accessible and the drawer can be closed without breaking page interaction
