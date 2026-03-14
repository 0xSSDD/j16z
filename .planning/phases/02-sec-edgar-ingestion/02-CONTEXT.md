# Phase 2: SEC EDGAR Ingestion - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Automatically poll SEC EDGAR for M&A-relevant filings, store raw filing content in the database, and display filing metadata on the deal board and Inbox before LLM extraction runs. This phase delivers the ingestion pipeline only — clause extraction and structured analysis belong to Phase 3. Configuration UI for EDGAR settings belongs in Phase 7.

</domain>

<decisions>
## Implementation Decisions

### Deal matching strategy
- Hybrid discovery: CIK-based watching for deals already on the board, plus a periodic broad scan of all M&A filing types to discover new deals
- Auto-create deals with confidence threshold: high-signal filings (S-4, DEFM14A) auto-create a deal record as ANNOUNCED; lower-signal types (8-K, 13D/13G) go to a review queue for analyst confirmation
- Auto-resolve CIKs from company names via EDGAR company search when a deal is created — no manual CIK entry
- Global ingestion stream: filings are public SEC data, ingested once into a shared table (no firm_id, no RLS on filings). Firm-scoped Event records are created when a filing matches a firm's deals — RLS applies at the event/deal layer, not the raw filing layer
- The `filings` table in the current schema needs firm_id removed to become a global/shared table

### Filing scope & filtering
- Tracked filing types (comprehensive M&A coverage):
  - **8-K / 8-K/A** — Material event reports (filtered by Item 1.01, 2.01 for broad scan)
  - **S-4 / S-4/A** — Registration statements for mergers
  - **DEFM14A** — Definitive proxy statements for mergers
  - **13D / SC 13D/A** — Beneficial ownership reports (activist/acquirer positions)
  - **13G / SC 13G/A** — Passive beneficial ownership reports
  - **SC TO / SC TO/A** — Tender offer schedules
  - **PREM14A** — Preliminary proxy statements
  - **SC 14D9 / SC 14D9/A** — Target company's response to tender offer
- Wide net approach: ingest all tracked types, rely on confidence threshold to sort signal from noise
- 30-day backfill on first run to populate recent active deals
- System-wide 15-minute polling interval (single cron schedule)

### Raw content storage
- Store in Postgres `raw_content` TEXT column for MVP — no object storage infra needed
- Convert EDGAR HTML to plain text before storing (strip tags, normalize whitespace); original always available via `raw_url`
- Two-stage ingestion: polling job captures metadata (type, date, accession number, URL) first; separate download job fetches full content later — keeps poll loop fast and filing appears on deal board immediately
- On download failure: filing shows on deal board with "content pending" status indicator; analyst can always click the EDGAR link as fallback; BullMQ retries handle transient failures (3 attempts, exponential backoff)

### Frontend filing display
- Deal board: filing count badge on deal cards for quick scan
- Deal card detail: individual filings appear as rows in the event timeline with filing type, date, filer name, and EDGAR source link
- Filing events appear in Inbox feed (type: FILING) with materiality scoring, consistent with existing event model
- Real data only for filings — no mock fallback. Frontend requires real backend running for filing data

### Claude's Discretion
- Rate limiting implementation (token bucket vs sliding window) — must stay under 10 req/s with correct User-Agent header per SEC guidelines
- CIK fuzzy matching approach for company name variants
- Error handling and retry strategy beyond what BullMQ provides
- Filing metadata parsing details (accession number extraction, date normalization)
- Multi-tenant architecture for the global-to-firm-scoped event creation flow

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/api/src/queues/ingestion.ts`: BullMQ queue already configured with retry strategy (3 attempts, exponential backoff 5s/25s/125s), completion/failure retention
- `apps/api/src/worker.ts`: Worker skeleton with `edgar_poll` job type placeholder, concurrency=5, graceful shutdown handling
- `apps/api/src/queues/connection.ts`: Upstash Redis connection with TLS, includes `testRedisConnection()` health check
- `apps/api/src/db/schema.ts`: `filings` table with accession_number (unique), filing_type, filer_name, filer_cik, filed_date, raw_url, raw_content, extracted flag — needs firm_id removed for global ingestion
- `apps/api/src/db/schema.ts`: `events` table with type/subType, materialityScore, severity — ready for FILING events (firm-scoped)
- `apps/j16z-frontend/src/lib/severity-scoring.ts` and `materiality-scoring.ts`: Scoring systems ready for FILING event subtypes

### Established Patterns
- BullMQ for background jobs with separate worker process (do NOT import worker in API server)
- Drizzle ORM with RLS policies via `firmIsolationPolicies()` helper — applies to firm-scoped tables only
- Two-tier scoring: severity (urgency 0-100) and materiality (deal impact 0-100)
- Frontend API abstraction layer in `api.ts` switches between mock and real data

### Integration Points
- Worker process (`apps/api/src/worker.ts`) needs EDGAR polling handlers added
- Ingestion queue (`apps/api/src/queues/ingestion.ts`) needs cron job scheduling for 15-min poll
- `filings` table schema needs firm_id and RLS removed (global/shared data)
- Frontend deal-board component needs filing badge rendering
- Frontend deal-card event timeline needs filing row type
- Frontend Inbox needs FILING event type rendering
- api.ts needs real endpoints for filings data (no mock fallback for filings)

</code_context>

<specifics>
## Specific Ideas

- Document all tracked filing types prominently — this is important for marketing (breadth of SEC coverage is a selling point)
- The full list: 8-K, S-4, DEFM14A, 13D, 13G, SC TO, PREM14A, SC 14D9 + all amendments (/A variants)

</specifics>

<deferred>
## Deferred Ideas

- **Phase 7: EDGAR Settings UI** — Configurable polling frequency, CIK management, confidence thresholds for auto-deal-creation, filing type toggles. All current Phase 2 defaults should become user-configurable in the Settings page.
- **Phase 7: Per-firm ingestion streams** — For larger orgs or on-prem deployments, support dedicated ingestion streams per firm instead of the shared global stream. Overkill before having customers but good to architect for.
- **Future: S3/R2 migration for raw content** — Move raw filing storage from Postgres to object storage when data volume warrants it. Keep DB pointer pattern ready.

</deferred>

---

*Phase: 02-sec-edgar-ingestion*
*Context gathered: 2026-03-01*
