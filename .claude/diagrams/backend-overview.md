# Backend Overview

## Overview
The j16z backend is a Hono API server (`apps/api/`) with a separate BullMQ worker process for background ingestion jobs. PostgreSQL on Supabase, Upstash Redis for job queues.

## System Architecture

```mermaid
graph TB
    subgraph "apps/api"
        API["API Server<br/>src/index.ts<br/>Hono on port 3001"]
        SCHED["Scheduler<br/>queues/scheduler.ts<br/>Registers crons at startup"]
    end

    subgraph "apps/api (separate process)"
        WORKER["Worker Process<br/>src/worker.ts<br/>BullMQ Worker, concurrency=5"]
    end

    subgraph "External Services"
        PG["PostgreSQL<br/>Supabase"]
        REDIS["Redis<br/>Upstash (TLS)"]
        EDGAR["SEC EDGAR APIs"]
        SUPA_AUTH["Supabase Auth<br/>JWT + JWKS"]
    end

    FRONTEND["Next.js Frontend<br/>apps/j16z-frontend<br/>port 3000"]

    FRONTEND -->|"Bearer JWT"| API
    API -->|"Drizzle ORM"| PG
    API -->|"enqueue jobs"| REDIS
    SCHED -->|"upsertJobScheduler"| REDIS
    WORKER -->|"poll jobs"| REDIS
    WORKER -->|"read/write"| PG
    WORKER -->|"rate-limited fetch"| EDGAR
    API -->|"JWKS verify"| SUPA_AUTH
```

## Two DB Clients — Critical Distinction

```mermaid
graph LR
    subgraph "db/index.ts"
        DB["db (user client)<br/>port 6543 (pooled)<br/>Respects RLS"]
        ADMIN["adminDb (admin client)<br/>port 5432 (direct)<br/>Bypasses RLS"]
    end

    DB -->|"prepare: false<br/>(required for Supabase pooler)"| PG[(PostgreSQL)]
    ADMIN -->|"service role credentials"| PG
```

**When to use which:**
- `db` — user-facing request handlers (currently unused in practice; all routes use `adminDb` with manual firm_id filtering + RLS as safety net)
- `adminDb` — webhooks, seed scripts, background jobs (worker), admin routes, and all current route handlers

**Gotcha:** Despite having a user-scoped `db` client, all current route handlers use `adminDb` and rely on manually adding `WHERE firm_id = ?` clauses. RLS is defense-in-depth, not the primary enforcement in route handlers. This is a deliberate belt-and-suspenders approach for financial data.

## Process Separation

```mermaid
graph TD
    subgraph "API Server Process (pnpm dev)"
        A1["Hono HTTP server"]
        A2["registerSchedules() — runs ONCE at startup"]
        A3["ingestionQueue — enqueue only"]
    end

    subgraph "Worker Process (pnpm worker:dev)"
        W1["BullMQ Worker — dequeue + process"]
        W2["edgar_poll handler"]
        W3["edgar_download handler"]
    end

    A2 -->|"upsertJobScheduler<br/>(idempotent)"| REDIS[(Redis)]
    A3 -->|"add jobs"| REDIS
    W1 -->|"pull jobs"| REDIS
    W1 --> W2
    W1 --> W3
```

**Critical:** Never import `registerSchedules` from `worker.ts`. The scheduler must only run in the API server process. If imported in the worker, every worker restart creates duplicate cron entries.

**Critical:** Never import worker handlers into `index.ts`. The Queue (enqueueing) and Worker (processing) are deliberately in separate processes.

## Key File Paths

| File | Purpose |
|---|---|
| `src/index.ts` | API server entry point, middleware wiring, route mounting |
| `src/worker.ts` | Separate worker process for background jobs |
| `src/db/index.ts` | Two Drizzle clients (user + admin) |
| `src/db/schema.ts` | All table definitions + RLS policies |
| `src/db/seed.ts` | Starter deal seeding for new firms |
| `src/middleware/auth.ts` | JWT verification via JWKS |
| `src/middleware/firm-context.ts` | Firm ID extraction from JWT |
| `src/routes/*.ts` | REST API route handlers |
| `src/edgar/*.ts` | EDGAR ingestion pipeline |
| `src/queues/*.ts` | BullMQ queue, connection, scheduler |

## Commands

```
pnpm dev           # API server with watch mode (tsx)
pnpm worker:dev    # Worker process with watch mode
pnpm build         # TypeScript → dist/
pnpm start         # Production API server
pnpm worker        # Production worker
pnpm db:generate   # Drizzle schema → SQL migrations
pnpm db:migrate    # Apply pending migrations
pnpm db:push       # Push schema directly (dev only)
pnpm db:seed       # Run seed script
```
