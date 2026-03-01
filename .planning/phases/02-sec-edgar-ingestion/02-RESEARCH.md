# Phase 2: SEC EDGAR Ingestion - Research

**Researched:** 2026-03-01
**Domain:** SEC EDGAR APIs, BullMQ job scheduling, two-stage ingestion pipeline, HTML-to-text parsing, Drizzle ORM schema migration
**Confidence:** HIGH (core APIs and patterns), MEDIUM (CIK fuzzy matching approach, schema migration specifics)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Deal matching strategy:** Hybrid — CIK-based watching for deals already on the board, plus a periodic broad scan of all tracked M&A filing types to discover new deals
- **Auto-deal creation:** High-signal filings (S-4, DEFM14A) auto-create a deal record as ANNOUNCED; lower-signal types (8-K, 13D/13G) go to a review queue for analyst confirmation
- **CIK resolution:** Auto-resolve CIKs from company names via EDGAR company search when a deal is created — no manual CIK entry
- **Global ingestion stream:** Filings table is global/shared (no firm_id, no RLS). Firm-scoped Event records created when a filing matches a firm's deals — RLS at event/deal layer only
- **Schema change needed:** Remove firm_id from filings table to make it a global/shared table
- **Filing types tracked:** 8-K, 8-K/A, S-4, S-4/A, DEFM14A, 13D, SC 13D/A, 13G, SC 13G/A, SC TO, SC TO/A, PREM14A, SC 14D9, SC 14D9/A
- **Backfill:** 30-day backfill on first run
- **Poll interval:** System-wide 15-minute cron schedule (single job)
- **Raw content storage:** Postgres TEXT column (no object storage for MVP)
- **HTML conversion:** Strip tags to plain text before storing; original always accessible via raw_url
- **Two-stage ingestion:** Poll captures metadata first; separate download job fetches full content — filing appears on deal board before content arrives
- **Download failure handling:** BullMQ retries (3 attempts, exponential backoff 5s/25s/125s); filing shows "content pending" status; analyst can always click EDGAR link
- **Frontend — no mock fallback:** Real data only for filings; frontend requires real backend for filing data
- **Frontend display:** Deal board filing count badge; deal card event timeline filing rows; Inbox FILING event type

### Claude's Discretion

- Rate limiting implementation (token bucket vs sliding window) — must stay under 10 req/s with correct User-Agent header per SEC guidelines
- CIK fuzzy matching approach for company name variants
- Error handling and retry strategy beyond what BullMQ provides
- Filing metadata parsing details (accession number extraction, date normalization)
- Multi-tenant architecture for the global-to-firm-scoped event creation flow

### Deferred Ideas (OUT OF SCOPE)

- Phase 7: EDGAR Settings UI (configurable polling frequency, CIK management, confidence thresholds, filing type toggles)
- Phase 7: Per-firm ingestion streams
- Future: S3/R2 migration for raw content storage
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| EDGAR-01 | System polls SEC EDGAR full-text search API on schedule (every 15 min) for tracked CIKs | BullMQ `upsertJobScheduler` with `'*/15 * * * *'` cron; EDGAR submissions API at `data.sec.gov/submissions/CIK{padded}.json` |
| EDGAR-02 | System ingests and stores 8-K, S-4, DEFM14A, and 13D/13G filings | Submissions API `form` field filtering; dual strategy: CIK-based + broad EFTS scan; existing `filings` table (after schema migration) |
| EDGAR-03 | System includes proper user-agent header to avoid EDGAR IP blocks | User-Agent format: `"j16z admin@j16z.com"`; must be on every outbound request; SEC blocks without this |
| EDGAR-04 | System rate-limits requests to <10/sec per SEC policy | Token bucket approach; `limiter` npm package (RateLimiter + TokenBucket classes); shared limiter instance across all EDGAR HTTP calls |
| EDGAR-05 | Raw filing content stored before extraction (two-stage ingestion) | Stage 1: metadata poll writes filing row with `extracted=false`, `raw_content=null`; Stage 2: `edgar_download` job fetches HTML and stores plain text |
| EDGAR-06 | User can view source filing via link to EDGAR document | `raw_url` column already in schema; URL pattern: `https://www.sec.gov/Archives/edgar/data/{cik}/{accessionPlain}/{primaryDocument}`; frontend renders as link |
</phase_requirements>

---

## Summary

Phase 2 builds the SEC EDGAR ingestion pipeline on top of the existing BullMQ + Drizzle + Hono infrastructure from Phase 1. The core work has three distinct tracks that execute in order: (1) schema migration to remove `firm_id` from `filings` and make it a global table, (2) the backend ingestion engine (two BullMQ job types + the EDGAR API calls + rate limiter), and (3) frontend changes to display real filing data.

The SEC EDGAR API requires no authentication — only a well-formed `User-Agent` header (`"j16z admin@j16z.com"`) and staying under 10 requests/second. Two complementary API endpoints cover the full use case: `data.sec.gov/submissions/CIK{padded}.json` for CIK-based tracking of known filers, and `efts.sec.gov/LATEST/search-index` for broad M&A keyword+form-type scanning to discover new deals. The submissions API returns columnar JSON arrays (not row arrays) that require a zip-transpose into filing objects. The EFTS endpoint supports `forms=S-4,DEFM14A` and `dateRange=custom` query parameters.

The BullMQ `upsertJobScheduler` API (v5.16.0+) is the correct scheduling primitive — it is idempotent on repeat start, which means the cron registration in the API startup code is safe to call repeatedly without creating duplicates. The two-stage design (poll metadata → separate download job) is validated as a standard pattern: Stage 1 writes a filing row with `raw_content=null` so the deal board shows the filing immediately, Stage 2 fetches the HTML and stores plain text via `html-to-text` or Cheerio.

**Primary recommendation:** Use `data.sec.gov/submissions` as the primary CIK-based poll, `efts.sec.gov/LATEST/search-index` for the broad discovery scan, the `limiter` npm package for token-bucket rate limiting, and `html-to-text` for HTML stripping. Keep the rate limiter as a module-level singleton shared across all EDGAR HTTP calls.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| BullMQ | ^5.70.1 (already installed) | Job scheduling and two-stage queue management | Already in project; `upsertJobScheduler` is the idiomatic v5 scheduling API |
| `node-fetch` / native fetch | Node 18+ built-in | HTTP calls to EDGAR APIs | No additional install needed; Node 18+ has `fetch` globally |
| `html-to-text` | ^9.x | Convert EDGAR HTML filings to plain text | Purpose-built; handles tables, lists, entities; more robust than regex or cheerio |
| Drizzle ORM | ^0.44.2 (already installed) | Schema migration (remove firm_id from filings) + query layer | Already in project; `drizzle-kit generate` then `drizzle-kit migrate` |
| Zod | ^3.24.2 (already installed) | Validate EDGAR API response shapes | Already in project; prevents runtime crashes from unexpected API responses |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `limiter` | ^3.x | Token bucket rate limiter | Rate-limit EDGAR requests to <10/s; simpler than hand-rolled; `RateLimiter` class wraps `TokenBucket` |
| Cheerio | ^1.x | Alternative HTML parser / text extraction | Only if `html-to-text` mishandles specific EDGAR HTML structures |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `limiter` (npm) | Hand-rolled token bucket | Hand-rolled misses burst handling; `limiter` is 1 line of setup |
| `html-to-text` | Regex tag stripping | Regex fails on malformed HTML, nested tags, HTML entities — common in EDGAR docs |
| `upsertJobScheduler` | `queue.add()` with repeat option directly | `upsertJobScheduler` is the v5 idiomatic API; the older `repeat` option in `add()` still works but is less explicit about idempotency |
| EFTS broad scan | RSS feed at `https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent` | RSS format is fragile; EFTS JSON is more stable and filterable |

**Installation:**
```bash
pnpm --filter @j16z/api add html-to-text limiter
pnpm --filter @j16z/api add -D @types/html-to-text
```

---

## Architecture Patterns

### Recommended Project Structure

```
apps/api/src/
├── edgar/
│   ├── client.ts          # EDGAR HTTP client with rate limiter + User-Agent header
│   ├── poll.ts            # edgar_poll job handler: broad scan + CIK-based scan → enqueue downloads
│   ├── download.ts        # edgar_download job handler: fetch HTML → strip to text → store
│   ├── cik-resolver.ts    # Company name/ticker → CIK lookup via company_tickers.json
│   ├── deal-matcher.ts    # Match filings to deals; auto-create deals for high-signal types
│   ├── event-factory.ts   # Create firm-scoped Event records from ingested filing rows
│   └── types.ts           # EDGAR API response types (Zod schemas)
├── queues/
│   ├── ingestion.ts       # (existing) Queue definition — add edgar_download job type docs
│   ├── connection.ts      # (existing) Redis connection
│   └── scheduler.ts       # NEW: call upsertJobScheduler at startup — idempotent cron registration
├── worker.ts              # Add edgar_poll + edgar_download handlers to job dispatcher
├── routes/
│   └── filings.ts         # NEW: GET /api/filings — firm-scoped filings list for frontend
└── db/
    └── schema.ts          # Remove firm_id + firmIsolationPolicies from filings table
```

### Pattern 1: EDGAR HTTP Client with Rate Limiter

**What:** A singleton fetch wrapper that enforces <10 req/s and injects the required `User-Agent` header on every call.

**When to use:** All outbound calls to `data.sec.gov` and `efts.sec.gov`.

```typescript
// Source: SEC EDGAR developer guidelines + limiter npm docs
import { RateLimiter } from 'limiter';

// Module-level singleton — shared across all EDGAR calls in the worker process
const edgarLimiter = new RateLimiter({ tokensPerInterval: 9, interval: 'second' });

const EDGAR_USER_AGENT = 'j16z admin@j16z.com';

export async function edgarFetch(url: string): Promise<Response> {
  await edgarLimiter.removeTokens(1);   // blocks until a token is available
  const res = await fetch(url, {
    headers: {
      'User-Agent': EDGAR_USER_AGENT,
      'Accept': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`EDGAR fetch failed: ${res.status} ${url}`);
  }
  return res;
}
```

Set tokens to 9 (not 10) to leave headroom — SEC counts across all machines sharing the IP.

### Pattern 2: Submissions API — CIK-Based Poll

**What:** For deals already on the board, poll each company's CIK to get recent filings.

**When to use:** Primary poll for tracked deals where CIK is known.

```typescript
// Source: SEC EDGAR developer resources — data.sec.gov/submissions
// Submissions API — no auth required, just User-Agent

const TRACKED_FORM_TYPES = new Set([
  '8-K', '8-K/A', 'S-4', 'S-4/A', 'DEFM14A',
  'SC 13D', 'SC 13D/A', 'SC 13G', 'SC 13G/A',
  'SC TO-T', 'SC TO-T/A', 'PREM14A', 'SC 14D9', 'SC 14D9/A',
]);

interface SubmissionsRecent {
  accessionNumber: string[];
  filingDate: string[];
  form: string[];
  primaryDocument: string[];
  // ... other columnar arrays
}

export async function fetchCikFilings(cik: string, sinceDate: Date): Promise<FilingMetadata[]> {
  const paddedCik = cik.padStart(10, '0');
  const res = await edgarFetch(`https://data.sec.gov/submissions/CIK${paddedCik}.json`);
  const data = await res.json() as { filings: { recent: SubmissionsRecent } };

  const recent = data.filings.recent;
  const count = recent.accessionNumber.length;

  // Zip columnar arrays into row objects
  const filings: FilingMetadata[] = [];
  for (let i = 0; i < count; i++) {
    const form = recent.form[i];
    const filedDate = new Date(recent.filingDate[i]);
    if (!TRACKED_FORM_TYPES.has(form)) continue;
    if (filedDate < sinceDate) break; // columnar arrays are newest-first; stop at cutoff
    filings.push({
      accessionNumber: recent.accessionNumber[i],
      filingType: form,
      filedDate: recent.filingDate[i],
      primaryDocument: recent.primaryDocument[i],
      filerCik: cik,
    });
  }
  return filings;
}
```

### Pattern 3: EFTS Broad Scan — New Deal Discovery

**What:** Query `efts.sec.gov/LATEST/search-index` for all S-4/DEFM14A filings in the last 15 minutes to discover M&A deals not yet on the board.

**When to use:** Broad scan job run every 15 minutes alongside the CIK-based poll.

```typescript
// Source: SEC EDGAR EFTS full-text search
// URL observed via EDGAR search UI network tab
// Query params: q (keywords), forms (comma-separated form types), dateRange, startdt, enddt

export async function broadScanForNewDeals(since: Date): Promise<EftsHit[]> {
  const startdt = since.toISOString().split('T')[0];
  const enddt = new Date().toISOString().split('T')[0];

  // High-signal types only for auto-deal-creation
  const url = `https://efts.sec.gov/LATEST/search-index?` +
    `q=%22merger+agreement%22&forms=S-4,S-4%2FA,DEFM14A,PREM14A` +
    `&dateRange=custom&startdt=${startdt}&enddt=${enddt}` +
    `&hits.hits._source=period_of_report,entity_name,file_num,form_type,file_date,accession_no`;

  const res = await edgarFetch(url);
  const data = await res.json() as EftsResponse;
  return data.hits?.hits ?? [];
}
```

EFTS response shape (from ecosystem research — MEDIUM confidence, verify fields at runtime):
```typescript
interface EftsHit {
  _source: {
    entity_name: string;
    accession_no: string;     // with hyphens
    form_type: string;
    file_date: string;        // ISO date
    period_of_report?: string;
    file_num?: string;
  };
}
interface EftsResponse {
  hits: { hits: EftsHit[]; total: { value: number } };
}
```

### Pattern 4: BullMQ Cron Scheduling with `upsertJobScheduler`

**What:** Register the 15-minute poll job at worker startup. `upsertJobScheduler` is idempotent — safe to call on every restart.

**When to use:** Called once from a `scheduler.ts` module invoked at API server startup.

```typescript
// Source: BullMQ v5 docs — docs.bullmq.io/guide/job-schedulers
// upsertJobScheduler available since v5.16.0; project uses ^5.70.1

import { Queue } from 'bullmq';
import { redisConnection } from './queues/connection.js';

export async function registerSchedules(): Promise<void> {
  const queue = new Queue('ingestion', { connection: redisConnection });

  // Every 15 minutes — idempotent on restart
  await queue.upsertJobScheduler(
    'edgar-poll-schedule',           // schedulerId — unique per schedule
    { pattern: '*/15 * * * *' },     // standard 5-field cron
    {
      name: 'edgar_poll',            // job.name used in worker dispatcher
      data: { triggeredBy: 'cron' },
      opts: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    },
  );

  await queue.close();
}
```

### Pattern 5: Two-Stage Ingestion Flow

**What:** Stage 1 (`edgar_poll`) writes filing metadata to DB; Stage 2 (`edgar_download`) fetches content.

```typescript
// Stage 1: edgar_poll job handler (in worker.ts dispatcher)
async function handleEdgarPoll(job: Job): Promise<void> {
  // 1. Get all deals with known CIKs from adminDb
  // 2. Fetch recent filings for each CIK (CIK-based poll)
  // 3. Run broad EFTS scan for new deal discovery
  // 4. For each new filing not already in filings table (unique accessionNumber):
  //    a. Insert row with raw_content=null, extracted=false
  //    b. Enqueue edgar_download job with filing id
  //    c. Create FILING Event records for each firm that tracks this deal
}

// Stage 2: edgar_download job handler
async function handleEdgarDownload(job: Job): Promise<void> {
  const { filingId, accessionNumber, cik, primaryDocument } = job.data;
  // 1. Construct URL: https://www.sec.gov/Archives/edgar/data/{cik}/{accNoPlain}/{primaryDocument}
  const accNoPlain = accessionNumber.replace(/-/g, '');
  const docUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accNoPlain}/${primaryDocument}`;
  // 2. Fetch HTML via edgarFetch (rate-limited)
  const html = await edgarFetch(docUrl).then(r => r.text());
  // 3. Strip to plain text
  const { htmlToText } = await import('html-to-text');
  const plainText = htmlToText(html, { wordwrap: false });
  // 4. Update filing row: raw_content = plainText
  await adminDb.update(schema.filings).set({ rawContent: plainText }).where(eq(schema.filings.id, filingId));
}
```

### Pattern 6: CIK Auto-Resolve

**What:** When a deal is created, look up the CIK for both acquirer and target using the SEC's `company_tickers.json` file.

```typescript
// Source: SEC API overview — company_tickers.json updated throughout the day
// Endpoint: https://www.sec.gov/files/company_tickers.json
// Response: { "0": { cik_str: 320193, ticker: "AAPL", title: "Apple Inc." }, ... }

export async function resolveCompanyCik(companyName: string): Promise<string | null> {
  const res = await edgarFetch('https://www.sec.gov/files/company_tickers.json');
  const data = await res.json() as Record<string, { cik_str: number; ticker: string; title: string }>;

  const companies = Object.values(data);
  const normalized = companyName.toLowerCase();

  // Exact match first
  const exact = companies.find(c => c.title.toLowerCase() === normalized);
  if (exact) return String(exact.cik_str);

  // Partial match fallback (Claude's discretion)
  const partial = companies.find(c => c.title.toLowerCase().includes(normalized) || normalized.includes(c.title.toLowerCase()));
  return partial ? String(partial.cik_str) : null;
}
```

Note: `company_tickers.json` has ~10,000 entries and is updated in real-time. Cache it for the duration of a poll job to avoid fetching it per-company.

### Pattern 7: Schema Migration — Remove firm_id from filings

**What:** The `filings` table currently has `firm_id` and `firmIsolationPolicies()`. It must become a global table — no firm_id, no RLS.

**Process:**
1. In `schema.ts`: remove `firmId` column and `firmIsolationPolicies()` from the `filings` table definition
2. Run `pnpm db:generate` — Drizzle Kit generates a migration with `ALTER TABLE filings DROP COLUMN firm_id` + DROP POLICY statements
3. Review the generated SQL (migration file in `drizzle/` folder)
4. Run `pnpm db:migrate` to apply

The `clauses` table still references `filings.id` (via `filingId`) — this FK is unaffected. The `clauses` table keeps its own `firm_id` + RLS (firm-scoped).

**Post-migration:** Queries against `filings` no longer need `WHERE firm_id = ...`. The `events` table (firm-scoped) becomes the boundary between global filings and firm-specific data.

### Anti-Patterns to Avoid

- **Calling `worker.ts` from `index.ts`:** The worker is a separate process. Registering cron schedules from `index.ts` is fine (queue-side only); the worker processes the jobs.
- **Fetching HTML without rate limiting:** Each `fetch()` to `sec.gov` must go through `edgarFetch()`. Never call `fetch()` directly for EDGAR URLs.
- **Storing raw HTML:** Always convert to plain text before storing. Storing raw HTML bloats the TEXT column and makes Phase 3 extraction harder.
- **Fetching `company_tickers.json` per company in a loop:** This is a single ~500KB JSON file. Fetch once per poll cycle, parse into a Map, then look up O(1).
- **Not deduplicating by accession number:** The `filings` table has a UNIQUE constraint on `accession_number`. Use `ON CONFLICT DO NOTHING` (Drizzle: `.onConflictDoNothing()`) to make poll idempotent.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting | Custom counter + setTimeout | `limiter` npm (`RateLimiter` class) | Handles burst, concurrency, async; 1 line of setup |
| HTML stripping | Regex `/<[^>]*>/g` | `html-to-text` | EDGAR filings have malformed HTML, nested tags, SGML artifacts; regex fails |
| Cron scheduling | `setInterval` in API server | BullMQ `upsertJobScheduler` | Survives restarts; distributed; visible in queue monitoring |
| Job deduplication | Custom DB check before enqueue | BullMQ `jobId` deduplication OR Drizzle `onConflictDoNothing()` | Race condition if not atomic |

**Key insight:** EDGAR HTML documents are often SGML-derived with non-standard tag usage. Regex stripping will produce garbage for 8-K exhibits and S-4 prospectuses. Use `html-to-text` which handles these edge cases.

---

## Common Pitfalls

### Pitfall 1: IP Block from Missing or Wrong User-Agent
**What goes wrong:** All EDGAR requests return 403 or are blocked at the IP level.
**Why it happens:** The SEC actively enforces the User-Agent requirement. Any automated tool without a valid company name + email in the User-Agent gets flagged.
**How to avoid:** The `edgarFetch` wrapper must set `User-Agent: j16z admin@j16z.com` on every request. Never bypass this wrapper.
**Warning signs:** HTTP 403 responses, or the message "Please declare your traffic by updating your user agent."

### Pitfall 2: Submissions API Returns Columnar Arrays (Not Row Arrays)
**What goes wrong:** Code tries `data.filings.recent.forEach(filing => ...)` and crashes because `recent` is an object of arrays, not an array of objects.
**Why it happens:** EDGAR uses a compact columnar format to minimize response size. E.g., `{ accessionNumber: ["0000...", "0000..."], form: ["8-K", "S-4"], ... }`.
**How to avoid:** Zip-transpose using the index approach shown in Pattern 2. Validate with Zod before processing.
**Warning signs:** `TypeError: data.filings.recent.forEach is not a function`

### Pitfall 3: Accession Number Format Mismatch
**What goes wrong:** Filing document URL construction fails (404) because the accession number format used for the directory differs from the formatted version.
**Why it happens:** EDGAR uses two formats: formatted (`0000320193-24-000058` with hyphens for display) and plain (`000032019324000058` without hyphens for URL path).
**How to avoid:** Store formatted version in DB; strip hyphens when constructing URLs: `accNo.replace(/-/g, '')`.
**Warning signs:** 404s when fetching `Archives/edgar/data/{cik}/{accNo}/{doc}`

### Pitfall 4: BullMQ `upsertJobScheduler` Creates Duplicate Schedules
**What goes wrong:** Each server restart creates an additional schedule, leading to poll jobs running multiple times per interval.
**Why it happens:** Using `queue.add()` with `repeat` option instead of `upsertJobScheduler` — the latter is idempotent by schedulerId.
**How to avoid:** Always use `upsertJobScheduler` with a stable schedulerId (e.g., `'edgar-poll-schedule'`). Verify in BullMQ dashboard after deploys.
**Warning signs:** More `edgar_poll` jobs executing than expected; duplicate filing inserts (mitigated by unique constraint).

### Pitfall 5: Firm_id Still Referenced After Schema Migration
**What goes wrong:** TypeScript compilation fails or runtime errors because existing code references `schema.filings.firmId` after it's removed.
**Why it happens:** Routes or seed code that currently reference `filings.firmId` for RLS-scoped queries.
**How to avoid:** Grep for all `filings.firmId` usages before migration; update them as part of the migration task. The `clauses` table still has `firmId` — don't confuse them.
**Warning signs:** `Property 'firmId' does not exist on type 'PgTableWithColumns<...>'`

### Pitfall 6: EFTS Endpoint Returns No Results for Custom Date Range
**What goes wrong:** Broad scan returns zero hits even though filings exist.
**Why it happens:** EFTS `dateRange=custom` requires both `startdt` and `enddt` in `YYYY-MM-DD` format. Date arithmetic errors (wrong timezone, off-by-one) produce empty windows.
**How to avoid:** Log the constructed URL on every poll run. Use UTC dates. Validate startdt < enddt.
**Warning signs:** Zero results from broad scan while CIK-based scan succeeds.

### Pitfall 7: Worker Process Importing Queue Scheduler at Startup
**What goes wrong:** Cron jobs are registered twice (once by API server, once by worker) and race.
**Why it happens:** Calling `registerSchedules()` from both `src/index.ts` and `src/worker.ts`.
**How to avoid:** Only register schedules from `src/index.ts` (API server startup). The worker just processes jobs. Keep clear separation per established project pattern.

---

## Code Examples

### EDGAR Filing URL Construction

```typescript
// Source: SEC EDGAR developer docs + ecosystem research (HIGH confidence)
// Pattern: https://www.sec.gov/Archives/edgar/data/{cik}/{accNoNoDashes}/{primaryDoc}

function buildFilingUrl(cik: string, accessionNumber: string, primaryDocument: string): string {
  const accNoPlain = accessionNumber.replace(/-/g, '');
  return `https://www.sec.gov/Archives/edgar/data/${cik}/${accNoPlain}/${primaryDocument}`;
}

// Filing index (to discover primaryDocument if not already known):
// https://www.sec.gov/Archives/edgar/data/{cik}/{accNoPlain}/{accessionNumber}-index.json
function buildIndexUrl(cik: string, accessionNumber: string): string {
  const accNoPlain = accessionNumber.replace(/-/g, '');
  return `https://www.sec.gov/Archives/edgar/data/${cik}/${accNoPlain}/${accessionNumber}-index.json`;
}
```

### HTML to Plain Text (SEC filings)

```typescript
// Source: html-to-text npm docs
import { htmlToText } from 'html-to-text';

function filingHtmlToText(html: string): string {
  return htmlToText(html, {
    wordwrap: false,             // Don't rewrap — preserve paragraph structure
    selectors: [
      { selector: 'script', format: 'skip' },
      { selector: 'style', format: 'skip' },
      { selector: 'table', options: { uppercaseHeaderCells: false } },
    ],
  });
}
```

### Drizzle Upsert Pattern for Idempotent Ingestion

```typescript
// Source: Drizzle ORM docs — onConflictDoNothing
import { adminDb } from '../db/index.js';
import * as schema from '../db/schema.js';

async function insertFilingIfNew(filing: NewFiling): Promise<boolean> {
  const result = await adminDb
    .insert(schema.filings)
    .values(filing)
    .onConflictDoNothing({ target: schema.filings.accessionNumber })
    .returning({ id: schema.filings.id });

  return result.length > 0; // true = new filing inserted, false = already existed
}
```

### Worker Job Dispatcher Pattern

```typescript
// Source: BullMQ docs + betterstack guide
import { Worker, type Job } from 'bullmq';

const handlers: Record<string, (job: Job) => Promise<void>> = {
  edgar_poll: handleEdgarPoll,
  edgar_download: handleEdgarDownload,
};

const worker = new Worker(
  'ingestion',
  async (job: Job) => {
    const handler = handlers[job.name];
    if (!handler) {
      console.warn(`[worker] No handler for job type: ${job.name}`);
      return;
    }
    await handler(job);
  },
  { connection: redisConnection, concurrency: 5 },
);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| BullMQ `queue.add()` with `repeat` | `queue.upsertJobScheduler()` | BullMQ v5.16.0 (2024) | Idempotent on restart; no duplicate schedule accumulation |
| EDGAR RSS feeds for new filing detection | EFTS full-text search API | 2021 (EFTS launched) | JSON API; filterable by form type and date; more reliable than RSS |
| Manual CIK entry | Auto-resolve via `company_tickers.json` | Always available; now standard | Removes manual maintenance burden |

**Deprecated/outdated:**
- `queue.add({ repeat: { cron: '...' } })`: Still works in BullMQ v5 but `upsertJobScheduler` is the preferred v5 API and is idempotent.
- Scraping `www.sec.gov/cgi-bin/browse-edgar` for filing lists: The `data.sec.gov/submissions` API is the stable, machine-readable replacement.

---

## Open Questions

1. **EFTS response field names**
   - What we know: The endpoint is `efts.sec.gov/LATEST/search-index` and returns Elasticsearch-style JSON with `hits.hits[]._source`
   - What's unclear: Exact field names in `_source` (observed names include `accession_no`, `entity_name`, `file_date`, `form_type` but this was from ecosystem sources, not official docs — sec.gov blocked direct API testing)
   - Recommendation: On first poll run, log the raw EFTS response for one filing and verify field names before deploying to production. Add a Zod schema with `.passthrough()` initially.

2. **CIK fuzzy matching accuracy**
   - What we know: `company_tickers.json` has ~10,000 entries; exact match is easy; partial matching will have false positives
   - What's unclear: How to handle subsidiaries, name variants (e.g., "Activision" vs "Activision Blizzard Inc."), and recently renamed companies
   - Recommendation: Implement exact match first, add partial match with analyst review queue for unmatched deals. Do not auto-create deals on fuzzy match alone.

3. **Primary document field in submissions API**
   - What we know: `primaryDocument` field is present in the submissions columnar arrays
   - What's unclear: Whether `primaryDocument` is always populated for all filing types or can be empty/null for some form types
   - Recommendation: Fall back to the index.json endpoint if `primaryDocument` is empty: `{accNoPlain}/{accessionNumber}-index.json` lists all documents in the submission.

4. **Review queue implementation for low-signal filings**
   - What we know: 8-K and 13D/13G go to a "review queue for analyst confirmation" (locked decision)
   - What's unclear: What the review queue UI looks like — whether it's a separate table, a column on filings, or a status on deals
   - Recommendation: Add a `status` column to `filings` table: `'pending_review' | 'active' | 'dismissed'`. Analyst confirms via a simple frontend action. This avoids creating a separate table and reuses the existing filings infrastructure.

---

## Validation Architecture

> `workflow.nyquist_validation` not present in `.planning/config.json` — this section is included per standard research format but coverage is mapped based on existing vitest infrastructure.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.2 |
| Config file | `apps/api/vitest.config.ts` |
| Quick run command | `pnpm --filter @j16z/api test` |
| Full suite command | `pnpm --filter @j16z/api test --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EDGAR-01 | Poll job enqueued on 15-min cron via `upsertJobScheduler` | unit | `pnpm --filter @j16z/api test -- edgar-scheduler` | ❌ Wave 0 |
| EDGAR-02 | Filing types correctly filtered from submissions response | unit | `pnpm --filter @j16z/api test -- edgar-poll` | ❌ Wave 0 |
| EDGAR-03 | Every EDGAR HTTP call includes correct User-Agent header | unit | `pnpm --filter @j16z/api test -- edgar-client` | ❌ Wave 0 |
| EDGAR-04 | Rate limiter enforces <10 req/s (token bucket) | unit | `pnpm --filter @j16z/api test -- edgar-client` | ❌ Wave 0 |
| EDGAR-05 | Filing row with null raw_content inserted by poll job (Stage 1) | unit | `pnpm --filter @j16z/api test -- edgar-poll` | ❌ Wave 0 |
| EDGAR-06 | `raw_url` populated and accessible via /api/filings endpoint | integration (live DB) | manual | N/A — requires live DB |

### Wave 0 Gaps

- [ ] `apps/api/src/tests/edgar-client.test.ts` — covers EDGAR-03 (User-Agent header present on every call) and EDGAR-04 (rate limiter token enforcement; mock `limiter` to verify `removeTokens` called)
- [ ] `apps/api/src/tests/edgar-poll.test.ts` — covers EDGAR-02 (form type filtering from mock submissions JSON) and EDGAR-05 (filing insert with null raw_content)
- [ ] `apps/api/src/tests/edgar-scheduler.test.ts` — covers EDGAR-01 (verify `upsertJobScheduler` called with correct cron pattern and job name; mock BullMQ Queue)

---

## Sources

### Primary (HIGH confidence)
- SEC EDGAR developer resources (verified via web search): Rate limit is <10 req/s; User-Agent format is `"Company Name admin@company.com"`
- BullMQ docs (docs.bullmq.io/guide/job-schedulers): `upsertJobScheduler` API, cron pattern `'*/15 * * * *'`, available since v5.16.0
- SEC developer resources (multiple sources agree): `data.sec.gov/submissions/CIK{padded}.json` — submissions endpoint; `company_tickers.json` at `www.sec.gov/files/company_tickers.json`
- Drizzle ORM docs: `onConflictDoNothing()` for idempotent inserts; `drizzle-kit generate` + `drizzle-kit migrate` for schema changes

### Secondary (MEDIUM confidence)
- EFTS endpoint `efts.sec.gov/LATEST/search-index` and query param structure (`forms`, `dateRange`, `startdt`, `enddt`, `q`) — confirmed as the correct endpoint by multiple sources but field names in `_source` not directly verified (sec.gov blocked direct API calls during research)
- Submissions API columnar array format and field names (`accessionNumber`, `filingDate`, `form`, `primaryDocument`) — confirmed by multiple ecosystem sources and one article with code sample
- Filing URL pattern `Archives/edgar/data/{cik}/{accNoNoDashes}/{primaryDoc}` — confirmed by multiple sources

### Tertiary (LOW confidence)
- EFTS `_source` field names (`entity_name`, `accession_no`, `file_date`, `form_type`) — from ecosystem libraries; not verified against official EDGAR docs. **Flag for validation on first run.**
- Partial match CIK resolution accuracy — no empirical data on false-positive rate for M&A company names

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — BullMQ is already installed; html-to-text and limiter are well-established npm packages; EDGAR APIs confirmed via multiple authoritative sources
- Architecture: HIGH — Two-stage ingestion pattern is standard (confirmed by sec-api.io documentation describing their own approach); BullMQ dispatcher pattern is from official examples
- EDGAR API specifics: MEDIUM — core endpoints and format confirmed; EFTS field names not officially documented and blocked from direct testing
- Pitfalls: HIGH — Columnar array format, accession number format, User-Agent requirements are widely documented pitfalls

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (EDGAR API is stable; BullMQ v5 is stable; check for BullMQ minor version changes)
