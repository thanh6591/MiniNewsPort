## Why

Data integrity rules for required fields and relationships need to be explicit and consistently enforced across schema, services, and APIs. Defining NOT NULL and foreign-key constraints now prevents invalid records and ambiguity during future migrations and feature work.

## What Changes

- Define and standardize mandatory NOT NULL constraints for core domain entities where data must always exist.
- Define and standardize foreign-key constraints and delete behavior for `Categories` → `News` and dependent tables.
- Clarify how constraint violations map to service/domain errors and API response codes.
- Ensure schema and migration expectations are explicit so environments apply the same integrity rules.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `news-domain`: Clarify and enforce NOT NULL and foreign-key relationship constraints for category/news/view entities.
- `news-api`: Clarify API behavior and error mapping when integrity constraints are violated.

## Impact

- Affected code: `apps/web/server/db/schema.ts`, migrations under `apps/web/drizzle/**`, repositories/services handling create/update/delete flows, and error translation middleware.
- Affected APIs: admin/news and admin/category mutation endpoints where FK and not-null violations surface.
- Affected tests: service tests and endpoint tests asserting conflict/validation/not-found behavior for constraint failures.
- Data impact: no model expansion required, but migration alignment and validation consistency are required.
