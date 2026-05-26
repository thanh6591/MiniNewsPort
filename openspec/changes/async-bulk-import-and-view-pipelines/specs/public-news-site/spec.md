## MODIFIED Requirements

### Requirement: Detail page displays full article with Newer/Older navigation
The system SHALL render an article detail page at `/news/{slug}` that displays the full content and provides links to the next-newer and next-older articles in the same category, with responsive spacing and controls, and SHALL trigger view reporting asynchronously so rendering is not blocked by counter updates.

#### Scenario: Detail page renders full content
- **WHEN** a visitor opens `/news/{slug}` for a published article
- **THEN** the page shows title, category, published date, image, summary, full content, and view count

#### Scenario: Newer/Older links navigate within the same category
- **WHEN** a newer (or older) article exists in the same category
- **THEN** a "Newer Post" (or "Older Post") link is displayed pointing to that article's detail page

#### Scenario: No newer/older article exists
- **WHEN** the current article is the newest (or oldest) in its category
- **THEN** the corresponding link is hidden or disabled

#### Scenario: Detail page reports a view asynchronously
- **WHEN** a visitor loads the detail page for a published article
- **THEN** the page triggers a non-blocking view increment request after article content is available without delaying the rendered response

#### Scenario: View reporting failure does not block reading
- **WHEN** the asynchronous view increment request is slow or fails
- **THEN** the article content and newer/older navigation remain visible and usable without a full-page error state

#### Scenario: Unpublished article is not accessible
- **WHEN** the slug refers to a DRAFT article
- **THEN** the system returns a 404 page

#### Scenario: Detail navigation remains usable on mobile
- **WHEN** a visitor views article detail on a mobile viewport
- **THEN** newer/older controls remain visible, tappable, and do not overlap article content