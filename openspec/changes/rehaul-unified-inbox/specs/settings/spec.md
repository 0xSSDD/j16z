## ADDED Requirements

### Requirement: Tabbed Settings Hub

The Settings page SHALL provide a centralized configuration hub with 5 tabs: Alert Rules, Integrations, RSS Feeds, Team, and API Keys.

#### Scenario: Settings page navigation
- **WHEN** user navigates to Settings page
- **THEN** page displays 5 tabs in header: Alert Rules, Integrations, RSS Feeds, Team, API Keys
- **AND** Alert Rules tab is selected by default
- **AND** tab content loads below tab header
- **AND** selected tab is highlighted with distinct visual treatment

#### Scenario: Tab switching
- **WHEN** user clicks Integrations tab
- **THEN** tab content switches to Integrations configuration
- **AND** URL updates to `/app/settings?tab=integrations`
- **AND** tab state persists on page reload
- **AND** transition is smooth (no flash of content)

#### Scenario: Direct tab access via URL
- **WHEN** user navigates to `/app/settings?tab=rss-feeds`
- **THEN** Settings page loads with RSS Feeds tab active
- **AND** RSS Feeds content is displayed

### Requirement: Alert Rules Configuration

The Settings SHALL provide Alert Rules tab for configuring default alert thresholds, per-deal overrides, and email digest settings.

#### Scenario: Default alert thresholds
- **WHEN** user views Alert Rules tab
- **THEN** page displays default thresholds section with:
  - Materiality threshold (default: HIGH, score > 70)
  - Spread movement alert (default: > 2.5%)
  - Outside date warning (default: < 30 days)
  - Delivery channels (default: Slack + Email)
- **AND** each threshold has Edit button
- **AND** thresholds apply to all new deals

#### Scenario: Edit materiality threshold
- **WHEN** user clicks Edit on materiality threshold
- **THEN** inline editor appears with dropdown (HIGH/MEDIUM/LOW)
- **AND** user selects MEDIUM (score > 50)
- **AND** clicks Save
- **THEN** threshold updates immediately
- **AND** future HIGH-tier events (score 50-70) now trigger external alerts
- **AND** success toast appears "Alert threshold updated"

#### Scenario: Per-deal alert override
- **WHEN** user clicks "+ Add Override" in Per-Deal Overrides section
- **THEN** modal appears with deal selector and override options
- **AND** user selects "Microsoft/Activision" deal
- **AND** user configures event filters via checkboxes (multi-select): AGENCY, COURT, FILING, SPREAD_MOVE, NEWS
- **AND** user selects AGENCY and COURT checkboxes only
- **AND** clicks Save
- **THEN** override appears in list showing "AGENCY + COURT events only"
- **AND** FILING and NEWS events for that deal no longer trigger external alerts
- **AND** override can be edited or deleted

#### Scenario: Email digest configuration
- **WHEN** user views Email Digest Config section
- **THEN** page displays daily and weekly digest options
- **AND** user can set time (e.g., "8:00 AM") with timezone auto-detected from browser
- **AND** user can manually override timezone via dropdown (ET, PT, UTC, etc.)
- **AND** user can select event tiers (HIGH + MEDIUM or ALL)
- **AND** user can enable/disable weekend suppression
- **AND** changes save automatically after 2-second debounce

### Requirement: Integrations Management

The Settings SHALL provide Integrations tab for managing Slack, Email, and Webhook connections.

#### Scenario: Connected integrations display
- **WHEN** user views Integrations tab
- **THEN** page displays list of connected integrations:
  - Slack: #arbitrage-desk channel
  - Email: analyst@firm.com
- **AND** each integration shows Edit and Disconnect buttons
- **AND** "+ Add Integration" button is visible

#### Scenario: Add Slack integration
- **WHEN** user clicks "+ Add Integration"
- **AND** selects "Slack" from dropdown
- **THEN** OAuth flow initiates to authorize j16z app
- **AND** user selects channel (#deals-alerts)
- **AND** completes authorization
- **THEN** Slack integration appears in list
- **AND** test message is posted to channel
- **AND** future alerts are sent to that channel

#### Scenario: Edit email integration
- **WHEN** user clicks Edit on Email integration
- **THEN** modal appears with email address field
- **AND** user updates email to new-analyst@firm.com
- **AND** clicks Save
- **THEN** verification email is sent to new address (valid for 48 hours)
- **AND** integration status shows "Pending verification"
- **AND** "Resend verification" button appears (max 3 resends, 5-minute cooldown)
- **AND** after verification, status updates to "Active"
- **AND** if not verified within 48 hours, status changes to "Expired"
- **AND** user can re-initiate setup from Expired state

#### Scenario: Disconnect integration
- **WHEN** user clicks Disconnect on Slack integration
- **THEN** confirmation dialog appears
- **AND** user confirms disconnection
- **THEN** integration is removed from list
- **AND** future alerts no longer sent to that channel
- **AND** success toast appears "Slack disconnected"

#### Scenario: Webhook configuration
- **WHEN** user adds webhook integration
- **THEN** modal appears with URL field and event type selector
- **AND** user enters webhook URL (https://internal-risk.firm.com/webhook)
- **AND** selects event types (AGENCY, COURT)
- **AND** clicks Save
- **THEN** webhook appears in list
- **AND** test payload is sent to webhook URL
- **AND** webhook status shows "Active" if test succeeds

### Requirement: RSS Feeds Management

The Settings SHALL provide RSS Feeds tab for managing built-in and custom RSS feed subscriptions.

#### Scenario: Built-in feeds display
- **WHEN** user views RSS Feeds tab
- **THEN** page displays Built-In Feeds section with:
  - SEC EDGAR (auto-subscribed for tracked CIKs)
  - FTC/DOJ Antitrust (auto-subscribed)
  - CourtListener Dockets (auto-subscribed)
- **AND** built-in feeds cannot be disabled
- **AND** feeds show last sync timestamp

#### Scenario: Add custom RSS feed
- **WHEN** user clicks "+ Add Custom Feed" in Custom Feeds section
- **THEN** modal appears with feed URL field and watchlist selector
- **AND** user enters feed URL (https://www.wlrk.com/antitrust.rss)
- **AND** selects watchlist "Tech M&A"
- **AND** clicks Save
- **THEN** feed is validated and parsed
- **AND** feed appears in Custom Feeds list
- **AND** future feed items are ingested and appear in Inbox

#### Scenario: Edit custom feed
- **WHEN** user clicks Edit on "Wachtell Antitrust Alerts" feed
- **THEN** modal appears with current URL and watchlist
- **AND** user changes watchlist to "All Deals"
- **AND** clicks Save
- **THEN** feed configuration updates
- **AND** future items apply to new watchlist

#### Scenario: Delete custom feed
- **WHEN** user clicks Delete on custom feed
- **THEN** confirmation dialog appears
- **AND** user confirms deletion
- **THEN** feed is removed from list
- **AND** future items from that feed are not ingested
- **AND** historical items remain in Inbox

### Requirement: Team Management

The Settings SHALL provide Team tab for managing team members and permissions.

#### Scenario: Team members display
- **WHEN** user with admin role views Team tab
- **THEN** page displays list of team members:
  - Current user (admin)
  - Other analysts (analyst role)
  - Portfolio managers (pm role)
- **AND** each member shows name, email, role, and action buttons
- **AND** "+ Invite New Member" button is visible

#### Scenario: Invite new team member
- **WHEN** admin clicks "+ Invite New Member"
- **THEN** modal appears with email and role fields
- **AND** admin enters email (new-analyst@firm.com) and selects role (analyst)
- **AND** clicks Send Invite
- **THEN** invitation email is sent
- **AND** pending invitation appears in list with "Pending" status
- **AND** invitee can accept invitation and create account

#### Scenario: Edit member permissions
- **WHEN** admin clicks Edit on team member
- **THEN** modal appears with role dropdown
- **AND** admin changes role from analyst to pm (view-only)
- **AND** clicks Save
- **THEN** member's role updates immediately
- **AND** member's permissions are restricted (no deal creation, no alert config)

#### Scenario: Remove team member
- **WHEN** admin clicks Remove on team member
- **THEN** confirmation dialog appears
- **AND** admin confirms removal
- **THEN** member is removed from team
- **AND** member loses access to platform
- **AND** member's watchlists and configurations are preserved (orphaned)

#### Scenario: Permissions model enforcement
- **WHEN** user with pm role attempts to create deal
- **THEN** "+ Deal" button is disabled
- **AND** tooltip explains "View-only access"
- **WHEN** user with analyst role attempts to invite team member
- **THEN** Team tab shows "Admin access required" message
- **AND** invite button is hidden

### Requirement: API Keys Management

The Settings SHALL provide API Keys tab for generating, rotating, and revoking API keys for external integrations.

#### Scenario: API keys display
- **WHEN** user views API Keys tab
- **THEN** page displays list of active API keys:
  - Key ID (e.g., j16z_live_12345)
  - Created date
  - Last used timestamp
  - Action buttons (Rotate, Revoke, Copy)
- **AND** "+ Generate New Key" button is visible
- **AND** "API Documentation" link is visible

#### Scenario: Generate new API key
- **WHEN** user clicks "+ Generate New Key"
- **THEN** modal appears with key name field
- **AND** user enters name "Internal Risk System"
- **AND** clicks Generate
- **THEN** new API key is created
- **AND** key value is displayed once (j16z_live_abc123...)
- **AND** warning appears "Save this key now. It won't be shown again."
- **AND** user can copy key to clipboard

#### Scenario: Rotate API key
- **WHEN** user clicks Rotate on existing key
- **THEN** confirmation dialog appears
- **AND** user confirms rotation
- **THEN** new key is generated
- **AND** old key is invalidated after 24-hour grace period
- **AND** new key value is displayed once
- **AND** grace period countdown is shown

#### Scenario: Revoke API key
- **WHEN** user clicks Revoke on API key
- **THEN** confirmation dialog appears with warning "This action is immediate and irreversible"
- **AND** user confirms revocation
- **THEN** key is immediately invalidated
- **AND** key is removed from list
- **AND** future API requests with that key return 401 Unauthorized

#### Scenario: Copy API key
- **WHEN** user clicks Copy on API key
- **THEN** masked key value (j16z_live_***45) is copied to clipboard
- **AND** toast appears "Key ID copied"
- **AND** full key value is never displayed after initial generation

#### Scenario: API documentation access
- **WHEN** user clicks "API Documentation" link
- **THEN** new tab opens with API reference docs
- **AND** docs include authentication, endpoints, rate limits, and examples
- **AND** docs show user's API key ID (not full key) in examples

### Requirement: Settings Search and Quick Access

The Settings SHALL provide search functionality to quickly find specific configuration options.

#### Scenario: Settings search
- **WHEN** user types "slack" in settings search field
- **THEN** search results highlight:
  - Integrations > Slack integration
  - Alert Rules > Delivery channels (mentions Slack)
- **AND** clicking result navigates to relevant tab and section
- **AND** matching section is highlighted with subtle animation

#### Scenario: Quick settings link from Inbox
- **WHEN** user clicks "Configure Alerts" link in Inbox header
- **THEN** Settings page opens with Alert Rules tab active
- **AND** Default Alert Thresholds section is scrolled into view
- **AND** section is highlighted to draw attention

### Requirement: Settings Persistence and Sync

The Settings SHALL persist all configuration changes immediately and sync across user sessions.

#### Scenario: Auto-save configuration
- **WHEN** user changes alert threshold
- **THEN** change is saved automatically after 2-second debounce
- **AND** loading indicator appears during save
- **AND** success indicator appears after save
- **AND** no explicit Save button required

#### Scenario: Cross-session sync
- **WHEN** user updates email digest time on desktop
- **AND** opens platform on different device
- **THEN** email digest time reflects latest change
- **AND** sync occurs within 5 seconds

#### Scenario: Optimistic updates
- **WHEN** user toggles weekend suppression
- **THEN** UI updates immediately (optimistic)
- **AND** save request is sent in background
- **AND** if save fails, UI reverts and error toast appears
