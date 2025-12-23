## ADDED Requirements

### Requirement: Settings Page Structure

The system SHALL provide a settings page for configuring user preferences, watchlists, and alert channels.

#### Scenario: Analyst navigates to settings

- **WHEN** an analyst clicks "System Config" in sidebar or presses CMD+K → "Settings"
- **THEN** the system navigates to `/app/settings`
- **AND** displays settings page with 4 sections: Profile, Watchlists, Alerts, Preferences

### Requirement: Profile Settings Section

The system SHALL allow analysts to view and update profile information.

#### Scenario: Analyst views profile settings

- **WHEN** an analyst opens the Profile section
- **THEN** displays: User name (editable), Email (read-only), Avatar (upload option)
- **AND** displays API key with copy button (for API access per MVP 8)
- **AND** displays "Generate New API Key" button
- **AND** changes auto-save after 5 seconds

#### Scenario: Analyst generates API key

- **WHEN** an analyst clicks "Generate New API Key"
- **THEN** a confirmation modal appears warning "This will invalidate your current API key"
- **WHEN** analyst confirms
- **THEN** system generates new API key
- **AND** displays new key with copy button
- **AND** shows success message

### Requirement: Watchlist Management Section

The system SHALL provide comprehensive watchlist management interface.

#### Scenario: Analyst views watchlists

- **WHEN** an analyst opens the Watchlists section
- **THEN** displays list of all watchlists with: name, description, deal count, last updated
- **AND** provides "+ New Watchlist" button
- **AND** each watchlist has: Edit, Delete, View Deals actions

#### Scenario: Analyst creates watchlist

- **WHEN** an analyst clicks "+ New Watchlist"
- **THEN** an inline form appears with fields: Name (required), Description (optional), Color tag (optional)
- **WHEN** analyst enters "Q4 2024 Coverage" and submits
- **THEN** watchlist is created
- **AND** appears in watchlist list
- **AND** is available in Deal Board filter dropdown

#### Scenario: Analyst edits watchlist

- **WHEN** an analyst clicks Edit on a watchlist
- **THEN** fields become editable inline
- **WHEN** analyst updates name or description and tabs away
- **THEN** changes auto-save after 5 seconds
- **AND** success indicator appears

#### Scenario: Analyst deletes watchlist

- **WHEN** an analyst clicks Delete on a watchlist
- **THEN** confirmation modal appears: "Delete [Watchlist Name]? This will not delete deals, only the watchlist."
- **WHEN** analyst confirms
- **THEN** watchlist is deleted
- **AND** deals remain in system (only watchlist association removed)

#### Scenario: Analyst views deals in watchlist

- **WHEN** an analyst clicks "View Deals" on a watchlist
- **THEN** system navigates to Deal Board with watchlist filter applied
- **AND** shows only deals in that watchlist

### Requirement: Alert Configuration Section

The system SHALL provide global alert configuration for all deals.

#### Scenario: Analyst configures default alerts

- **WHEN** an analyst opens the Alerts section
- **THEN** displays global alert settings: Event types (checkboxes), Materiality threshold (dropdown), Notification channels
- **AND** event type checkboxes: FILING, COURT, AGENCY, SPREAD_MOVE, NEWS
- **AND** materiality dropdown: All, High only, High + Medium
- **AND** notification channels: Email (toggle + address), Slack (toggle + webhook URL), Webhook (toggle + URL)

#### Scenario: Analyst enables Slack notifications

- **WHEN** an analyst toggles Slack notifications ON
- **THEN** Slack webhook URL field becomes editable
- **WHEN** analyst enters webhook URL and tabs away
- **THEN** system validates URL format
- **AND** auto-saves after 5 seconds
- **AND** displays "Test Notification" button

#### Scenario: Analyst tests Slack notification

- **WHEN** an analyst clicks "Test Notification" for Slack
- **THEN** system sends test message to configured Slack webhook
- **AND** displays success message: "Test notification sent to Slack"
- **OR** displays error message if webhook fails

#### Scenario: Analyst configures per-deal alerts

- **WHEN** an analyst is on a Deal Card and presses CMD+K → "Configure Alerts"
- **THEN** modal shows deal-specific alert overrides
- **AND** inherits global settings by default
- **AND** allows overriding: event types, materiality, channels for this deal only

### Requirement: Preferences Section

The system SHALL allow analysts to configure UI and data preferences.

#### Scenario: Analyst views preferences

- **WHEN** an analyst opens the Preferences section
- **THEN** displays settings: Theme (Dark/Light/Auto), Default spread filter, Default probability filter, Auto-save frequency, Date format, Number format

#### Scenario: Analyst changes theme

- **WHEN** an analyst selects "Light" theme
- **THEN** UI immediately switches to light mode
- **AND** preference is saved to localStorage
- **AND** applies across all sessions

#### Scenario: Analyst sets default filters

- **WHEN** an analyst sets "Default spread filter" to ">3%"
- **THEN** Deal Board will apply this filter by default on load
- **AND** analyst can still change filter per session
- **AND** preference persists across sessions

#### Scenario: Analyst changes auto-save frequency

- **WHEN** an analyst changes "Auto-save frequency" from 5s to 10s
- **THEN** all auto-save operations (draft editing, inline edits) use new frequency
- **AND** preference applies immediately

### Requirement: Settings Data Persistence

The system SHALL persist settings data appropriately for MVP.

#### Scenario: Settings storage for MVP

- **WHEN** running MVP with mock data
- **THEN** profile settings stored in localStorage with key `user-profile`
- **AND** watchlists stored in localStorage with key `watchlists`
- **AND** alert settings stored in localStorage with key `alert-config`
- **AND** preferences stored in localStorage with key `user-preferences`
- **AND** API key stored in localStorage with key `api-key` (for demo purposes)

#### Scenario: Settings migration to backend

- **WHEN** backend API is ready (Phase 2)
- **THEN** settings sync to backend via: `POST /api/settings/profile`, `POST /api/settings/watchlists`, `POST /api/settings/alerts`, `POST /api/settings/preferences`
- **AND** localStorage serves as cache
- **AND** backend is source of truth

### Requirement: Settings Visual Consistency

The system SHALL maintain terminal aesthetic in settings page.

#### Scenario: Analyst views settings page styling

- **WHEN** an analyst views settings page
- **THEN** page uses dark background with amber accents
- **AND** sections are separated by subtle borders
- **AND** form inputs use monospace fonts for values
- **AND** buttons use amber primary color
- **AND** success/error messages use appropriate color coding (emerald/red)
- **AND** layout is single-column with max-width 1200px for readability
