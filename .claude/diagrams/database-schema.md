# Database Schema

## Overview
PostgreSQL on Supabase with Drizzle ORM. 13 tables split between global (no RLS) and firm-scoped (RLS enforced). UUID primary keys everywhere, soft deletes on most tables.

## Entity Relationship Diagram

```mermaid
erDiagram
    firms ||--o{ firm_members : "has"
    firms ||--o{ invites : "has"
    firms ||--o{ deals : "owns"
    firms ||--o{ events : "owns"
    firms ||--o{ clauses : "owns"
    firms ||--o{ market_snapshots : "owns"
    firms ||--o{ news_items : "owns"
    firms ||--o{ watchlists : "owns"
    firms ||--o{ alert_rules : "owns"
    firms ||--o{ audit_log : "owns"

    deals ||--o{ events : "generates"
    deals ||--o{ clauses : "has"
    deals ||--o{ market_snapshots : "has"
    deals ||--o{ news_items : "references"
    deals ||--o{ alert_rules : "scoped to"
    deals }o--o{ watchlists : "via watchlist_deals"

    filings ||--o{ deals : "linked to (nullable)"

    watchlists ||--o{ watchlist_deals : "contains"
    deals ||--o{ watchlist_deals : "appears in"
```

## Global vs Firm-Scoped Tables

```mermaid
graph LR
    subgraph "Global (no firm_id, no RLS)"
        FIRMS["firms<br/>(admin-only)"]
        FILINGS["filings<br/>(shared ingestion stream)"]
    end

    subgraph "Firm-Scoped (firm_id + RLS)"
        DEALS["deals"]
        EVENTS["events"]
        CLAUSES["clauses"]
        MARKET["market_snapshots"]
        NEWS["news_items"]
        WATCHLISTS["watchlists"]
        ALERT["alert_rules"]
        AUDIT["audit_log"]
        MEMBERS["firm_members"]
        INVITES["invites"]
    end

    subgraph "Junction (RLS via parent)"
        WD["watchlist_deals<br/>(RLS checks through watchlists)"]
    end
```

**Why filings are global:** The EDGAR ingestion pipeline inserts filings once globally. Firm-scoped Events are then created for each firm tracking the related deal. This avoids duplicating filing data per firm.

**Why deals can have `firm_id = null`:** Auto-discovered deals (from high-signal EDGAR filings) start unclaimed in a global discovery pool. They become firm-scoped when a firm claims them.

## Key Tables Detail

### deals

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK, auto-generated |
| firm_id | UUID (nullable) | null = unclaimed auto-discovered deal |
| symbol | text | Ticker symbol |
| acquirer / target | text | Company names |
| acquirer_cik / target_cik | text (nullable) | For EDGAR CIK-based polling |
| status | text | ANNOUNCED, REGULATORY_REVIEW, LITIGATION, APPROVED, TERMINATED, CLOSED |
| consideration_type | text | CASH, STOCK, MIXED |
| deal_value, price_per_share, premium, current_price | numeric | Financial metrics (stored as strings in API, Drizzle handles conversion) |
| spread, annualized_return | numeric | Computed merger-arb metrics |
| p_close_base, p_break_regulatory, p_break_litigation | numeric | Analyst probability estimates |
| outside_date, expected_close_date, announced_date | text | Key dates |
| source | text (nullable) | 'auto_edgar' for auto-created deals |
| auto_edgar | boolean | Legacy flag for auto-creation |
| is_starter | boolean | Marks seed data for UI badging |
| size_bucket | text | MEGA, LARGE, MID, SMALL |
| deleted_at | timestamp (nullable) | Soft delete |

### events

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| firm_id | UUID | Always present (firm-scoped) |
| deal_id | UUID (nullable) | Can be unlinked |
| type | text | FILING, COURT, AGENCY, SPREAD_MOVE, NEWS |
| sub_type | text (nullable) | E.g., 'S-4', 'FTC_COMPLAINT', '8-K' |
| title, description | text | Human-readable |
| source | text | SEC_EDGAR, COURTLISTENER, etc. |
| source_url | text (nullable) | Link to original |
| timestamp | timestamp | When the event occurred |
| materiality_score | integer | 0-100 |
| severity | text | CRITICAL, WARNING, INFO |
| metadata | jsonb | Flexible per-type data |

### filings (GLOBAL — no firm_id)

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| accession_number | text (unique) | Dedupe key for idempotent inserts |
| filing_type | text | S-4, 8-K, DEFM14A, etc. |
| filer_name, filer_cik | text | Who filed |
| filed_date | text | ISO date |
| deal_id | UUID (nullable) | Linked after matching |
| raw_url | text | SEC EDGAR URL |
| raw_content | text (nullable) | Plain text (null until Stage 2 download) |
| extracted | boolean | Whether LLM extraction has run |
| status | text | active, pending_review, dismissed |

## RLS Implementation

```mermaid
sequenceDiagram
    participant CLIENT as Client Request
    participant PG as PostgreSQL
    participant JWT as JWT (app_metadata)

    CLIENT->>PG: SELECT * FROM deals
    PG->>JWT: Extract firm_id from auth.jwt()->'app_metadata'->>'firm_id'
    JWT-->>PG: firm_id = 'abc-123'
    PG->>PG: Apply RLS policy:<br/>WHERE firm_id = 'abc-123'
    PG-->>CLIENT: Only firm's rows returned
```

RLS helper function pattern (applied to all firm-scoped tables):

```sql
-- 4 policies per table: SELECT, INSERT, UPDATE, DELETE
CREATE POLICY "firm_isolation_select" ON deals
  FOR SELECT USING (
    firm_id = (
      SELECT ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid
    )
  );
```

**watchlist_deals special case:** Has RLS that checks through the parent watchlist's firm_id:
```sql
CREATE POLICY "firm_isolation_select" ON watchlist_deals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM watchlists
      WHERE watchlists.id = watchlist_deals.watchlist_id
      AND watchlists.firm_id = (auth.jwt()->'app_metadata'->>'firm_id')::uuid
    )
  );
```

**Practical note:** RLS is defense-in-depth. All current route handlers use `adminDb` (bypasses RLS) and add manual `WHERE firm_id = ?` clauses. RLS catches bugs where a handler forgets the filter.

## Custom Access Token Hook

```mermaid
sequenceDiagram
    participant USER as User
    participant SUPA as Supabase Auth
    participant HOOK as custom_access_token_hook()
    participant FM as firm_members table

    USER->>SUPA: Login / refresh token
    SUPA->>HOOK: event = {claims: {...}}
    HOOK->>FM: SELECT firm_id, role WHERE user_id = sub
    alt User has firm
        FM-->>HOOK: firm_id, role
        HOOK->>HOOK: Inject into app_metadata
        HOOK-->>SUPA: {firm_id: 'abc', firm_role: 'admin'}
    else No firm (pre-onboarding)
        FM-->>HOOK: empty
        HOOK-->>SUPA: claims unchanged
    end
    SUPA-->>USER: JWT with app_metadata
```

**Deployment:** Must be enabled in Supabase Dashboard → Authentication → Hooks → Custom Access Token Hook. Without this, no JWT will contain `firm_id` and all data routes will return 403.

## Seed Data

`seedFirm(firmId, userId)` creates starter data for new firms:

- **7 deals**: US Steel/Nippon, Juniper/HPE, HashiCorp/IBM, Figma/Adobe, Activision/Microsoft, Discover/Capital One, Hess/Chevron
- **4 events**: CFIUS review, steel union lawsuit, DOJ second request, ExxonMobil arbitration
- **1 watchlist**: "Top Active Deals" with active/review deals linked
- **Audit log entries** for all seeded entities

All seed records marked `is_starter: true` for UI distinction.

## Soft Delete Pattern

All firm-scoped tables (except `audit_log`) have `deleted_at` timestamp:
- **List queries**: Always filter `WHERE deleted_at IS NULL`
- **Delete operations**: `SET deleted_at = now(), updated_at = now()` — never hard delete
- **audit_log**: Immutable — no `deleted_at` column, records are never removed
