# Change: Add MVP Frontend Screens (Deal Board, Deal Card, Research Draft)

## Why

MVP sections 7.1-7.3 require three analyst-facing screens that currently don't exist.

**Product Goal**: j16z turns raw regulatory, legal, and market data into analyst-ready outputs by automatically tracking M&A deals end-to-end.

**Analyst Pain**: Manually checking SEC filings, court dockets, FTC/DOJ press releases, and market data across 20-50 deals wastes 3-5 hours/day.

**Solution**: Analyst provides tickers → Backend scrapes/extracts/alerts automatically → Frontend shows actionable intelligence → Analyst produces client research in 15 minutes instead of 3-5 hours.

**Current gap:** No UI for monitoring deals, viewing deal details, or generating research memos.

## What Changes

### Three Core Screens (API-Grounded Design)

**1. Deal Board** (`/app/deals`) - Sortable table of all tracked deals
- Columns based on real M&A API structure: Deal Name, Status, Spread, p_close_base, EV, Reg/Lit Status, Outside Date Countdown
- Filters: Spread threshold, probability, sector, watchlist
- Quick actions: Add Deal, Manage Watchlists, Export CSV
- Data structure: `{ symbol, companyName, acquisitionDate, spread, p_close_base, status, outsideDate }`

**2. Deal Card** (`/app/deals/[id]`) - Single-page scrollable dashboard (NOT tabs)
- **Single scrollable page** with collapsible sections (Bloomberg Terminal pattern)
- Sections: Key Metrics, Deal Terms, Event Timeline, Spread Chart, News, Regulatory/Litigation Status
- Inline editable: p_close_base, spread_entry_threshold
- Quick actions: Export, Generate Draft, Configure Alerts, Add to Watchlist
- Data structure: Company Overview API + M&A API + SEC Filings + Court Dockets

**3. Research Draft** (`/app/deals/[id]/draft`) - Auto-generated memo editor
- Auto-populated from deal data: Overview, Terms Table, Regulatory Section, Litigation Section, Scenario Analysis
- Markdown editor with 5-second auto-save
- Export: Copy, .md, .docx
- Data structure: Aggregated from Deal Card data

**4. Deal Discovery** (Modal via CMD+K → "Create Deal")
- Ticker input form (acquirer, target, optional fields)
- Discovery search across SEC EDGAR, CourtListener, FTC/DOJ archives
- Results display with checkboxes (filings, court cases, agency events)
- Confirmation and deal creation with linked data sources
- Backend: `POST /api/deals/discover` with ticker resolution and relevance scoring

**5. Notifications Inbox** (`/app/notifications`)
- Unified event feed across all tracked deals
- Unread indicators and filtering (materiality, event type, deal)
- Mark as read/unread, quick actions (View Deal, Dismiss)
- Real-time updates via WebSocket/polling
- Backend: `GET /api/notifications` with pagination

**6. Watchlist Detail** (`/app/watchlists/:id`)
- Manage deals in watchlist (add, remove, view)
- Attach RSS feeds to watchlist (all deals get news automatically)
- Test RSS feeds, view feed status and item counts
- Backend: `GET/POST/DELETE /api/watchlists/:id/deals` and `/api/watchlists/:id/feeds`

### Navigation Update
- Add "Deals" to sidebar Platform section (between Live Monitor and Deal Intelligence)
- Sidebar order: Dashboard → Live Monitor → **Deals** → Deal Intelligence
- Settings page at `/app/settings` for: Profile, Watchlists, Alerts, Preferences

### Design Principles
- **Not overwhelming**: Single-page scrollable (not tabs), collapsible sections, progressive disclosure
- **API-grounded**: All data structures match real financial APIs (Alpha Vantage, FMP, OpenBB patterns)
- **Terminal aesthetic**: Dark (#0a0a0a), amber accents (#f59e0b), monospace fonts, high density
- **Keyboard-first**: CMD+K search, CMD+1-5 section navigation, CMD+D draft, CMD+E export

## Impact

### Affected Specs
- `deal-board` (new capability)
- `deal-card` (new capability)
- `research-draft` (new capability)
- `navigation` (new capability - sidebar with Deals integration)
- `settings` (new capability - user preferences, watchlists, alerts)
- `deal-discovery` (new capability - ticker input, discovery search, results confirmation)
- `notifications-inbox` (new capability - unified event feed, triage, mark read/unread)
- `watchlist-detail` (new capability - manage deals and RSS feeds per watchlist)

### Affected Code
**New files:**
- `apps/j16z-frontend/src/app/app/deals/page.tsx`
- `apps/j16z-frontend/src/app/app/deals/[id]/page.tsx`
- `apps/j16z-frontend/src/app/app/deals/[id]/draft/page.tsx`
- `apps/j16z-frontend/src/components/deal-board.tsx`
- `apps/j16z-frontend/src/components/deal-card.tsx`
- `apps/j16z-frontend/src/components/research-draft.tsx`
- `apps/j16z-frontend/src/components/ui/data-table.tsx`
- `apps/j16z-frontend/src/components/ui/status-badge.tsx`
- `apps/j16z-frontend/src/components/ui/spread-chart.tsx`
- `apps/j16z-frontend/src/components/ui/event-timeline.tsx`
- `apps/j16z-frontend/src/components/ui/collapsible-section.tsx`
- `apps/j16z-frontend/src/lib/types.ts` (Deal, Event, Clause, MarketSnapshot interfaces)
- `apps/j16z-frontend/src/lib/constants.ts` (mock data matching API structures)

**Modified files:**
- `apps/j16z-frontend/src/components/app-layout.tsx` (add Deals sidebar item between Live Monitor and Deal Intelligence)

**New files (Settings):**
- `apps/j16z-frontend/src/app/app/settings/page.tsx`
- `apps/j16z-frontend/src/components/settings/profile-section.tsx`
- `apps/j16z-frontend/src/components/settings/watchlist-section.tsx`
- `apps/j16z-frontend/src/components/settings/alerts-section.tsx`
- `apps/j16z-frontend/src/components/settings/preferences-section.tsx`

### User Impact
- **Time savings**: 3-5 hours/day → 30-45 min (per Executive Summary)
- **Single dashboard**: All deal data in one scrollable page (MVP Story #3)
- **Quick research**: Auto-generated memos reduce 3-5 hours to 15 minutes (MVP Story #6)
- **Structured exports**: CSV/Markdown/DOCX for models and clients (MVP Story #4)

### Dependencies
- TanStack Table v8 (React Table) - needs installation
- docx.js for DOCX export - needs installation
- Recharts (already installed)
- React Query (planned for Phase 2 API integration)

### MVP Compliance
Fully implements MVP sections 7.1-7.3 and all 8 user stories:
- ✅ Story #1: Define coverage (watchlist management)
- ✅ Story #2: Understand events quickly (timeline with summaries)
- ✅ Story #3: Single deal dashboard (one scrollable page)
- ✅ Story #4: Structured data exports (CSV/Markdown/DOCX)
- ✅ Story #5: Probabilities and thresholds (inline editable widgets)
- ✅ Story #6: Research production (auto-generated drafts)
- ✅ Story #7: Alerts and integrations (configuration UI)
- ✅ Story #8: Qualitative RSS/news (news section with notes)
