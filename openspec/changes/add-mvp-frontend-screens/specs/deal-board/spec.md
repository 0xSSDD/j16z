## ADDED Requirements

### Requirement: Deal Board Table View

The system SHALL provide a sortable, filterable table displaying all tracked M&A deals with key metrics and status indicators.

#### Scenario: Analyst views all deals

- **WHEN** an analyst navigates to `/app/deals`
- **THEN** the system displays a table with columns: Deal Name (Acquirer → Target), Status, Spread (%), p_close_base (%), EV (%), Reg/Lit Status, Outside Date Countdown
- **AND** each row shows deal tickers, status badge with color coding (🟢 ANNOUNCED, 🟡 REGULATORY_REVIEW, 🔴 TERMINATED)
- **AND** spread column shows 24-hour change indicator (↑/↓ with percentage)
- **AND** regulatory/litigation status shows icons (🔴 for FTC/DOJ issues, ⚖️ with count for litigation)
- **AND** outside date shows countdown format ("⏱ 45d", "⏱ 120d", or "CLOSED")

#### Scenario: Analyst sorts deals by spread

- **WHEN** an analyst clicks the "Spread" column header
- **THEN** the table sorts deals by spread percentage in descending order
- **AND** clicking again reverses the sort order
- **AND** the active sort column is visually indicated with an icon

### Requirement: Deal Board Filtering

The system SHALL support filtering deals by spread threshold, probability threshold, sector, and watchlist membership.

#### Scenario: Analyst filters by multiple criteria

- **WHEN** an analyst applies filters: "Spread > 2%", "p_close > 40%", "My Watchlist"
- **THEN** the table shows only deals matching ALL filter criteria
- **AND** each active filter is displayed as a removable badge
- **AND** a "Clear All Filters" option is available

#### Scenario: Analyst filters by sector

- **WHEN** an analyst selects "Technology" from the sector dropdown
- **THEN** the table shows only deals where either acquirer or target is in Technology sector
- **AND** sector data is derived from Company Overview API structure

### Requirement: Outside Date Countdown

The system SHALL display a countdown to the outside date for each deal in the Deal Board.

#### Scenario: Analyst views outside date countdown

- **WHEN** an analyst views the Deal Board
- **THEN** each deal shows outside date countdown in format "⏱ 45d" or "⏱ 120d"
- **AND** deals past outside date show "CLOSED" or "EXPIRED"
- **AND** countdown updates daily
- **AND** deals within 30 days show amber color, within 7 days show red color

### Requirement: Watchlist Management

The system SHALL provide UI for creating, editing, and managing deal watchlists.

#### Scenario: Analyst creates new watchlist

- **WHEN** an analyst clicks "Manage Watchlists"
- **THEN** a modal opens with list of existing watchlists
- **WHEN** analyst clicks "+ New Watchlist"
- **THEN** a form appears with fields: Watchlist Name, Description
- **WHEN** analyst submits the form
- **THEN** the new watchlist is created and available in the filter dropdown

#### Scenario: Analyst adds deal to watchlist

- **WHEN** an analyst clicks the watchlist icon on a deal row
- **THEN** a dropdown shows all available watchlists
- **WHEN** analyst selects a watchlist
- **THEN** the deal is added to that watchlist
- **AND** the watchlist icon changes to indicate membership

### Requirement: Add Deal Flow

The system SHALL provide a simple flow for adding new deals to track.

#### Scenario: Analyst adds new deal

- **WHEN** an analyst clicks "+ Add Deal"
- **THEN** a modal opens with form fields: Acquirer Ticker, Target Ticker, Deal Name (optional)
- **WHEN** analyst enters "MSFT" and "ATVI" and submits
- **THEN** the system creates a new deal record with status "ANNOUNCED"
- **AND** the deal appears in the Deal Board table
- **AND** the modal closes

### Requirement: Deal Board Export

The system SHALL support exporting deal list data to CSV and JSON formats.

#### Scenario: Analyst exports filtered deals to CSV

- **WHEN** an analyst has active filters applied
- **AND** clicks "Export CSV"
- **THEN** the system downloads a CSV file containing all visible deals (respecting active filters)
- **AND** the CSV includes columns: Symbol, Acquirer, Target, Status, Spread, p_close_base, EV, Deal Value, Announcement Date, Outside Date, Regulatory Flags, Litigation Count
- **AND** filename format is `j16z-deals-{date}.csv`

### Requirement: Deal Board Pagination

The system SHALL display deals with pagination to maintain performance with large datasets.

#### Scenario: Analyst navigates paginated results

- **WHEN** there are more than 50 deals
- **THEN** the system displays 50 deals per page
- **AND** pagination controls show current page and total pages
- **AND** "Load More" button loads next page inline
- **AND** pagination state is preserved in URL parameters

### Requirement: Deal Board Keyboard Navigation

The system SHALL support Linear-style keyboard shortcuts for efficient navigation.

#### Scenario: Analyst uses keyboard shortcuts

- **WHEN** an analyst presses CMD+K
- **THEN** the command palette opens with actions: "Create Deal", "Export CSV", "Manage Watchlists", "Filter by Spread", etc.
- **WHEN** an analyst presses C
- **THEN** the "Add Deal" modal opens
- **WHEN** an analyst presses / (slash)
- **THEN** quick search activates to filter deals
- **WHEN** an analyst presses Arrow Up/Down
- **THEN** the selection moves to previous/next deal row
- **WHEN** an analyst presses Enter on a selected row
- **THEN** the system opens the deal card for that deal
- **WHEN** an analyst presses Space while hovering over a deal
- **THEN** deal preview (peek) appears

### Requirement: Deal Board Visual Density

The system SHALL use high-density terminal-style layout optimized for large desktop monitors.

#### Scenario: Analyst views board on large monitor

- **WHEN** an analyst views the deal board on a 1920x1080+ monitor
- **THEN** the table uses compact spacing (4-8px padding)
- **AND** font sizes are 11-13px for body text, 10px for labels
- **AND** monospace fonts (JetBrains Mono) are used throughout
- **AND** dark background (#0a0a0a) with amber accents (#f59e0b) matches terminal aesthetic
- **AND** all columns are visible without horizontal scrolling on 1920px width
