## Why

The current UI works functionally but feels inconsistent and cramped on smaller screens, especially navigation and admin layout behavior. A professional, mobile-first revamp is needed now to improve usability, visual consistency, and perceived product quality across public and admin experiences.

## What Changes

- Redesign public and admin shells using a mobile-first responsive approach, then scale up to tablet and desktop.
- Standardize global layout behavior so header/footer/navigation are consistent and not duplicated across pages.
- Improve mobile navigation patterns (menu toggle, drawer/overlay behavior, spacing, tap targets) for both public and admin pages.
- Refine responsive grid and card behavior for homepage, category, most-viewed widget, and article navigation components.
- Apply a professional visual system (typography, spacing, hierarchy, states, and interaction polish) while keeping existing business flows and API behavior intact.
- Add viewport-focused acceptance coverage to ensure responsive UX remains stable.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `public-news-site`: Update responsive and visual requirements for public pages (home, category, detail) from mobile through desktop.
- `backoffice-admin`: Update responsive shell and navigation requirements for admin pages, including mobile usability expectations.
- `e2e-tests`: Extend acceptance coverage to validate key UI behavior at representative mobile and desktop viewports.

## Impact

- Affected code: `apps/web/layouts/**`, `apps/web/pages/**`, `apps/web/components/**`, and supporting client-side composables/stores used by navigation and page rendering.
- Affected test coverage: `apps/web/e2e/**` Playwright scenarios and viewport matrix.
- APIs and data contracts: No breaking API contract changes expected; focus is UI/UX behavior and presentation requirements.
- Dependencies: No required backend dependency changes; frontend-only styling/system updates may require minor utility additions if needed.
