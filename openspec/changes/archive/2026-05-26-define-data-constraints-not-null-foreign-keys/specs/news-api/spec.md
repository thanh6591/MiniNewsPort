## MODIFIED Requirements

### Requirement: Admin category CRUD endpoints
The API SHALL expose authenticated `GET/POST/PUT/DELETE /api/admin/categories` operations, requiring a valid JWT, and SHALL enforce FK-related delete restrictions.

#### Scenario: Create category
- **WHEN** an authenticated admin posts a valid category body
- **THEN** the response is 201 with the created category

#### Scenario: Slug conflict
- **WHEN** the submitted slug already exists
- **THEN** the response is 409 with `error.code = "SLUG_CONFLICT"`

#### Scenario: Update category
- **WHEN** an authenticated admin PUTs valid changes to an existing category
- **THEN** the response is 200 with the updated category

#### Scenario: Delete category with no news
- **WHEN** an authenticated admin DELETEs a category that has no news
- **THEN** the response is 204

#### Scenario: Delete category with news
- **WHEN** the category has at least one news article
- **THEN** the response is 409 with `error.code = "CATEGORY_HAS_NEWS"`

#### Scenario: Unauthenticated request
- **WHEN** no/invalid JWT is supplied
- **THEN** the response is 401 with `error.code = "UNAUTHORIZED"`

### Requirement: Admin news CRUD endpoints
The API SHALL expose authenticated `GET/POST/PUT/DELETE /api/admin/news` operations with validation and integrity-constraint behavior for required fields and category references.

#### Scenario: Create news
- **WHEN** an authenticated admin posts a valid news body
- **THEN** the response is 201 with the created news

#### Scenario: Validation failure on create/edit
- **WHEN** the body fails any field rule (title, slug pattern, summary length, content length, imageUrl URL, categoryId existence, status enum, publishedAt when PUBLISHED)
- **THEN** the response is 400 with `error.code = "VALIDATION_ERROR"` and a `details` array listing each invalid field

#### Scenario: Missing required field
- **WHEN** required fields (`title`, `slug`, `summary`, `content`, `status`, or `categoryId`) are missing or null in create/update payloads
- **THEN** the response is 400 with `error.code = "VALIDATION_ERROR"`

#### Scenario: Reference to missing category
- **WHEN** the `categoryId` does not exist
- **THEN** the response is 400 with `error.code = "CATEGORY_NOT_FOUND"`

#### Scenario: Slug conflict on news
- **WHEN** the slug already exists
- **THEN** the response is 409 with `error.code = "SLUG_CONFLICT"`

#### Scenario: Update news
- **WHEN** an authenticated admin PUTs valid changes
- **THEN** the response is 200 with the updated news

#### Scenario: Delete news
- **WHEN** an authenticated admin DELETEs an existing news article
- **THEN** the response is 204

#### Scenario: Not found
- **WHEN** the id does not exist
- **THEN** the response is 404 with `error.code = "NEWS_NOT_FOUND"`
