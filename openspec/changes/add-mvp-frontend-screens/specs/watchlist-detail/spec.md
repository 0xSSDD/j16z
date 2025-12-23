# Watchlist Detail View

## ADDED Requirements

### Requirement: Watchlist Detail Page Access

The system SHALL provide a detail page for each watchlist accessible from Settings > Watchlists or Deal Board watchlist filter.

**Rationale**: User Story #13 - Manage deals and RSS feeds per watchlist.

#### Scenario: Access from settings
- **GIVEN** analyst is on Settings > Watchlists page
- **WHEN** analyst clicks on "Tech M&A" watchlist row
- **THEN** system navigates to `/app/watchlists/:id` detail page

#### Scenario: Access from deal board
- **GIVEN** analyst is on Deal Board with "Tech M&A" filter active
- **WHEN** analyst clicks "Manage Watchlist" button
- **THEN** system navigates to `/app/watchlists/:id` detail page for Tech M&A

---

### Requirement: Watchlist Header

The system SHALL display watchlist name, description, deal count, and edit/delete actions in the header.

#### Scenario: Display watchlist info
- **GIVEN** analyst opens "Tech M&A" watchlist detail
- **WHEN** page loads
- **THEN** system displays:
  - Watchlist name: "Tech M&A" (editable inline)
  - Description: "High-value technology sector mergers" (editable inline)
  - Deal count: "12 deals"
  - Created date: "Created 3 months ago"
  - Edit and Delete buttons

#### Scenario: Edit watchlist name
- **GIVEN** analyst is on watchlist detail page
- **WHEN** analyst clicks name, edits to "Tech M&A - US Only", and presses Enter
- **THEN** system updates watchlist name via `PATCH /api/settings/watchlists/:id`

#### Scenario: Delete watchlist
- **GIVEN** analyst clicks "Delete Watchlist" button
- **WHEN** analyst confirms deletion in modal
- **THEN** system deletes watchlist via `DELETE /api/settings/watchlists/:id` and navigates back to Settings > Watchlists

---

### Requirement: Deals in Watchlist Section

The system SHALL display all deals in the watchlist with key metrics and remove action.

**Backend API**: `GET /api/watchlists/:id/deals`

#### Scenario: Display deals list
- **GIVEN** "Tech M&A" watchlist has 12 deals
- **WHEN** analyst views watchlist detail
- **THEN** system displays table with columns:
  - Deal Name (Acquirer → Target)
  - Status badge
  - Spread (%)
  - p_close_base (%)
  - EV (%)
  - Last Event (type and timestamp)
  - Remove button (X icon)

#### Scenario: Remove deal from watchlist
- **GIVEN** analyst views deals in watchlist
- **WHEN** analyst clicks "X" icon on "MSFT/ATVI" row
- **THEN** system:
  - Shows confirmation "Remove MSFT/ATVI from Tech M&A?"
  - On confirm, removes via `DELETE /api/settings/watchlists/:id/deals/:dealId`
  - Updates deal count in header
  - Removes row from table

#### Scenario: Click deal to view
- **GIVEN** analyst views deals in watchlist
- **WHEN** analyst clicks on "MSFT/ATVI" row
- **THEN** system navigates to Deal Card for MSFT/ATVI

---

### Requirement: Add Deals to Watchlist

The system SHALL provide a dropdown or search interface to add existing deals to the watchlist.

**Backend API**: `POST /api/settings/watchlists/:id/deals` with body `{deal_id}`

#### Scenario: Add deal via dropdown
- **GIVEN** analyst is on watchlist detail page
- **WHEN** analyst clicks "Add Deal" button
- **THEN** system shows dropdown with all tracked deals not in this watchlist

#### Scenario: Search and add deal
- **GIVEN** "Add Deal" dropdown is open
- **WHEN** analyst types "GOOGL" in search
- **THEN** system filters dropdown to show only deals matching "GOOGL"

#### Scenario: Confirm add deal
- **GIVEN** analyst selected "GOOGL/WAZE" from dropdown
- **WHEN** analyst clicks "Add"
- **THEN** system:
  - Adds deal to watchlist via API
  - Updates deal count in header
  - Adds row to deals table
  - Shows success toast "GOOGL/WAZE added to Tech M&A"

---

### Requirement: RSS Feeds Section

The system SHALL display all RSS feeds attached to the watchlist with add, test, and remove actions.

**Rationale**: User Story #13 - Attach RSS feeds to watchlists so all deals automatically get news.

**Data Structure**:
```typescript
{
  feeds: Array<{
    id,
    watchlist_id,
    name,
    url,
    last_fetched_at,
    item_count,
    status: 'active' | 'error'
  }>
}
```

**Backend API**:
- `GET /api/watchlists/:id/feeds`
- `POST /api/watchlists/:id/feeds` with body `{name, url}`
- `DELETE /api/watchlists/:id/feeds/:feedId`
- `POST /api/watchlists/:id/feeds/:feedId/test`

#### Scenario: Display RSS feeds
- **GIVEN** "Tech M&A" watchlist has 2 RSS feeds attached
- **WHEN** analyst views watchlist detail
- **THEN** system displays "RSS Feeds (2)" section with table:
  - Feed name (e.g., "Wachtell M&A Alerts")
  - Feed URL (truncated, with copy icon)
  - Last fetched timestamp ("2 hours ago")
  - Item count ("15 items in last 7 days")
  - Status indicator (green checkmark for active, red X for error)
  - Test and Remove buttons

#### Scenario: Add RSS feed
- **GIVEN** analyst clicks "Add RSS Feed" button
- **WHEN** analyst enters name "Skadden Antitrust Blog" and URL "https://skadden.com/rss/antitrust"
- **THEN** system:
  - Validates URL format
  - Creates feed via `POST /api/watchlists/:id/feeds`
  - Adds row to RSS feeds table
  - Shows success toast "RSS feed added. Testing connection..."
  - Backend starts polling feed hourly

#### Scenario: Test RSS feed
- **GIVEN** analyst views RSS feeds
- **WHEN** analyst clicks "Test" button on "Wachtell M&A Alerts" feed
- **THEN** system:
  - Calls `POST /api/watchlists/:id/feeds/:feedId/test`
  - Shows loading spinner
  - Displays result: "✓ Feed is valid. Found 3 new items." or "✗ Feed error: 404 Not Found"

#### Scenario: Remove RSS feed
- **GIVEN** analyst views RSS feeds
- **WHEN** analyst clicks "Remove" button and confirms
- **THEN** system:
  - Deletes feed via `DELETE /api/watchlists/:id/feeds/:feedId`
  - Removes row from table
  - Shows toast "RSS feed removed. Historical items will remain."

#### Scenario: RSS feed error status
- **GIVEN** backend failed to fetch RSS feed (404, timeout, invalid XML)
- **WHEN** analyst views RSS feeds
- **THEN** system displays:
  - Red X status indicator
  - Error message: "Last error: 404 Not Found (2 hours ago)"
  - "Retry" button to manually trigger fetch

---

### Requirement: RSS Feed Behavior

The system SHALL automatically match RSS feed items to deals in the watchlist based on company names/tickers and create NEWS events.

**Backend Behavior** (MVP Section 5.6):
- Poll each RSS feed hourly
- Parse title, summary, published_at from feed items
- Entity matching: search for acquirer/target company names or tickers in title/summary
- If matched to deal in watchlist, create NewsItem with deal_id
- Create NEWS Event with low materiality
- Display in Deal Card > News & Research section

#### Scenario: RSS feed matches deal
- **GIVEN** "Wachtell M&A Alerts" feed is attached to "Tech M&A" watchlist
- **WHEN** backend fetches new item with title "Microsoft-Activision: FTC Appeals Court Ruling"
- **THEN** system:
  - Matches "Microsoft" and "Activision" to MSFT/ATVI deal in watchlist
  - Creates NewsItem with deal_id for MSFT/ATVI
  - Creates NEWS Event
  - Displays in MSFT/ATVI Deal Card > News & Research section
  - Does NOT create notification (low materiality)

---

### Requirement: Visual Consistency

The watchlist detail page SHALL maintain terminal aesthetic with dark background, amber accent, and clear section separation.

#### Scenario: Terminal styling applied
- **GIVEN** analyst views watchlist detail page
- **WHEN** page renders
- **THEN** system displays:
  - Dark background (#0a0a0a)
  - Amber accent for primary actions
  - Monospace font for URLs, timestamps, deal names
  - Clear section headers: "Deals (12)", "RSS Feeds (2)"
  - Consistent with Deal Board, Deal Card, Settings styling
