## ADDED Requirements

### Requirement: Research Draft Auto-Generation

The system SHALL auto-generate a structured research memo skeleton from deal data.

#### Scenario: Analyst generates draft from deal card

- **WHEN** an analyst clicks "Generate Draft" from a deal card or presses CMD+D
- **THEN** the system navigates to `/app/deals/[id]/draft`
- **AND** auto-populates the following sections: Deal Overview, Key Terms, Regulatory Status, Litigation, Scenario Analysis
- **AND** displays generation timestamp in the header
- **AND** all sections are editable with Markdown syntax

#### Scenario: Draft includes deal overview

- **WHEN** a draft is generated
- **THEN** the Deal Overview section includes: acquirer and target names (from Deal entity), deal value (from reportedEquityTakeoverValue), consideration type, announcement date, expected close date, outside date
- **AND** current spread and probability assessment (from p_close_base) are displayed
- **AND** spread_entry_threshold is displayed
- **AND** all data is pulled from the Deal entity matching API structure

### Requirement: Research Draft Key Terms Table

The system SHALL generate a formatted Markdown table of deal terms with source citations.

#### Scenario: Draft includes terms table

- **WHEN** a draft is generated
- **THEN** the Key Terms section includes a Markdown table with columns: Term, Value, Source
- **AND** terms include: Consideration, Termination Fee, Reverse Termination Fee, MAE Definition, Regulatory Efforts, Litigation Condition, Financing Condition, Outside Date
- **AND** source citations reference specific filing sections (e.g., "S-4 Section 7.2(b)")
- **AND** the table is editable
- **AND** data is pulled from Clause entities

### Requirement: Research Draft Regulatory Section

The system SHALL summarize regulatory status with risk assessment.

#### Scenario: Draft includes regulatory analysis

- **WHEN** a draft is generated
- **THEN** the Regulatory Status section lists each jurisdiction: FTC (US), DOJ (US), EU Commission, UK CMA
- **AND** for each jurisdiction, includes: latest action, date, key concerns, risk level ([🔴 HIGH RISK], [🟡 MEDIUM RISK], [🟢 LOW RISK])
- **AND** risk levels are based on materiality of recent AGENCY events
- **AND** section is editable with Markdown formatting
- **AND** data is pulled from Event entities filtered by type=AGENCY

### Requirement: Research Draft Litigation Section

The system SHALL summarize active litigation with case details.

#### Scenario: Draft includes litigation summary

- **WHEN** a draft is generated
- **THEN** the Litigation section lists: number of active cases, case types (shareholder derivative, class action, antitrust), most recent development with date and materiality
- **AND** includes risk assessment ([🔴 HIGH RISK], [🟡 MEDIUM RISK], [🟢 LOW RISK])
- **AND** section is editable
- **AND** data is pulled from Event entities filtered by type=COURT

### Requirement: Research Draft Scenario Analysis

The system SHALL generate probability-weighted scenario analysis with return calculations.

#### Scenario: Draft includes scenario analysis

- **WHEN** a draft is generated
- **THEN** the Scenario Analysis section includes three scenarios: Base Case, Bear Case, Bull Case
- **AND** Base Case shows: probability (from p_close_base), expected return calculation (spread / months to close), annualized return
- **AND** Bear Case shows: probability (100 - p_close_base), downside scenario description (deal breaks, stock trades down estimate)
- **AND** Bull Case shows: probability estimate, upside scenario description (quick regulatory approval, accelerated close)
- **AND** all calculations are based on current Deal entity metrics
- **AND** section is editable

### Requirement: Research Draft Markdown Editor

The system SHALL provide an editable Markdown interface with syntax support.

#### Scenario: Analyst edits draft content

- **WHEN** an analyst clicks into any section
- **THEN** that section becomes editable with Markdown syntax support
- **WHEN** an analyst types Markdown syntax (e.g., **bold**, - list, ## heading)
- **THEN** the syntax is preserved in the editor
- **AND** changes are auto-saved after 5 seconds of no typing
- **AND** a "Auto-saved X seconds ago" indicator displays the save timestamp

#### Scenario: Analyst uses Markdown formatting

- **WHEN** an analyst types Markdown in the editor
- **THEN** headings (# ## ###), bold (**text**), italic (*text*), lists (- item), tables (| col |), and links ([text](url)) are supported
- **AND** the raw Markdown is visible in the editor (not rendered)
- **AND** export formats will render the Markdown correctly

### Requirement: Research Draft Export

The system SHALL support exporting drafts to multiple formats.

#### Scenario: Analyst copies draft to clipboard

- **WHEN** an analyst clicks "Copy"
- **THEN** the entire draft (all sections) is copied to clipboard as Markdown
- **AND** a toast notification confirms "Copied to clipboard"
- **AND** the Markdown preserves all formatting

#### Scenario: Analyst exports draft as Markdown

- **WHEN** an analyst clicks "⬇ .md"
- **THEN** the system downloads a `.md` file named `j16z-{acquirer}-{target}-analysis-{YYYY-MM-DD}.md`
- **AND** the file contains all sections with proper Markdown formatting
- **AND** the file is UTF-8 encoded

#### Scenario: Analyst exports draft as DOCX

- **WHEN** an analyst clicks "⬇ .docx"
- **THEN** the system uses docx.js library to generate a DOCX file
- **AND** downloads a file named `j16z-{acquirer}-{target}-analysis-{YYYY-MM-DD}.docx`
- **AND** the file contains all sections with proper formatting (headings, tables, lists, bold, italic)
- **AND** monospace fonts are preserved for code/data sections
- **AND** tables are properly formatted with borders

### Requirement: Research Draft Header

The system SHALL display draft metadata and export actions in a prominent header.

#### Scenario: Analyst views draft header

- **WHEN** an analyst views a research draft
- **THEN** the header displays: deal name (acquirer / target), generation timestamp, export buttons (Copy, .md, .docx)
- **AND** a back button navigates to the deal card
- **AND** header remains fixed at top during scrolling
- **AND** auto-save status is displayed ("Auto-saved X seconds ago")

### Requirement: Research Draft Auto-Save

The system SHALL automatically save draft edits without explicit save action.

#### Scenario: Draft auto-saves edits

- **WHEN** an analyst edits any section
- **AND** stops typing for 5 seconds
- **THEN** the system saves the changes to localStorage (MVP) or backend (Phase 2)
- **AND** displays "Auto-saved X seconds ago" indicator
- **WHEN** an analyst navigates away
- **THEN** all changes are persisted
- **AND** returning to the draft shows the latest edits

#### Scenario: Draft handles unsaved changes on navigation

- **WHEN** an analyst has unsaved changes (typed within last 5 seconds)
- **AND** attempts to navigate away
- **THEN** the system waits for auto-save to complete before navigating
- **OR** if navigation is forced, saves immediately before leaving

### Requirement: Research Draft Visual Consistency

The system SHALL maintain terminal aesthetic and readability for long-form content.

#### Scenario: Analyst views draft on large monitor

- **WHEN** an analyst views a research draft on a 1920x1080+ monitor
- **THEN** the content area uses maximum width of 1200px for readability
- **AND** monospace fonts are used for all text (JetBrains Mono)
- **AND** dark background (#0a0a0a) with high-contrast text (#ffffff)
- **AND** headings use amber accent color (#f59e0b)
- **AND** tables use terminal-style borders
- **AND** line height is 1.6-1.8 for comfortable reading of long-form content

### Requirement: Research Draft Data Persistence

The system SHALL persist draft edits across sessions.

#### Scenario: Analyst returns to draft

- **WHEN** an analyst generates a draft and makes edits
- **AND** navigates away from the page
- **AND** returns to the same draft later
- **THEN** the system displays the edited version (not the original auto-generated version)
- **AND** all edits are preserved
- **AND** the generation timestamp shows the original generation time
- **AND** the auto-save timestamp shows the last edit time

#### Scenario: Draft storage for MVP

- **WHEN** running MVP with mock data
- **THEN** draft edits are stored in localStorage with key format `draft-{dealId}`
- **AND** drafts persist across browser sessions
- **AND** clearing localStorage will reset drafts to auto-generated state
