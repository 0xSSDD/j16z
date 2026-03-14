# J16Z API — Hono Backend + BullMQ

**Generated:** 2026-03-07

## OVERVIEW

Hono REST API on port 3001 with Drizzle ORM, Supabase auth, BullMQ job queue. Dual-worker architecture: Node.js worker for EDGAR I/O, Python worker for LLM extraction. Multi-tenant via 3-layer firm isolation.

## STRUCTURE

```
src/
├── index.ts              # Hono app entry — middleware chain, route mounting, scheduler
├── worker.ts             # BullMQ worker entry — SEPARATE PROCESS from index.ts
├── middleware/
│   ├── auth.ts           # JWT verification via Supabase JWKS (all /api/* routes)
│   └── firm-context.ts   # Extracts firm_id from JWT app_metadata (data routes only)
├── routes/
│   ├── index.ts          # Route aggregator — exports all route modules
│   ├── auth.ts           # POST /api/auth/onboard, /invite; GET /api/auth/me
│   ├── deals.ts          # CRUD /api/deals (firm-scoped, soft delete)
│   ├── events.ts         # GET /api/events (firm-scoped, optional ?dealId)
│   ├── filings.ts        # GET /api/filings, /unmatched, /deal/:dealId
│   └── watchlists.ts     # CRUD /api/watchlists (firm-scoped)
├── db/
│   ├── index.ts          # Two Drizzle clients: db (RLS) + adminDb (service-role)
│   ├── schema.ts         # 13 tables with RLS policies, soft deletes, firm_id scoping
│   ├── seed.ts           # Firm seeding with starter deals
│   └── migrations/       # custom_access_token_hook.sql (JWT enrichment)
├── edgar/
│   ├── client.ts         # Rate-limited HTTP client (9 req/s, mandatory User-Agent)
│   ├── types.ts          # Zod schemas for EDGAR API responses
│   ├── poll.ts           # Stage 1: CIK-based + EFTS broad scan (273 lines)
│   ├── download.ts       # Stage 2: Fetch HTML, parse text, enqueue llm_extract
│   ├── deal-matcher.ts   # Match filing → deal or auto-create (S-4/DEFM14A)
│   ├── event-factory.ts  # Create firm-scoped events from filings
│   └── cik-resolver.ts   # Company name → CIK lookup
├── queues/
│   ├── connection.ts     # Upstash Redis connection (TLS)
│   ├── ingestion.ts      # Queue def: 3 attempts, exponential backoff (5s→25s→125s)
│   └── scheduler.ts      # Cron: edgar_poll every 15 min (idempotent, API-only)
└── tests/                # 10 test files (see Testing section)
```

## MIDDLEWARE CHAIN

```
Request → logger() → cors(FRONTEND_URL) → /health (unauthenticated)
                                         → /api/*
                                           ├── authMiddleware (all routes)
                                           ├── firmContextMiddleware (deals, events, filings, watchlists)
                                           │   └── NOT applied to /api/auth/* (onboarding users lack firm_id)
                                           └── Route Handler (adminDb + WHERE firm_id)
```

## EDGAR PIPELINE (3 Stages)

```
Stage 1: edgar_poll (cron every 15 min)
  ├─ Scan A: CIK-based (tracked deals' acquirer/target CIKs)
  ├─ Scan B: EFTS broad ("merger agreement", high-signal forms)
  ├─ Dedup by accession number → insert filings
  └─ Enqueue edgar_download per new filing

Stage 2: edgar_download
  ├─ Fetch HTML via edgarFetch() (rate-limited)
  ├─ HTML → plaintext, store rawContent
  ├─ Match to deal (CIK match or auto-create for S-4/DEFM14A)
  ├─ Create firm-scoped events
  └─ Enqueue llm_extract (for Python worker)

Stage 3: llm_extract (Python worker — see apps/langextract/AGENTS.md)
```

## MULTI-TENANT ISOLATION

| Layer | Mechanism | Location |
|-------|-----------|----------|
| Database | RLS policies (`firm_id = JWT.app_metadata.firm_id`) | schema.ts |
| Middleware | firmContextMiddleware extracts firm_id | firm-context.ts |
| Route | WHERE firm_id = ? on every query | routes/*.ts |
| JWT | Custom access token hook injects firm_id | migrations/custom_access_token_hook.sql |

## TESTING

**Vitest, node environment, 30s timeout.** Two projects: `j16z-backend` (main) + `isolation` (cross-tenant CI gate).

**Drizzle Chain Mock Pattern** (critical — used in all DB tests):
```typescript
// Chain: select().from().where() or select().from().orderBy().limit()
const mockWhere = vi.fn().mockResolvedValue(rows);
const mockFrom = vi.fn().mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

// MUST reset in beforeEach — vi.clearAllMocks() clears implementations
beforeEach(() => { vi.clearAllMocks(); resetMockChains(); });
```

**Test files**: health, edgar-client, edgar-poll, edgar-download, edgar-deal-matcher, edgar-event-factory, edgar-scheduler, db-schema, queue, cross-tenant.

## ANTI-PATTERNS

- **NO** importing worker.ts from index.ts — separate processes
- **NO** `registerSchedules()` in worker.ts — API server only
- **NO** raw content in BullMQ payloads — fetch from DB by filing_id
- **NO** hardcoded EDGAR URLs — use `edgarFetch()` (rate limit + User-Agent)
- **NO** `select()` without firm_id on tenant-scoped tables
- **NO** `db` (RLS client) in workers — use `adminDb` (service-role)
- **NO** hard DELETE — use soft delete (`deleted_at` timestamp)

## COMMANDS

```bash
pnpm dev          # tsx watch src/index.ts (API server)
pnpm build        # tsc → dist/
pnpm worker       # Start BullMQ worker (separate process)
pnpm worker:dev   # Watch mode worker
pnpm db:generate  # Generate Drizzle migrations
pnpm db:migrate   # Run migrations
pnpm db:push      # Push schema (dev only)
pnpm db:seed      # Seed starter data
```

## SUPABASE & DATABASE

### Env Var Naming (March 2026)

| Env Var | Purpose | Format |
|---------|---------|--------|
| `SUPABASE_URL` | Project API URL | `https://xxx.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Public client key (was `ANON_KEY`) | `sb_publishable_...` |
| `SUPABASE_SECRET_KEY` | Server-only key (was `SERVICE_ROLE_KEY`) | `sb_secret_...` |
| `DATABASE_URL` | RLS client connection (pooled) | Transaction pooler `:6543` |
| `SUPABASE_DB_URL_SERVICE_ROLE` | Admin client + migrations | Session pooler `:5432` |
| `REDIS_URL` | BullMQ job queue | `redis://localhost:6380` (dev) |

### Connection Gotchas

- **Direct DB host (`db.xxx.supabase.co`) is IPv6-only** — unreachable from macOS/CI
- **Use Supavisor pooler** (`aws-{N}-[region].pooler.supabase.com`) for IPv4
- **Pooler prefix is NOT always `aws-0`** — our project uses `aws-1-eu-central-1`. Copy exact hostname from Dashboard → Connect → Session Pooler ([GitHub #30107](https://github.com/orgs/supabase/discussions/30107))
- **Transaction mode (port 6543):** Requires `prepare: false` — used by `DATABASE_URL` (RLS client)
- **Session mode (port 5432):** Supports prepared statements — used by `SUPABASE_DB_URL_SERVICE_ROLE` (admin client, Drizzle migrations)
- **Drizzle migrations:** Use `supabase db push --linked` (routes via Management API, IPv4) since `drizzle-kit migrate` needs direct DB access

### Redis Connection

`connection.ts` supports dual mode via `REDIS_URL`:
- **Local dev:** `REDIS_URL=redis://localhost:6380` (Docker, parsed by `buildRedisConnection()`)
- **Production:** `UPSTASH_REDIS_HOST` + `UPSTASH_REDIS_PASSWORD` (TLS, fallback when `REDIS_URL` is unset)

## NOTES

- `filings` table is GLOBAL (no firm_id, no RLS) — events bridge filings to firms
- Auto-deal creation: S-4/DEFM14A filings create deals with `firmId=null, source='auto_edgar'`
- Scheduler uses `upsertJobScheduler()` — idempotent, safe on API restart
- GET /api/filings/unmatched registered BEFORE /:id — Hono matches in registration order
- drizzle.config.ts uses `SUPABASE_DB_URL_SERVICE_ROLE` for migrations
