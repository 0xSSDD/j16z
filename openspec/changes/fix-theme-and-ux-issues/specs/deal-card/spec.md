# Deal Card Spec Deltas

## MODIFIED Requirements

### Requirement: Theme Support
The Deal Card SHALL support both light and dark color themes that can be toggled by the user.

#### Scenario: Light mode displays readable colors
- **WHEN** user switches to light mode
- **THEN** Deal Card background is light (white/gray-50)
- **AND** all sections have light backgrounds
- **AND** text is dark and readable
- **AND** charts adapt to light theme

#### Scenario: Dark mode displays terminal aesthetic
- **WHEN** user switches to dark mode
- **THEN** Deal Card background is dark (#0a0a0a/zinc-950)
- **AND** all sections have dark backgrounds
- **AND** amber accents are preserved
- **AND** charts use dark theme

### Requirement: Inline Editing Discoverability
The Deal Card SHALL make inline-editable fields clearly discoverable to users.

#### Scenario: Editable fields show hover state
- **WHEN** user hovers over p_close_base or spread_entry_threshold
- **THEN** field shows border to indicate editability
- **AND** cursor changes to text cursor

#### Scenario: Editable fields have visual cues
- **WHEN** user views key metrics panel
- **THEN** pencil icon is visible next to editable fields
- **AND** placeholder text hints at editability

## ADDED Requirements

### Requirement: Helpful Empty States
The Deal Card SHALL provide helpful guidance when sections have no data.

#### Scenario: Empty events section shows guidance
- **WHEN** deal has no events
- **THEN** empty state displays: "No events yet. Check back as regulatory actions occur."
- **AND** suggests adding to watchlist for notifications

#### Scenario: Empty news section shows guidance
- **WHEN** deal has no news items
- **THEN** empty state displays: "No news items yet. News will appear as coverage develops."

#### Scenario: Empty clauses section shows guidance
- **WHEN** deal has no clauses
- **THEN** empty state displays: "No deal terms available. Terms will be extracted from SEC filings."

### Requirement: Section State Persistence
The Deal Card SHALL remember which sections are collapsed/expanded across page visits.

#### Scenario: Collapsed sections stay collapsed
- **WHEN** user collapses a section
- **AND** navigates away and returns
- **THEN** section remains collapsed

#### Scenario: Expanded sections stay expanded
- **WHEN** user expands a section
- **AND** navigates away and returns
- **THEN** section remains expanded

#### Scenario: State is per-deal
- **WHEN** user collapses section on Deal A
- **AND** views Deal B
- **THEN** Deal B sections have independent state
