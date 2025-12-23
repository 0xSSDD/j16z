## 1. Dependencies & Setup

- [ ] 1.1 Install @tanstack/react-table v8 for data table functionality
- [ ] 1.2 Install docx library for DOCX export
- [ ] 1.3 Verify Recharts is installed (should be from landing page)
- [ ] 1.4 Create TypeScript interfaces in `src/lib/types.ts` matching API structures (Deal, Event, Clause, MarketSnapshot, NewsItem)

## 2. Mock Data Generation (API-Grounded)

- [ ] 2.1 Generate comprehensive mock data for 10-15 deals in `src/lib/constants.ts` matching FMP M&A API structure
- [ ] 2.2 Include all deal statuses (ANNOUNCED, REGULATORY_REVIEW, TERMINATED, APPROVED, CLOSED)
- [ ] 2.3 Create mock events for each deal (FILING, COURT, AGENCY, SPREAD_MOVE, NEWS) with varying materiality
- [ ] 2.4 Add mock clauses data (termination fees, MAE, regulatory conditions) matching SEC filing extraction format
- [ ] 2.5 Generate mock spread history data (daily snapshots for 6 months) matching market data API structure
- [ ] 2.6 Create mock news items with sources and timestamps
- [ ] 2.7 Add mock regulatory status data (FTC, DOJ, EU, UK CMA) derived from AGENCY events
- [ ] 2.8 Include mock litigation data (case types, counts, last filings) derived from COURT events
- [ ] 2.9 Add outside date countdown calculations

## 3. Shared UI Components

- [ ] 3.1 Create `src/components/ui/data-table.tsx` using shadcn/ui Table + TanStack Table
- [ ] 3.2 Implement sorting functionality in DataTable (click headers to sort)
- [ ] 3.3 Implement filtering functionality in DataTable
- [ ] 3.4 Add column visibility controls to DataTable
- [ ] 3.5 Create `src/components/ui/status-badge.tsx` with color-coded badges (🟢🟡🔴)
- [ ] 3.6 Create `src/components/ui/spread-chart.tsx` using Recharts AreaChart with amber gradient
- [ ] 3.7 Add event markers overlay to SpreadChart component
- [ ] 3.8 Create `src/components/ui/event-timeline.tsx` for vertical time-ordered events
- [ ] 3.9 Create `src/components/ui/filter-chips.tsx` for removable filter badges
- [ ] 3.10 Create `src/components/ui/collapsible-section.tsx` with [▼]/[▶] indicators
- [ ] 3.11 Ensure all components use terminal aesthetic (dark bg, amber accents, monospace fonts)

## 4. Deal Board Page

- [ ] 4.1 Create route `src/app/app/deals/page.tsx`
- [ ] 4.2 Create `src/components/deal-board.tsx` component
- [ ] 4.3 Integrate DataTable with columns: Deal Name, Status, Spread, p_close_base, EV, Reg/Lit Status, Outside Date
- [ ] 4.4 Add StatusBadge component to Status column
- [ ] 4.5 Format Spread, p_close_base, EV columns as percentages
- [ ] 4.6 Add regulatory/litigation status icons (🔴 for issues, ⚖️ with count)
- [ ] 4.7 Add outside date countdown display ("⏱ 45d", "⏱ 120d", "CLOSED")
- [ ] 4.8 Implement sorting on all columns (click to toggle asc/desc)
- [ ] 4.9 Add filter dropdowns: Spread threshold, p_close threshold, Sector, Watchlist
- [ ] 4.10 Display active filters as removable badges
- [ ] 4.11 Add "Clear All Filters" button
- [ ] 4.12 Implement pagination (50 deals per page) with "Load More" button
- [ ] 4.13 Add CSV export button (downloads filtered deals)
- [ ] 4.14 Add JSON export button
- [ ] 4.15 Implement row click navigation to deal card
- [ ] 4.16 Preserve filter state in URL parameters
- [ ] 4.17 Add keyboard navigation (Arrow keys, Enter to open)
- [ ] 4.18 Style with terminal aesthetic (compact spacing, monospace, dark theme)

## 5. Watchlist Management

- [ ] 5.1 Create "Manage Watchlists" modal component
- [ ] 5.2 Implement watchlist CRUD operations (localStorage for MVP)
- [ ] 5.3 Add "+ New Watchlist" form with Name and Description fields
- [ ] 5.4 Add watchlist icon to deal rows with dropdown
- [ ] 5.5 Implement "Add to Watchlist" functionality
- [ ] 5.6 Add watchlist filter toggle in Deal Board
- [ ] 5.7 Store watchlist data in localStorage with key `watchlists`

## 6. Add Deal Flow

- [ ] 6.1 Create "+ Add Deal" modal component
- [ ] 6.2 Add form fields: Acquirer Ticker, Target Ticker, Deal Name (optional)
- [ ] 6.3 Implement form validation (required fields, ticker format)
- [ ] 6.4 Create new deal record with status "ANNOUNCED" on submit
- [ ] 6.5 Add new deal to Deal Board table
- [ ] 6.6 Close modal on successful submission

## 7. Deal Card Page Structure

- [ ] 7.1 Create route `src/app/app/deals/[id]/page.tsx` with dynamic id parameter
- [ ] 7.2 Create `src/components/deal-card.tsx` component
- [ ] 7.3 Implement deal header with acquirer → target names, status badge, key dates, outside date countdown
- [ ] 7.4 Create single-page scrollable layout (NOT tabs)
- [ ] 7.5 Implement 5 collapsible sections using CollapsibleSection component
- [ ] 7.6 Add keyboard shortcuts (CMD+1-5) for section navigation
- [ ] 7.7 Store section collapsed/expanded state in localStorage
- [ ] 7.8 Add quick action buttons in header: Export, Draft, Alerts, Watchlist

## 8. Deal Card - Key Metrics Panel

- [ ] 8.1 Create always-visible (non-collapsible) Key Metrics panel
- [ ] 8.2 Display: Spread (with 24h change), p_close_base, EV, Deal Value, Consideration Type
- [ ] 8.3 Add 24-hour spread change indicator (↑/↓ with percentage)
- [ ] 8.4 Implement inline editable p_close_base with [✎] icon
- [ ] 8.5 Implement inline editable spread_entry_threshold with [✎] icon
- [ ] 8.6 Add input validation (0-100% range)
- [ ] 8.7 Implement 5-second auto-save on blur
- [ ] 8.8 Update EV calculation when p_close_base changes (EV = spread * p_close_base / 100)
- [ ] 8.9 Display "Saved" indicator after successful save

## 9. Deal Card - Deal Terms & Clauses Section

- [ ] 9.1 Create collapsible "Deal Terms & Clauses" section (CMD+1)
- [ ] 9.2 Display clauses table with columns: Clause Type, Value, Source
- [ ] 9.3 Include all clause types: Termination Fee, Reverse Termination Fee, MAE, Regulatory Efforts, Litigation Condition, Financing Condition
- [ ] 9.4 Add clickable source links (e.g., "S-4 Section 7.2(b) →")
- [ ] 9.5 Open SEC filing URLs in new tab on click
- [ ] 9.6 Style table with terminal aesthetic (monospace, compact spacing)

## 10. Deal Card - Event Timeline Section

- [ ] 10.1 Create collapsible "Event Timeline" section (CMD+2)
- [ ] 10.2 Integrate EventTimeline component
- [ ] 10.3 Display events in reverse chronological order (newest first)
- [ ] 10.4 Add filter chips for event types: FILING, COURT, AGENCY, SPREAD_MOVE, NEWS
- [ ] 10.5 Add materiality filter dropdown: All, High, Medium, Low
- [ ] 10.6 Implement filter logic (show/hide events based on active filters)
- [ ] 10.7 Display each event with: timestamp, materiality badge, event type icon, title, summary
- [ ] 10.8 Add source links to each event (FTC press release, court order, etc.)
- [ ] 10.9 Color-code event types: FILING (blue), COURT (red), AGENCY (amber), SPREAD_MOVE (emerald), NEWS (gray)
- [ ] 10.10 Add pagination or "Load More" for long event lists
- [ ] 10.11 Implement smooth scrolling to event on click

## 11. Deal Card - Spread History Section

- [ ] 11.1 Create collapsible "Spread History" section (CMD+3)
- [ ] 11.2 Integrate SpreadChart component with Recharts AreaChart
- [ ] 11.3 Display spread percentage over time with amber gradient fill (#f59e0b to #d97706)
- [ ] 11.4 Add event markers on chart for major events (injunctions, regulatory actions)
- [ ] 11.5 Implement time range selector: 1M, 3M, 6M, 1Y, ALL (default: 3M)
- [ ] 11.6 Add hover tooltips showing exact spread value and date
- [ ] 11.7 Display current spread, 24h change, and spread statistics below chart
- [ ] 11.8 Add chart legend explaining event marker icons
- [ ] 11.9 Implement responsive chart sizing for different monitor widths

## 12. Deal Card - News & Research Section

- [ ] 12.1 Create collapsible "News & Research" section (CMD+4)
- [ ] 12.2 Display news item list with: timestamp, source, title, summary, link
- [ ] 12.3 Sort items by timestamp (newest first)
- [ ] 12.4 Add "Add Note" functionality with editable text field per item
- [ ] 12.5 Implement 5-second auto-save for notes on blur
- [ ] 12.6 Style news items with terminal aesthetic
- [ ] 12.7 Add external link icon for news source links
- [ ] 12.8 Implement "Load More" for long news lists

## 13. Deal Card - Regulatory & Litigation Section

- [ ] 13.1 Create collapsible "Regulatory & Litigation" section (CMD+5)
- [ ] 13.2 Display regulatory status for: FTC (US), DOJ (US), EU Commission, UK CMA
- [ ] 13.3 For each jurisdiction show: latest action, date, key concerns, risk level
- [ ] 13.4 Add risk level badges: [🔴 HIGH RISK], [🟡 MEDIUM RISK], [🟢 LOW RISK]
- [ ] 13.5 Display litigation status: case count, types, last filing
- [ ] 13.6 Derive risk levels from event materiality
- [ ] 13.7 Style with terminal aesthetic

## 14. Deal Card - Alert Configuration

- [ ] 14.1 Create alert configuration modal
- [ ] 14.2 Add event type checkboxes: FILING, COURT, AGENCY, SPREAD_MOVE, NEWS
- [ ] 14.3 Add materiality threshold dropdown: All, High only, High + Medium
- [ ] 14.4 Add notification channel toggles: Email, Slack
- [ ] 14.5 Add webhook URL text input
- [ ] 14.6 Implement save functionality (localStorage for MVP)
- [ ] 14.7 Display configured alerts indicator on deal card

## 15. Deal Card - Export Functionality

- [ ] 15.1 Create export dropdown with CSV and JSON options
- [ ] 15.2 Implement CSV export with columns: deal terms, metrics, clauses, recent events
- [ ] 15.3 Format CSV filename as `j16z-deal-{acquirer}-{target}-{date}.csv`
- [ ] 15.4 Implement JSON export with full deal data structure
- [ ] 15.5 Add CMD+E keyboard shortcut to open export dropdown

## 16. Research Draft Page

- [ ] 16.1 Create route `src/app/app/deals/[id]/draft/page.tsx`
- [ ] 16.2 Create `src/components/research-draft.tsx` component
- [ ] 16.3 Implement draft header with deal name, generation timestamp, export buttons
- [ ] 16.4 Auto-generate Deal Overview section from deal data
- [ ] 16.5 Auto-generate Key Terms table from clauses data
- [ ] 16.6 Auto-generate Regulatory Status section from AGENCY events
- [ ] 16.7 Auto-generate Litigation section from COURT events
- [ ] 16.8 Auto-generate Scenario Analysis with Base/Bear/Bull cases
- [ ] 16.9 Calculate expected returns and annualized returns for each scenario
- [ ] 16.10 Make all sections editable with Markdown syntax support
- [ ] 16.11 Implement Markdown editor (textarea with monospace font)
- [ ] 16.12 Add fixed header that remains visible during scrolling

## 17. Research Draft Auto-Save

- [ ] 17.1 Implement auto-save logic (save after 5 seconds of no typing)
- [ ] 17.2 Display "Auto-saved X seconds ago" indicator
- [ ] 17.3 Store draft edits in localStorage with key `draft-{dealId}`
- [ ] 17.4 Restore draft edits when returning to page
- [ ] 17.5 Handle navigation away with pending auto-save (wait or save immediately)
- [ ] 17.6 Differentiate between original generation time and last edit time

## 18. Research Draft Export

- [ ] 18.1 Implement "Copy" button to copy entire draft as Markdown to clipboard
- [ ] 18.2 Add toast notification on successful copy
- [ ] 18.3 Implement "⬇ .md" button to download Markdown file
- [ ] 18.4 Format Markdown filename as `j16z-{acquirer}-{target}-analysis-{YYYY-MM-DD}.md`
- [ ] 18.5 Implement "⬇ .docx" button using docx.js library
- [ ] 18.6 Preserve formatting in DOCX (headings, tables, lists, bold, italic, monospace)
- [ ] 18.7 Format DOCX filename as `j16z-{acquirer}-{target}-analysis-{YYYY-MM-DD}.docx`
- [ ] 18.8 Add loading indicators during export generation

## 19. Navigation & Sidebar Update

- [ ] 19.1 Update `src/components/app-layout.tsx` to add "Deals" sidebar item
- [ ] 19.2 Position "Deals" in Platform section after "Live Monitor"
- [ ] 19.3 Use TrendingUp icon from Lucide
- [ ] 19.4 Ensure active state highlights correctly when on deals routes
- [ ] 19.5 Test navigation flow: Dashboard → Deals → Deal Card → Draft

## 20. Keyboard Shortcuts

- [ ] 20.1 Verify CMD+K opens global search/command palette (already implemented)
- [ ] 20.2 Add CMD+D shortcut on deal card to generate draft
- [ ] 20.3 Add CMD+E shortcut on deal card to open export dropdown
- [ ] 20.4 Add CMD+1-5 shortcuts for deal card section navigation
- [ ] 20.5 Add Arrow key navigation for deal board table rows
- [ ] 20.6 Add Enter key to open selected deal from board
- [ ] 20.7 Add Escape key to close modals/dialogs
- [ ] 20.8 Document shortcuts in help modal or tooltip
- [ ] 20.9 Add keyboard shortcut hints in UI (e.g., "CMD+D" badge on Generate Draft button)

## 21. Styling & Terminal Aesthetic

- [ ] 21.1 Verify CSS custom properties use amber primary (#f59e0b, #d97706) not emerald
- [ ] 21.2 Ensure all screens use dark background (#0a0a0a)
- [ ] 21.3 Apply monospace fonts (JetBrains Mono) throughout deal screens
- [ ] 21.4 Use compact spacing (4-8px padding, 12-16px gaps) for high density
- [ ] 21.5 Set font sizes: 11-13px body, 10px labels, 14-16px headings
- [ ] 21.6 Apply consistent status badge colors: 🟢 emerald (positive), 🟡 amber (neutral), 🔴 red (negative)
- [ ] 21.7 Use subtle border-radius (6-8px) for cards and buttons
- [ ] 21.8 Ensure hover states use amber accent color
- [ ] 21.9 Add focus indicators for keyboard navigation
- [ ] 21.10 Style collapsible section headers with hover effects

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
