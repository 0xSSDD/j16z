## ADDED Requirements

### Requirement: Deal Card Single-Page Layout

The system SHALL provide a single-page scrollable dashboard for comprehensive deal analysis with collapsible sections.

#### Scenario: Analyst views deal card

- **WHEN** an analyst navigates to `/app/deals/[id]`
- **THEN** the system displays a single scrollable page (NOT tabs)
- **AND** the page includes: Deal Header, Key Metrics Panel (always visible), and 5 collapsible sections
- **AND** collapsible sections are: Deal Terms & Clauses, Event Timeline, Spread History, News & Research, Regulatory & Litigation
- **AND** each collapsible section has [▼] (expanded) or [▶] (collapsed) indicator
- **AND** all actions accessible via CMD+K command palette

#### Scenario: Analyst collapses section

- **WHEN** an analyst clicks on a section header or [▼] indicator
- **THEN** the section collapses and shows [▶] indicator
- **AND** section state is saved to localStorage
- **WHEN** analyst returns to the page
- **THEN** sections restore to their previous collapsed/expanded state

### Requirement: Deal Card Header

The system SHALL display deal identification, status, and key dates in a prominent header.

#### Scenario: Analyst views deal header

- **WHEN** an analyst views a deal card
- **THEN** the header displays: Acquirer Name → Target Name
- **AND** status badge with color coding (🟢🟡🔴)
- **AND** announcement date in format "Announced: YYYY-MM-DD"
- **AND** outside date with countdown "Outside: ⏱ 45d"
- **AND** CMD+K indicator in top-right corner

### Requirement: Key Metrics Panel

The system SHALL display always-visible key metrics with inline editing for analyst inputs.

#### Scenario: Analyst views key metrics

- **WHEN** an analyst views a deal card
- **THEN** the Key Metrics panel is always visible (not collapsible)
- **AND** displays: Spread (with 24h change), p_close_base, EV (calculated), Deal Value, Consideration Type
- **AND** spread shows change indicator (↑ 0.3% or ↓ 0.3%)
- **AND** p_close_base has inline edit icon [✎]
- **AND** below metrics, displays spread_entry_threshold with inline edit icon [✎]

#### Scenario: Analyst edits p_close_base

- **WHEN** an analyst clicks the [✎] icon next to p_close_base
- **THEN** the value becomes an editable input field
- **WHEN** analyst enters a new value between 0-100 and presses Enter or tabs away
- **THEN** the system validates the value
- **AND** updates the EV calculation (EV = spread * p_close_base / 100)
- **AND** auto-saves the change after 5 seconds
- **AND** displays "Saved" indicator

#### Scenario: Analyst edits spread_entry_threshold

- **WHEN** an analyst clicks the [✎] icon next to spread_entry_threshold
- **THEN** the value becomes an editable input field
- **WHEN** analyst enters a new value between 0-100 and submits
- **THEN** the system validates and saves the threshold
- **AND** this threshold is used for entry decision logic

### Requirement: Deal Terms & Clauses Section

The system SHALL display extracted deal terms from SEC filings with source citations.

#### Scenario: Analyst views deal clauses

- **WHEN** an analyst expands the "Deal Terms & Clauses" section (CMD+1)
- **THEN** the system displays a table with columns: Clause Type, Value, Source
- **AND** clause types include: Termination Fee, Reverse Termination Fee, MAE, Regulatory Efforts, Litigation Condition, Financing Condition
- **AND** each source is a clickable link (e.g., "S-4 Section 7.2(b) →")
- **WHEN** analyst clicks a source link
- **THEN** the system opens the SEC filing URL in a new tab

### Requirement: Event Timeline Section

The system SHALL display a time-ordered, filterable timeline of all deal-related events.

#### Scenario: Analyst views event timeline

- **WHEN** an analyst expands the "Event Timeline" section (CMD+2)
- **THEN** the system displays events in reverse chronological order (newest first)
- **AND** each event shows: timestamp, materiality badge ([🔴 HIGH], [🟡 MEDIUM], [🟢 LOW]), event type, title, summary, source links
- **AND** filter chips are displayed: [FILING] [COURT] [AGENCY] [SPREAD_MOVE] [NEWS]
- **AND** materiality dropdown filter: [All Materiality ▾]

#### Scenario: Analyst filters events by type

- **WHEN** an analyst clicks the [COURT] filter chip
- **THEN** the chip becomes highlighted/active
- **AND** the timeline shows only COURT events
- **AND** other event types are hidden
- **WHEN** analyst clicks [COURT] again
- **THEN** the filter is removed and all events are shown

#### Scenario: Analyst filters by materiality

- **WHEN** an analyst selects "High Materiality" from the dropdown
- **THEN** the timeline shows only events with materiality = HIGH
- **AND** the dropdown displays "High Materiality" as active filter

### Requirement: Spread History Section

The system SHALL display an interactive spread chart with event markers.

#### Scenario: Analyst views spread chart

- **WHEN** an analyst expands the "Spread History" section (CMD+3)
- **THEN** the system displays an area chart showing spread percentage over time
- **AND** the chart uses amber gradient fill (#f59e0b to #d97706)
- **AND** major events are marked on the chart with icons
- **AND** time range selector offers: [1M] [3M] [6M] [1Y] [ALL] with 3M as default
- **WHEN** analyst hovers over an event marker
- **THEN** a tooltip displays the event title and date

#### Scenario: Analyst changes time range

- **WHEN** an analyst clicks [1Y]
- **THEN** the chart updates to show spread data for the past year
- **AND** [1Y] button is visually highlighted as active

### Requirement: News & Research Section

The system SHALL display curated news and RSS items with analyst note capability.

#### Scenario: Analyst reviews news items

- **WHEN** an analyst expands the "News & Research" section (CMD+4)
- **THEN** the system displays a list of news items with: timestamp, source, title, summary, link
- **AND** items are sorted by timestamp (newest first)
- **AND** each item has an "Add Note" button

#### Scenario: Analyst adds note to news item

- **WHEN** an analyst clicks "Add Note" on a news item
- **THEN** an editable text field appears below the news item
- **WHEN** analyst types a note and tabs away
- **THEN** the note is auto-saved after 5 seconds
- **AND** the note is displayed with the news item on subsequent views

### Requirement: Regulatory & Litigation Section

The system SHALL display regulatory and litigation status with risk assessment.

#### Scenario: Analyst views regulatory status

- **WHEN** an analyst expands the "Regulatory & Litigation" section (CMD+5)
- **THEN** the system displays regulatory status for: FTC (US), DOJ (US), EU Commission, UK CMA
- **AND** each jurisdiction shows: latest action, date, key concerns, risk level ([🔴 HIGH RISK], [🟡 MEDIUM RISK], [🟢 LOW RISK])
- **AND** risk levels are derived from event materiality

#### Scenario: Analyst views litigation status

- **WHEN** an analyst views the Regulatory & Litigation section
- **THEN** the system displays: number of active cases, case types (shareholder derivative, class action, antitrust), most recent development with date and materiality
- **AND** includes overall litigation risk assessment

### Requirement: Deal Card Actions via Command Palette

The system SHALL provide all actions through CMD+K command palette.

#### Scenario: Analyst exports deal data

- **WHEN** an analyst presses CMD+K and types "export"
- **THEN** command palette shows: "Export as CSV", "Export as JSON"
- **WHEN** analyst selects "Export as CSV"
- **THEN** the system downloads a CSV file containing: deal terms, current metrics, all clauses, recent events (last 30 days)
- **AND** filename format is `j16z-deal-{acquirer}-{target}-{date}.csv`

#### Scenario: Analyst generates research draft

- **WHEN** an analyst presses CMD+K and types "draft"
- **THEN** command palette shows "Generate Draft"
- **WHEN** analyst selects it
- **THEN** the system navigates to `/app/deals/[id]/draft` and auto-generates memo

#### Scenario: Analyst configures alerts

- **WHEN** an analyst presses CMD+K and types "alert"
- **THEN** command palette shows "Configure Alerts"
- **WHEN** analyst selects it
- **THEN** a modal opens with: event type checkboxes (FILING, COURT, AGENCY, SPREAD_MOVE, NEWS), materiality dropdown, notification channels (Email, Slack, Webhook)
- **WHEN** analyst saves configuration
- **THEN** alerts are activated for this deal

### Requirement: Deal Card Keyboard Shortcuts

The system SHALL support Linear-style keyboard shortcuts for efficient navigation and actions.

#### Scenario: Analyst uses command palette

- **WHEN** an analyst presses CMD+K
- **THEN** the command palette opens with searchable actions: "Jump to Events", "Jump to Terms", "Generate Draft", "Export CSV", "Configure Alerts", "Add to Watchlist"
- **WHEN** analyst types "draft" and presses Enter
- **THEN** the system generates a research draft

#### Scenario: Analyst uses navigation shortcuts

- **WHEN** an analyst presses G then D
- **THEN** the system navigates to Deal Board
- **WHEN** analyst presses / (slash)
- **THEN** quick search activates
- **WHEN** analyst presses Space while hovering over an event
- **THEN** event preview (peek) appears
- **WHEN** analyst presses Escape
- **THEN** any open modals close

### Requirement: Deal Card Visual Consistency

The system SHALL maintain terminal aesthetic and high data density throughout the single-page layout.

#### Scenario: Analyst views deal card on large monitor

- **WHEN** an analyst views the deal card on a 1920x1080+ monitor
- **THEN** all sections use consistent dark background (#0a0a0a) with amber accents (#f59e0b)
- **AND** monospace fonts are used for all data display
- **AND** spacing is compact (4-8px padding) to maximize information density
- **AND** status badges use consistent color coding (🟢 emerald = positive, 🟡 amber = neutral, 🔴 red = negative)
- **AND** collapsible section headers are clearly distinguishable with hover effects
- **AND** the page is fully scrollable without horizontal scrolling
