## 1. Dependencies & Setup

- [x] 1.1 Install @tanstack/react-table v8 for data table functionality
- [x] 1.2 Install docx library for DOCX export
- [x] 1.3 Verify Recharts is installed (should be from landing page)
- [x] 1.4 Create TypeScript interfaces in `src/lib/types.ts` matching API structures (Deal, Event, Clause, MarketSnapshot, NewsItem)

## 2. Mock Data Generation (API-Grounded)

- [x] 2.1 Generate comprehensive mock data for 10-15 deals in `src/lib/constants.ts` matching FMP M&A API structure
- [x] 2.2 Include all deal statuses (ANNOUNCED, REGULATORY_REVIEW, TERMINATED, APPROVED, CLOSED)
- [x] 2.3 Create mock events for each deal (FILING, COURT, AGENCY, SPREAD_MOVE, NEWS) with varying materiality
- [x] 2.4 Add mock clauses data (termination fees, MAE, regulatory conditions) matching SEC filing extraction format
- [x] 2.5 Generate mock spread history data (daily snapshots for 6 months) matching market data API structure
- [x] 2.6 Create mock news items with sources and timestamps
- [x] 2.7 Add mock regulatory status data (FTC, DOJ, EU, UK CMA) derived from AGENCY events
- [x] 2.8 Include mock litigation data (case types, counts, last filings) derived from COURT events
- [x] 2.9 Add outside date countdown calculations

## 3. Shared UI Components

- [x] 3.1 Create `src/components/ui/data-table.tsx` using shadcn/ui Table + TanStack Table
- [x] 3.2 Implement sorting functionality in DataTable (click headers to sort)
- [x] 3.3 Implement filtering functionality in DataTable
- [x] 3.4 Add column visibility controls to DataTable
- [x] 3.5 Create `src/components/ui/status-badge.tsx` with color-coded badges (🟢🟡🔴)
- [x] 3.6 Create `src/components/ui/spread-chart.tsx` using Recharts AreaChart with amber gradient
- [x] 3.7 Add event markers overlay to SpreadChart component
- [x] 3.8 Create `src/components/ui/event-timeline.tsx` for vertical time-ordered events
- [x] 3.9 Create `src/components/ui/filter-chips.tsx` for removable filter badges
- [x] 3.10 Create `src/components/ui/collapsible-section.tsx` with [▼]/[▶] indicators
- [x] 3.11 Ensure all components use terminal aesthetic (dark bg, amber accents, monospace fonts)

## 4. Deal Board Page

- [x] 4.1 Create route `src/app/app/deals/page.tsx`
- [x] 4.2 Create `src/components/deal-board.tsx` component
- [x] 4.3 Integrate DataTable with columns: Deal Name, Status, Spread, p_close_base, EV, Reg/Lit Status, Outside Date
- [x] 4.4 Add StatusBadge component to Status column
- [x] 4.5 Format Spread, p_close_base, EV columns as percentages
- [x] 4.6 Add regulatory/litigation status icons (🔴 for issues, ⚖️ with count)
- [x] 4.7 Add outside date countdown display ("⏱ 45d", "⏱ 120d", "CLOSED")
- [x] 4.8 Implement sorting on all columns (click to toggle asc/desc)
- [x] 4.9 Add filter dropdowns: Spread threshold, p_close threshold, Sector, Watchlist
- [x] 4.10 Display active filters as removable badges
- [x] 4.11 Add "Clear All Filters" button
- [x] 4.12 Implement pagination (50 deals per page) with "Load More" button
- [x] 4.13 Add CSV export button (downloads filtered deals)
- [x] 4.14 Add JSON export button
- [x] 4.15 Implement row click navigation to deal card
- [x] 4.16 Preserve filter state in URL parameters
- [x] 4.17 Add keyboard navigation (Arrow keys, Enter to open)
- [x] 4.18 Style with terminal aesthetic (compact spacing, monospace, dark theme)

## 5. Watchlist Management

- [x] 5.1 Create "Manage Watchlists" modal component
- [x] 5.2 Implement watchlist CRUD operations (localStorage for MVP)
- [x] 5.3 Add "+ New Watchlist" form with Name and Description fields
- [x] 5.4 Add watchlist icon to deal rows with dropdown
- [x] 5.5 Implement "Add to Watchlist" functionality
- [x] 5.6 Add watchlist filter toggle in Deal Board
- [x] 5.7 Store watchlist data in localStorage with key `watchlists`

## 6. Add Deal Flow

- [x] 6.1 Create "+ Add Deal" modal component
- [x] 6.2 Add form fields: Acquirer Ticker, Target Ticker, Deal Name (optional)
- [x] 6.3 Implement form validation (required fields, ticker format)
- [x] 6.4 Create new deal record with status "ANNOUNCED" on submit
- [x] 6.5 Add new deal to Deal Board table
- [x] 6.6 Close modal on successful submission

## 7. Deal Card Page Structure

- [x] 7.1 Create route `src/app/app/deals/[id]/page.tsx` with dynamic id parameter
- [x] 7.2 Create `src/components/deal-card.tsx` component
- [x] 7.3 Implement deal header with acquirer → target names, status badge, key dates, outside date countdown
- [x] 7.4 Create single-page scrollable layout (NOT tabs)
- [x] 7.5 Implement 5 collapsible sections using CollapsibleSection component
- [x] 7.6 Add keyboard shortcuts (CMD+1-5) for section navigation
- [x] 7.7 Store section collapsed/expanded state in localStorage
- [x] 7.8 Add quick action buttons in header: Export, Draft, Alerts, Watchlist

## 8. Deal Card - Key Metrics Panel

- [x] 8.1 Create always-visible (non-collapsible) Key Metrics panel
- [x] 8.2 Display: Spread (with 24h change), p_close_base, EV, Deal Value, Consideration Type
- [x] 8.3 Add 24-hour spread change indicator (↑/↓ with percentage)
- [x] 8.4 Implement inline editable p_close_base with [✎] icon
- [x] 8.5 Implement inline editable spread_entry_threshold with [✎] icon
- [x] 8.6 Add input validation (0-100% range)
- [x] 8.7 Implement 5-second auto-save on blur
- [x] 8.8 Update EV calculation when p_close_base changes (EV = spread * p_close_base / 100)
- [x] 8.9 Display "Saved" indicator after successful save

## 9. Deal Card - Deal Terms & Clauses Section

- [x] 9.1 Create collapsible "Deal Terms & Clauses" section (CMD+1)
- [x] 9.2 Display clauses table with columns: Clause Type, Value, Source
- [x] 9.3 Include all clause types: Termination Fee, Reverse Termination Fee, MAE, Regulatory Efforts, Litigation Condition, Financing Condition
- [x] 9.4 Add clickable source links (e.g., "S-4 Section 7.2(b) →")
- [x] 9.5 Open SEC filing URLs in new tab on click
- [x] 9.6 Style table with terminal aesthetic (monospace, compact spacing)

## 10. Deal Card - Event Timeline Section

- [x] 10.1 Create collapsible "Event Timeline" section (CMD+2)
- [x] 10.2 Integrate EventTimeline component
- [x] 10.3 Display events in reverse chronological order (newest first)
- [x] 10.4 Add filter chips for event types: FILING, COURT, AGENCY, SPREAD_MOVE, NEWS
- [x] 10.5 Add materiality filter dropdown: All, High, Medium, Low
- [x] 10.6 Implement filter logic (show/hide events based on active filters)
- [x] 10.7 Display each event with: timestamp, materiality badge, event type icon, title, summary
- [ ] 10.8 Add source links to each event (FTC press release, court order, etc.)
- [ ] 10.9 Color-code event types: FILING (blue), COURT (red), AGENCY (amber), SPREAD_MOVE (emerald), NEWS (gray)
- [ ] 10.10 Add pagination or "Load More" for long event lists
- [ ] 10.11 Implement smooth scrolling to event on click

## 11. Deal Card - Spread History Section

- [x] 11.1 Create collapsible "Spread History" section (CMD+3)
- [x] 11.2 Integrate SpreadChart component with Recharts AreaChart
- [x] 11.3 Display spread percentage over time with amber gradient fill (#f59e0b to #d97706)
- [x] 11.4 Add event markers on chart for major events (injunctions, regulatory actions)
- [x] 11.5 Implement time range selector: 1M, 3M, 6M, 1Y, ALL (default: 3M)
- [x] 11.6 Add hover tooltips showing exact spread value and date
- [x] 11.7 Display current spread, 24h change, and spread statistics below chart
- [x] 11.8 Add chart legend explaining event marker icons
- [x] 11.9 Implement responsive chart sizing for different monitor widths

## 12. Deal Card - News & Research Section

- [x] 12.1 Create collapsible "News & Research" section (CMD+4)
- [x] 12.2 Display news item list with: timestamp, source, title, summary, link
- [x] 12.3 Sort items by timestamp (newest first)
- [x] 12.4 Add "Add Note" functionality with editable text field per item
- [x] 12.5 Implement 5-second auto-save for notes on blur
- [x] 12.6 Style news items with terminal aesthetic
- [x] 12.7 Add external link icon for news source links
- [x] 12.8 Implement "Load More" for long news lists

## 13. Deal Card - Regulatory & Litigation Section

- [x] 13.1 Create collapsible "Regulatory & Litigation" section (CMD+5)
- [x] 13.2 Display regulatory status for: FTC (US), DOJ (US), EU Commission, UK CMA
- [x] 13.3 For each jurisdiction show: latest action, date, key concerns, risk level
- [x] 13.4 Add risk level badges: [🔴 HIGH RISK], [🟡 MEDIUM RISK], [🟢 LOW RISK]
- [x] 13.5 Display litigation status: case count, types, last filing
- [x] 13.6 Derive risk levels from event materiality
- [x] 13.7 Style with terminal aesthetic

## 14. Deal Card - Alert Configuration

- [x] 14.1 Create alert configuration modal
- [x] 14.2 Add event type checkboxes: FILING, COURT, AGENCY, SPREAD_MOVE, NEWS
- [x] 14.3 Add materiality threshold dropdown: All, High only, High + Medium
- [x] 14.4 Add notification channel toggles: Email, Slack
- [x] 14.5 Add webhook URL text input
- [x] 14.6 Implement save functionality (localStorage for MVP)
- [x] 14.7 Display configured alerts indicator on deal card

## 15. Deal Card - Export Functionality

- [x] 15.1 Create export dropdown with CSV and JSON options
- [x] 15.2 Implement CSV export with columns: deal terms, metrics, clauses, recent events
- [x] 15.3 Format CSV filename as `j16z-deal-{acquirer}-{target}-{date}.csv`
- [x] 15.4 Implement JSON export with full deal data structure
- [x] 15.5 Add CMD+E keyboard shortcut to open export dropdown

## 16. Research Draft Page

- [x] 16.1 Create route `src/app/app/deals/[id]/draft/page.tsx`
- [x] 16.2 Create `src/components/research-draft.tsx` component
- [x] 16.3 Implement draft header with deal name, generation timestamp, export buttons
- [x] 16.4 Auto-generate Deal Overview section from deal data
- [x] 16.5 Auto-generate Key Terms table from clauses data
- [x] 16.6 Auto-generate Regulatory Status section from AGENCY events
- [x] 16.7 Auto-generate Litigation section from COURT events
- [x] 16.8 Auto-generate Scenario Analysis with Base/Bear/Bull cases
- [x] 16.9 Calculate expected returns and annualized returns for each scenario
- [x] 16.10 Make all sections editable with Markdown syntax support
- [x] 16.11 Implement Markdown editor (textarea with monospace font)
- [x] 16.12 Add fixed header that remains visible during scrolling

## 17. Research Draft Auto-Save

- [x] 17.1 Implement auto-save logic (save after 5 seconds of no typing)
- [x] 17.2 Display "Auto-saved X seconds ago" indicator
- [x] 17.3 Store draft edits in localStorage with key `draft-{dealId}`
- [x] 17.4 Restore draft edits when returning to page
- [x] 17.5 Handle navigation away with pending auto-save (wait or save immediately)
- [x] 17.6 Differentiate between original generation time and last edit time

## 18. Research Draft Export

- [x] 18.1 Implement "Copy" button to copy entire draft as Markdown to clipboard
- [x] 18.2 Add toast notification on successful copy
- [x] 18.3 Implement "⬇ .md" button to download Markdown file
- [x] 18.4 Format Markdown filename as `j16z-{acquirer}-{target}-analysis-{YYYY-MM-DD}.md`
- [x] 18.5 Implement "⬇ .docx" button using docx library
- [ ] 18.6 Preserve formatting in DOCX (headings, tables, lists, bold, italic, monospace)
- [ ] 18.7 Format DOCX filename as `j16z-{acquirer}-{target}-analysis-{YYYY-MM-DD}.docx`
- [ ] 18.8 Add loading indicators during export generation

- [x] 19.1 Update `src/components/app-layout.tsx` to add "Deals" sidebar item
- [x] 19.2 Position "Deals" in Platform section after "Live Monitor"
- [x] 19.3 Use TrendingUp icon from Lucide
- [x] 19.4 Ensure active state highlights correctly when on deals routes
- [x] 19.5 Test navigation flow: Dashboard → Deals → Deal Card → Draft

## 20. Keyboard Shortcuts

- [x] 20.1 Verify CMD+K opens global search/command palette (already implemented)
- [x] 20.2 Add CMD+D shortcut on deal card to generate draft
- [x] 20.3 Add CMD+E shortcut on deal card to open export dropdown
- [x] 20.4 Add CMD+1-5 shortcuts for deal card section navigation
- [x] 20.5 Add Arrow key navigation for deal board table rows
- [x] 20.6 Add Enter key to open selected deal from board
- [x] 20.7 Add Escape key to close modals/dialogs
- [x] 20.8 Document shortcuts in help modal or tooltip
- [x] 20.9 Add keyboard shortcut hints in UI (e.g., "CMD+D" badge on Generate Draft button)

## 21. Styling & Terminal Aesthetic

- [x] 21.1 Verify CSS custom properties use amber primary (#f59e0b, #d97706) not emerald
- [x] 21.2 Ensure all screens use dark background (#0a0a0a)
- [x] 21.3 Apply monospace fonts (JetBrains Mono) throughout deal screens
- [x] 21.4 Use compact spacing (4-8px padding, 12-16px gaps) for high density
- [x] 21.5 Set font sizes: 11-13px body, 10px labels, 14-16px headings
- [x] 21.6 Apply consistent status badge colors: 🟢 emerald (positive), 🟡 amber (neutral), 🔴 red (negative)
- [x] 21.7 Use subtle border-radius (6-8px) for cards and buttons
- [x] 21.8 Ensure hover states use amber accent color
- [x] 21.9 Add focus indicators for keyboard navigation
- [x] 21.10 Style collapsible section headers with hover effects

## 22. Testing - Deal Board

- [ ] 22.1 Test deal board sorting on all columns (ascending/descending)
- [ ] 22.2 Test deal board filtering with single filter
- [ ] 22.3 Test deal board filtering with multiple active filters
- [ ] 22.4 Test "Clear All Filters" functionality
- [ ] 22.5 Test pagination and "Load More" functionality
- [ ] 22.6 Test CSV export with filtered results
- [ ] 22.7 Test row click navigation to deal card
- [ ] 22.8 Test keyboard navigation (Arrow keys, Enter)
- [ ] 22.9 Verify filter state persists in URL parameters
- [ ] 22.10 Test outside date countdown display and color coding
- [ ] 22.11 Test watchlist management (create, add deals, filter)
- [ ] 22.12 Test "+ Add Deal" flow

## 23. Testing - Deal Card

- [ ] 23.1 Test single-page scrollable layout (no tabs)
- [ ] 23.2 Test collapsible section expand/collapse
- [ ] 23.3 Test section state persistence in localStorage
- [ ] 23.4 Test p_close_base inline editing and auto-save
- [ ] 23.5 Test spread_entry_threshold inline editing and auto-save
- [ ] 23.6 Test probability validation (reject values outside 0-100%)
- [ ] 23.7 Test EV calculation updates when p_close_base changes
- [ ] 23.8 Test event timeline filtering by type
- [ ] 23.9 Test event timeline filtering by materiality
- [ ] 23.10 Test spread chart time range selector (1M, 3M, 6M, 1Y, ALL)
- [ ] 23.11 Test spread chart hover tooltips
- [ ] 23.12 Test news tab "Add Note" functionality and auto-save
- [ ] 23.13 Test keyboard shortcuts (CMD+1-5, CMD+D, CMD+E)
- [ ] 23.14 Test alert configuration modal
- [ ] 23.15 Test export functionality (CSV, JSON)

## 24. Testing - Research Draft

- [ ] 24.1 Test draft auto-generation from deal card
- [ ] 24.2 Verify all sections are auto-populated with correct data
- [ ] 24.3 Test Markdown editing in all sections
- [ ] 24.4 Test auto-save (verify saves after 5 seconds of no typing)
- [ ] 24.5 Test draft persistence (navigate away and return)
- [ ] 24.6 Test "Copy" button and clipboard functionality
- [ ] 24.7 Test Markdown (.md) export and file download
- [ ] 24.8 Test DOCX (.docx) export and file download
- [ ] 24.9 Verify DOCX formatting (headings, tables, lists)
- [ ] 24.10 Test back button navigation to deal card
- [ ] 24.11 Test fixed header during scrolling

## 25. Quality Assurance

- [ ] 25.1 Run `pnpm lint` and fix all Biome errors
- [ ] 25.2 Run `pnpm tsc --noEmit` and fix all TypeScript errors
- [ ] 25.3 Verify all components have proper TypeScript typing (no `any` types)
- [ ] 25.4 Test page load performance (should load in <2 seconds with mock data)
- [ ] 25.5 Verify no console errors or warnings in browser
- [ ] 25.6 Test with different deal counts (5, 20, 50, 100 deals) for performance
- [ ] 25.7 Verify responsive behavior on desktop sizes (1920px, 2560px widths)
- [ ] 25.8 Test on different browsers (Chrome, Firefox, Safari)
- [ ] 25.9 Verify all links and buttons are clickable and functional
- [ ] 25.10 Test error states (e.g., invalid probability input)

## 26. Documentation

- [ ] 26.1 Add JSDoc comments to all major components explaining purpose and props
- [ ] 26.2 Document mock data structure in `src/lib/constants.ts` with API references
- [ ] 26.3 Add TODO comments for future API integration points
- [ ] 26.4 Document keyboard shortcuts in code comments
- [ ] 26.5 Create inline comments explaining complex calculations (EV, scenario analysis)
- [ ] 26.6 Document API data structure mappings (FMP, Alpha Vantage patterns)
