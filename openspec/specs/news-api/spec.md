# news-api Specification

## Purpose
TBD - created by archiving change mini-news-portal. Update Purpose after archive.
## Requirements
### Requirement: Public categories listing endpoint
The API SHALL expose `GET /api/categories` returning all categories ordered by name ASC.

#### Scenario: List categories
- **WHEN** a client calls `GET /api/categories`
- **THEN** the response is 200 with a JSON array of `{ id, name, slug, newsCount }`

### Requirement: Public news listing with pagination and filtering
The API SHALL expose `GET /api/news` returning a paginated list of PUBLISHED news, optionally filtered by `categoryId` or `categorySlug`, ordered by `publishedAt DESC, id DESC`.

#### Scenario: Default page
- **WHEN** a client calls `GET /api/news`
- **THEN** the response is 200 with `{ items: News[], page: 1, limit: 10, total, hasMore }`

#### Scenario: Specific page and limit
- **WHEN** a client calls `GET /api/news?page=2&limit=10&categorySlug=tech`
- **THEN** the response returns items 11–20 of category `tech` and `hasMore` is true only if more items remain

#### Scenario: Invalid pagination parameters
- **WHEN** `page` < 1 or `limit` > 50 or non-numeric
- **THEN** the response is 400 with `error.code = "VALIDATION_ERROR"`

#### Scenario: Unknown category filter
- **WHEN** `categorySlug` does not match any category
- **THEN** the response is 404 with `error.code = "CATEGORY_NOT_FOUND"`

### Requirement: Public news detail endpoint with view increment
The API SHALL expose `GET /api/news/{slug}` returning the full article plus `newerSlug` and `olderSlug` siblings, and SHALL atomically increment total and per-day view counts on each call.

#### Scenario: Fetch published article
- **WHEN** a client calls `GET /api/news/{slug}` for a PUBLISHED article
- **THEN** the response is 200 with the article fields plus `newerSlug` and `olderSlug` (each may be null) and the article's `viewCount` and today's view tally are each incremented by 1

#### Scenario: Article not found or draft
- **WHEN** the slug does not match a PUBLISHED article
- **THEN** the response is 404 with `error.code = "NEWS_NOT_FOUND"`

### Requirement: Most viewed today endpoint
The API SHALL expose `GET /api/news/most-viewed-today?limit=5` returning the top N articles by today's view count.

#### Scenario: Fetch top viewed today
- **WHEN** a client calls `GET /api/news/most-viewed-today`
- **THEN** the response is 200 with up to 5 items `{ id, slug, title, todayViewCount }` ordered by `todayViewCount` DESC

#### Scenario: Limit out of range
- **WHEN** `limit` is < 1 or > 20
- **THEN** the response is 400 with `error.code = "VALIDATION_ERROR"`

### Requirement: Authentication endpoints
The API SHALL expose `POST /api/auth/login` and `POST /api/auth/logout` for stateless JWT auth.

#### Scenario: Login success
- **WHEN** the client posts valid `{ username, password }`
- **THEN** the response is 200 with `{ token, expiresAt }` and an `httpOnly Secure SameSite=Lax` cookie `mnp_token` is set

#### Scenario: Login failure
- **WHEN** credentials do not match the hardcoded admin
- **THEN** the response is 401 with `error.code = "INVALID_CREDENTIALS"`

#### Scenario: Login validation
- **WHEN** the body is missing `username` or `password`
- **THEN** the response is 400 with `error.code = "VALIDATION_ERROR"`

#### Scenario: Logout
- **WHEN** the client calls `POST /api/auth/logout`
- **THEN** the response is 204 and the `mnp_token` cookie is cleared

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

### Requirement: Standardized error response envelope
The API SHALL return errors in a single JSON envelope shape `{ error: { code, message, details? } }` and SHALL use HTTP status codes 400, 401, 403, 404, 409, 500 as documented.

#### Scenario: Validation error shape
- **WHEN** a request fails validation
- **THEN** the response status is 400 and the body matches `{ error: { code: "VALIDATION_ERROR", message: string, details: Array<{ field, message }> } }`

#### Scenario: Unhandled exception
- **WHEN** the server throws an unexpected exception
- **THEN** the response status is 500 and the body is `{ error: { code: "INTERNAL_ERROR", message: "Internal server error" } }` with no stack trace leaked

