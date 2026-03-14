# EDGAR Ingestion Pipeline

## Overview
Two-stage background pipeline for ingesting SEC EDGAR filings: Stage 1 polls for new filings every 15 minutes, Stage 2 downloads and converts content. Auto-creates deals from high-signal filings (S-4, DEFM14A, PREM14A).

## Pipeline Flow

```mermaid
graph TD
    CRON["BullMQ Cron<br/>*/15 * * * *"] -->|"edgar_poll job"| POLL["Stage 1: Poll<br/>edgar/poll.ts"]

    POLL --> SCAN_A["Scan A: CIK-based<br/>Submissions API<br/>Per tracked deal CIK"]
    POLL --> SCAN_B["Scan B: EFTS Broad<br/>Full-text search<br/>High-signal form types"]

    SCAN_A --> DEDUP["Deduplicate<br/>by accession number"]
    SCAN_B --> DEDUP

    DEDUP --> INSERT["Insert if new<br/>(ON CONFLICT DO NOTHING)"]

    INSERT -->|"new filing"| ENQUEUE["Enqueue edgar_download<br/>for content fetch"]
    INSERT -->|"new filing"| MATCH["Match to deal<br/>deal-matcher.ts"]

    MATCH -->|"CIK match found"| LINK["Link filing to deal<br/>+ create events"]
    MATCH -->|"no match + high-signal"| AUTO["Auto-create deal<br/>firmId=null, source='auto_edgar'"]
    MATCH -->|"no match + low-signal"| REVIEW["Goes to /unmatched<br/>review queue"]

    AUTO --> LINK_NEW["Link filing to new deal<br/>(no events — no firms yet)"]

    LINK --> EVENTS["Create firm-scoped Events<br/>event-factory.ts"]

    ENQUEUE -->|"edgar_download job"| DL["Stage 2: Download<br/>edgar/download.ts"]

    DL --> RESOLVE["Resolve primary doc<br/>(if missing from EFTS)"]
    RESOLVE --> FETCH["edgarFetch() — rate limited"]
    FETCH --> CONVERT["HTML → plain text<br/>html-to-text"]
    CONVERT --> STORE["Store in filings.rawContent"]
```

## Stage 1: Poll (`edgar/poll.ts`)

### Scan A: CIK-based poll

```mermaid
sequenceDiagram
    participant POLL as handleEdgarPoll
    participant DB as PostgreSQL
    participant SEC as SEC Submissions API

    POLL->>DB: Query all deals with acquirer_cik or target_cik
    DB-->>POLL: Unique CIK set

    loop For each CIK
        POLL->>SEC: GET /submissions/CIK{padded10}.json
        SEC-->>POLL: Columnar response (arrays)
        Note over POLL: Zip-transpose columns → rows<br/>(accessionNumber[], form[], filingDate[])
        POLL->>POLL: Filter by TRACKED_FORM_TYPES
        POLL->>POLL: Filter by date >= sinceDate
    end
```

**Columnar response pitfall:** The Submissions API returns parallel arrays (`accessionNumber[]`, `form[]`, `filingDate[]`), NOT an array of objects. Must zip-transpose by index: `recent.accessionNumber[i]`, `recent.form[i]`, etc.

**CIK padding:** CIKs must be zero-padded to 10 digits for the URL: `CIK0000320193.json`

### Scan B: EFTS broad scan

Searches SEC full-text search for high-signal form types (S-4, DEFM14A, PREM14A) containing "merger agreement".

**EFTS gotcha:** Requires both `startdt` AND `enddt` parameters. Omitting either causes silent empty results.

**EFTS limitations:**
- `filerCik` and `primaryDocument` are often missing from EFTS results
- These are resolved during Stage 2 download via the filing index endpoint
- EFTS is a secondary mechanism; CIK-based poll is primary

### Cutoff date logic

- **First run** (no filings in DB): 30-day backfill
- **Subsequent runs**: Since the most recent filing date in DB
- Uses 1-hour overlap window (not 15 min) for safety

## Stage 2: Download (`edgar/download.ts`)

```mermaid
graph TD
    START["edgar_download job<br/>{filingId, accessionNumber, cik, primaryDocument}"]

    START -->|"primaryDocument present"| BUILD_URL["buildFilingUrl()"]
    START -->|"primaryDocument empty<br/>(EFTS results)"| RESOLVE["Fetch filing index JSON"]

    RESOLVE --> FIND_HTML["Find first .htm/.html<br/>in directory.item[]"]
    FIND_HTML -->|"found"| BUILD_URL
    FIND_HTML -->|"not found"| WARN["Log warning, return<br/>(rawContent stays null)"]

    BUILD_URL --> FETCH["edgarFetch(docUrl)<br/>Rate limited"]
    FETCH --> PARSE["htmlToText(html)<br/>Strip scripts, styles"]
    PARSE --> UPDATE["UPDATE filings<br/>SET rawContent, rawUrl"]
```

**Failure behavior:** If all 3 retries fail, the filing stays with `rawContent = null`. The UI shows "content pending" and the analyst can click the raw EDGAR link. This is acceptable — content is supplementary, not critical.

## Deal Matching (`edgar/deal-matcher.ts`)

```mermaid
flowchart TD
    START["matchFilingToDeal(filing)"] --> CIK_CHECK{"filerCik exists?"}

    CIK_CHECK -->|yes| QUERY["Query deals WHERE<br/>acquirerCik = filerCik<br/>OR targetCik = filerCik"]
    CIK_CHECK -->|no| HIGH_SIGNAL

    QUERY --> FOUND{"Deals found?"}
    FOUND -->|yes| RETURN_MATCH["Return {dealId, firmIds}<br/>isNewDeal: false"]
    FOUND -->|no| HIGH_SIGNAL{"High-signal<br/>filing type?"}

    HIGH_SIGNAL -->|"yes + filerName exists"| DUP_CHECK{"Auto-deal already<br/>exists for this CIK?"}
    HIGH_SIGNAL -->|no| RETURN_NULL["Return {dealId: null}<br/>→ review queue"]

    DUP_CHECK -->|yes| RETURN_EXISTING["Return existing<br/>auto-deal ID"]
    DUP_CHECK -->|no| CREATE["INSERT deal<br/>firmId=null<br/>source='auto_edgar'<br/>status='ANNOUNCED'"]
    CREATE --> RETURN_NEW["Return {dealId, firmIds: []}<br/>isNewDeal: true"]
```

**Auto-created deal properties:**
- `firmId = null` — invisible to firm-scoped RLS queries
- `source = 'auto_edgar'` — distinguishes from manually created deals
- `symbol = ''`, `target = ''` — unknown until analyst reviews
- `acquirer = filing.filerName` — best guess from metadata
- `status = 'ANNOUNCED'`

**No events for unclaimed deals:** When `firmIds` is empty (auto-created deal, no firm tracking it), the event factory returns early. Events only appear in firm Inboxes when a firm claims the deal.

## Event Factory (`edgar/event-factory.ts`)

Creates one Event per firm tracking the deal:

```mermaid
graph LR
    FILING["Global Filing<br/>(no firm_id)"] --> FACTORY["createFilingEvents()"]
    FACTORY -->|"1 per firm"| E1["Event for Firm A"]
    FACTORY -->|"1 per firm"| E2["Event for Firm B"]
    FACTORY -->|"1 per firm"| E3["Event for Firm C"]
```

### Materiality Scores

| Filing Type | Score | Severity |
|---|---|---|
| S-4, DEFM14A | 80 | CRITICAL |
| SC TO-T, PREM14A, SC 14D9 | 70-75 | CRITICAL |
| 8-K | 60 | WARNING |
| SC 13D | 50 | WARNING |
| SC 13G | 40 | INFO |

Severity thresholds: >= 70 CRITICAL, >= 50 WARNING, < 50 INFO.

## Rate Limiting (`edgar/client.ts`)

```mermaid
graph LR
    ALL["All EDGAR calls"] --> LIMITER["edgarFetch()<br/>Singleton rate limiter<br/>9 req/sec (< SEC limit of 10)"]
    LIMITER --> SEC["sec.gov / data.sec.gov / efts.sec.gov"]
```

**Mandatory:** ALL outbound EDGAR requests must go through `edgarFetch()`. Never call `fetch()` directly for EDGAR URLs.

**User-Agent required:** SEC Fair Access Policy mandates a User-Agent header. Currently `'j16z admin@j16z.com'`.

**Rate limiter:** Uses `limiter` package's `RateLimiter`. Module-level singleton — shared across all EDGAR calls in the process.

## Tracked Form Types

**High-signal (auto-create deals):** S-4, S-4/A, DEFM14A, PREM14A

**All tracked types:**
8-K, 8-K/A, S-4, S-4/A, DEFM14A, SC 13D, SC 13D/A, SC 13G, SC 13G/A, SC TO-T, SC TO-T/A, SC TO-I, SC TO-I/A, PREM14A, SC 14D9, SC 14D9/A

**SC TO naming gotcha:** "SC TO" is NOT a valid EDGAR form code. The actual codes are SC TO-T (third-party tender offer, primary M&A signal) and SC TO-I (issuer self-tender, lower signal).

## Queue Infrastructure

```mermaid
graph TD
    API["API Server"] -->|"registerSchedules()<br/>at startup (once)"| REDIS[(Upstash Redis<br/>TLS required)]

    REDIS -->|"*/15 * * * *"| POLL_JOB["edgar_poll job"]
    POLL_JOB -->|"enqueues per filing"| DL_JOB["edgar_download jobs"]

    WORKER["Worker Process<br/>concurrency: 5"] -->|"pulls from"| REDIS

    subgraph "Retry Strategy"
        R1["Attempt 1 — immediate"]
        R2["Attempt 2 — 5s delay"]
        R3["Attempt 3 — 25s delay"]
        R4["Exhausted — 125s would be next<br/>but max 3 attempts"]
    end
```

**Upstash TLS:** Connection requires `tls: {}` (empty object enables TLS). Forgetting this causes silent connection failures.

**Cost warning:** BullMQ polls Redis continuously. Use Upstash Fixed plan (not pay-as-you-go) during development to avoid surprise charges.

**Job retention:** 1000 completed, 5000 failed (for debugging/audit).
