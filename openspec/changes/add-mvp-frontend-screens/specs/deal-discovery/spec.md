# Deal Discovery Results

## ADDED Requirements

### Requirement: Discovery Modal Trigger

The system SHALL provide a "Create Deal" action accessible via CMD+K command palette or a primary action button that opens a deal creation modal.

**Rationale**: User Story #9 - Analyst needs to initiate deal tracking from tickers.

#### Scenario: Open discovery modal via CMD+K
- **GIVEN** analyst is on any page
- **WHEN** analyst presses CMD+K and types "Create Deal"
- **THEN** system opens deal creation modal with focus on acquirer ticker input

#### Scenario: Open discovery modal via button
- **GIVEN** analyst is on Deal Board
- **WHEN** analyst clicks "New Deal" button in header
- **THEN** system opens deal creation modal

---

### Requirement: Ticker Input Form

The system SHALL provide a form with acquirer ticker, target ticker, and optional fields (deal name, expected close date, initial p_close_base, spread_entry_threshold).

**Rationale**: User Story #1 - Define coverage by providing tickers.

#### Scenario: Enter required tickers
- **GIVEN** deal creation modal is open
- **WHEN** analyst enters "MSFT" in acquirer field and "ATVI" in target field
- **THEN** system validates tickers and enables "Discover" button

#### Scenario: Ticker validation error
- **GIVEN** deal creation modal is open
- **WHEN** analyst enters invalid ticker "INVALID123"
- **THEN** system shows error "Ticker not found" and disables "Discover" button

#### Scenario: Optional fields
- **GIVEN** analyst has entered valid tickers
- **WHEN** analyst expands "Advanced Options"
- **THEN** system shows fields for deal name, expected close date, p_close_base (0-100%), spread_entry_threshold (%)

---

### Requirement: Discovery Search Execution

The system SHALL execute discovery searches across SEC EDGAR, CourtListener, and FTC/DOJ archives when analyst clicks "Discover" button, showing loading state with progress indicators.

**Rationale**: User Story #9 - Automatically discover all relevant data sources.

**Backend API**: `POST /api/deals/discover` with body `{acquirer_ticker, target_ticker}`

**Backend Responsibilities** (MVP Section 5.1):
- Resolve tickers to Company entities (CIK lookup via SEC API)
- Search SEC EDGAR for recent filings (last 12 months) mentioning "merger" or "acquisition" for these CIKs
- Search CourtListener for dockets with party names matching acquirer/target near announcement date
- Search FTC/DOJ RSS archives for press releases mentioning company names
- Return candidates with relevance scores

#### Scenario: Discovery in progress
- **GIVEN** analyst clicked "Discover" button
- **WHEN** backend is searching data sources
- **THEN** system shows loading modal with progress: "Searching SEC filings...", "Searching court dockets...", "Searching regulatory actions..."

#### Scenario: Discovery timeout
- **GIVEN** discovery search is running
- **WHEN** search takes longer than 30 seconds
- **THEN** system shows partial results with warning "Some sources timed out, showing available results"

---

### Requirement: Discovery Results Display

The system SHALL display discovered filings, court cases, and agency events in categorized sections with checkboxes for analyst confirmation.

**Data Structure**:
```typescript
{
  filings: Array<{id, type, date, title, url, relevance_score}>,
  court_cases: Array<{id, court, case_number, caption, date, url, relevance_score}>,
  agency_events: Array<{id, agency, type, date, title, url, relevance_score}>
}
```

#### Scenario: Display discovered filings
- **GIVEN** discovery search completed
- **WHEN** system found 3 SEC filings (8-K, S-4, DEFM14A)
- **THEN** system displays "SEC Filings (3)" section with:
  - Checkbox (checked by default if relevance > 0.7)
  - Filing type badge (8-K, S-4, DEFM14A)
  - Date
  - Title/description
  - Link to SEC EDGAR
  - Relevance indicator (HIGH/MEDIUM/LOW)

#### Scenario: Display discovered court cases
- **GIVEN** discovery search completed
- **WHEN** system found 2 court cases
- **THEN** system displays "Court Cases (2)" section with:
  - Checkbox (unchecked by default, requires analyst confirmation)
  - Court name
  - Case number
  - Caption (party names)
  - Filed date
  - Link to CourtListener
  - Case type indicator (Antitrust, Shareholder, Appraisal)

#### Scenario: Display discovered agency events
- **GIVEN** discovery search completed
- **WHEN** system found 5 FTC/DOJ press releases
- **THEN** system displays "Regulatory Actions (5)" section with:
  - Checkbox (checked by default if relevance > 0.8)
  - Agency badge (FTC, DOJ)
  - Event type (Press Release, Complaint, Second Request)
  - Date
  - Title
  - Link to source

#### Scenario: No results found
- **GIVEN** discovery search completed
- **WHEN** no filings, cases, or events found
- **THEN** system shows "No results found. You can still create the deal and add data manually."

---

### Requirement: Result Selection and Confirmation

The system SHALL allow analyst to select/deselect discovered items and confirm selections to create the deal with linked data sources.

#### Scenario: Select all high-relevance items
- **GIVEN** discovery results displayed
- **WHEN** analyst clicks "Select All High Confidence"
- **THEN** system checks all items with relevance > 0.7

#### Scenario: Deselect irrelevant items
- **GIVEN** discovery results displayed with some items checked
- **WHEN** analyst unchecks "FTC Press Release - Generic Policy Statement"
- **THEN** system removes that item from selection

#### Scenario: Confirm and create deal
- **GIVEN** analyst has reviewed and selected items
- **WHEN** analyst clicks "Create Deal & Start Tracking"
- **THEN** system:
  - Creates Deal record with acquirer_company_id, target_company_id
  - Links selected filings to Deal (creates Filing records)
  - Links selected court cases to Deal (creates CourtCase records)
  - Links selected agency events to Deal (creates AgencyEvent records)
  - Subscribes to RSS feeds for ongoing monitoring (SEC RSS for CIKs, CourtListener RSS for dockets, FTC/DOJ RSS with company name matching)
  - Starts market data polling (every 15 min)
  - Navigates to Deal Card for newly created deal
  - Shows success toast "Deal created. Tracking 3 filings, 1 court case, 2 regulatory actions."

---

### Requirement: Manual Deal Creation Fallback

The system SHALL allow analyst to create deal without discovery results if no data is found or analyst wants to add data manually later.

#### Scenario: Create deal without discovery
- **GIVEN** discovery returned no results or analyst skipped discovery
- **WHEN** analyst clicks "Create Deal Anyway"
- **THEN** system creates Deal record with only ticker information and navigates to Deal Card

---

### Requirement: Visual Consistency

The discovery modal and results display SHALL maintain terminal aesthetic with dark background (#0a0a0a), amber accent (#f59e0b), and monospace fonts for data fields.

#### Scenario: Terminal styling applied
- **GIVEN** discovery modal is open
- **WHEN** analyst views the interface
- **THEN** system displays:
  - Dark background (#0a0a0a)
  - Amber accent for primary actions and highlights
  - Monospace font for tickers, dates, case numbers
  - Consistent with Deal Board and Deal Card styling
