## ADDED Requirements

### Requirement: Admin shell provides mobile-first navigation
The system SHALL provide a responsive admin shell where navigation is available via drawer/toggle on small screens and persistent sidebar on large screens.

#### Scenario: Mobile admin navigation opens and closes
- **WHEN** an authenticated admin opens any `/admin/**` page on a mobile viewport and taps the menu toggle
- **THEN** the navigation drawer opens with dashboard, categories, news, and logout actions, and closes via explicit close action or backdrop interaction

#### Scenario: Desktop admin navigation is persistently visible
- **WHEN** an authenticated admin opens any `/admin/**` page on desktop viewport
- **THEN** the navigation sidebar is visible without requiring a toggle and content remains readable beside the sidebar

## MODIFIED Requirements

### Requirement: Category CRUD UI
The system SHALL provide a responsive admin UI to list, create, edit, and delete categories.

#### Scenario: List categories
- **WHEN** the admin opens `/admin/categories`
- **THEN** a paginated table of categories is displayed with name, slug, news count, and actions

#### Scenario: Create category
- **WHEN** the admin submits a valid category form
- **THEN** the category is created and the list refreshes showing it

#### Scenario: Edit category
- **WHEN** the admin edits a category and submits valid changes
- **THEN** the changes persist and the list reflects the new values

#### Scenario: Delete category that has no news
- **WHEN** the admin confirms deletion of a category with zero news
- **THEN** the category is removed from the list

#### Scenario: Delete category that has news
- **WHEN** the admin attempts to delete a category that still has news
- **THEN** the system shows an error "Cannot delete: category has news articles" and the category is preserved

#### Scenario: Validation error on create/edit
- **WHEN** the admin submits an invalid name or slug
- **THEN** field-level error messages are shown and the request is not sent again until corrected

#### Scenario: Category UI remains usable on mobile
- **WHEN** the admin manages categories on a mobile viewport
- **THEN** list and form interactions remain operable with readable density, no clipped controls, and tappable action targets

### Requirement: News CRUD UI
The system SHALL provide a responsive admin UI to list, create, edit, and delete news articles.

#### Scenario: List news with filters
- **WHEN** the admin opens `/admin/news`
- **THEN** a paginated table is displayed with title, category, status, published date, view count, and actions; filter by category and status is available

#### Scenario: Create news
- **WHEN** the admin submits a valid news form
- **THEN** the news is created and the admin is redirected to the news list with a success toast

#### Scenario: Edit news
- **WHEN** the admin edits an existing news article and submits valid changes
- **THEN** the changes persist

#### Scenario: Delete news
- **WHEN** the admin confirms deletion of a news article
- **THEN** the article is removed from the list

#### Scenario: Validation errors are surfaced
- **WHEN** the API returns a 400 validation error
- **THEN** each field error is mapped to the corresponding form field

#### Scenario: News UI remains usable on mobile
- **WHEN** the admin manages news on a mobile viewport
- **THEN** filters, row actions, and form controls are reachable and usable without horizontal scrolling of the whole page