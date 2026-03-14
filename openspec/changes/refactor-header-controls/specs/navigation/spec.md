## ADDED Requirements

### Requirement: Header Control Layout

The application layout SHALL provide a consistent header control section in the top-right corner containing theme toggle and logout controls.

#### Scenario: App header displays theme and logout controls
- **WHEN** user views any authenticated page
- **THEN** header displays theme toggle button (Sun/Moon icon)
- **AND** header displays logout button (LogOut icon)
- **AND** controls are positioned in top-right corner after "Pro Plan" badge
- **AND** controls are separated by vertical divider
- **AND** bell icon is NOT present in header

#### Scenario: Theme toggle in header
- **WHEN** user clicks theme toggle button in header
- **THEN** theme switches between dark and light mode
- **AND** preference is saved to localStorage
- **AND** icon updates (Sun for dark mode, Moon for light mode)
- **AND** document classes update immediately

#### Scenario: Logout from header
- **WHEN** user clicks logout button in header
- **THEN** user is redirected to /login page
- **AND** session is cleared

### Requirement: Landing Page Theme Toggle

The landing page SHALL provide a theme toggle control in the header for unauthenticated users.

#### Scenario: Landing page header with theme toggle
- **WHEN** user views landing page (/)
- **THEN** header displays theme toggle button
- **AND** theme toggle uses same localStorage key as app layout
- **AND** theme preference persists when navigating to app

#### Scenario: Theme consistency across pages
- **WHEN** user sets theme on landing page
- **AND** user logs in and navigates to app
- **THEN** app displays with same theme preference
- **AND** no theme flicker occurs during transition

## REMOVED Requirements

### Requirement: Notification Bell Icon

**Reason**: Removing bell icon from header to simplify navigation controls and reduce visual clutter. Notification functionality will be accessed through alternative means (Inbox page with badge count).

**Migration**: Users can access notifications via the Inbox sidebar item which displays unread count badge.

### Requirement: Sidebar Bottom Controls

**Reason**: Theme toggle and logout controls are being moved to header for better discoverability and conventional UX patterns.

**Migration**: Controls relocated to top-right header. No functionality loss, only position change.

#### Previous behavior (now removed):
- Theme toggle button in sidebar bottom section
- Logout button in sidebar bottom section
- Bottom control container with theme/logout buttons
