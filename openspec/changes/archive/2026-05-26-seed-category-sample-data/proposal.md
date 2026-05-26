## Why

Current production sample rows are outdated and sparse. We need a deterministic, category-relevant dataset for demos and QA.

## What Changes

- Replace existing sample dataset in seed flow instead of appending.
- Generate 30 published posts for each core category.
- Ensure each post has category-relevant title, image seed, and content.
- Regenerate `news_view_daily` rows from the new seeded posts.

## Capabilities

### Modified Capabilities
- `news-domain`: Seeding now fully resets and recreates deterministic sample data.

## Impact

- Affected code: `apps/web/server/db/seed.ts`, deployment seed execution through `vercel.json`.
- Data impact: seeded categories/news/news_view_daily rows are replaced on seed runs.
