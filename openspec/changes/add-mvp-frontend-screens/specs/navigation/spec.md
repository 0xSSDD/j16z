## ADDED Requirements

### Requirement: Sidebar Navigation Structure

The system SHALL provide a logical sidebar navigation with Deals section integrated into Platform group.

#### Scenario: Analyst views sidebar navigation

- **WHEN** an analyst views any authenticated page
- **THEN** the sidebar displays navigation grouped into: Platform, Research, and System sections
- **AND** Platform section includes: Dashboard, Live Monitor, Deals, Deal Intelligence (in that order)
- **AND** Research section includes: AI Analyst, Prediction Markets, Risk Radar
- **AND** System section (bottom) includes: System Config
- **AND** active route is highlighted with amber border and background
- **AND** CMD+K search button is displayed at top of sidebar

#### Scenario: Analyst navigates to Deals

- **WHEN** an analyst clicks "Deals" in the Platform section
- **THEN** the system navigates to `/app/deals` (Deal Board)
- **AND** the "Deals" item is highlighted as active
- **AND** the Deal Board page loads with all tracked deals

### Requirement: Sidebar Visual Consistency

The system SHALL maintain terminal aesthetic in sidebar navigation matching existing design system.

#### Scenario: Analyst views sidebar styling

- **WHEN** an analyst views the sidebar
- **THEN** sidebar uses dark background (#0a0a0a) with border (#27272a)
- **AND** section headers use uppercase text with zinc-600 color
- **AND** nav items use 12px font size with zinc-400 color (inactive)
- **AND** active items use amber-500 border with surface highlight background
- **AND** hover states use surface highlight with 50% opacity
- **AND** icons are 16px with 70% opacity (100% on hover)

### Requirement: Sidebar CMD+K Integration

The system SHALL provide quick access to command palette from sidebar.

#### Scenario: Analyst opens command palette from sidebar

- **WHEN** an analyst clicks the "Jump to..." search button in sidebar
- **THEN** the command palette opens with focus on search input
- **WHEN** analyst presses CMD+K anywhere in app
- **THEN** the command palette opens
- **AND** includes actions: "Go to Deals", "Create Deal", "Go to Dashboard", "Go to Settings", etc.

### Requirement: Sidebar User Profile Display

The system SHALL display authenticated user information in sidebar footer.

#### Scenario: Analyst views user profile

- **WHEN** an analyst views the sidebar footer
- **THEN** displays user avatar with initials
- **AND** displays user name or email
- **AND** displays connection status indicator (green dot with "Connected")
- **AND** provides theme toggle button (dark/light mode)
- **AND** provides logout button

### Requirement: Sidebar Responsive Behavior

The system SHALL maintain sidebar visibility on desktop screens optimized for large monitors.

#### Scenario: Analyst views sidebar on large monitor

- **WHEN** an analyst views the app on 1920x1080+ monitor
- **THEN** sidebar is fixed at 256px width
- **AND** sidebar is always visible (not collapsible for MVP)
- **AND** main content area uses remaining width
- **AND** sidebar scrolls independently if nav items exceed viewport height
