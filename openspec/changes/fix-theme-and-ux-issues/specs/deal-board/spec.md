# Deal Board Spec Deltas

## MODIFIED Requirements

### Requirement: Theme Support
The Deal Board SHALL support both light and dark color themes that can be toggled by the user.

#### Scenario: Light mode displays readable colors
- **WHEN** user switches to light mode
- **THEN** Deal Board background is light (white/gray-50)
- **AND** text is dark (gray-900)
- **AND** table rows have light backgrounds
- **AND** all content is readable

#### Scenario: Dark mode displays terminal aesthetic
- **WHEN** user switches to dark mode
- **THEN** Deal Board background is dark (#0a0a0a/zinc-950)
- **AND** text is light (zinc-100)
- **AND** table rows have dark backgrounds
- **AND** amber accents (#f59e0b) are preserved

#### Scenario: Theme persists across page reloads
- **WHEN** user selects a theme
- **AND** reloads the page
- **THEN** selected theme is still active

## ADDED Requirements

### Requirement: Financial Term Tooltips
The Deal Board SHALL provide explanatory tooltips for financial terms to help new users understand the data.

#### Scenario: Spread column has tooltip
- **WHEN** user hovers over "Spread" column header
- **THEN** tooltip appears explaining: "Difference between target price and offer price as a percentage"

#### Scenario: p_close column has tooltip
- **WHEN** user hovers over "p_close" column header
- **THEN** tooltip appears explaining: "Probability of deal closing (0-100%)"

#### Scenario: EV column has tooltip
- **WHEN** user hovers over "EV" column header
- **THEN** tooltip appears explaining: "Expected Value = Spread × p_close / 100"

### Requirement: Navigation Completeness
The Deal Board SHALL be accessible from the main navigation alongside other platform features.

#### Scenario: Discovery link in navigation
- **WHEN** user views the sidebar
- **THEN** "Discovery" link is visible in Platform section
- **AND** clicking it navigates to /app/discovery

#### Scenario: Notifications link in navigation
- **WHEN** user views the sidebar
- **THEN** "Notifications" link is visible in Platform section
- **AND** clicking it navigates to /app/notifications

### Requirement: Command Palette
The application SHALL provide a CMD+K command palette for quick navigation and actions.

#### Scenario: CMD+K opens command palette
- **WHEN** user presses CMD+K (or CTRL+K on Windows)
- **THEN** command palette modal opens
- **AND** search input is focused

#### Scenario: Navigate to pages via command palette
- **WHEN** user opens command palette
- **AND** types "deals" or "dashboard" or "discovery"
- **THEN** matching navigation commands appear
- **AND** pressing Enter navigates to selected page

#### Scenario: Search deals via command palette
- **WHEN** user opens command palette
- **AND** types a ticker symbol (e.g., "MSFT")
- **THEN** matching deals appear in results
- **AND** pressing Enter navigates to deal card

#### Scenario: Quick actions via command palette
- **WHEN** user opens command palette
- **AND** types "new deal" or "watchlist"
- **THEN** quick action commands appear
- **AND** pressing Enter executes the action

#### Scenario: Escape closes command palette
- **WHEN** user presses Escape
- **THEN** command palette closes
- **AND** focus returns to previous element
