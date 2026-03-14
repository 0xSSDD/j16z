# Supabase Infrastructure

## Overview
j16z uses hosted Supabase (eu-central-1) for auth + Postgres, Docker Redis for BullMQ. Supabase's direct DB connection is IPv6-only; all local dev and CI must route through the Session Pooler (IPv4) or Supabase CLI (Management API). New API key format (`sb_publishable_`/`sb_secret_`) replaced legacy JWT-based `anon`/`service_role` keys.

## Connection Architecture

```mermaid
graph TD
    subgraph "Local Dev (macOS / IPv4-only)"
        API["Hono API<br/>apps/api/"]
        WORKER["BullMQ Worker"]
        FE["Next.js Frontend"]
        DRIZZLE["Drizzle ORM"]
        CLI["Supabase CLI"]
    end

    subgraph "Docker (localhost)"
        REDIS["Redis :6380<br/>docker-compose.test.yml"]
    end

    subgraph "Supabase Hosted (eu-central-1)"
        subgraph "API Gateway (IPv4)"
            REST["REST API / Auth<br/>tppysrmbmnedkswlpgkw.supabase.co"]
            MGMT["Management API<br/>api.supabase.com"]
        end
        subgraph "Supavisor Pooler (IPv4)"
            POOLER["Session Pooler :5432 / Transaction :6543<br/>aws-1-eu-central-1.pooler.supabase.com"]
        end
        subgraph "Database (IPv6-only)"
            PG["PostgreSQL :5432<br/>db.tppysrmbmnedkswlpgkw.supabase.co"]
        end
    end

    API -->|REDIS_URL| REDIS
    WORKER -->|REDIS_URL| REDIS
    API -->|"DATABASE_URL :6543<br/>prepare: false (transaction)"| POOLER
    API -->|"SUPABASE_DB_URL_SERVICE_ROLE :5432<br/>(session mode)"| POOLER
    POOLER --> PG
    FE -->|SUPABASE_URL + Publishable Key| REST
    CLI -->|supabase db push| MGMT
    MGMT --> PG
    DRIZZLE -.->|"❌ IPv6 unreachable"| PG

    style PG fill:#fee,stroke:#c00,color:#333
    style DRIZZLE fill:#fee,stroke:#c00,color:#333
```

### Key Gotchas

- **Direct connection (`db.xxx.supabase.co:5432`) is IPv6-only** on free tier. `drizzle-kit migrate` will fail with `EHOSTUNREACH` on macOS.
- **Workaround for migrations:** Copy SQL from `apps/api/drizzle/*.sql` → `supabase/migrations/` with timestamp prefixes, then `supabase db push --linked`. Routes through Management API (IPv4).
- **Runtime DB access:** Use Session Pooler (`aws-0-eu-central-1.pooler.supabase.com:5432`) in `DATABASE_URL` and `SUPABASE_DB_URL_SERVICE_ROLE`. Must use `prepare: false` in transaction mode (port 6543), session mode (port 5432) supports prepared statements.
- **`NODE_OPTIONS="--dns-result-order=ipv4first"`** does NOT fix the IPv6 issue — the host literally has no A record.
- **Pooler hostname prefix varies per project.** Our project uses `aws-1-eu-central-1`, NOT `aws-0-eu-central-1`. Using the wrong prefix gives "Tenant or user not found". Always copy the exact hostname from Dashboard → Connect → Session Pooler. ([GitHub Discussion #30107](https://github.com/orgs/supabase/discussions/30107))
- **Pooler hostname is NOT always `aws-0`!** Our project uses `aws-1-eu-central-1.pooler.supabase.com`. Using `aws-0` gives "Tenant or user not found". **Always copy the exact hostname from Dashboard → Connect → Session Pooler.** (See [GitHub Discussion #30107](https://github.com/orgs/supabase/discussions/30107))

## API Key Architecture

```mermaid
graph LR
    subgraph "New Keys (March 2026)"
        PUB["Publishable Key<br/>sb_publishable_..."]
        SEC["Secret Key<br/>sb_secret_..."]
    end

    subgraph "Legacy Keys (deprecated)"
        ANON["anon JWT"]
        SR["service_role JWT"]
    end

    subgraph "Env Vars"
        E1["SUPABASE_PUBLISHABLE_KEY<br/>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]
        E2["SUPABASE_SECRET_KEY"]
    end

    PUB --> E1
    SEC --> E2
    ANON -.->|"still works, deprecated"| E1
    SR -.->|"still works, deprecated"| E2

    E1 -->|"createBrowserClient()"| BROWSER["Browser Client"]
    E1 -->|"createServerClient()"| SSR["Next.js SSR"]
    E2 -->|"createClient() admin"| SERVER["API Server"]
```

### Key Differences

| Property | Publishable (`sb_publishable_`) | Secret (`sb_secret_`) |
|----------|-------------------------------|----------------------|
| Client-safe? | Yes | No — blocked by API Gateway in browsers |
| RLS | Respects RLS (anon/authenticated role) | Bypasses RLS (service_role) |
| Rotation | Independent, instant, no downtime | Independent, instant |
| Format | Short opaque string | Short opaque string |
| Legacy equiv | `anon` JWT | `service_role` JWT |

## Auth Flow with Access Token Hook

```mermaid
sequenceDiagram
    participant User as User (Browser)
    participant FE as Next.js Frontend
    participant SB as Supabase Auth
    participant HOOK as custom_access_token_hook
    participant FM as firm_members table
    participant API as Hono API

    User->>FE: Login (email/password)
    FE->>SB: signInWithPassword()
    SB->>SB: Verify credentials
    SB->>HOOK: Generate access token (event jsonb)
    HOOK->>FM: SELECT firm_id, role WHERE user_id = ?
    FM-->>HOOK: { firm_id, role } or NULL
    alt User has firm membership
        HOOK->>HOOK: Inject app_metadata.firm_id + firm_role
    else Pre-onboarding user
        HOOK->>HOOK: No injection (fields absent)
    end
    HOOK-->>SB: Modified JWT claims
    SB-->>FE: JWT with firm_id in app_metadata
    FE->>API: Authorization: Bearer <JWT>
    API->>API: authMiddleware verifies via JWKS
    API->>API: firmContextMiddleware extracts firm_id
    API->>API: Route handler uses firm_id for queries
```

### Hook Deployment Checklist

1. SQL function deployed via `supabase db push` (file: `apps/api/src/db/migrations/custom_access_token_hook.sql`)
2. **Must enable in Dashboard:** Authentication → Hooks → Custom Access Token Hook → Enable → Select `public.custom_access_token_hook`
3. Without enabling in Dashboard, the function exists but Supabase won't call it — JWTs will lack `firm_id`
4. Function has `SECURITY DEFINER` — runs as owner, not caller. Granted to `supabase_auth_admin` only.

## Local Dev Stack

```mermaid
graph TB
    subgraph "Terminal 1: pnpm dev:fe"
        FE["Next.js 16<br/>:3000<br/>MOCK_DATA=false"]
    end

    subgraph "Terminal 2: pnpm dev (api)"
        API["Hono API<br/>:3001"]
    end

    subgraph "Terminal 3: pnpm worker"
        W["BullMQ Worker<br/>Node.js"]
    end

    subgraph "Docker"
        R["Redis 7-alpine<br/>:6380"]
    end

    subgraph "Supabase Cloud"
        AUTH["Auth Service"]
        DB["PostgreSQL<br/>(via Session Pooler)"]
    end

    FE -->|"API calls :3001"| API
    FE -->|"Auth (login/signup)"| AUTH
    API --> DB
    API --> R
    W --> R
    W --> DB
    AUTH -->|"JWT with firm_id"| FE
```

### Startup Sequence

```bash
# 1. Start Redis (Docker must be running)
pnpm infra:up

# 2. Start API server
cd apps/api && pnpm dev

# 3. Start worker (separate terminal)
cd apps/api && pnpm worker

# 4. Start frontend (separate terminal)
cd apps/j16z-frontend && pnpm dev

# Or use the orchestrated script (steps 1-3):
pnpm dev:be
```

### Environment Files

| File | Contains | Points to |
|------|----------|-----------|
| `apps/api/.env` | All backend env vars | Supabase cloud + local Redis |
| `apps/j16z-frontend/.env.local` | Frontend env vars | Supabase cloud + local API |
| `apps/langextract/.env` | Python worker env | Same DB + Redis as API |
