## Context

The project currently seeds a small set of records and only inserts when tables are empty. This does not support refreshing demo data to a known state.

## Decisions

1. Full reset before seed insertion
- Delete `news_view_daily`, `news`, and `categories` in FK-safe order.
- Rationale: guarantees deterministic sample dataset.

2. Category-specific content templates
- Use per-category topic lists to build titles and content.
- Use category-based image seed keywords for predictable visual variety.

3. Fixed volume per category
- Create exactly 30 published posts per category.
- Rationale: supports pagination/infinite-scroll testing across categories.

4. Recreate daily view aggregates
- Populate `news_view_daily` from top seeded posts for "most viewed" sections.

## Risks / Trade-offs

- Seeding is destructive by design and should only be used for demo/sample environments.
- Re-running seed resets demo data and may overwrite manual edits.

## Verification

- Run typecheck.
- Deploy and verify API counts by category and most-viewed endpoint.
