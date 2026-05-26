## Context

The current UI implementation is functional but inconsistent across layout ownership, responsive behavior, and interaction patterns. Public pages currently include shell components directly in pages while a default layout also defines shell structure, creating risk of duplicated or divergent header/footer behavior. Admin pages use a desktop-first sidebar that degrades poorly on mobile by stacking navigation above content.

This change is a UI/UX revamp focused on professional visual quality and mobile-first behavior from phone to desktop without changing core business workflows, API contracts, or domain logic. Existing capabilities for public pages, admin pages, and e2e coverage must be updated to codify responsive expectations.

Constraints:
- Preserve Nuxt 3 + Tailwind-only styling conventions.
- Avoid backend behavior changes unless required for UI compatibility.
- Maintain existing auth and CRUD flows while improving presentation and usability.

## Goals / Non-Goals

**Goals:**
- Establish a single, consistent shell strategy for public pages to eliminate duplicated header/footer behavior.
- Introduce mobile-first navigation patterns for both public and admin experiences.
- Define responsive layout behavior for key surfaces (home, category list, detail navigation, admin list/forms).
- Raise visual polish through consistent spacing, hierarchy, and interaction states.
- Add viewport-aware acceptance criteria in e2e specs to prevent regressions.

**Non-Goals:**
- Redesigning product information architecture or changing content model semantics.
- Rewriting backend API, auth token logic, or repository/service contracts.
- Introducing a new component framework or replacing Tailwind.
- Building a full design token platform beyond what is needed for this revamp.

## Decisions

1. Mobile-first breakpoints drive all layout decisions
- Decision: Define base styles for phone first, then progressive enhancements at tablet and desktop breakpoints.
- Rationale: Existing issues are most severe on small screens; mobile-first prevents desktop assumptions from leaking into compact layouts.
- Alternatives considered:
  - Desktop-first patching: faster initially but historically leads to fragmented responsive behavior.
  - Separate mobile-only components: increases duplication and maintenance overhead.

2. Layout ownership is centralized in layout files
- Decision: Public shell structure (header/footer/main container) is owned by the default layout, with pages responsible for content only.
- Rationale: Ensures navigation and shell consistency across all public routes and simplifies future global updates.
- Alternatives considered:
  - Keep shell inside each page: high drift risk and repetitive maintenance.
  - Hybrid ownership: ambiguous responsibility and harder debugging.

3. Navigation uses explicit mobile drawer patterns
- Decision: Public top nav and admin navigation will use explicit menu toggle and overlay/drawer behavior on small screens, with persistent desktop navigation on large screens.
- Rationale: Stacked links and always-visible sidebars are not usable on constrained viewports.
- Alternatives considered:
  - Keep inline links only: insufficient tap ergonomics and content crowding.
  - Collapse to select menus: poor discoverability for admin actions.

4. Revamp preserves capability behavior while refining presentation requirements
- Decision: Keep existing functional requirements (news listing, infinite scroll, auth, CRUD) but modify requirements to include responsive and professional UX acceptance outcomes.
- Rationale: Business logic is already valid; deficiencies are in presentation, consistency, and viewport behavior.
- Alternatives considered:
  - Create new capability for UI revamp: unnecessary indirection since behavior changes belong to existing capabilities.

5. E2E coverage validates representative viewport matrix
- Decision: Public and admin e2e scenarios explicitly validate at least one mobile viewport and one desktop viewport for critical flows.
- Rationale: Responsive regressions are otherwise easy to miss when only default desktop runner dimensions are used.
- Alternatives considered:
  - Snapshot-only visual checks: brittle and less behavior-oriented.
  - Manual QA-only viewport testing: not enforceable in CI.

## Risks / Trade-offs

- [Risk] CSS and layout refactors can introduce unintended visual regressions on unchanged pages. → Mitigation: encode shell and viewport behaviors in modified spec scenarios and e2e checks.
- [Risk] Mobile drawer interactions can create accessibility gaps (focus trap, escape handling, keyboard support). → Mitigation: include explicit interaction states and acceptance expectations in admin/public requirements.
- [Risk] Scope creep into full design-system rewrite may delay delivery. → Mitigation: constrain to shell, navigation, responsive layout, and professional visual consistency for existing components.
- [Trade-off] Keeping existing business flows limits opportunity for deeper IA improvements. → Mitigation: document IA improvements as future follow-up changes if needed.

## Migration Plan

1. Update capability specs for `public-news-site`, `backoffice-admin`, and `e2e-tests` to codify responsive behavior.
2. Implement layout ownership cleanup and responsive component updates in small, testable increments.
3. Update or add e2e scenarios with explicit mobile and desktop viewports for critical paths.
4. Roll out as a standard frontend deploy with no data migration.
5. Rollback strategy: revert frontend commit set if regressions are found; no database rollback required.

## Open Questions

- Should admin mobile support target full CRUD parity or only essential monitoring/actions?
- What minimum viewport widths are required for acceptance (for example 360px and 1280px)?
- Should article cards adopt a distinct mobile horizontal variant or retain one universal card style?
- Do we require reduced-motion behavior for drawer transitions in this change or a follow-up?
