# Phase 1: Backend Foundation + Auth - Research

**Researched:** 2026-02-26
**Domain:** Hono API + Drizzle ORM + Supabase Auth + BullMQ/Upstash Redis + Next.js SSR auth middleware
**Confidence:** HIGH (core stack), MEDIUM (cross-tenant CI testing pattern)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Magic link is the primary login method — email field prominent, "Sign in with email link" as the default path
- Email + password signup exists but is secondary (below the fold or behind a toggle)
- Dedicated /login page (unified signup + login) — not a modal overlay
- "Don't have an account? Sign up" / "Already have an account? Sign in" toggle on the same page
- First-time users trigger an onboarding flow after clicking the magic link; returning users go straight to /app/inbox
- Unauthenticated access to /app/* silently redirects to /login; after auth, redirect back to the originally intended page
- Self-service firm creation: first user signs up, names their firm during onboarding, firm is created automatically
- Admin can pre-configure the firm so additional members have minimal setup
- Additional members join via invite link only — no email domain auto-matching
- Two roles: Admin (manages firm settings, invites, integrations) and Member (uses the product)
- Onboarding must be fast — firm name + land in a populated app. No lengthy wizard
- Pre-populate every new firm with real, notable M&A deals: US Steel/Nippon Steel, major AI acquisitions, other marquee active deals
- Include a pre-built example watchlist (e.g., "Top Active Deals") so Watchlists page has content from day one
- Seed deals display a subtle "starter" badge to distinguish from user-added deals
- Users can remove/dismiss seed content — it's soft deleted, admin can restore
- Skeleton loading screens (shimmer placeholders matching layout shape) for all data-fetching states — no spinners
- All entities get soft deletes (deleted_at column) — nothing is ever truly lost
- Audit change log table tracking: who, what entity, what action, when — for all mutations (schema in Phase 1, UI deferred)
- Landing page CTAs route to /login (unified auth page)
- Silent redirect for unauthenticated /app/* access with redirect-back-after-auth
- Logo is the lowercase text wordmark "j16z" — no icon
- Light and dark mode supported (dark is default)
- Fonts: Plus Jakarta Sans (headings), Inter (body), JetBrains Mono (mono) — already in place

### Claude's Discretion

- Auth page visual design (modern standard, within brand system)
- Error message tone and copy
- Exact onboarding flow screens and transitions
- Skeleton screen shimmer implementation details
- Seed deal selection beyond US Steel/Nippon and AI acquisitions
- Audit log table schema design

### Deferred Ideas (OUT OF SCOPE)

- Audit log UI in Settings (full admin view with proper visualization) — Phase 7 or dedicated phase
- Contextual change history visible inline for members — Phase 7 or dedicated phase
- Email domain auto-matching for firm joining — potential future enhancement
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BACK-01 | Backend API service runs in monorepo at `apps/api/` using Hono + Drizzle ORM | Hono Node.js adapter pattern; pnpm workspace setup confirmed |
| BACK-02 | Database schema with Supabase Postgres — all domain tables | Drizzle pgTable schema patterns; soft delete + audit log columns |
| BACK-03 | All database queries scoped by `firm_id` with Supabase RLS for multi-tenant isolation | Drizzle pgPolicy + auth.uid() claim injection via custom access token hook |
| BACK-04 | Frontend API abstraction (`api.ts`) connects to real backend when `NEXT_PUBLIC_USE_MOCK_DATA=false` | Existing api.ts has TODO stubs; needs base URL wiring + JWT passthrough |
| BACK-05 | BullMQ job queue with Redis for scheduled ingestion and async extraction jobs | BullMQ + Upstash Redis TLS connection confirmed; workers need persistent host |
| AUTH-01 | User can sign up with email and password via Supabase auth | Supabase email/password signup is default; confirmed via @supabase/ssr |
| AUTH-02 | User can log in via magic link (passwordless) | signInWithOtp() email method; token_hash callback route required |
| AUTH-03 | User session persists across browser refresh | Supabase SSR stores session in cookies; middleware refreshes on every request |
| AUTH-04 | User can log out from any page | signOut() method; redirect to /login |
| AUTH-05 | Team-level data isolation — users only see their firm's deals, events, and watchlists | RLS policies using firm_id claim from JWT; Drizzle pgPolicy syntax |
| AUTH-06 | Cross-tenant isolation passes as blocking CI gate before pilot onboarding | Vitest integration test using two service-role clients scoped to different firms |
</phase_requirements>

---

## Summary

Phase 1 builds the backend foundation on a well-established and actively maintained stack: Hono (web framework) + Drizzle ORM (type-safe SQL) + Supabase Postgres (hosted database + auth). All three libraries are stable in 2026, have strong TypeScript support, and are widely used together in production SaaS applications. The integration pattern is documented officially by both Supabase and Drizzle.

The multi-tenant isolation strategy uses Supabase's built-in Row Level Security (RLS) with a `firm_id` column on all tables. The JWT is extended via a Custom Access Token Hook to include `firm_id` as a custom claim, which RLS policies then use to scope all queries. Drizzle's `pgPolicy` API lets this be defined directly in the schema file alongside the table definition. The Hono API layer validates the Supabase JWT on every request using the jose library, then passes the firm context down to queries.

BullMQ + Upstash Redis is confirmed for the job queue. The critical deployment constraint is that BullMQ workers cannot run on serverless platforms (Vercel). The API and workers must be hosted on a persistent-process platform (Railway or Render). This is the single biggest architectural decision that must be resolved before any deployment work begins — noted in STATE.md as a known blocker.

**Primary recommendation:** Build `apps/api/` as a Hono Node.js service with `@hono/node-server`. Define all 13 domain tables in Drizzle schema with `firm_id` + `deleted_at` on every table. Wire Supabase auth in Next.js using `@supabase/ssr` middleware. The cross-tenant CI test should use Vitest with two real Supabase service-role clients inserting data for Firm A and asserting Firm B cannot see it.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `hono` | ^4.x (latest) | HTTP routing, middleware pipeline for `apps/api/` | Web-standards-based, first-class TypeScript, runs on Node.js and edge; the emergent default for new TS API services |
| `@hono/node-server` | ^1.x | Node.js adapter for Hono | Required to run Hono on Node.js 18+; official adapter |
| `drizzle-orm` | ^0.44.x | Type-safe SQL query builder + ORM | Generates zero-abstraction SQL; excellent Postgres + Supabase support; schema-as-code |
| `drizzle-kit` | ^0.30.x | Migration generation + push CLI | Paired with drizzle-orm; handles `generate`, `migrate`, `push` commands |
| `postgres` | ^3.x | PostgreSQL driver for Drizzle | Official recommended driver for drizzle-orm/postgres-js |
| `@supabase/supabase-js` | ^2.87.1 (already installed) | Supabase client: auth, RPC, admin operations | Already in frontend; same version for API admin client |
| `@supabase/ssr` | ^0.8.0 (already installed) | Next.js SSR auth with cookie-based sessions | Required for App Router auth; already installed in frontend |
| `bullmq` | ^5.x | Job queues and workers | Industry standard for Redis-backed background jobs in Node.js |
| `jose` | ^5.x | JWT verification for Supabase tokens in Hono | Used by Supabase itself; supports RS256 (Supabase's algorithm) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@hono/zod-validator` | ^0.4.x | Request body/query validation in Hono routes | All API routes that accept a request body |
| `zod` | ^4.x (already installed) | Schema validation + TypeScript inference | Already in the project; use consistently |
| `dotenv` | ^16.x | Environment variable loading in `apps/api/` | Load `.env` for local dev; production uses platform env vars |
| `tsx` | ^4.x | TypeScript execution for dev + scripts | Run drizzle-kit and API in dev without compilation |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Drizzle ORM | Prisma | Prisma has a heavier query engine; Drizzle is leaner, better for RLS passthrough |
| Hono | Express | Express has no built-in TypeScript types; Hono is faster and purpose-built for edge/node |
| Upstash Redis | Self-hosted Redis | Self-hosted needs a persistent server; Upstash is serverless-compatible and simpler for Phase 1 |
| Jose | `jsonwebtoken` | `jsonwebtoken` uses Node.js crypto (not Web Crypto API); `jose` works on all runtimes and is what Supabase uses |

**Installation (new `apps/api/` package):**
```bash
pnpm add hono @hono/node-server drizzle-orm postgres @supabase/supabase-js bullmq jose @hono/zod-validator zod dotenv
pnpm add -D drizzle-kit tsx @types/node typescript
```

---

## Architecture Patterns

### Recommended Project Structure

```
apps/api/
├── src/
│   ├── db/
│   │   ├── index.ts          # Drizzle client setup (two clients: anon-RLS, admin)
│   │   ├── schema.ts         # All pgTable definitions + pgPolicy definitions
│   │   └── seed.ts           # Seed script for starter deals / watchlist
│   ├── middleware/
│   │   ├── auth.ts           # Hono middleware: verify Supabase JWT via jose
│   │   └── firm-context.ts   # Extract firm_id from verified JWT, attach to context
│   ├── routes/
│   │   ├── deals.ts          # /api/deals endpoints
│   │   ├── events.ts         # /api/events endpoints
│   │   ├── watchlists.ts     # /api/watchlists endpoints
│   │   ├── auth.ts           # /api/auth/firm (firm creation during onboarding)
│   │   └── index.ts          # Route aggregation
│   ├── queues/
│   │   ├── connection.ts     # Upstash Redis connection shared instance
│   │   └── ingestion.ts      # BullMQ Queue definition for ingestion jobs
│   └── index.ts              # Server entry: serve(app, { port: 3001 })
├── drizzle.config.ts
├── package.json
└── tsconfig.json

apps/j16z-frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx  # Unified login/signup page (already exists, needs real auth)
│   │   └── auth/
│   │       └── confirm/
│   │           └── route.ts  # Magic link token_hash callback handler (NEW)
│   └── lib/
│       └── supabase/
│           ├── client.ts     # Browser client (createBrowserClient)
│           └── server.ts     # Server client (createServerClient with cookies)
├── middleware.ts             # Auth gate: protect /app/* routes, redirect to /login (NEW)
└── .env.local
```

### Pattern 1: Hono API with Supabase JWT Middleware

**What:** Every protected Hono route validates the Supabase JWT from the Authorization header using `jose`. The verified payload is attached to the Hono context for downstream use.

**When to use:** All routes under `/api/*` that require authentication (virtually all of them).

```typescript
// Source: https://hono.dev/docs/middleware/builtin/jwt + Supabase JWT docs
// apps/api/src/middleware/auth.ts

import { createMiddleware } from 'hono/factory';
import { jwtVerify, createRemoteJWKSet } from 'jose';

const JWKS_URL = `${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`;
const JWKS = createRemoteJWKSet(new URL(JWKS_URL));

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const token = authHeader.slice(7);
  try {
    const { payload } = await jwtVerify(token, JWKS);
    // payload.app_metadata.firm_id set by custom access token hook
    c.set('user', payload);
    c.set('firmId', (payload.app_metadata as any)?.firm_id as string);
    await next();
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
});
```

**Key detail:** Use `createRemoteJWKSet` (not a static secret) because Supabase uses RS256 asymmetric keys. The JWKS endpoint is public and Supabase rotates keys.

### Pattern 2: Drizzle Schema with RLS Policies and Soft Deletes

**What:** All tables include `firm_id`, `created_at`, `deleted_at` columns. RLS policies scope SELECT/INSERT/UPDATE/DELETE to the authenticated user's `firm_id` from the JWT.

**When to use:** Every domain table in the schema.

```typescript
// Source: https://orm.drizzle.team/docs/rls
// apps/api/src/db/schema.ts

import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, pgPolicy, integer, boolean } from 'drizzle-orm/pg-core';

// Reusable timestamp columns
const timestamps = {
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
};

export const firms = pgTable('firms', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  ...timestamps,
});

export const deals = pgTable('deals', {
  id: uuid('id').defaultRandom().primaryKey(),
  firmId: uuid('firm_id').references(() => firms.id).notNull(),
  acquirer: text('acquirer').notNull(),
  target: text('target').notNull(),
  status: text('status').notNull().default('ANNOUNCED'),
  isStarter: boolean('is_starter').default(false),  // seed data badge
  ...timestamps,
}, (t) => [
  pgPolicy('firm_isolation_select', {
    for: 'select',
    to: 'authenticated',
    using: sql`firm_id = (auth.jwt() ->> 'app_metadata')::jsonb ->> 'firm_id'`,
  }),
  pgPolicy('firm_isolation_insert', {
    for: 'insert',
    to: 'authenticated',
    withCheck: sql`firm_id = (auth.jwt() ->> 'app_metadata')::jsonb ->> 'firm_id'`,
  }),
]);
```

**Key detail:** `auth.jwt()` is the Postgres function that reads the current session JWT. The custom access token hook (see Pattern 4) injects `firm_id` into `app_metadata` so it is accessible in RLS policies.

### Pattern 3: Supabase SSR Auth in Next.js App Router

**What:** Two utility files create the Supabase client for browser vs. server. A `middleware.ts` at the project root refreshes tokens and guards `/app/*` routes.

**When to use:** Frontend auth — the middleware runs on every request to protected pages.

```typescript
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
// apps/j16z-frontend/middleware.ts

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith('/app')) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users away from /login to /app/inbox
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/app/inbox', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

### Pattern 4: Custom Access Token Hook for firm_id JWT Injection

**What:** A Postgres function that Supabase calls before issuing every JWT. It looks up the user's firm and injects `firm_id` into `app_metadata`.

**When to use:** Required for RLS policies to access `firm_id` from the JWT without extra DB queries per request.

```sql
-- Source: https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook
-- Run as a migration or Supabase SQL editor

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
as $$
declare
  claims jsonb;
  firm_id text;
begin
  -- Look up the user's firm membership
  select fm.firm_id::text into firm_id
  from public.firm_members fm
  where fm.user_id = (event->>'user_id')::uuid
  limit 1;

  claims := event->'claims';

  if firm_id is not null then
    claims := jsonb_set(claims, '{app_metadata,firm_id}', to_jsonb(firm_id));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Grant required permissions
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
```

Register in Supabase Dashboard: Authentication > Hooks > Custom Access Token Hook.

### Pattern 5: Magic Link Auth Callback Route

**What:** A Next.js Route Handler at `/auth/confirm` receives the `token_hash` from the email link and exchanges it for a session cookie.

**When to use:** Required for magic link and email confirmation flows.

```typescript
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
// apps/j16z-frontend/src/app/auth/confirm/route.ts

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/app/inbox';

  if (token_hash && type) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options));
          },
        },
      },
    );

    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      // First-time user (no firm yet) → onboarding; returning user → inbox
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
}
```

**Supabase email template config:** Change the magic link URL template from `{{ .ConfirmationURL }}` to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.

### Pattern 6: BullMQ + Upstash Redis Connection

**What:** A shared Redis connection module that both the Queue (enqueue side, in Hono) and Worker (consume side, in a separate process) import.

**When to use:** Job enqueueing in API routes; worker process started separately.

```typescript
// Source: https://upstash.com/docs/redis/integrations/bullmq
// apps/api/src/queues/connection.ts

import { ConnectionOptions } from 'bullmq';

export const redisConnection: ConnectionOptions = {
  host: process.env.UPSTASH_REDIS_HOST!,
  port: 6379,
  password: process.env.UPSTASH_REDIS_PASSWORD!,
  tls: {},
};

// apps/api/src/queues/ingestion.ts
import { Queue } from 'bullmq';
import { redisConnection } from './connection';

export const ingestionQueue = new Queue('ingestion', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
});
```

**Cost note:** BullMQ polls Redis continuously even when idle. Use Upstash's Fixed plan (not Pay-as-you-go) to avoid surprise charges during development.

### Pattern 7: Two Drizzle Clients (RLS vs. Admin)

**What:** Two separate Drizzle instances — one for user-facing queries (respects RLS), one for admin/webhook/seed operations (bypasses RLS with service role).

```typescript
// Source: https://makerkit.dev/docs/next-supabase-turbo/recipes/drizzle-supabase
// apps/api/src/db/index.ts

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// User-facing client — respects RLS. Pass user's JWT via set_config before queries.
const userSql = postgres(process.env.DATABASE_URL!, { prepare: false });
export const db = drizzle(userSql, { schema });

// Admin client — bypasses RLS. Use only in webhooks, seed scripts, and background jobs.
const adminSql = postgres(process.env.SUPABASE_DB_URL_SERVICE_ROLE!, { prepare: false });
export const adminDb = drizzle(adminSql, { schema });
```

**Critical:** `prepare: false` is required when using Supabase's connection pooler in Transaction mode.

### Anti-Patterns to Avoid

- **Using service role key in user-facing routes:** Bypasses RLS entirely. Only use `adminDb` in admin-only and background job paths.
- **Relying on `auth.uid()` alone for firm isolation:** `auth.uid()` only gives the user ID, not the firm. Must use the custom access token hook to inject `firm_id` into the JWT and reference `app_metadata.firm_id` in RLS policies.
- **Calling `auth.uid()` or `auth.jwt()` multiple times in one RLS policy:** Postgres evaluates these per-row without caching. Wrap in a subquery `(select auth.uid())` to evaluate once per statement.
- **Running `SET LOCAL ROLE` outside a transaction:** PostgreSQL's `set_config` for JWT context only persists within a transaction. Without the transaction wrapper, RLS policies see an anonymous user.
- **Putting BullMQ workers in the Next.js app:** Workers need a persistent process. They must live in `apps/api/` or a separate entry point, hosted on Railway/Render, not Vercel.
- **Using spinners instead of skeleton loading:** Locked decision — all data-fetching states use shimmer skeleton placeholders matching the layout shape.
- **Storing the Supabase anon key in the Hono API:** The API should use the service role key for admin operations and verify the user's JWT independently. Never expose the anon key server-to-server.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT verification | Custom RS256 decode + verify | `jose` + `createRemoteJWKSet` | Key rotation, algorithm support, timing-safe comparison |
| Session management in Next.js | Custom cookie logic | `@supabase/ssr` + `createServerClient` | Handles token refresh, cookie sync across server/client components |
| SQL migrations | Hand-written migration SQL files | `drizzle-kit generate` + `drizzle-kit migrate` | Schema snapshots, safe diff generation, replay order |
| Email delivery for magic links | SMTP server | Supabase built-in auth email | Handles OTP lifecycle, templates, delivery tracking |
| Invite system | Custom invite token table | Supabase `inviteUserByEmail()` admin API | Built-in token, expiry, and delivery |
| Background job retry/backoff | Custom queue implementation | BullMQ | Rate limiting, exponential backoff, dead letter queues, concurrency |
| Multi-tenant query scoping | Application-level WHERE clauses | Supabase RLS + Drizzle pgPolicy | Cannot be bypassed by application code bugs; enforced at DB layer |

**Key insight:** The Supabase RLS + custom access token hook combination enforces multi-tenant isolation at the database layer. Application-level WHERE `firm_id = ?` clauses are insufficient — a bug in one route exposes all firm data. DB-layer enforcement is the correct architecture for a SaaS handling sensitive financial data.

---

## Common Pitfalls

### Pitfall 1: Custom Access Token Hook Not Registered

**What goes wrong:** RLS policies reference `firm_id` from `app_metadata` but the claim is never present in JWTs — all multi-tenant queries return zero rows silently (RLS default-deny).

**Why it happens:** The hook must be manually registered in the Supabase Dashboard under Authentication > Hooks. It is not enabled by creating the Postgres function alone.

**How to avoid:** After writing the hook migration, verify the hook is active by decoding a test JWT (use `jwt.io`) and confirming `app_metadata.firm_id` is present.

**Warning signs:** All queries return empty arrays even with a valid session; no 403 errors (RLS silently excludes rows, never errors).

### Pitfall 2: Middleware Running on API Routes and Static Files

**What goes wrong:** `middleware.ts` intercepts `/_next/static/*` or `/api/*` and triggers a Supabase auth check for every static asset fetch, causing 10x overhead.

**Why it happens:** The default middleware matcher `'/:path*'` matches everything.

**How to avoid:** Use the explicit negative matcher:
```typescript
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

### Pitfall 3: Magic Link Returns Fragment-Based Token (Not Token Hash)

**What goes wrong:** Default Supabase magic link email template uses `{{ .ConfirmationURL }}` which puts the token in the URL fragment (`#access_token=...`). Fragments are not sent to the server, so the Next.js Route Handler receives nothing.

**Why it happens:** Fragment-based tokens are a legacy pattern for client-side single-page apps. Server-side Next.js cannot read fragments.

**How to avoid:** Change the Supabase email template to use `token_hash` as a query parameter:
`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`

**Warning signs:** The `/auth/confirm` route receives a request with no `token_hash` in `searchParams`; the auth exchange fails silently.

### Pitfall 4: Connection Pooler Breaking Prepared Statements

**What goes wrong:** Drizzle throws `prepared statement "..." already exists` errors in production because Supabase's Transaction pool mode doesn't support prepared statements.

**Why it happens:** Supabase uses PgBouncer in Transaction mode. Prepared statements are connection-scoped; the pooler reuses connections across requests.

**How to avoid:** Always pass `{ prepare: false }` to the `postgres()` driver when using Supabase's pooled connection string (the one with port `6543`).

**Note:** Use the direct connection string (port `5432`, no pooler) for `drizzle-kit` migrations; use the pooled string (port `6543`) for the running application.

### Pitfall 5: BullMQ Worker Process Not Separated from API Server

**What goes wrong:** Importing BullMQ workers in the main Hono server entry point causes all ingestion workers to spin up inside the API process, consuming memory and competing with request handling.

**Why it happens:** The Queue and Worker classes are often imported in the same file during development.

**How to avoid:** Keep `Queue` (enqueue only) in the API. Workers live in a separate entry point (`apps/api/src/worker.ts`) started by a separate `pnpm worker` script and deployed as a separate process.

### Pitfall 6: Supabase Invite Emails Going to Spam

**What goes wrong:** `inviteUserByEmail()` sends from Supabase's default SMTP domain, which many corporate mail filters reject or send to spam.

**Why it happens:** Supabase's default email uses a shared sending domain. Institutional finance clients have aggressive spam filtering.

**How to avoid:** Configure a custom SMTP provider (Resend, Postmark) in Supabase dashboard before sending invites to real pilot clients. Can defer to post-Phase 1 but document as a deployment prerequisite.

### Pitfall 7: Soft Delete Leaking to UI (Showing Deleted Records)

**What goes wrong:** Queries forget to add `where(isNull(schema.deals.deletedAt))` and deleted deals reappear.

**Why it happens:** Soft deletes require explicit filter on every query. There is no automatic exclusion.

**How to avoid:** Create a Drizzle query helper or an RLS policy that excludes `deleted_at IS NOT NULL` rows, or add a DB-level RLS policy for `select` that enforces `deleted_at IS NULL`. In application code, use a shared query builder function rather than raw `db.select().from(...)` everywhere.

---

## Code Examples

### Hono App Entry Point

```typescript
// Source: https://hono.dev/docs/getting-started/nodejs
// apps/api/src/index.ts

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authMiddleware } from './middleware/auth';
import { dealsRoutes } from './routes/deals';

const app = new Hono();

app.use(logger());
app.use('/*', cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  credentials: true,
}));

app.get('/health', (c) => c.json({ status: 'ok' }));

// All /api/* routes require auth
const api = app.basePath('/api');
api.use('/*', authMiddleware);
api.route('/deals', dealsRoutes);

serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 3001) }, (info) => {
  console.log(`API running on port ${info.port}`);
});

export type AppType = typeof app;
```

### Cross-Tenant Isolation Vitest Test

```typescript
// Source: Vitest docs + Supabase testing guide
// apps/api/src/tests/cross-tenant.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const API_URL = process.env.API_URL ?? 'http://localhost:3001';

describe('Cross-tenant isolation (AUTH-06 CI gate)', () => {
  let firmAUserId: string;
  let firmBUserId: string;
  let firmAJwt: string;
  let firmBJwt: string;
  let firmADealId: string;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  beforeAll(async () => {
    // Create two users in separate firms via admin client
    // ... setup code creates firm A + user A, firm B + user B
    // ... firmAJwt and firmBJwt obtained via signInWithPassword
    // ... firmADealId inserted via API as Firm A user
  });

  afterAll(async () => {
    // Clean up test users and firms
  });

  it('Firm B cannot see Firm A deals via GET /api/deals', async () => {
    const response = await fetch(`${API_URL}/api/deals`, {
      headers: { Authorization: `Bearer ${firmBJwt}` },
    });
    const deals = await response.json();
    const firmADeal = deals.find((d: any) => d.id === firmADealId);
    expect(firmADeal).toBeUndefined();
  });

  it('Firm B cannot fetch Firm A deal directly by ID', async () => {
    const response = await fetch(`${API_URL}/api/deals/${firmADealId}`, {
      headers: { Authorization: `Bearer ${firmBJwt}` },
    });
    expect(response.status).toBe(404);
  });
});
```

**CI gate configuration:** Add this test to a `vitest.workspace.ts` project marked as `isolationTest`. Fail CI if this test is skipped or errored.

### Drizzle Migration Workflow

```bash
# Generate migration from schema changes
cd apps/api
pnpm drizzle-kit generate

# Apply to Supabase (uses direct connection, NOT pooled)
DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres" pnpm drizzle-kit migrate

# Seed starter data
pnpm tsx src/db/seed.ts
```

### Frontend api.ts Update (BACK-04)

The existing `api.ts` in `apps/j16z-frontend/src/lib/api.ts` already has the mock/real toggle. The real-mode paths need:
1. A base URL: `const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';`
2. A JWT getter that reads the Supabase session cookie: import `createBrowserClient` and call `supabase.auth.getSession()` to get the access token.
3. An `authFetch` wrapper that injects `Authorization: Bearer <token>` on every real-mode request.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Magic link via URL fragment (`#access_token`) | `token_hash` as query parameter | Supabase SSR package ~2023 | Server-side frameworks can now handle magic link exchange |
| Prisma as default TS ORM | Drizzle ORM becoming the standard | 2023-2024 | Schema-as-code, zero query engine, better RLS support |
| `jsonwebtoken` for JWT | `jose` (Web Crypto API) | 2022-2023 | Runtime-agnostic; works on edge/Node/Deno |
| `pages/api/` auth routes | App Router `route.ts` handlers | Next.js 13+ | Colocated, typed route handlers; middleware-based guards |
| Supabase `auth-helpers-nextjs` | `@supabase/ssr` | 2023-2024 | Unified SSR package replacing the old helpers package |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Replaced by `@supabase/ssr`. The old package still works but is not maintained.
- `pages/middleware.ts` pattern for auth: Still functional but App Router patterns are current.
- `next-auth` with Supabase adapter: Unnecessary — `@supabase/ssr` handles session management natively.

---

## Open Questions

1. **Hosting target for `apps/api/` and BullMQ workers**
   - What we know: Vercel is incompatible with BullMQ workers (serverless, no persistent process). Railway and Render both support persistent Node.js processes.
   - What's unclear: Whether the frontend (Vercel) and API (Railway/Render) will need CORS configuration beyond the basics; cost implications for Phase 1 (workers idle during Phase 1 but need to be running).
   - Recommendation: Commit to Railway for both API and workers in Phase 1. It supports pnpm monorepos natively, has a free tier, and the `railway.toml` config is minimal. Revisit if scale demands it.
   - **This is the most important unresolved decision from STATE.md and must be resolved before Plan 01-02.**

2. **RLS Policy for firm_id on the Hono API side vs. DB side only**
   - What we know: Supabase RLS enforces isolation at the DB layer. The Hono API additionally extracts `firm_id` from the JWT for explicit use in application logic (auditing, scoping BullMQ jobs).
   - What's unclear: Whether the API should also add application-level `where firm_id = ?` clauses as defense-in-depth, or rely entirely on RLS.
   - Recommendation: Add application-level scoping in Hono routes as defense-in-depth. Belt-and-suspenders is appropriate for financial data. The RLS is the hard gate; the app-level scope prevents accidental cross-tenant queries in code paths that bypass RLS (e.g., when using `adminDb`).

3. **Onboarding flow scope for Phase 1**
   - What we know: After magic link click, first-time users see an onboarding flow to name their firm. The decision says "fast — firm name + land in populated app."
   - What's unclear: Whether the onboarding flow is a simple 1-screen form (firm name → submit → /app/inbox) or needs additional steps (invite teammates, configure alert defaults).
   - Recommendation: Phase 1 scope = 1-screen onboarding: firm name input, submit, create firm, insert seed deals, redirect to /app/inbox. Invite and alert config can appear as inline prompts from /app/inbox in a later phase.

4. **Seed data insertion strategy (per-firm vs. global)**
   - What we know: Every new firm gets pre-populated starter deals. Deals have `is_starter = true`. Users can soft-delete them.
   - What's unclear: Whether seed deals are globally shared records (read-only) or per-firm copies inserted on firm creation.
   - Recommendation: Per-firm copies inserted at firm creation time. This is simpler to reason about with RLS (firm_id is set), allows each firm to independently delete/restore their starters without affecting others, and avoids complex shared-record RLS exceptions.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.2 (already in monorepo root `package.json`) |
| Config file | None yet — `vitest.workspace.ts` needed at monorepo root |
| Quick run command | `pnpm test:be` (runs `vitest --project=j16z-backend`) |
| Full suite command | `pnpm test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BACK-01 | API server starts and returns 200 from `/health` | smoke | `pnpm test:be --reporter=verbose` | ❌ Wave 0 |
| BACK-02 | Schema tables exist in Postgres (verify via introspection or drizzle-kit check) | integration | `pnpm test:be` | ❌ Wave 0 |
| BACK-03 | RLS policies defined in schema (static assertion on pgPolicy presence) | unit | `pnpm test:be` | ❌ Wave 0 |
| BACK-04 | `NEXT_PUBLIC_USE_MOCK_DATA=false` — GET /api/deals returns `[]` (not mock data) | integration | `pnpm test:be` | ❌ Wave 0 |
| BACK-05 | BullMQ Queue can enqueue a job; Upstash connection succeeds | integration | `pnpm test:be` | ❌ Wave 0 |
| AUTH-01 | Signup flow creates a user in Supabase auth.users | manual-only | N/A | — |
| AUTH-02 | Magic link email arrives and `/auth/confirm` route exchanges token | manual-only | N/A | — |
| AUTH-03 | Session cookie persists across simulated browser refresh (middleware reads cookie) | integration | `pnpm test:be` | ❌ Wave 0 |
| AUTH-04 | `signOut()` clears session and redirects to /login | manual-only | N/A | — |
| AUTH-05 | User's deals query only returns deals with matching firm_id | integration | `pnpm test:be` | ❌ Wave 0 |
| AUTH-06 | Firm A JWT cannot see Firm B deals or events | integration (CI GATE) | `pnpm test:be --project=isolation` | ❌ Wave 0 |

**Note on manual-only tests:** AUTH-01, AUTH-02, AUTH-04 depend on email delivery and real browser interaction. They are acceptance criteria verified manually against a running Supabase project, not automated in CI. AUTH-06 (the CI gate) is automated because it only requires two Supabase service-role clients and a running API — no email delivery needed.

### Sampling Rate

- **Per task commit:** `pnpm test:be --reporter=verbose` (runs all backend tests)
- **Per wave merge:** `pnpm test` (all projects)
- **Phase gate (AUTH-06 blocking):** `pnpm test:be --project=isolation` must be green before Phase 1 is marked complete

### Wave 0 Gaps

- [ ] `vitest.workspace.ts` — monorepo-level workspace config with `j16z-backend` and `isolation` projects
- [ ] `apps/api/src/tests/cross-tenant.test.ts` — AUTH-06 isolation test (the CI gate)
- [ ] `apps/api/src/tests/health.test.ts` — BACK-01 smoke test
- [ ] `apps/api/src/tests/db-schema.test.ts` — BACK-02/03 schema existence checks
- [ ] `apps/api/src/tests/queue.test.ts` — BACK-05 BullMQ connection test
- [ ] `apps/api/vitest.config.ts` — per-package vitest config pointing to test files

---

## Sources

### Primary (HIGH confidence)

- [Hono Node.js docs](https://hono.dev/docs/getting-started/nodejs) — serve() pattern, Node.js version requirements, @hono/node-server adapter
- [Supabase SSR Next.js docs](https://supabase.com/docs/guides/auth/server-side/nextjs) — middleware.ts pattern, cookie management, server/browser client split
- [Drizzle ORM + Supabase setup](https://orm.drizzle.team/docs/get-started/supabase-new) — connection setup, drizzle.config.ts, postgres() driver
- [Drizzle RLS docs](https://orm.drizzle.team/docs/rls) — pgPolicy API, pgTable.withRLS(), provider-specific roles
- [Supabase Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) — Postgres function signature, permissions, app_metadata claims
- [Upstash BullMQ integration](https://upstash.com/docs/redis/integrations/bullmq) — TLS connection config, Queue setup
- [Hono Zod validator](https://hono.dev/docs/guides/validation) — @hono/zod-validator usage pattern
- [Supabase inviteUserByEmail](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail) — invite link API for team onboarding

### Secondary (MEDIUM confidence)

- [Makerkit: Drizzle + Supabase dual clients](https://makerkit.dev/docs/next-supabase-turbo/recipes/drizzle-supabase) — admin vs. user client pattern verified against official Supabase RLS docs
- [DEV: Testing Supabase RLS](https://dev.to/davepar/testing-supabase-row-level-security-4h32) — vitest integration test pattern for RLS; cross-verified with Supabase testing docs
- [Supabase testing overview](https://supabase.com/docs/guides/local-development/testing/overview) — test infrastructure guidance
- [Basejump: magic links + Next.js middleware](https://usebasejump.com/blog/supabase-oauth-with-nextjs-middleware) — token_hash route pattern cross-verified with Supabase official docs

### Tertiary (LOW confidence — flag for validation)

- BullMQ Vercel incompatibility claim: sourced from multiple community posts + Syntax.fm video; not from official Vercel/BullMQ docs. **Validate:** Try deploying a BullMQ worker to Vercel; confirm it fails due to function timeout/no persistent process.
- Railway as hosting choice: community recommendation pattern; no head-to-head benchmark vs. Render for this stack. **Validate:** Confirm Railway supports pnpm v10 workspace monorepos natively before committing.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all core libraries verified against official docs and are stable, widely-used packages
- Architecture: HIGH — patterns sourced from official Supabase SSR docs, Drizzle RLS docs, Hono Node.js docs
- Cross-tenant CI test strategy: MEDIUM — integration test pattern sourced from community + Supabase testing overview; specific vitest-with-Supabase pattern has known complexity (sequential test requirement, service-role client setup)
- Pitfalls: HIGH — each pitfall cross-referenced against official documentation or multiple community sources
- Deployment hosting (Railway): LOW — based on community consensus, not official benchmarks

**Research date:** 2026-02-26
**Valid until:** 2026-03-26 (stable libraries; Supabase auth docs change less frequently than edge library docs)
