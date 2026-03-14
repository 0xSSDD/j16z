# Frontend Data Layer

## Overview
API abstraction layer (`src/lib/api.ts`) that switches between mock data and real backend calls via `NEXT_PUBLIC_USE_MOCK_DATA`. Client-side scoring, localStorage for read status and preferences. React Query and Zustand are installed but not yet used.

## Data Flow Architecture

```mermaid
graph TD
    COMP["UI Component"] --> API["api.ts function<br/>(getDeals, getEvents, etc.)"]

    API -->|"USE_MOCK_DATA=true"| MOCK["constants.ts<br/>~1400 lines of mock data"]
    API -->|"USE_MOCK_DATA=false"| AUTH_FETCH["authFetch()<br/>Attaches Supabase JWT"]

    AUTH_FETCH --> BACKEND["Hono API<br/>localhost:3001/api/*"]

    MOCK --> TRANSFORM["Optional transforms<br/>(filter by dealId, etc.)"]
    BACKEND --> TRANSFORM

    TRANSFORM --> SCORING["Client-side scoring<br/>severity-scoring.ts<br/>materiality-scoring.ts"]

    SCORING --> ALERTS["alert-triggers.ts<br/>Determines channels"]

    COMP --> LS["localStorage<br/>(read-status, theme, prefs)"]
```

## API Functions Map

```mermaid
graph LR
    subgraph "Read Operations"
        GD["getDeals()"]
        GD1["getDeal(id)"]
        GE["getEvents(dealId)"]
        GAE["getAllEvents()"]
        GC["getClauses(dealId)"]
        GMS["getMarketSnapshots(dealId)"]
        GN["getNews(dealId)"]
        GF["getFilings(dealId)"]
        GAF["getAllFilings()"]
        GFC["getFilingCount(dealId)"]
    end

    subgraph "Write Operations"
        CD["createDeal(data)"]
        UD["updateDeal(id, data)"]
        DD["deleteDeal(id)"]
    end

    subgraph "Data Source"
        MOCK["Mock Data<br/>(constants.ts)"]
        REAL["Real API<br/>(authFetch)"]
    end

    GD --> MOCK
    GD --> REAL
    GF -->|"No mock fallback"| REAL
    GAF -->|"No mock fallback"| REAL
    GFC -->|"No mock fallback"| REAL
```

**Filings are backend-only:** `getFilings()`, `getAllFilings()`, and `getFilingCount()` have no mock data fallback. They always call the real API. In mock mode, these return empty arrays / 0.

## authFetch Wrapper

```mermaid
sequenceDiagram
    participant COMP as Component
    participant API as api.ts
    participant SUPA as Supabase Client
    participant BACKEND as Hono API

    COMP->>API: getDeals()
    API->>API: Check USE_MOCK_DATA

    alt Mock mode
        API-->>COMP: Return MOCK_DEALS
    else Real mode
        API->>SUPA: getSession()
        SUPA-->>API: { access_token }
        API->>BACKEND: GET /api/deals<br/>Authorization: Bearer {token}
        BACKEND-->>API: JSON response
        API-->>COMP: Parsed data
    end
```

**Gotcha:** If the Supabase session is expired, `authFetch` will send a request without a valid token, which will return 401 from the backend. The frontend doesn't currently handle token refresh failures in `authFetch` — the user sees an error and must re-login.

## Client-Side Scoring

```mermaid
graph TD
    EVENT["Event from API"] --> SEV["severity-scoring.ts<br/>calculateSeverityScore()"]
    EVENT --> MAT["materiality-scoring.ts<br/>calculateMaterialityScore()"]

    SEV --> SEV_OUT["Score 0-100<br/>CRITICAL (>70) / WARNING (50-70) / INFO (<50)"]
    MAT --> MAT_OUT["Score 0-100<br/>HIGH (>70) / MEDIUM (50-70) / LOW (<50)"]

    SEV_OUT --> ALERT["alert-triggers.ts"]
    MAT_OUT --> ALERT

    ALERT --> CH{"Score >= 70?"}
    CH -->|yes| EMAIL["Email + Slack<br/>SLA: 60s"]
    CH -->|"50-69"| SLACK["Slack only<br/>SLA: 300s"]
    CH -->|"<50"| NONE["Inbox only<br/>No external alert"]
```

### Severity Base Scores

| Type | SubType | Score |
|---|---|---|
| AGENCY | FTC Complaint | 95 |
| AGENCY | Second Request | 85 |
| AGENCY | DOJ Press Release | 80 |
| COURT | Injunction Granted | 90 |
| COURT | Motion Denied | 75 |
| FILING | S-4, DEFM14A | 80 |
| FILING | 8-K Amendment | 60 |
| SPREAD_MOVE | >200 bps | 70 |
| SPREAD_MOVE | >100 bps | 50 |
| NEWS | - | 10-40 |

### Adjustments (applied on top of base)

| Condition | Adjustment |
|---|---|
| <30 days to outside_date | +20 |
| p_close < 40% | +15 |
| litigation > 3 cases | +10 |
| Analyst marked "not_critical" | -25 |

**Important:** These scores are calculated client-side. The backend's `event-factory.ts` also assigns `materiality_score` and `severity` on event creation, but the frontend recalculates using its own logic. The two systems use similar but not identical base scores.

## Read/Unread Status

```mermaid
graph LR
    LS["localStorage<br/>key: inbox_read_events"] --> RS["read-status.ts"]

    RS --> MR["markEventAsRead(id)"]
    RS --> MA["markAllEventsAsRead(ids)"]
    RS --> IR["isEventRead(id)"]
    RS --> UC["getUnreadCount(allIds)"]

    UC --> BADGE["Inbox badge in sidebar"]
    IR --> DOT["Read/unread dot on event cards"]
```

**Client-only:** Read status is stored only in localStorage, not synced to the database. Clearing browser data resets all events to unread. Different devices/browsers have independent read states.

**Custom event:** When read status changes, a `inbox:unread-updated` CustomEvent is dispatched on `window` so the sidebar badge updates in real-time without polling.

## State Management Status

| Tool | Status | Usage |
|---|---|---|
| `@tanstack/react-query` v5 | Installed, **not used** | No `useQuery`/`useMutation` calls found |
| `zustand` v5 | Installed, **not used** | No stores created |
| `use-local-storage-state` | **Active** | Theme, read status, preferences |
| Direct `api.ts` calls | **Active** | All data fetching is inline in components |

**Implication:** There's no query caching, deduplication, or background refetching. Each component that calls `getDeals()` makes a separate network request. This is fine for MVP but will need React Query integration as the app scales.

## Mock Data Inventory

| Constant | Count | Notes |
|---|---|---|
| `MOCK_DEALS` | ~50 deals | Real M&A transactions with full financial data |
| `MOCK_EVENTS` | ~11 events | Mix of all 5 event types |
| `MOCK_CLAUSES` | ~8 clauses | Termination fees, MAE, regulatory efforts |
| `MOCK_MARKET_SNAPSHOTS` | ~180 points | 6 months daily data for deal-1 |
| `MOCK_NEWS` | ~4 items | Law firm alerts, analyst notes |

**No mock filings:** Filing data is always fetched from the real backend, even in mock mode.

## Navigation & App Shell

```mermaid
graph TD
    subgraph "App Shell (app-layout.tsx)"
        SIDEBAR["Sidebar<br/>4 nav items"]
        HEADER["Header<br/>Status, theme, logout"]
        CONTENT["Content Area<br/>(children)"]
    end

    SIDEBAR --> INBOX["Inbox<br/>(default home)"]
    SIDEBAR --> DEALS["Deals"]
    SIDEBAR --> WATCH["Watchlists"]
    SIDEBAR --> SETTINGS["Settings"]

    INBOX -.->|"unread badge"| UC["getUnreadCount()"]
    HEADER -.->|"system status"| STATUS["SYSTEM_NOMINAL indicator"]
    HEADER -.->|"Cmd+K"| CMD["Command palette"]
```

The sidebar shows an unread count badge computed from `getAllEvents()` + `getReadEvents()` on mount and updated via the `inbox:unread-updated` custom event.
