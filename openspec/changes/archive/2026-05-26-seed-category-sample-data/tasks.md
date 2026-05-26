## 1. Deterministic Seed Reset and Generation

- [x] 1.1 Replace insert-if-empty flow with reset-and-reseed flow in `apps/web/server/db/seed.ts`
- [x] 1.2 Generate 30 published posts for each category with category-relevant title/image/content
- [x] 1.3 Rebuild `news_view_daily` sample rows from new seeded posts

## 2. Validate and Roll Out

- [x] 2.1 Run typecheck to ensure no regressions from seed changes
- [x] 2.2 Deploy and verify production API data counts reflect new sample volume
