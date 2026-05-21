## 1. Shell Architecture Cleanup

- [ ] 1.1 Consolidate public shell ownership into `layouts/default.vue` and remove duplicated header/footer usage from page-level templates
- [ ] 1.2 Ensure public routes use one consistent header/footer across home, category, and detail pages
- [ ] 1.3 Verify route-level layout selection remains correct for admin SPA routes and public SSR routes

## 2. Public Navigation Mobile-First Revamp

- [ ] 2.1 Redesign `AppHeader` with mobile menu toggle, accessible navigation states, and desktop inline navigation
- [ ] 2.2 Implement mobile drawer/overlay behavior with close actions and non-overlapping content flow
- [ ] 2.3 Update header spacing, typography hierarchy, and tap target sizing for professional visual polish

## 3. Public Content Responsiveness and Component Polish

- [ ] 3.1 Refine homepage section/grid behavior for mobile, tablet, and desktop breakpoints without overflow
- [ ] 3.2 Update `MostViewedToday` responsive layout density (stacked on mobile, denser on larger screens)
- [ ] 3.3 Improve category listing card responsiveness and touch ergonomics for small screens
- [ ] 3.4 Improve detail-page navigation controls (`NewerOlderNav`) for mobile visibility and tap usability

## 4. Admin Responsive Shell and Page Usability

- [ ] 4.1 Add mobile-first admin navigation toggle with drawer behavior in `layouts/admin.vue`
- [ ] 4.2 Preserve persistent sidebar behavior for desktop admin viewports
- [ ] 4.3 Update admin list/form surfaces (categories/news) to remain readable and operable on mobile
- [ ] 4.4 Verify logout and key admin actions remain accessible in both mobile and desktop navigation states
- [x] 4.5 Surface admin news validation errors after submit with field-level inline messages and format examples

## 5. Visual Consistency and Interaction Quality

- [ ] 5.1 Standardize spacing, typography scale, and visual hierarchy across public and admin shared UI elements
- [ ] 5.2 Harmonize interactive states (hover, focus, active, disabled) for links, buttons, and navigation items
- [ ] 5.3 Validate no horizontal page overflow and no clipped controls at representative mobile breakpoints

## 6. E2E and Regression Coverage

- [ ] 6.1 Add/adjust Playwright config or projects to run critical UI flows in both mobile and desktop viewports
- [ ] 6.2 Extend public e2e scenarios to assert responsive rendering of home/category/detail flows
- [ ] 6.3 Extend admin e2e scenarios to assert mobile navigation toggle/drawer behavior and core CRUD accessibility
- [ ] 6.4 Run and stabilize e2e suite for responsive revamp and fix flaky selectors introduced by layout updates

## 7. Verification and Release Readiness

- [ ] 7.1 Run lint, typecheck, and targeted UI tests after responsive changes
- [ ] 7.2 Perform manual cross-viewport QA checklist for public and admin pages
- [ ] 7.3 Capture before/after screenshots for key routes to aid reviewer validation
