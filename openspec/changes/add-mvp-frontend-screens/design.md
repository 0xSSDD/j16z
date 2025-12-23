# Design: MVP Frontend Screens

## Context

J16z requires three analyst-facing screens per MVP 7.1-7.3. These must serve institutional users (PE/hedge fund analysts) who need to monitor 20-50 M&A deals simultaneously. Design is grounded in real financial API patterns (Alpha Vantage, FMP, OpenBB) to ensure backend implementation feasibility.

**Design priorities:**
- **Not overwhelming**: Single-page scrollable with collapsible sections (not tabs)
- **API-grounded**: Data structures match real M&A APIs
- **Terminal aesthetic**: Dark backgrounds, monospace fonts, amber accents
- **Keyboard-first**: CMD+K search, CMD+1-5 section navigation
- **Large monitor optimization**: 1920x1080+ displays

**Tech stack:** Next.js 15, React 19, Tailwind v4, shadcn/ui, Recharts. Mock data initially, Supabase + React Query in Phase 2.

## Goals / Non-Goals

### Goals
- Implement Deal Board, Deal Card, Research Draft per MVP 7.1-7.3
- Match Bloomberg Terminal UX pattern (single-page scrollable, not tabs)
- Ground all data structures in real financial APIs
- Enable efficient deal monitoring for 20-50 deals
- Support CSV/Markdown/DOCX exports
- Provide keyboard shortcuts

### Non-Goals
- Real-time streaming (use polling for MVP)
- Mobile-first design (desktop-first)
- Advanced charting beyond spread history
- Custom visualization libraries (stick with Recharts)
- Backend API implementation (mock data, API in Phase 2)

## API-Grounded Data Structures

Based on research of Alpha Vantage, FMP, and OpenBB APIs:

### Deal Entity (from M&A APIs)
```typescript
interface Deal {
  // Core identifiers (from FMP M&A API)
  symbol: string;                    // Target ticker (e.g., "ATVI")
  acquirerSymbol: string;            // Acquirer ticker (e.g., "MSFT")
  companyName: string;               // Target name
  acquirerName: string;              // Acquirer name

  // Dates (from M&A API)
  announcementDate: string;          // ISO date
  acquisitionDate: string;           // Expected close date
  outsideDate: string;               // Drop-dead date

  // Financial (from M&A API + Company Overview)
  reportedEquityTakeoverValue: number; // Deal value in USD
  considerationType: 'CASH' | 'STOCK' | 'MIXED';

  // Analyst inputs (j16z-specific)
  p_close_base: number;              // Probability of close (0-100)
  spread_entry_threshold: number;    // Minimum spread for entry (0-100)

  // Calculated
  currentSpread: number;             // (offerPrice - currentPrice) / currentPrice * 100
  ev: number;                        // spread * p_close_base

  // Status (derived from events)
  status: 'ANNOUNCED' | 'REGULATORY_REVIEW' | 'LITIGATION' | 'APPROVED' | 'TERMINATED' | 'CLOSED';
  regulatoryFlags: Array<'FTC_SECOND_REQUEST' | 'DOJ_INVESTIGATION' | 'EU_REVIEW' | 'UK_CMA_REVIEW'>;
  litigationCount: number;
}
```

### Event Entity (from SEC Filings + Court Dockets)
```typescript
interface Event {
  id: string;
  dealId: string;
  timestamp: string;                 // ISO datetime
  type: 'FILING' | 'COURT' | 'AGENCY' | 'SPREAD_MOVE' | 'NEWS';
  subtype: string;                   // e.g., '8-K', 'Motion to Dismiss', 'FTC Second Request'
  materiality: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  summary: string;
  sourceUrl: string;                 // Link to SEC filing, court order, etc.
  sourceType: 'SEC_EDGAR' | 'COURT_LISTENER' | 'FTC_GOV' | 'DOJ_GOV' | 'RSS';
}
```

### Clause Entity (extracted from SEC S-4/DEFM filings)
```typescript
interface Clause {
  id: string;
  dealId: string;
  type: 'TERMINATION_FEE' | 'REVERSE_TERMINATION_FEE' | 'MAE' | 'REGULATORY_EFFORTS' | 'LITIGATION_CONDITION' | 'FINANCING_CONDITION';
  value: string;                     // e.g., "$3.0B", "Standard", "Reasonable Best Efforts"
  sourceFilingType: string;          // e.g., "S-4", "DEFM14A"
  sourceSection: string;             // e.g., "Section 7.2(b)"
  sourceUrl: string;
}
```

### Market Snapshot (from market data APIs)
```typescript
interface MarketSnapshot {
  dealId: string;
  timestamp: string;
  targetPrice: number;
  acquirerPrice: number;
  offerPrice: number;
  spread: number;                    // Calculated
  volume: number;
}
```

## Decisions

### UI Architecture: Single-Page Scrollable (NOT Tabs)

**Decision**: Use single-page scrollable layout with collapsible sections for Deal Card

**Rationale**:
- MVP 7.2 requires "single dashboard per deal" - analysts want ONE view
- Bloomberg Terminal pattern: everything on one page with collapsible sections
- Collapsible sections allow scanning without clicking
- Keyboard shortcuts (CMD+1-5) jump to sections instantly
- Tabs fragment information and require clicking to see data

**Alternatives considered**:
- Tabbed interface: Fragments information, poor for quick scanning, requires remembering which tab has what
- Accordion without collapse: Too much scrolling

### Data Table: TanStack Table v8

**Decision**: Custom DataTable using shadcn/ui Table + TanStack Table v8

**Rationale**:
- TanStack Table provides sorting/filtering without heavy dependencies
- shadcn/ui Table primitives match terminal aesthetic
- Grounded in real API pagination patterns (FMP uses `page` and `limit` params)

### Spread Chart: Recharts AreaChart

**Decision**: Recharts AreaChart with amber gradient and event markers

**Rationale**:
- Recharts already in dependencies
- Amber gradient (#f59e0b to #d97706) matches design system
- Event markers overlay shows regulatory/litigation events on timeline
- Grounded in market data API structure (timestamp + price arrays)

### Probability Widget: Simple 2-Input Design

**Decision**: Inline editable inputs for p_close_base and spread_entry_threshold only

**Rationale**:
- MVP 7.2 explicitly requires these two inputs
- Complex breakdown (regulatory/litigation/other) deferred to Phase 2
- Industry standard: Bloomberg uses simple probability inputs
- Inline editing avoids modal friction

### Auto-Save: 5-Second Debounce

**Decision**: Auto-save after 5 seconds of no typing (not 2 seconds)

**Rationale**:
- Industry standard: Google Docs uses 5s, Notion uses 5-10s
- 2 seconds is too aggressive, causes unnecessary API calls
- 5 seconds balances responsiveness with performance

### Color Scheme: Amber Primary

**Decision**: Use amber (#f59e0b, #d97706) as primary accent, NOT emerald

**Rationale**:
- Existing design system uses amber (`globals.css`: `--color-primary-500: #f59e0b`)
- Amber/orange is more institutional (Bloomberg-style)
- Emerald reserved for positive status indicators only

## Navigation & Settings

### Sidebar Navigation Order
```
Platform
├── Dashboard (/app)
├── Live Monitor (/app/feed)
├── Deals (/app/deals) ← NEW
└── Deal Intelligence (/app/intelligence)

Research
├── AI Analyst (/app/chat)
├── Prediction Markets (/app/markets)
└── Risk Radar (/app/risk)

System (footer)
└── System Config (/app/settings) ← UPDATED
```

### Settings Page Structure
```
Settings (/app/settings)
├── ProfileSection
│   ├── Name (editable)
│   ├── Email (read-only)
│   ├── Avatar (upload)
│   └── API Key (generate/copy)
├── WatchlistSection
│   ├── WatchlistList (name, description, count)
│   ├── CreateWatchlist (inline form)
│   ├── EditWatchlist (inline edit)
│   └── DeleteWatchlist (confirmation modal)
├── AlertsSection
│   ├── EventTypeCheckboxes (FILING, COURT, AGENCY, SPREAD_MOVE, NEWS)
│   ├── MaterialityDropdown (All, High, High+Medium)
│   ├── EmailToggle (with address input)
│   ├── SlackToggle (with webhook URL input)
│   ├── WebhookToggle (with URL input)
│   └── TestNotification (button per channel)
└── PreferencesSection
    ├── ThemeSelector (Dark/Light/Auto)
    ├── DefaultSpreadFilter (dropdown)
    ├── DefaultProbabilityFilter (dropdown)
    ├── AutoSaveFrequency (5s/10s/15s)
    ├── DateFormat (YYYY-MM-DD/MM-DD-YYYY/DD-MM-YYYY)
    └── NumberFormat (US/EU)
```

## Component Hierarchy

### Core Screens

```
DealBoard (page)
├── DataTable
│   ├── TableHeader (sortable columns)
│   ├── TableBody
│   │   └── TableRow (per deal)
│   │       ├── StatusBadge
│   │       ├── SpreadCell
│   │       ├── ProbabilityCell
│   │       ├── OutsideDateCell (countdown: "45d", "120d")
│   │       └── ActionButtons
│   └── TablePagination (50 per page)
├── FilterBar
│   ├── SpreadFilter (dropdown: ">2%", ">3%", ">5%")
│   ├── ProbabilityFilter (dropdown: ">40%", ">50%", ">60%")
│   ├── SectorFilter (dropdown from Company Overview API)
│   └── WatchlistFilter (toggle: "My Watchlist")

DealCard (/app/deals/[id]) - SINGLE SCROLLABLE PAGE
├── DealHeader (name, status, key dates, outside date countdown)
├── KeyMetrics (always visible: spread, p_close_base, EV, spread_entry_threshold - inline editable)
├── CollapsibleSection: Deal Terms [▼]
│   └── ClausesTable (termination fees, MAE, conditions)
├── CollapsibleSection: Events [▼]
│   ├── FilterChips (FILING, COURT, AGENCY, SPREAD_MOVE, NEWS)
│   └── EventTimeline (vertical, time-ordered)
├── CollapsibleSection: Spread Chart [▶]
│   └── SpreadChart (Recharts with event markers)
├── CollapsibleSection: News [▶]
│   └── NewsItemList (with analyst notes)
└── CollapsibleSection: Regulatory/Litigation [▶]
    ├── RegulatoryStatus (FTC, DOJ, EU, UK)
    └── LitigationStatus (cases, last filing)

ResearchDraft (/app/deals/[id]/draft)
├── DraftHeader (export buttons)
├── MarkdownEditor (editable sections, 5s auto-save)
│   ├── DealOverview (auto-filled from Deal entity)
│   ├── TermsTable (auto-filled from Clauses)
│   ├── RegulatorySection (from Events filtered by type=AGENCY)
│   ├── LitigationSection (from Events filtered by type=COURT)
│   ├── SpreadSnapshot (from MarketSnapshot)
│   └── ScenarioAnalysis (calculated from p_close_base)
└── ExportActions (Copy, .md, .docx)
```

### New Workflow Screens

```
DealDiscovery (Modal via CMD+K → "Create Deal")
├── TickerInputForm
│   ├── AcquirerTickerInput (with validation)
│   ├── TargetTickerInput (with validation)
│   └── AdvancedOptions (collapsible)
│       ├── DealNameInput
│       ├── ExpectedCloseDateInput
│       ├── PCloseBaseInput (0-100%)
│       └── SpreadEntryThresholdInput (%)
├── DiscoverySearchButton ("Discover")
├── LoadingState (progress indicators: "Searching SEC...", "Searching courts...")
└── DiscoveryResults
    ├── SECFilingsSection
    │   └── FilingRow (checkbox, type badge, date, title, link, relevance)
    ├── CourtCasesSection
    │   └── CaseRow (checkbox, court, case number, caption, date, link)
    ├── AgencyEventsSection
    │   └── EventRow (checkbox, agency badge, type, date, title, link)
    └── ConfirmButton ("Create Deal & Start Tracking")

NotificationsInbox (/app/notifications)
├── InboxHeader
│   ├── UnreadCount ("5 unread")
│   ├── FilterBar
│   │   ├── UnreadOnlyToggle
│   │   ├── MaterialityFilter (HIGH/MEDIUM/LOW)
│   │   ├── EventTypeFilter (FILING/COURT/AGENCY/SPREAD_MOVE/NEWS)
│   │   └── DealFilter (dropdown)
│   ├── SortDropdown (Time/Materiality)
│   └── MarkAllReadButton
└── NotificationFeed
    ├── DealGroup (grouped by deal)
    │   ├── DealGroupHeader ("MSFT/ATVI - 3 notifications")
    │   └── NotificationRow
    │       ├── UnreadIndicator (blue dot)
    │       ├── EventTypeBadge (FILING/COURT/AGENCY/etc)
    │       ├── MaterialityBadge (🔴 HIGH / 🟡 MEDIUM / ⚪ LOW)
    │       ├── Title
    │       ├── ShortSummary (truncated 2 lines)
    │       ├── Timestamp ("2 hours ago")
    │       └── QuickActions (View Deal, Mark Unread, Dismiss)
    └── LoadMoreButton (pagination)

WatchlistDetail (/app/watchlists/:id)
├── WatchlistHeader
│   ├── WatchlistName (inline editable)
│   ├── WatchlistDescription (inline editable)
│   ├── DealCount ("12 deals")
│   ├── CreatedDate ("Created 3 months ago")
│   └── Actions (Edit, Delete)
├── DealsSection
│   ├── SectionHeader ("Deals (12)")
│   ├── AddDealButton (dropdown with search)
│   └── DealsTable
│       └── DealRow
│           ├── DealName (Acquirer → Target)
│           ├── StatusBadge
│           ├── Spread (%)
│           ├── PCloseBase (%)
│           ├── EV (%)
│           ├── LastEvent (type + timestamp)
│           └── RemoveButton (X icon)
└── RSSFeedsSection
    ├── SectionHeader ("RSS Feeds (2)")
    ├── AddFeedButton (form: name + URL)
    └── FeedsTable
        └── FeedRow
            ├── FeedName ("Wachtell M&A Alerts")
            ├── FeedURL (truncated, with copy icon)
            ├── LastFetched ("2 hours ago")
            ├── ItemCount ("15 items in last 7 days")
            ├── StatusIndicator (✓ active / ✗ error with message)
            └── Actions (Test, Remove)
```

## ASCII Mockups

### Deal Board (`/app/deals`)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ j16z > Deals                                                        [CMD+K ⌘]   │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [Spread>2%▾] [p_close>40%▾] [All Sectors▾] [○ Watchlist]  / Search  C Create   │
├──────┬────────────────────────┬────────┬────────┬────────┬──────────┬───────────┤
│ Deal │ Status                 │ Spread │ p_close│   EV   │ Reg/Lit  │ Outside   │
├──────┼────────────────────────┼────────┼────────┼────────┼──────────┼───────────┤
│ MSFT │ [🟡 REG_REVIEW]       │  4.2%  │  65%   │  2.73% │ 🔴 FTC   │ ⏱ 45d     │
│ →    │ Microsoft / Activision │ ↑ 0.3% │        │        │ ⚖️ 3     │           │
│ ATVI │                        │        │        │        │          │           │
├──────┼────────────────────────┼────────┼────────┼────────┼──────────┼───────────┤
│ ADBE │ [🔴 TERMINATED]       │  0.1%  │   5%   │  0.01% │          │ CLOSED    │
│ →    │ Adobe / Figma          │ ↓ 2.1% │        │        │          │           │
│ FIGM │                        │        │        │        │          │           │
├──────┼────────────────────────┼────────┼────────┼────────┼──────────┼───────────┤
│ TWTR │ [🟢 ANNOUNCED]        │  1.8%  │  85%   │  1.53% │ ⚖️ 1     │ ⏱ 120d    │
│ →    │ Elon Musk / Twitter    │ ↑ 0.1% │        │        │          │           │
│ X    │                        │        │        │        │          │           │
└──────┴────────────────────────┴────────┴────────┴────────┴──────────┴───────────┘
 3 of 47 deals • Sort: Spread ▾ • CMD+K for actions • Space for peek
```

### Deal Card - Single Scrollable Page (`/app/deals/[id]`)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ j16z > MSFT / ATVI                                                    [CMD+K ⌘] │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Microsoft Corporation → Activision Blizzard                                     │
│ Status: [🟡 REGULATORY_REVIEW]  Announced: 2022-01-18  Outside: ⏱ 45d         │
├─────────────────────────────────────────────────────────────────────────────────┤
│ KEY METRICS                                                                     │
│ Spread: 4.2% ↑0.3%  p_close: [65%]✎  EV: 2.73%  Value: $68.7B  Threshold: [2.5%]✎ │
│                                                                                 │
│ [▼] DEAL TERMS                                                                  │
│ Termination Fee: $3.0B (S-4 §7.2(b)→) • Reverse Fee: $3.0B (S-4 §7.2(c)→)     │
│ MAE: Standard (S-4 §8.3→) • Reg Efforts: Reasonable (S-4 §5.7→)               │
│                                                                                 │
│ [▼] EVENTS                                                                      │
│ [FILING] [COURT] [AGENCY] [SPREAD_MOVE] [NEWS] • [High ▾]                     │
│ ┌─ 2023-12-08 14:32 ─────────────────────────────────────────────────────┐   │
│ │ [🔴 HIGH] AGENCY • FTC Second Request                                   │   │
│ │ FTC issued Second Request under HSR Act. 30-day extension.              │   │
│ │ → FTC Press Release • 8-K Filing                                        │   │
│ └─────────────────────────────────────────────────────────────────────────┘   │
│ ┌─ 2023-11-30 09:15 ─────────────────────────────────────────────────────┐   │
│ │ [🔴 HIGH] COURT • Motion to Dismiss DENIED                              │   │
│ │ Judge Corley denied motion. Injunction hearing Dec 22-23.               │   │
│ │ → Court Order                                                            │   │
│ └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│ [▶] SPREAD CHART                                                                │
│ [▶] NEWS                                                                        │
│ [▶] REGULATORY/LITIGATION                                                       │
│                                                                                 │
│ Press CMD+K for actions • Space for peek • G+D for deals                       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Research Draft (`/app/deals/[id]/draft`)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ j16z > MSFT / ATVI > Research Draft                [📋 Copy] [⬇ .md] [⬇ .docx] │
│ Auto-saved 2 seconds ago                                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│ # Microsoft / Activision Blizzard Merger Analysis                              │
│ *Generated: 2023-12-15 • Deal Status: REGULATORY_REVIEW*                       │
│                                                                                 │
│ ## Deal Overview                                                                │
│ Microsoft Corporation (MSFT) announced acquisition of Activision Blizzard      │
│ (ATVI) for $95.00/share in all-cash transaction valued at $68.7B. Deal        │
│ announced 2022-01-18, expected close 2024-07-18 (outside date).                │
│                                                                                 │
│ **Current Spread:** 4.2% (ATVI trading at $91.20 vs $95.00 offer)             │
│ **Probability Assessment:** 65% base case close                                │
│ **Entry Threshold:** 2.5% minimum spread                                       │
│                                                                                 │
│ ## Key Terms                                                                    │
│ | Term                    | Value          | Source                |           │
│ |-------------------------|----------------|-----------------------|           │
│ | Consideration           | $95.00/share   | S-4 Section 2.1       |           │
│ | Termination Fee         | $3.0B          | S-4 Section 7.2(b)    |           │
│ | Reverse Termination Fee | $3.0B          | S-4 Section 7.2(c)    |           │
│ | MAE Definition          | Standard       | S-4 Section 8.3       |           │
│ | Regulatory Efforts      | Reasonable     | S-4 Section 5.7       |           │
│ | Outside Date            | 2024-07-18     | S-4 Section 7.1(b)    |           │
│                                                                                 │
│ ## Regulatory Status                                                            │
│ **FTC (US):** Second Request issued 2023-12-08. FTC filed complaint in        │
│ administrative court citing concerns over gaming market consolidation.         │
│ Preliminary injunction hearing scheduled Dec 22-23. [HIGH RISK]                │
│                                                                                 │
│ **EU Commission:** Conditional approval granted 2023-05-15 subject to          │
│ behavioral remedies (10-year licensing commitments). [LOW RISK]                │
│                                                                                 │
│ ## Scenario Analysis                                                            │
│ **Base Case (65% probability):** Deal closes with regulatory concessions.      │
│ Expected return: 4.2% over ~7 months = 7.2% annualized.                        │
│                                                                                 │
│ **Bear Case (35% break):** FTC/CMA block deal. Reverse term fee paid.         │
│ ATVI trades down to $75-80 range (-15-20%).                                    │
│                                                                                 │
│ [Click to edit any section • Auto-saves every 5 seconds]                       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Styling Patterns

### Terminal Aesthetic
```css
/* Colors - AMBER PRIMARY (matches globals.css) */
--background: #0a0a0a;        /* Deep black */
--surface: #171717;           /* Zinc-900 */
--surface-highlight: #27272a; /* Zinc-800 */
--border: #27272a;            /* Zinc-800 */
--text-main: #ffffff;         /* White */
--text-muted: #a1a1aa;        /* Zinc-400 */
--text-dim: #52525b;          /* Zinc-600 */
--primary: #f59e0b;           /* Amber-500 (PRIMARY ACCENT) */
--primary-600: #d97706;       /* Amber-600 (DARKER ACCENT) */
--danger: #ef4444;            /* Red-500 */
--success: #10b981;           /* Emerald-500 (positive status only) */

/* Typography */
font-family: 'JetBrains Mono', monospace;
font-size: 11-13px (body), 10px (labels), 14-16px (headings);
line-height: 1.4-1.5;
letter-spacing: -0.01em;

/* Spacing */
padding: 4-8px (tight), 12-16px (normal), 24-32px (loose);
gap: 4-8px (components), 12-16px (sections);

/* Borders */
border: 1px solid var(--border);
border-radius: 6px-8px;
```

### Status Badges
```
🟢 EMERALD (ANNOUNCED, APPROVED, CLOSED) - Positive, low risk
🟡 AMBER (REGULATORY_REVIEW, PENDING) - Neutral, medium risk
🔴 RED (LITIGATION, TERMINATED, BLOCKED) - Negative, high risk
```

### Keyboard Shortcuts (Linear-Style)
```
CMD+K: Command palette (all actions: "Jump to Events", "Generate Draft", "Export CSV", etc.)
G then D: Go to Deals
G then I: Go to Deal (from board)
/: Quick search
C: Create new deal
Arrow keys: Navigate tables/lists
Enter: Open selected item
Space: Peek preview (hover + space)
Escape: Close modals/dialogs
```

## Risks / Trade-offs

### Risk: Information Overload
**Mitigation**: Collapsible sections (not tabs), progressive disclosure, Key Metrics always visible

### Risk: Performance with Large Deal Lists
**Mitigation**: Pagination (50 deals/page), lazy-load charts, virtualized scrolling for event timelines

### Risk: Mock Data Limitations
**Mitigation**: Structure mock data to match real API shapes (FMP, Alpha Vantage patterns), document API contracts

### Risk: Export Format Compatibility
**Mitigation**: CSV (universal), Markdown (simple), DOCX via docx.js library

## Migration Plan

### Phase 1: Core Screens (This Change)
1. Implement Deal Board with mock data matching FMP M&A API structure
2. Implement Deal Card as single-page scrollable with collapsible sections
3. Implement Research Draft with Markdown editor and 5s auto-save
4. Add keyboard shortcuts (CMD+1-5, CMD+D, CMD+E)
5. Test on 1920x1080, 2560x1440 monitors

### Phase 2: API Integration (Follow-up)
1. Define API contracts matching researched API patterns
2. Wire React Query for data fetching
3. Connect Supabase backend
4. Replace mock data with real queries
5. Add loading/error states

### Phase 3: Polish (Follow-up)
1. Virtualized scrolling for long event lists
2. More keyboard shortcuts
3. Accessibility (ARIA, focus management)
4. E2E tests (Playwright)

## Open Questions

1. **DOCX export**: Client-side (docx.js) or server-side?
   - **Recommendation**: Client-side docx.js for MVP

2. **Real-time updates**: Auto-refresh or manual?
   - **Recommendation**: Manual refresh (button + CMD+R) for MVP

3. **Watchlist storage**: LocalStorage or backend?
   - **Recommendation**: LocalStorage for MVP, backend in Phase 2

4. **Chart time ranges**: Which defaults?
   - **Recommendation**: 1M, 3M, 6M, 1Y, ALL with 3M as default

5. **Collapsible section state**: Remember collapsed/expanded?
   - **Recommendation**: Yes, store in LocalStorage per user
