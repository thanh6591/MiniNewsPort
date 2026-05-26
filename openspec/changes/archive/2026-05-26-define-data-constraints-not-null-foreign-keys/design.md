## Context

The data model already expresses key relationships between categories, news, and daily view counters, but constraint enforcement and error mapping are not fully explicit across schema, service, and API layers. The change introduces stronger definition and alignment for required fields (NOT NULL) and referential integrity (foreign keys) so all environments and entry points enforce the same rules.

This is cross-cutting because it touches schema/migrations, repositories/services, API error shaping, and test expectations.

## Goals / Non-Goals

**Goals:**
- Ensure core required columns are explicitly non-null in schema and migration outputs.
- Ensure foreign keys and delete actions are explicitly defined for category/news/view relationships.
- Define deterministic mapping from constraint failures to domain/API errors.
- Prevent invalid or orphaned records regardless of entry path.

**Non-Goals:**
- Introducing new entities or changing core business workflows.
- Reworking pagination, UI behavior, or auth behavior.
- Replacing existing ORM or database driver setup.

## Decisions

1. Constraints are source-of-truth in DB schema
- Decision: Keep authoritative integrity guarantees in DB-level constraints (NOT NULL, FK, CHECK, UNIQUE) rather than relying only on request validation.
- Rationale: Prevents integrity drift from alternate write paths and protects data under concurrent operations.
- Alternative considered: service-only validation, rejected because it cannot guarantee integrity outside service boundaries.

2. Explicit FK delete behavior for each relationship
- Decision: Preserve `News.category_id -> Category.id` as `ON DELETE RESTRICT` and `NewsViewDaily.news_id -> News.id` as `ON DELETE CASCADE`.
- Rationale: Category deletion must be blocked when news exists; view rows should be cleaned up automatically when a news row is removed.
- Alternative considered: cascading category delete, rejected to avoid accidental content loss.

3. Constraint violations map to stable API error semantics
- Decision: Normalize constraint-originated failures into existing API error codes (`VALIDATION_ERROR`, `CATEGORY_NOT_FOUND`, `CATEGORY_HAS_NEWS`, `SLUG_CONFLICT`) depending on operation context.
- Rationale: Keeps API contract stable while improving enforcement depth.
- Alternative considered: exposing raw SQL errors, rejected for portability and security reasons.

4. Constraint coverage is verified in service/API tests
- Decision: Add tests for null-required fields, missing FK references, and restricted deletes.
- Rationale: Prevents regression when schema or repository behavior changes.

## Risks / Trade-offs

- [Risk] Existing seed or legacy rows might violate newly enforced constraints. → Mitigation: validate seed/migration assumptions and fail fast during migration.
- [Risk] Different DB dialects can surface different SQL error messages/codes. → Mitigation: keep mapping logic at semantic operation level, not raw message strings.
- [Trade-off] Stricter constraints may reject previously tolerated bad inputs. → Mitigation: document expected errors and align API tests.

## Migration Plan

1. Verify schema definitions for required columns and FK delete actions.
2. Generate/apply migration and ensure both supported dialects enforce equivalent constraints.
3. Update service/API error mapping where constraint failures surface.
4. Add/adjust tests for not-null, missing FK, and restricted delete scenarios.
5. Rollback plan: revert migration and related service/API mapping changes if deployment issues arise.

## Open Questions

- Should missing `categoryId` in admin create/update be consistently treated as `VALIDATION_ERROR` (400) across all endpoints?
- Do we need explicit DB-level check constraints for additional enum-like fields beyond current `status`?
