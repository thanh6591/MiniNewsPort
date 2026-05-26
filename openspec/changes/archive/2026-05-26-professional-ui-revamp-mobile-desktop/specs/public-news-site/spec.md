## MODIFIED Requirements

### Requirement: Home page displays latest news grouped by category
The system SHALL render a mobile-first home page that lists each active category with the latest published news items in that category (default 5 per category, ordered by `publishedAt` DESC), and SHALL preserve a consistent global shell across breakpoints.

#### Scenario: Home page renders responsive sections with consistent shell
- **WHEN** a visitor navigates to `/` on mobile, tablet, or desktop viewport
- **THEN** the page displays one consistent site header and footer, and category sections render without horizontal overflow at that viewport

#### Scenario: Home page renders categories with latest news
- **WHEN** a visitor navigates to `/`
- **THEN** the page displays each category as a section, each section containing up to 5 of the most recently published news items with title, summary, image, category badge, and link to the detail page

#### Scenario: Empty category is hidden or shows empty state
- **WHEN** a category has no published news
- **THEN** the home page either omits that category section or shows a clear "No articles yet" placeholder

### Requirement: Home page shows Most Viewed News of the Day
The system SHALL render a responsive "Most Viewed Today" section on the home page listing the top 5 news items by today's view count, ordered DESC.

#### Scenario: Most viewed today is rendered with responsive density
- **WHEN** a visitor opens `/`
- **THEN** a "Most Viewed Today" widget displays up to 5 news items with rank, title, and view count, using a compact stacked layout on mobile and a multi-column layout on larger viewports

#### Scenario: No views yet today
- **WHEN** no article has been viewed today
- **THEN** the widget shows a placeholder message and does not break the layout

### Requirement: Category page lists news with lazy loading
The system SHALL provide a category page at `/category/{slug}` that loads news items 10 at a time via infinite scroll and remains usable from mobile through desktop viewports.

#### Scenario: Initial load shows first page
- **WHEN** a visitor opens `/category/{slug}`
- **THEN** the system displays the first 10 published news items in that category ordered by `publishedAt` DESC

#### Scenario: Scrolling triggers next page
- **WHEN** the visitor scrolls near the bottom of the list and more items exist
- **THEN** the next 10 items are fetched and appended without a full page reload

#### Scenario: All items loaded
- **WHEN** all items in the category have been loaded
- **THEN** the system shows an "End of list" indicator and stops further fetches

#### Scenario: Unknown category slug
- **WHEN** the slug does not match any category
- **THEN** the system shows a 404 page

#### Scenario: Category grid adapts by viewport
- **WHEN** the category page is viewed on mobile, tablet, and desktop
- **THEN** article cards reflow by breakpoint with legible text, tappable links, and no clipped or overlapping content

### Requirement: Detail page displays full article with Newer/Older navigation
The system SHALL render an article detail page at `/news/{slug}` that displays the full content and provides links to the next-newer and next-older articles in the same category, with responsive spacing and controls.

#### Scenario: Detail page renders full content
- **WHEN** a visitor opens `/news/{slug}` for a published article
- **THEN** the page shows title, category, published date, image, summary, full content, and view count

#### Scenario: Newer/Older links navigate within the same category
- **WHEN** a newer (or older) article exists in the same category
- **THEN** a "Newer Post" (or "Older Post") link is displayed pointing to that article's detail page

#### Scenario: No newer/older article exists
- **WHEN** the current article is the newest (or oldest) in its category
- **THEN** the corresponding link is hidden or disabled

#### Scenario: Visiting detail page increments view count
- **WHEN** a visitor loads the detail page for a published article
- **THEN** the article's total view count and today's view count are each incremented by 1

#### Scenario: Unpublished article is not accessible
- **WHEN** the slug refers to a DRAFT article
- **THEN** the system returns a 404 page

#### Scenario: Detail navigation remains usable on mobile
- **WHEN** a visitor views article detail on a mobile viewport
- **THEN** newer/older controls remain visible, tappable, and do not overlap article content
