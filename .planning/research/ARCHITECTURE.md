# Architecture Research

**Domain:** M&A Intelligence Platform — LLM Extraction Pipeline + Backend API
**Researched:** 2026-02-25
**Confidence:** MEDIUM-HIGH (architecture patterns drawn from current sources; exact component sizing from training data)

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL DATA SOURCES                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │  SEC EDGAR   │  │CourtListener │  │   FTC/DOJ    │  │  RSS/News   │  │
│  │  (REST API)  │  │  (REST +     │  │  (scraped +  │  │  (feeds)    │  │
│  │              │  │   webhook)   │  │   press RSS) │  │             │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘  │
└─────────┼────────────────┼────────────────┼────────────────┼────────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          INGESTION LAYER (apps/api/)                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     BullMQ Job Queue (Redis)                     │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐             │    │
│  │  │edgar-poller │  │court-poller │  │  rss-poller  │  (cron)     │    │
│  │  │  (15min)    │  │  (30min)    │  │  (60min)     │             │    │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘             │    │
│  └─────────┼────────────────┼────────────────┼─────────────────────┘    │
│            │                │                │                           │
│            ▼                ▼                ▼                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      Raw Document Store                          │    │
│  │            (PostgreSQL: raw_filings, raw_docket_entries)         │    │
│  └──────────────────────────┬──────────────────────────────────────┘    │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     LLM EXTRACTION PIPELINE (LangExtract)                │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  BullMQ Worker: extraction-worker                                 │   │
│  │                                                                   │   │
│  │  1. Fetch raw document from store                                 │   │
│  │  2. Route: PDF→OCR/parser | HTML→cheerio strip                   │   │
│  │  3. Chunk large docs (sliding window, 4k tokens/chunk)            │   │
│  │  4. AI SDK generateObject() with Zod schemas                      │   │
│  │     → ExtractedClause | ExtractedEvent | DealTerms               │   │
│  │  5. Score materiality (existing scoring logic, port to backend)   │   │
│  │  6. Persist structured entities to PostgreSQL                     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      PERSISTENCE LAYER (PostgreSQL via Supabase)         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────┐    │
│  │  deals     │  │  events    │  │  clauses   │  │  raw_filings   │    │
│  │  companies │  │  docket_   │  │  market_   │  │  raw_docket_   │    │
│  │  watchlists│  │  entries   │  │  snapshots │  │  entries       │    │
│  └────────────┘  └────────────┘  └────────────┘  └────────────────┘    │
│           Drizzle ORM schema (TypeScript-first, Zod generation)          │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
              ┌────────────────┴──────────────────┐
              ▼                                   ▼
┌──────────────────────────┐       ┌──────────────────────────────────────┐
│    REST API (Hono)        │       │       ALERT ENGINE                    │
│  ┌────────────────────┐  │       │  BullMQ Worker: alert-worker           │
│  │ GET /deals         │  │       │  1. Event written → materiality scored │
│  │ GET /deals/:id     │  │       │  2. Evaluate AlertRules per user/deal  │
│  │ GET /events        │  │       │  3. Route to:                          │
│  │ GET /events/:id    │  │       │     - Email (Resend)                   │
│  │ GET /clauses       │  │       │     - Slack (incoming webhook)         │
│  │ POST /deals        │  │       │     - Custom webhook (HTTP POST)       │
│  │ GET /sse/events    │  │       │  4. Digest scheduler (BullMQ cron)     │
│  └────────────────────┘  │       │     - Daily: 07:00 UTC (BullMQ cron)  │
│  Hono RPC → shared types │       │     - Weekly: Monday 07:00 UTC        │
└──────────────┬───────────┘       └──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (apps/j16z-frontend/)                         │
│  src/lib/api.ts  →  NEXT_PUBLIC_USE_MOCK_DATA=false  →  NEXT_PUBLIC_API_URL│
│  Inbox | Deals | Watchlists | Settings                                   │
│  SSE connection for live inbox updates (EventSource → /api/sse/events)   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| **Pollers** (BullMQ cron workers) | Fetch new filings/dockets from external APIs on schedule; deduplicate by source_id; write raw docs to DB | BullMQ (enqueue extraction jobs), PostgreSQL (raw store) |
| **Extraction Worker** (BullMQ) | Pull raw docs from store; chunk; call LLM with Zod schemas; persist structured entities; trigger materiality scoring | PostgreSQL (read raw, write structured), LLM API (OpenAI/Anthropic via AI SDK), BullMQ (enqueue alert jobs) |
| **Alert Worker** (BullMQ) | Evaluate AlertRules when new events arrive; route notifications to email/Slack/webhook; enqueue digest jobs | PostgreSQL (read events + rules), Resend (email), Slack webhook, user-configured webhook URLs |
| **Digest Scheduler** (BullMQ cron) | At scheduled times, aggregate events by severity, render email template, deliver | PostgreSQL (read events), Resend |
| **Hono REST API** | Serve structured data to frontend; handle auth middleware; expose SSE endpoint for live updates | PostgreSQL via Drizzle, Supabase auth verification, Redis (optional SSE fan-out) |
| **SSE Endpoint** | Push new events to connected frontend clients without polling | PostgreSQL (LISTEN/NOTIFY or Redis pub/sub), Frontend EventSource |
| **PostgreSQL (Supabase)** | Single source of truth for all structured data; deduplication layer; audit trail | All backend services via Drizzle ORM |
| **Redis** | BullMQ queue backing store; optional pub/sub for SSE fan-out | BullMQ workers, SSE endpoint |
| **Frontend API Abstraction** (`src/lib/api.ts`) | Toggle between mock data and real backend by env var; all data fetching goes through this module | Hono REST API (production), mock constants (dev) |

---

## Recommended Project Structure

```
apps/
├── j16z-frontend/                  # existing Next.js app (unchanged)
│   └── src/lib/api.ts              # NEXT_PUBLIC_API_URL → Hono base URL
│
└── api/                            # NEW: backend service
    ├── src/
    │   ├── index.ts                # Hono app entry + BullMQ worker boot
    │   ├── routes/                 # Hono route handlers
    │   │   ├── deals.ts
    │   │   ├── events.ts
    │   │   ├── clauses.ts
    │   │   ├── market-snapshots.ts
    │   │   └── sse.ts              # Server-Sent Events stream
    │   ├── db/                     # Drizzle ORM
    │   │   ├── schema.ts           # table definitions (generates Zod schemas)
    │   │   ├── migrations/
    │   │   └── client.ts           # Drizzle + Supabase pool connection
    │   ├── ingestion/              # Source pollers
    │   │   ├── edgar-poller.ts
    │   │   ├── courtlistener-poller.ts
    │   │   ├── ftc-doj-poller.ts
    │   │   └── rss-poller.ts
    │   ├── extraction/             # LangExtract pipeline
    │   │   ├── extraction-worker.ts
    │   │   ├── chunker.ts
    │   │   ├── schemas.ts          # Zod schemas for LLM structured output
    │   │   └── prompts.ts          # extraction prompt templates
    │   ├── alerts/                 # Alert + digest engine
    │   │   ├── alert-worker.ts
    │   │   ├── digest-scheduler.ts
    │   │   ├── email.ts            # Resend integration
    │   │   ├── slack.ts            # Slack webhook integration
    │   │   └── webhook.ts          # User-configured webhooks
    │   ├── scoring/                # Port of frontend scoring to backend
    │   │   ├── materiality.ts
    │   │   └── severity.ts
    │   ├── queue/
    │   │   ├── queues.ts           # BullMQ queue definitions
    │   │   └── workers.ts          # Worker registration
    │   ├── lib/
    │   │   ├── auth.ts             # Supabase JWT verification middleware
    │   │   └── logger.ts
    │   └── types/
    │       └── index.ts            # Shared types (re-export from packages/types if extracted)
    ├── package.json
    └── tsconfig.json

packages/
└── types/                          # OPTIONAL: shared domain types
    └── src/index.ts                # Deal, Event, Clause — identical between frontend and backend
```

### Structure Rationale

- **ingestion/ vs extraction/:** Pollers and LLM extraction are separated because they run on different schedules and fail independently. Pollers fail due to network/rate-limits; extraction fails due to LLM budget or bad doc format. Separating them means extraction can be retried without re-polling.
- **scoring/ in backend:** The frontend's `severity-scoring.ts` and `materiality-scoring.ts` are pure functions. They should be ported to the backend (or extracted to `packages/`) so scores are computed at ingest time, stored in DB, and served as data — not recalculated client-side on every render.
- **queue/ directory:** Centralizes BullMQ queue/worker boot so it's easy to add new job types without touching other modules.
- **packages/types/:** Optional but high value — eliminates type drift between frontend `src/lib/types.ts` and backend. The existing frontend types are well-designed; extracting them is low-effort.

---

## Architectural Patterns

### Pattern 1: Two-Stage Ingestion (Fetch → Extract)

**What:** Pollers write raw source documents to a `raw_filings` / `raw_docket_entries` table first. A separate BullMQ extraction worker picks them up asynchronously. Structured entities are written to the main domain tables only after extraction succeeds.

**When to use:** Always — for j16z this is mandatory because LLM extraction is expensive, rate-limited, and can fail. Separating fetch from extract means you never lose a document if the LLM call fails.

**Trade-offs:** Adds latency (raw doc → extract job → structured data). For M&A intelligence, 2-5 minute lag is acceptable and far better than lost data.

**Example:**
```typescript
// edgar-poller.ts
async function pollEdgar() {
  const newFilings = await fetchRecentFilings(['8-K', 'S-4', 'DEFM14A', '13D']);
  for (const filing of newFilings) {
    const exists = await db.query.rawFilings.findFirst({ where: eq(rawFilings.sourceId, filing.accessionNumber) });
    if (exists) continue; // deduplicate by accession number
    const [saved] = await db.insert(rawFilings).values({ sourceId: filing.accessionNumber, ... }).returning();
    await extractionQueue.add('extract-filing', { rawFilingId: saved.id });
  }
}
```

### Pattern 2: Zod-First LLM Extraction

**What:** Define Zod schemas for all structured outputs (clause terms, event summaries, deal details). Use Vercel AI SDK `generateObject()` with those schemas — the LLM is constrained to produce only valid structured JSON. Zod validation runs on every response before persistence.

**When to use:** All LLM extraction calls. OpenAI structured outputs achieve 100% schema compliance on gpt-4o-2024-08-06+. This eliminates regex post-processing entirely.

**Trade-offs:** More upfront schema design work. Pays off: no parsing failures, no hallucinated fields, TypeScript types derived from the same Zod schema used for DB insertion.

**Example:**
```typescript
// extraction/schemas.ts
import { z } from 'zod';

export const ExtractedClauseSchema = z.object({
  clauseType: z.enum(['TERMINATION_FEE', 'REVERSE_TERMINATION_FEE', 'MAE', 'REGULATORY_EFFORTS', 'FINANCING_CONDITION']),
  value: z.string(),
  sourceSection: z.string(),
  confidence: z.number().min(0).max(1),
  verbatimQuote: z.string().optional(),
});

// extraction-worker.ts
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';

const { object } = await generateObject({
  model: openai('gpt-4o'),
  schema: z.object({ clauses: z.array(ExtractedClauseSchema) }),
  prompt: `Extract M&A deal clauses from this filing section:\n\n${chunk}`,
});
```

### Pattern 3: Scoring at Ingest Time, Stored as Data

**What:** Run materiality and severity scoring immediately after extraction, store `materiality_score` and `severity` as columns on the `events` table. The frontend reads these pre-computed values rather than re-running scoring logic client-side.

**When to use:** Always. The existing frontend scoring functions are pure functions — they can be called server-side without modification (or extracted to `packages/`).

**Trade-offs:** Score updates require re-scoring stored events when rules change (acceptable: run a migration job). Avoids re-running scoring on every page render, which matters for the inbox's 50-100 event lists.

### Pattern 4: SSE for Live Inbox Updates

**What:** Frontend connects to `GET /api/sse/events` using the browser's `EventSource` API. When the extraction worker persists a new event, it publishes to a Redis channel. The SSE endpoint is subscribed to that channel and forwards events to connected clients.

**When to use:** Inbox page — analysts need to see new events as they land. SSE is unidirectional (server → client), which is all j16z needs. Simpler than WebSockets for this use case; works through proxies; HTTP/2 compatible.

**Trade-offs:** Does not work for bidirectional use cases (not needed here). Requires a Redis pub/sub layer if running multiple API server instances.

**Example:**
```typescript
// routes/sse.ts
app.get('/sse/events', (c) => {
  const stream = new ReadableStream({
    start(controller) {
      const subscriber = redis.subscribe('new-event', (message) => {
        controller.enqueue(`data: ${message}\n\n`);
      });
      c.req.raw.signal.addEventListener('abort', () => subscriber.unsubscribe());
    }
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
  });
});
```

---

## Data Flow

### Ingestion Flow (External API → Database → Frontend)

```
External API (e.g. SEC EDGAR /submissions endpoint)
    ↓  (BullMQ cron: edgar-poller, every 15 min)
Fetch new filings since last_checked timestamp
    ↓
Deduplicate by accession number against raw_filings table
    ↓  (skip if exists)
Write to raw_filings table (source_id, raw_html/text, source_url, fetched_at)
    ↓
Enqueue extraction job: extractionQueue.add('extract', { rawFilingId })
    ↓  (BullMQ worker: extraction-worker)
Fetch raw doc, chunk at section boundaries (max 4k tokens/chunk)
    ↓
generateObject() with Zod schema → ExtractedClause[] / EventSummary
    ↓  (validate, confidence threshold filter)
Write to events / clauses / deals tables (scored at insertion)
    ↓
Publish to Redis channel 'new-event'
    ↓  (SSE endpoint listening on Redis)
Push SSE event to connected frontend clients
    ↓  (EventSource in Inbox page)
Inbox updates in real-time without page refresh
```

### Alert Flow (New Event → Notifications)

```
New Event written to DB (after extraction)
    ↓
Enqueue alert job: alertQueue.add('evaluate', { eventId })
    ↓  (BullMQ worker: alert-worker)
Load event with deal context + analyst fields (p_close, outside_date, litigation_count)
    ↓
Apply materiality adjustment rules (+20 if <30 days to outside_date, etc.)
    ↓
Load AlertRules for all users watching this deal
    ↓
For each rule where score > threshold:
  ├── score > 70 → email (Resend) + Slack (webhook POST)
  ├── score 50-70 → Slack only
  └── score < 50 → inbox only (no push)
    ↓
Write notification_log record (deduplication, audit)
```

### API Request Flow (Frontend → Backend)

```
Frontend component calls getDeals() in src/lib/api.ts
    ↓  (NEXT_PUBLIC_USE_MOCK_DATA=false)
fetch(NEXT_PUBLIC_API_URL + '/deals', { headers: { Authorization: 'Bearer <supabase_jwt>' } })
    ↓
Hono middleware: verify Supabase JWT → extract user_id + team_id
    ↓
Drizzle query: SELECT * FROM deals WHERE team_id = $1
    ↓
JSON response → component renders with real data
```

### Frontend API Abstraction → Real Backend Connection

The existing `src/lib/api.ts` already has the correct structure. The two changes needed to connect to the real backend are:

1. Set `NEXT_PUBLIC_USE_MOCK_DATA=false` in production `.env`
2. Set `NEXT_PUBLIC_API_URL=https://api.j16z.com` (or `http://localhost:3001` for local dev)
3. Add `Authorization: Bearer <supabase_jwt>` header to fetch calls (Supabase session from `@supabase/ssr`)

No restructuring of `api.ts` is needed — the mock/real branching and endpoint paths already match what the backend will serve.

---

## Build Order and Phase Dependencies

```
Phase 1: Database + Schema
    ↓ (required by everything)
Phase 2: Hono API skeleton + auth middleware
    ↓ (required for frontend connection)
Phase 3: Frontend → real API connection (flip NEXT_PUBLIC_USE_MOCK_DATA=false)
    ↓ (unblocks frontend iteration on real data)
Phase 4: SEC EDGAR poller (simplest external API, best documented)
    ↓ (first real data, validates ingestion architecture)
Phase 5: LLM extraction pipeline (requires real filings to extract from)
    ↓ (first structured AI output)
Phase 6: CourtListener + FTC/DOJ pollers (parallel with Phase 5 once pipeline proven)
Phase 7: Alert engine (requires events in DB + extraction working)
    ↓
Phase 8: Email/Slack integrations (requires alert engine)
Phase 9: Email digest scheduler (requires email integration)
Phase 10: RSS/news poller (lowest priority, least critical for MVP)
```

**Key dependency:** Phases 1-3 must complete before any real data appears in the frontend. Phase 4 must complete before Phase 5 (can't extract from filings that haven't been fetched). Phase 7 depends on having scored events in the DB.

**What can be parallelized:** Once Phase 4 is proven, additional source pollers (Phase 6) can be built in parallel with extraction refinement. Alert routing (email vs Slack vs webhook) within Phase 8 can be done in parallel by different developers.

---

## Integration Points

### External Services

| Service | Integration Pattern | Rate Limits / Notes |
|---------|---------------------|---------------------|
| SEC EDGAR | REST polling (`/submissions/{CIK}.json`, `/Archives/edgar/full-index/`) | No auth required; unofficial rate limit ~10 req/sec; use `User-Agent` header with company name per SEC policy |
| CourtListener | REST polling + webhooks (recommended over pure polling) | 5,000 req/hr authenticated; webhook endpoint for docket updates eliminates polling load |
| FTC/DOJ | RSS feeds + HTML scraping (no formal API) | No rate limits published; poll hourly; parse press release HTML with cheerio |
| Market Data | TBD (Polygon.io or IEX Cloud for spreads) | Paid; implied consideration = (offer price − current price) / current price |
| Resend | HTTP POST to send API | Transactional email; React Email for templates; generous free tier |
| Slack | Incoming webhook URL (user-configured in Settings) | App-level webhook per channel; no SDK needed for simple notifications |
| OpenAI / Anthropic | AI SDK `generateObject()` | Rate limits per tier; use `gpt-4o` for extraction; cache identical chunks via DB lookup |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Pollers → Extraction | BullMQ job queue (Redis) | Decoupled — pollers don't wait for extraction; extraction retries independently |
| Extraction → Alert | BullMQ job queue (Redis) | Same pattern — alert evaluation queued after event persisted |
| Alert → Email/Slack | Direct HTTP calls (Resend/Slack webhook) within worker | No separate queue needed at MVP scale |
| API → Frontend | HTTP REST + SSE | Hono RPC can generate TypeScript client with full type safety — eliminates need to keep frontend/backend types in sync manually |
| Backend → DB | Drizzle ORM over Supabase Postgres | Use connection pooling (Transaction mode) with `prepare: false` |
| Frontend auth → Backend | Supabase JWT in `Authorization` header | Hono middleware calls `supabase.auth.getUser(token)` to verify; no custom session management |

---

## Anti-Patterns

### Anti-Pattern 1: Synchronous LLM Extraction in Poller

**What people do:** Call `generateObject()` directly inside the poller cron job, block until extraction completes, then move to next filing.

**Why it's wrong:** LLM calls take 2-15 seconds per chunk; a single S-4 filing may have 50+ chunks. One slow LLM response backs up the entire poller. Rate limit errors on the LLM API fail the entire batch. Poller timeout causes re-fetch of already-processed documents.

**Do this instead:** Pollers write raw docs and enqueue extraction jobs. Workers handle extraction with built-in BullMQ retry/backoff. The two concerns are fully decoupled.

### Anti-Pattern 2: Computing Materiality Scores in the Frontend

**What people do:** Keep scoring logic only in frontend (as it exists now), calculate scores at render time from raw event data.

**Why it's wrong:** Every page load re-runs scoring for 50-100 events. Sorting and filtering the inbox by score requires sending all events to the client first. Backend alert evaluation can't use the same score logic without duplicating code.

**Do this instead:** Port the existing `severity-scoring.ts` and `materiality-scoring.ts` to the backend (or `packages/`). Store computed scores as columns on `events`. Frontend receives `{ ..., materialityScore: 85, severity: 'CRITICAL' }` and renders directly.

### Anti-Pattern 3: Polling CourtListener When Webhooks Are Available

**What people do:** Poll CourtListener `/dockets/` endpoint every N minutes looking for updates.

**Why it's wrong:** CourtListener has a 5,000 req/hr limit. Polling all tracked deals at 15-minute intervals for 50+ active deals burns through quota quickly. Missed updates are possible if polling interval exceeds update frequency.

**Do this instead:** Register a CourtListener webhook for each monitored docket. CourtListener POSTs to j16z's `/webhooks/courtlistener` endpoint when a docket updates. Polling is the fallback for initial discovery only.

### Anti-Pattern 4: Using Next.js API Routes as the Backend

**What people do:** Add `/app/api/deals/route.ts` files in the Next.js app to handle backend logic.

**Why it's wrong:** Next.js API routes share the same process as the frontend; long-running ingestion jobs and BullMQ workers cannot run inside a Next.js serverless function. The monorepo structure (separate `apps/api/`) is the correct architecture. Next.js API routes are appropriate only for BFF (backend-for-frontend) concerns like auth token refresh, not for data ingestion.

**Do this instead:** Keep the backend in `apps/api/` as a separate Hono service. The frontend calls it via `NEXT_PUBLIC_API_URL`. This separation also means the backend can be deployed independently (Railway, Fly.io, etc.) without Vercel's serverless function timeout constraints.

### Anti-Pattern 5: Storing Extracted Text Without Raw Source

**What people do:** Write only the LLM-extracted structured data to the database, discard the raw filing text.

**Why it's wrong:** LLM extraction improves over time. If you discard raw documents, you cannot re-extract with a better model or corrected prompt. You also lose the ability to show analysts the verbatim source text for a clause.

**Do this instead:** Always store raw documents in `raw_filings` / `raw_docket_entries` tables. Extraction writes to separate domain tables linked by foreign key. Re-extraction is a background job that updates domain tables from the unchanged raw store.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-50 active deals (MVP pilot) | Single Hono process hosting API + BullMQ workers; SQLite or Supabase free tier; Redis Cloud free tier (30MB). BullMQ cron for pollers runs in same process. |
| 50-500 deals (Series A scale) | Separate API server and worker processes; add concurrency to BullMQ workers (parallel LLM calls); Supabase Pro for connection pooling; Redis Upstash or dedicated instance. SSE works fine at this scale with Redis pub/sub. |
| 500+ deals | Separate extraction workers to dedicated machines; LLM call batching; PostgreSQL read replicas for heavy read API queries; consider moving from SSE to dedicated WebSocket service. Extract `packages/types` as published package if frontend/backend teams diverge. |

### Scaling Priorities

1. **First bottleneck:** LLM extraction throughput — rate limits on OpenAI API constrain ingestion speed. Fix with: BullMQ rate limiter on extraction queue (e.g. max 20 req/min matching tier), retry with exponential backoff.
2. **Second bottleneck:** PostgreSQL connection count — Supabase free tier has 60 connection limit. Fix with: Supabase Supavisor connection pooler (Transaction mode), Drizzle `prepare: false`.

---

## Sources

- [SEC EDGAR Application Programming Interfaces](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) — MEDIUM confidence (official)
- [CourtListener REST API v4](https://www.courtlistener.com/help/api/rest/) — HIGH confidence (official)
- [CourtListener Webhook API](https://www.courtlistener.com/help/api/webhooks/) — HIGH confidence (official)
- [AI SDK Core: generateObject](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-object) — HIGH confidence (official Vercel AI SDK docs)
- [BullMQ Documentation](https://docs.bullmq.io/) — HIGH confidence (official)
- [Drizzle ORM with Supabase](https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase) — HIGH confidence (official)
- [Hono Best Practices](https://hono.dev/docs/guides/best-practices) — HIGH confidence (official)
- [OpenAI Structured Outputs](https://openai.com/index/introducing-structured-outputs-in-the-api/) — HIGH confidence (official)
- [Building Full-Stack TypeScript Monorepo with React and Hono](https://blog.raulnq.com/building-a-full-stack-typescript-monorepo-with-react-and-hono) — MEDIUM confidence (community)
- [SSE vs WebSockets 2025](https://dev.to/haraf/server-sent-events-sse-vs-websockets-vs-long-polling-whats-best-in-2025-5ep8) — MEDIUM confidence (community, aligns with Shopify engineering post)
- [Building Data Extraction Pipeline for Unstructured Legal Contracts](https://medium.com/@ayanchax/building-data-extraction-pipeline-for-unstructured-legal-us-contracts-part-1-88947ede9b40) — MEDIUM confidence (practitioner post)
- [Tribe AI: Data Stack for AI-Enabled Due Diligence](https://www.tribe.ai/applied-ai/data-stack-for-ai-enabled-due-diligence) — LOW confidence (contextual reference only)

---

*Architecture research for: M&A Intelligence Platform — backend + LLM extraction pipeline*
*Researched: 2026-02-25*
