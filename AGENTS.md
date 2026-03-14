<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# J16Z — M&A Intelligence Platform

**Generated:** 2026-03-07 | **Branch:** rehaul | **Commit:** 2a48c69

## OVERVIEW

Deal-first intelligence terminal for merger-arb desks. Ingests SEC EDGAR filings, extracts deal terms via LLM, surfaces materiality-scored event stream. pnpm monorepo: Next.js 16 frontend + Hono API + Python LLM pipeline. Phase 3/7 complete.

## STRUCTURE

```
j16z/
├── apps/
│   ├── j16z-frontend/     # Next.js 16 + React 19 (see apps/j16z-frontend/AGENTS.md)
│   ├── api/               # Hono backend + BullMQ (see apps/api/AGENTS.md)
│   └── langextract/       # Python LLM extraction (see apps/langextract/AGENTS.md)
├── packages/              # Empty — reserved for @j16z/design-system, @j16z/utils
├── openspec/              # Spec-driven development (proposals, specs, changes)
├── .planning/             # GSD planning system (phases, roadmap, state)
└── j16z-docs/             # Reference docs (pitch deck, rehaul spec, pain points)
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add frontend page | `apps/j16z-frontend/src/app/app/` | App Router file-based routing |
| Add React component | `apps/j16z-frontend/src/components/` | "use client" on everything |
| Add shadcn component | `apps/j16z-frontend/src/components/ui/` | `npx shadcn@latest add <name>` |
| Add API route | `apps/api/src/routes/` | Register in routes/index.ts |
| Add EDGAR job type | `apps/api/src/edgar/` | Then handle in worker.ts |
| Add LLM extraction pipeline | `apps/langextract/pipelines/` | Then route in worker.py |
| Add DB table | `apps/api/src/db/schema.ts` | Drizzle ORM, then `pnpm db:generate && pnpm db:migrate` |
| Change mock data | `apps/j16z-frontend/src/lib/constants.ts` | 1381 lines of mock deals/events |
| Domain types (frontend) | `apps/j16z-frontend/src/lib/types.ts` | Deal, Event, Clause, Filing |
| Domain types (backend) | `apps/api/src/db/schema.ts` | Drizzle schema = source of truth |
| Change proposals | `openspec/changes/` | Read openspec/AGENTS.md first |
| Project roadmap | `.planning/ROADMAP.md` | 7 phases, currently at Phase 4 |
| Known issues | `.planning/codebase/CONCERNS.md` | 270 lines of documented issues |
| Domain pitfalls | `.planning/research/PITFALLS.md` | 8 critical gotchas (EDGAR, LLM, PACER) |

## DATA FLOW

```
EDGAR (SEC)                    Frontend (Next.js)
    │                              │
    ▼                              ▼ authFetch(JWT)
┌─────────┐   BullMQ Redis   ┌─────────┐
│ Node.js │ ◄──────────────► │ Hono API│ ◄── port 3001
│ Worker  │   ingestion queue │ Server  │
└────┬────┘                   └────┬────┘
     │ enqueue llm_extract         │
     ▼                             ▼
┌─────────┐                  ┌──────────┐
│ Python  │ ──────────────►  │ Postgres │ ◄── Supabase
│ Worker  │   clause/event   │ (RLS)    │
└─────────┘   writes         └──────────┘
```

**Dual-Worker Architecture:** Node.js worker handles `edgar_poll` + `edgar_download`. Python worker handles `llm_extract`. Both subscribe to same `ingestion` queue, filter by job name.

## CONVENTIONS

- **Quotes**: Single quotes only (Biome enforced)
- **Line width**: 120 chars
- **Trailing commas**: Everywhere
- **TypeScript**: Strict mode + `exactOptionalPropertyTypes` + `noUnusedLocals`
- **Imports**: `@/` → `src/` (frontend + API), `@j16z/` for internal packages
- **Components**: shadcn/ui new-york style, Lucide icons, "use client" on all components
- **Styling**: Tailwind v4 with CSS variables in globals.css, dark mode default
- **DB**: Drizzle ORM. Two clients: `db` (RLS, user routes) and `adminDb` (service-role, workers)
- **Soft deletes**: `deleted_at` timestamp, never hard DELETE
- **Firm isolation**: 3 layers — RLS policy + middleware extraction + WHERE clause

## ANTI-PATTERNS (THIS PROJECT)

- **NO** `as any`, `@ts-ignore`, `@ts-expect-error` — strict TypeScript, fix the types
- **NO** importing worker.ts from index.ts — separate processes
- **NO** `registerSchedules()` in worker.ts — only in API server (prevents duplicate crons)
- **NO** raw content in BullMQ job payloads — fetch from DB by filing_id (avoids 800KB Redis payloads)
- **NO** hardcoded EDGAR URLs — always use `edgarFetch()` (enforces rate limit + User-Agent)
- **NO** `select()` without firm_id filter on tenant-scoped tables
- **NO** refactoring while fixing bugs — minimal fixes only
- **NO** `window.dispatchEvent` for new cross-component communication — use Zustand (available but unused)

## SUPABASE SETUP

**Project:** tppysrmbmnedkswlpgkw | **Region:** eu-central-1 (Frankfurt) | **CLI linked**

### API Keys (new naming — March 2026)

Supabase replaced `anon`/`service_role` JWT keys with new prefixed keys:

| Old Name | New Name | Env Var | Format |
|----------|----------|---------|--------|
| `anon` key | Publishable key | `SUPABASE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` |
| `service_role` key | Secret key | `SUPABASE_SECRET_KEY` | `sb_secret_...` |

Legacy JWT keys still work but are deprecated. New keys are drop-in compatible with `@supabase/supabase-js` — same `createClient(url, key)` API.

**Key difference:** Secret keys are blocked by Supabase API Gateway when sent from browsers (User-Agent check). Publishable keys work everywhere.

### Connection (IPv6 / IPv4)

- **Direct connection** (`db.xxx.supabase.co:5432`) is **IPv6-only** on free tier
- Most local dev environments (macOS, GitHub Actions, Vercel) are IPv4-only
- **Workaround:** Use Supabase CLI (`supabase db push`) which routes through the Management API (IPv4)
- **For app runtime:** Use Session Pooler (`aws-{N}-[region].pooler.supabase.com`) for IPv4 support. **WARNING: The `N` prefix is NOT always `0` — copy exact hostname from Dashboard → Connect → Session Pooler.** Our project uses `aws-1-eu-central-1`.
- **IPv4 add-on** available on paid plans for direct connections

### Migrations

Drizzle ORM manages the schema (`apps/api/drizzle/`), but migrations are pushed via **Supabase CLI** due to IPv6:

```bash
supabase login                    # One-time auth (opens browser)
supabase link --project-ref ...   # Link to project
supabase db push --linked         # Push migrations from supabase/migrations/
```

Migration SQL files are copied from `apps/api/drizzle/*.sql` → `supabase/migrations/` with timestamp prefixes.

### Access Token Hook

`custom_access_token_hook` is deployed as a Postgres function. It injects `firm_id` and `firm_role` into every JWT's `app_metadata` by looking up `firm_members`.

**After deploying the SQL, enable in Supabase Dashboard:**
Dashboard → Authentication → Hooks → Custom Access Token Hook → Enable → Select `public.custom_access_token_hook`

### Redis (BullMQ)

`connection.ts` supports dual mode:
- **Local dev:** `REDIS_URL=redis://localhost:6380` (Docker)
- **Production:** `UPSTASH_REDIS_HOST` + `UPSTASH_REDIS_PASSWORD` (TLS)

`REDIS_URL` takes priority when set.

### MCP Integration

Supabase MCP is configured in `~/.config/opencode/opencode.json`:
```json
"supabase": { "type": "remote", "url": "https://mcp.supabase.com/mcp?project_ref=tppysrmbmnedkswlpgkw", "enabled": true }
```
Auth: `opencode mcp auth supabase`

## CRITICAL KNOWN ISSUES

| Issue | Severity | Location | Status |
|-------|----------|----------|--------|
| ~~Payload key mismatch (camelCase→snake_case)~~ | ~~CRITICAL~~ | api/edgar/download.ts → langextract/worker.py | **FIXED** |
| ~~Missing /api/deals/:id/clauses route~~ | ~~CRITICAL~~ | api/routes/deals.ts | **FIXED** |
| ~~Redis TLS mismatch (Node vs Python)~~ | ~~CRITICAL~~ | api/queues/connection.ts vs langextract/.env | **FIXED** |
| newsItems table missing from schema | MEDIUM | api/routes/deals.ts (GET /:id/news) | OPEN |
| Pre-existing TS errors (.materiality field) | LOW | notifications-inbox.tsx, event-timeline.tsx | OPEN |
| No CI/CD pipeline | MEDIUM | No .github/workflows/ | OPEN |

## COMMANDS

```bash
pnpm dev                  # Start frontend + API in parallel
pnpm dev:fe               # Frontend only
pnpm dev:be               # Backend: Docker + migrations + API + worker
pnpm build                # Build packages → apps
pnpm lint                 # Biome check
pnpm lint:fix             # Biome auto-fix
pnpm check                # TypeScript type-check (tsc -b)
pnpm test                 # Vitest all projects
pnpm test:be              # Backend tests only
pnpm infra:up             # Start Docker (Postgres + Redis)
pnpm infra:down           # Stop Docker

# API-specific (from apps/api/)
pnpm worker               # Start BullMQ Node.js worker
pnpm worker:dev           # Watch mode worker
pnpm db:generate          # Generate Drizzle migrations
pnpm db:migrate           # Run migrations (needs IPv6 or pooler)
pnpm db:push              # Push schema (dev only)
pnpm db:seed              # Seed starter data

# Supabase CLI (for IPv4 environments)
supabase db push --linked  # Push migrations via Management API
supabase db dump           # Dump remote schema

# Python (from apps/langextract/)
pnpm dev                  # python worker.py
pnpm test                 # pytest
pnpm install:py           # pip install with dev deps
```

## NOTES

- React Compiler enabled (next.config.ts) — no manual useMemo/useCallback needed
- Frontend can run offline with `NEXT_PUBLIC_USE_MOCK_DATA=true` (default for dev)
- Cross-tenant isolation test runs as separate vitest project (`--project=isolation`)
- Materiality scoring exists in BOTH TypeScript (frontend fallback) and Python (authoritative) — must stay in sync
- `google-generativeai` package is deprecated — `google.genai` is replacement (flagged, not blocking)
- LangExtract 1.1.1 AlignmentStatus uses `MATCH_EXACT/GREATER/LESSER/FUZZY` (not `ALIGNED/APPROXIMATE/FAILED` from research docs)
- S-4/DEFM14A filings auto-create deals with `firmId=null, source='auto_edgar'` — live in discovery pool until claimed
- Supabase env vars use new naming: `SUPABASE_PUBLISHABLE_KEY` (not `ANON_KEY`), `SUPABASE_SECRET_KEY` (not `SERVICE_ROLE_KEY`)