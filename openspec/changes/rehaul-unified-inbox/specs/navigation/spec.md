## ADDED Requirements

### Requirement: Four-Item Navigation Structure

The platform SHALL provide a simplified 4-item navigation sidebar: Inbox, Deals, Watchlists, and Settings.

#### Scenario: Navigation item display
- **WHEN** authenticated user views any page
- **THEN** sidebar displays exactly 4 navigation items in order: Inbox, Deals, Watchlists, Settings
- **AND** each item shows icon and label
- **AND** active page is highlighted with distinct visual treatment
- **AND** unread counts appear as badges on Inbox item

#### Scenario: Default landing page
- **WHEN** user navigates to `/app` root
- **THEN** platform redirects to `/app/inbox`
- **AND** Inbox navigation item is highlighted as active
- **AND** Inbox page loads within 500ms

#### Scenario: Navigation persistence
- **WHEN** user navigates between pages
- **THEN** sidebar remains visible and consistent
- **AND** active state updates to reflect current page
- **AND** navigation state persists across page reloads

### Requirement: Keyboard Navigation Shortcuts

The platform SHALL support global keyboard shortcuts for navigation between main sections.

#### Scenario: Go to Inbox shortcut
- **WHEN** user presses `g` then `i` keys
- **THEN** platform navigates to Inbox page
- **AND** focus moves to first unread event

#### Scenario: Go to Deals shortcut
- **WHEN** user presses `g` then `d` keys
- **THEN** platform navigates to Deals page
- **AND** focus moves to deal board

#### Scenario: Go to Watchlists shortcut
- **WHEN** user presses `g` then `w` keys
- **THEN** platform navigates to Watchlists page

#### Scenario: Go to Settings shortcut
- **WHEN** user presses `g` then `s` keys
- **THEN** platform navigates to Settings page

#### Scenario: Keyboard shortcut help
- **WHEN** user presses `?` key
- **THEN** modal displays all available keyboard shortcuts
- **AND** shortcuts are grouped by context (navigation, inbox, deals)
- **AND** modal can be closed via ESC key

### Requirement: Unread Badge Display

The Inbox navigation item SHALL display a badge showing the count of unread events.

#### Scenario: Unread count display
- **WHEN** Inbox contains 3 unread events
- **THEN** Inbox nav item shows badge with "3"
- **AND** badge uses high-contrast color (red or amber)
- **AND** badge is visible in both light and dark modes

#### Scenario: Unread count updates
- **WHEN** analyst marks event as read
- **THEN** unread count decrements in real-time
- **AND** badge updates without page reload
- **AND** badge disappears when count reaches 0

#### Scenario: Maximum count display
- **WHEN** unread count exceeds 99
- **THEN** badge displays "99+"
- **AND** actual count is available on hover tooltip

## REMOVED Requirements

### Requirement: Dashboard Navigation Item

**Reason:** Dashboard functionality consolidated into Inbox (event triage) and Settings (analytics/configuration). Redundant with new unified Inbox approach.

**Migration:**
- Event monitoring → Inbox page
- Alert configuration → Settings > Alert Rules
- Analytics → Settings > Alert Rules (digest config)

### Requirement: Live Monitor Navigation Item

**Reason:** Live Monitor duplicates Notifications functionality. Real-time event monitoring now handled by unified Inbox with filters.

**Migration:**
- Real-time event feed → Inbox page
- Channel configuration (Slack/Email) → Settings > Integrations
- Filter rules → Inbox filters (materiality, type, deal)

### Requirement: Discovery Navigation Item

**Reason:** Discovery page used only for one-off deal creation. Functionality moved to Deals page "+ Deal" button.

**Migration:**
- Deal creation → Deals page header "+ Deal" button
- Deal search → Deals page filters

### Requirement: Deal Intelligence Navigation Item

**Reason:** Deal Intelligence side panel pattern now integrated into Inbox. Separate page no longer needed.

**Migration:**
- Event detail view → Inbox side panel
- Deal context → Inbox inline display + side panel
- Source document access → Inbox side panel links

### Requirement: Notifications Navigation Item

**Reason:** Notifications page absorbed into unified Inbox. All event sources consolidated.

**Migration:**
- Event list → Inbox timeline
- Event detail → Inbox side panel
- Mark as read → Inbox read/unread management
- Filters → Inbox filters
