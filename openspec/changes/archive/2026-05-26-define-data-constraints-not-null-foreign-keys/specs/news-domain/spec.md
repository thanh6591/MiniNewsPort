## MODIFIED Requirements

### Requirement: Category entity and schema
The persistence layer SHALL define a `Category` table with explicit required-field and uniqueness constraints.

Columns:
- `id` PK, auto-generated.
- `name` VARCHAR(100) NOT NULL.
- `slug` VARCHAR(120) NOT NULL, UNIQUE.
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT now().
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now().

#### Scenario: Insert valid category
- **WHEN** a row with a non-null `name` and unique `slug` is inserted
- **THEN** the insert succeeds and timestamps are populated

#### Scenario: Duplicate slug rejected
- **WHEN** a second row attempts to use an existing `slug`
- **THEN** the database rejects the insert with a unique-constraint violation

#### Scenario: Null name rejected
- **WHEN** `name` is null
- **THEN** the database rejects the insert with a not-null violation

### Requirement: News entity and schema with FK to Category
The persistence layer SHALL define a `News` table with columns, constraints, and a NOT NULL FK to `Category(id)` enforcing the 1—n relationship.

Columns:
- `id` PK auto-generated.
- `title` VARCHAR(200) NOT NULL.
- `slug` VARCHAR(220) NOT NULL UNIQUE.
- `summary` VARCHAR(500) NOT NULL.
- `content` TEXT NOT NULL.
- `image_url` VARCHAR(500) NULL.
- `status` VARCHAR(16) NOT NULL CHECK (status IN ('DRAFT','PUBLISHED')).
- `published_at` TIMESTAMPTZ NULL.
- `view_count` INTEGER NOT NULL DEFAULT 0.
- `category_id` INTEGER NOT NULL REFERENCES `Category(id)` ON DELETE RESTRICT.
- `created_at` / `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now().

Indexes:
- `idx_news_category_published` on `(category_id, published_at DESC)`.
- `idx_news_published` on `(published_at DESC)`.

#### Scenario: Insert valid news
- **WHEN** a row with all required fields and a valid `category_id` is inserted
- **THEN** the insert succeeds

#### Scenario: Missing required field rejected
- **WHEN** any required column (`title`, `slug`, `summary`, `content`, `status`, `category_id`) is null
- **THEN** the database rejects the insert or update with a not-null violation

#### Scenario: Missing category FK rejected
- **WHEN** `category_id` references a non-existent Category
- **THEN** the database rejects the insert or update with an FK violation

#### Scenario: Delete category referenced by news rejected
- **WHEN** an attempt is made to delete a Category referenced by at least one News
- **THEN** the database rejects the delete (ON DELETE RESTRICT)

#### Scenario: Invalid status value
- **WHEN** `status` is set to a value other than 'DRAFT' or 'PUBLISHED'
- **THEN** the database rejects the insert via the CHECK constraint

### Requirement: Daily view counter entity
The persistence layer SHALL define a `NewsViewDaily` table with unique `(news_id, view_date)` and a required FK to `News(id)`.

Columns:
- `id` PK.
- `news_id` INTEGER NOT NULL REFERENCES `News(id)` ON DELETE CASCADE.
- `view_date` DATE NOT NULL.
- `view_count` INTEGER NOT NULL DEFAULT 0.
- UNIQUE (`news_id`, `view_date`).
- Index `(view_date, view_count DESC)`.

#### Scenario: Upsert today's counter
- **WHEN** a view event occurs for a news article and `(news_id, today)` does not exist
- **THEN** a row is inserted with `view_count = 1`

#### Scenario: Increment existing counter
- **WHEN** a view event occurs and `(news_id, today)` already exists
- **THEN** `view_count` is incremented by 1 atomically

#### Scenario: Missing news FK rejected
- **WHEN** `news_id` references a non-existent News row
- **THEN** the database rejects the insert with an FK violation

#### Scenario: Cascade on news delete
- **WHEN** a News row is deleted
- **THEN** all related `NewsViewDaily` rows are deleted automatically
