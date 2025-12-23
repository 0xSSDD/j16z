# Notifications Inbox

## ADDED Requirements

### Requirement: Inbox Access

The system SHALL provide a notifications inbox accessible via CMD+K command palette, navigation menu, or notification badge in header.

**Rationale**: User Story #10 - Unified view of all new events for quick triage.

#### Scenario: Access inbox via CMD+K
- **GIVEN** analyst is on any page
- **WHEN** analyst presses CMD+K and types "Notifications" or "Inbox"
- **THEN** system navigates to `/app/notifications` page

#### Scenario: Access inbox via header badge
- **GIVEN** analyst has 5 unread notifications
- **WHEN** analyst clicks notification badge showing "5" in header
- **THEN** system navigates to `/app/notifications` page

#### Scenario: Access inbox via navigation
- **GIVEN** analyst is on any page
- **WHEN** analyst clicks "Notifications" in sidebar (if added) or CMD+K
- **THEN** system navigates to `/app/notifications` page

---

### Requirement: Unified Event Feed

The system SHALL display all events across all tracked deals in reverse chronological order with unread indicators, grouped by deal.

**Data Structure**:
```typescript
{
  notifications: Array<{
    id,
    user_id,
    event_id,
    deal_id,
    read_at: timestamp | null,
    created_at: timestamp,
    event: {
      type, sub_type, title, short_summary, materiality_score, event_date,
      deal: {id, acquirer_name, target_name}
    }
  }>
}
```

**Backend API**: `GET /api/notifications?unread_only=false&limit=50&offset=0`

#### Scenario: Display unread notifications
- **GIVEN** analyst has 5 unread notifications
- **WHEN** analyst opens inbox
- **THEN** system displays notifications with:
  - Unread indicator (blue dot or highlight)
  - Deal name (Acquirer → Target)
  - Event type badge (FILING, COURT, AGENCY, SPREAD_MOVE, NEWS)
  - Materiality badge (HIGH/MEDIUM/LOW with color coding)
  - Title
  - Short summary (truncated to 2 lines)
  - Timestamp (relative: "2 hours ago", "yesterday")
  - Grouped by deal with deal name as section header

#### Scenario: Display read notifications
- **GIVEN** analyst has read some notifications
- **WHEN** analyst views inbox with "Show All" filter
- **THEN** system displays read notifications with:
  - No unread indicator
  - Slightly dimmed appearance
  - Same information as unread notifications

#### Scenario: Empty inbox
- **GIVEN** analyst has no notifications
- **WHEN** analyst opens inbox
- **THEN** system shows "No notifications. You're all caught up!" with illustration

---

### Requirement: Filtering and Sorting

The system SHALL provide filters for unread status, materiality level, event type, and deal, with sorting by time or materiality.

#### Scenario: Filter by unread only
- **GIVEN** analyst has 5 unread and 20 read notifications
- **WHEN** analyst toggles "Unread Only" filter
- **THEN** system displays only 5 unread notifications

#### Scenario: Filter by materiality
- **GIVEN** analyst has notifications of varying materiality
- **WHEN** analyst selects "HIGH" materiality filter
- **THEN** system displays only notifications with materiality_score >= 70

#### Scenario: Filter by event type
- **GIVEN** analyst wants to see only regulatory events
- **WHEN** analyst selects "AGENCY" event type filter
- **THEN** system displays only AGENCY events (FTC, DOJ actions)

#### Scenario: Filter by deal
- **GIVEN** analyst tracks 20 deals
- **WHEN** analyst selects "MSFT/ATVI" from deal dropdown
- **THEN** system displays only notifications for that deal

#### Scenario: Sort by materiality
- **GIVEN** analyst has notifications sorted by time (default)
- **WHEN** analyst selects "Sort by Materiality"
- **THEN** system reorders notifications with highest materiality first

---

### Requirement: Mark as Read/Unread

The system SHALL allow analyst to mark individual notifications or all notifications as read/unread.

**Backend API**:
- `PATCH /api/notifications/:id/read`
- `POST /api/notifications/mark-all-read`

#### Scenario: Mark single notification as read
- **GIVEN** analyst views an unread notification
- **WHEN** analyst clicks on notification to view details
- **THEN** system automatically marks notification as read (updates read_at timestamp)

#### Scenario: Mark single notification as unread
- **GIVEN** analyst has read a notification
- **WHEN** analyst clicks "Mark as Unread" icon
- **THEN** system marks notification as unread (sets read_at to null)

#### Scenario: Mark all as read
- **GIVEN** analyst has 10 unread notifications
- **WHEN** analyst clicks "Mark All as Read" button
- **THEN** system marks all notifications as read and updates badge count to 0

---

### Requirement: Quick Actions

The system SHALL provide quick actions on each notification: View Deal, Dismiss, Mark as Unread.

#### Scenario: View deal from notification
- **GIVEN** analyst sees notification for MSFT/ATVI deal
- **WHEN** analyst clicks notification or "View Deal" button
- **THEN** system navigates to Deal Card for MSFT/ATVI with relevant section expanded (e.g., if COURT event, expand Regulatory/Litigation section)

#### Scenario: Dismiss notification
- **GIVEN** analyst views a notification
- **WHEN** analyst clicks "Dismiss" icon
- **THEN** system marks notification as read and removes from unread count

---

### Requirement: Real-Time Updates

The system SHALL update notification badge count and inbox in real-time when new events occur (via WebSocket or polling).

#### Scenario: New notification arrives
- **GIVEN** analyst has inbox open
- **WHEN** backend creates new high-materiality event
- **THEN** system:
  - Increments badge count in header
  - Adds notification to top of inbox feed
  - Shows brief toast "New HIGH event: FTC Second Request - MSFT/ATVI"

#### Scenario: Notification count in header
- **GIVEN** analyst is on any page
- **WHEN** analyst has 5 unread notifications
- **THEN** system displays badge with "5" on notification icon in header

---

### Requirement: Pagination

The system SHALL paginate notifications with 50 items per page and infinite scroll or "Load More" button.

#### Scenario: Load more notifications
- **GIVEN** analyst has scrolled to bottom of 50 notifications
- **WHEN** analyst clicks "Load More" or scrolls to trigger
- **THEN** system fetches next 50 notifications via `GET /api/notifications?offset=50`

---

### Requirement: Visual Consistency

The notifications inbox SHALL maintain terminal aesthetic with dark background, amber accent, and clear visual hierarchy for materiality levels.

#### Scenario: Materiality color coding
- **GIVEN** analyst views notifications
- **WHEN** notifications have different materiality levels
- **THEN** system displays:
  - HIGH materiality: Red badge (#ef4444) with "🔴 HIGH"
  - MEDIUM materiality: Amber badge (#f59e0b) with "🟡 MEDIUM"
  - LOW materiality: Gray badge (#6b7280) with "⚪ LOW"

#### Scenario: Terminal styling
- **GIVEN** analyst views inbox
- **WHEN** page renders
- **THEN** system applies:
  - Dark background (#0a0a0a)
  - Amber accent for interactive elements
  - Monospace font for timestamps and deal names
  - Consistent with Deal Board and Deal Card styling
