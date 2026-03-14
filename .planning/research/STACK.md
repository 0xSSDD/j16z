# Stack Research

**Domain:** M&A Intelligence Backend — LLM extraction pipeline, data ingestion, real-time alerting
**Researched:** 2026-02-25
**Confidence:** MEDIUM-HIGH (versions verified via npm search; framework rationale verified via official docs + multiple sources)

---

## Context: What's Locked vs. What's Being Decided

**Locked (frontend, do not change):**
- Next.js 16, React 19, Tailwind v4, shadcn/ui
- pnpm monorepo at root
- Supabase for auth (SDK already installed: `@supabase/supabase-js` 2.87.1)
- `@google/genai` 1.33.0 already installed (planned for LLM; see LLM section)
- Node.js 22.12.0, TypeScript strict mode

**Being decided here (backend + pipeline):**
- Backend API framework (Node service in `apps/api/`)
- ORM for the Supabase Postgres database
- Job queue / scheduler for data ingestion
- LLM orchestration for document extraction (LangExtract)
- Email delivery for digests and alerts
- RSS / feed parsing
- External data source clients (SEC EDGAR, CourtListener, FTC/DOJ)
- Vector storage (if needed for semantic search on filings)
- Redis (if needed for BullMQ)

---

## Recommended Stack

### Core Backend Framework

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Hono** | 4.12.x | HTTP API server in `apps/api/` | Lightweight (~12kB), TypeScript-first, zero dependencies, Web Standards API so it's portable across Node/Deno/Cloudflare Workers. 3x more throughput than Express at 40% less memory. Identical patterns to FastAPI: routes, middleware, validators. First-class monorepo fit — just another pnpm workspace. |
| **`@hono/node-server`** | latest | Node.js adapter for Hono | Required to run Hono on Node.js. Separates the framework from the runtime — swap to Cloudflare Workers later without rewriting routes. |
| **Zod** | 4.x | Request validation + schema inference | Already in the frontend; reuse same schemas in the backend via a shared `packages/types` workspace. Hono's official validator middleware accepts Zod schemas natively. |

**Why NOT FastAPI (Python):** The frontend is TypeScript, the types are TypeScript, the monorepo is pnpm/Node. A Python microservice introduces a language boundary that requires duplicating the domain type system. FastAPI would make sense only if the LLM pipeline logic were deeply Python-first (e.g., heavy ML dependencies); for this project all LLM calls are via HTTP APIs, so the language-boundary cost is not justified.

**Why NOT Express:** 10-year-old API surface, no TypeScript-first design, significant performance gap vs Hono (benchmarks 2025: Hono > 3x Express throughput). Express has no built-in validator middleware.

**Why NOT NestJS:** Heavyweight decorators, large bundle, high cognitive overhead for a small-team MVP. Hono routes are simpler and just as structured when organised properly.

---

### Database & ORM

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Supabase PostgreSQL** | managed | Relational data store — deals, events, filings, users | Already chosen for auth; using it as the primary DB avoids a separate managed Postgres. RLS policies provide multi-tenant isolation per team. |
| **Drizzle ORM** | 0.45.x | Type-safe SQL query builder + migrations | ~7kB bundle, zero binary dependencies, serverless-safe (no Rust engine binary). Schema defined in TypeScript not a DSL, so diffs are PR-reviewable. 2025/2026 community consensus: Drizzle has displaced Prisma as the preferred ORM for serverless/edge-aware TypeScript projects. Supabase officially documents Drizzle as a first-class client. |
| **`drizzle-kit`** | matching | Migration generation + Drizzle Studio | Same package family. Run `drizzle-kit generate` to diff schema, `drizzle-kit migrate` to apply. Drizzle Studio gives a local table browser. |
| **`postgres`** (npm) | 3.x | Low-level Postgres wire driver | Drizzle uses this under the hood for connection to Supabase via connection string. More performant than `pg` for the use case; supports prepared statements and pipelining. |

**Why NOT Prisma:** Prisma 6.x still has the binary engine story (Prisma 7 removed it in late 2025, but adoption is early). Drizzle generates SQL you can read and audit — important for a regulated-data product. Drizzle's type inference is faster at type-check time than Prisma's codegen approach.

**pgvector (Supabase native):** For the optional embeddings use case (semantic search over filing text), pgvector is built into Supabase. No separate vector DB needed for MVP scale. Use pgvector if/when the filing corpus grows to a point where keyword search is insufficient. Defer Qdrant or Pinecone until >10M embeddings or complex filtering requirements emerge.

---

### Job Queue / Scheduler

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **BullMQ** | 5.70.x | Job queue for data ingestion workers | Redis-backed, fully typed in TypeScript, 1.7M weekly downloads vs 110K for pg-boss. Supports cron schedules, priority queues, rate limiting, retries with backoff, job events. Ingestion jobs (EDGAR poll, CourtListener poll, FTC/DOJ RSS) map naturally to named queues. |
| **ioredis** | 5.9.x | Redis client (required by BullMQ) | BullMQ uses ioredis internally. TypeScript-native, supports Cluster + Sentinel. |
| **Redis** | 7.x (managed: Upstash) | Queue backend | Upstash Redis is the zero-infra option — pay per request, no Redis server to manage, native HTTPS API. Compatible with ioredis via `@upstash/redis` adapter or standard connection URL. Use Upstash for MVP, self-host or Redis Cloud for production scale. |

**Scheduler (cron triggers):** BullMQ has a native `repeat` option for cron jobs (`{ every: 15 * 60 * 1000 }` or cron string). No need for a separate `node-cron` or `node-schedule` package. One system for both one-off jobs and recurring ingestion.

**Why NOT Inngest:** Inngest is excellent for serverless (no persistent worker process), but the j16z backend will run as a persistent Node.js service in `apps/api/`. BullMQ + Redis is more operationally predictable and widely understood. Inngest would add a vendor dependency and external-event-invocation model that doesn't simplify the architecture here.

**Why NOT pg-boss:** PostgreSQL-backed queues are simpler operationally (no Redis), but pg-boss has 15x fewer downloads and less TypeScript coverage. BullMQ's rate limiting is critical for respecting SEC EDGAR's and CourtListener's API rate limits.

---

### LLM Orchestration (LangExtract)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **`@anthropic-ai/sdk`** | 0.78.x | Direct Claude API for document extraction | Claude 3.5 Sonnet: 200K context window (critical for long SEC filings), superior accuracy on legal clause extraction vs GPT-4o per benchmarks. Native structured outputs (public beta, stable for JSON schema enforcement). Claude's JSON mode tested more reliable than competitors for structured data extraction. |
| **`@langchain/core`** | 1.1.x | Orchestration primitives — chains, prompts, output parsers | LangChain 1.x (stable since Oct 2025). `.withStructuredOutput()` method enforces Zod schema at the API level. `PDFLoader` in `@langchain/community` handles SEC EDGAR PDF filings directly. Provides `RecursiveCharacterTextSplitter` for chunking long documents. Prevents re-inventing document loading and chain composition logic. |
| **`@langchain/anthropic`** | 1.x | LangChain provider adapter for Claude | Integrates Anthropic SDK into LangChain's chain abstraction. Use this rather than calling `@anthropic-ai/sdk` directly so LangExtract chains are swappable (can A/B test GPT-4o vs Claude). |
| **`@langchain/community`** | 1.1.x | Document loaders: PDF, HTML, RSS | `PDFLoader` (uses PDF.js) for EDGAR PDF filings. `CheerioWebBaseLoader` for HTML scraping of FTC/DOJ press releases and CourtListener pages. |

**LLM Model Choice:** Claude 3.5 Sonnet as default extraction model. The `@google/genai` SDK is already installed in the frontend (demo only). For backend production extraction, Claude's 200K context, legal document accuracy, and structured output reliability make it the better choice. Keep `@google/genai` as a fallback/cost option for lower-stakes summarization tasks if needed.

**Why NOT Vercel AI SDK:** Vercel AI SDK (`ai` package) is excellent for streaming UI responses (frontend). It's not the right tool for backend batch document extraction pipelines. Its bundle overhead (67.5kB vs 34kB for direct SDK) is a cost without benefit on the server. Use the Vercel AI SDK only if/when adding a real-time chat assistant to the frontend.

**Why NOT LlamaIndex JS:** LlamaIndex specializes in retrieval-augmented generation (RAG) over document corpora. For j16z MVP, the extraction task is structured output from individual filings — not similarity search over a large corpus. LangChain's `.withStructuredOutput()` + `PDFLoader` covers the MVP need. Revisit LlamaIndex when the vector search / semantic retrieval use case becomes primary.

**Zod schemas for extraction:** Every extraction output (clauses, deal terms, event summaries) should be defined as a Zod schema. LangChain's `.withStructuredOutput(zodSchema)` guarantees the LLM response conforms before it reaches the database. This is the pattern for production-safe extraction.

---

### Data Source Clients

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **SEC EDGAR (official API)** | — | Filings ingestion | `data.sec.gov` is a free, key-free REST API returning JSON. Full-text search via EFTS (`efts.sec.gov`). New filings indexed within 60 seconds. No third-party SDK needed — fetch with native `fetch` or `undici`. |
| **`sec-api`** (npm) | latest | Optional paid EDGAR wrapper | `sec-api.io` provides a paid JS SDK with convenience filtering and webhook-style polling. Evaluate for MVP only if the official API polling proves insufficient. The official SEC API is free and should be tried first. |
| **`@us-legal-tools/courtlistener-sdk`** | latest | CourtListener RECAP/docket access | Official-adjacent TypeScript SDK for CourtListener REST API v4. Supports case law, PACER dockets, docket alerts (webhooks). Rate limit: 5,000 req/day on free tier. |
| **FTC RSS + DOJ RSS** | — | Antitrust enforcement monitoring | Both agencies publish RSS feeds (FTC: `https://www.ftc.gov/rss`, DOJ ATR: `https://www.justice.gov/atr/press-releases`). No API key required. Parse with `rss-parser`. FTC also has an Early Termination Notices API endpoint. |
| **`rss-parser`** | 3.x | RSS/Atom feed parsing | Lightweight Node.js RSS parser, TypeScript generics for custom fields (`CustomFeed`, `CustomItem`). Handles FTC/DOJ feeds and curated law firm newsletters. Actively maintained. |

**CourtListener webhooks:** CourtListener supports webhook events for docket updates. For real-time litigation monitoring, register webhooks and have the Hono server receive them at `/webhooks/courtlistener`. This is more efficient than polling for active cases.

---

### Email (Alerts + Digests)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Resend** | 6.9.x | Transactional email: alerts and digests | Modern developer-first email API. React Email integration is seamless — email templates are `.tsx` files rendered with `@react-email/render`. TypeScript-native SDK, Edge runtime support, fast time-to-first-email. Generous free tier (3K emails/month). |
| **`react-email`** | 5.2.x | Email template system | JSX-based email templates with Tailwind 4 support (as of v5.0, Nov 2025). Matches the project's existing React + Tailwind stack. Dark mode support. Shared template components between daily and weekly digests. |
| **`@react-email/components`** | latest | Email UI primitives | Button, Text, Section, Link, etc. — the shadcn/ui equivalent for emails. |

**Why NOT Postmark:** Postmark's deliverability reputation is excellent, but the developer experience is notably inferior to Resend: no React Email integration, no Edge runtime support, and the API is more verbose. For a TypeScript/React-native team, Resend's DX advantage is significant. Switch to Postmark only if deliverability SLA requirements become enterprise-grade.

**Why NOT SendGrid / Mailgun:** These are marketing email tools first. Their transactional APIs are functional but clunky for developer-native workflows. Resend is purpose-built for transactional use from code.

---

### Slack Integration (Alerts)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **`@slack/webhook`** | 7.0.x | Incoming webhook for CRITICAL/WARNING alerts | Official Slack library. Dead simple for send-only notifications. TypeScript support via editor hints. CRITICAL events (score >70) fire immediately via webhook. |

For alert routing: Slack webhook URL stored per-team in the database (Settings > Integrations). The alert worker reads the URL, sends the formatted message. No OAuth complexity needed for the incoming webhook pattern.

---

### Supporting Infrastructure

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **`pino`** | 9.x | Structured logging | Fast JSON logger, low overhead, works in Node.js. Replaces ad-hoc `console.log`. `pino-pretty` for local development. Supports log levels (info, warn, error) and context fields (`dealId`, `jobId`, `source`). |
| **`@hono/zod-openapi`** | latest | OpenAPI 3.x spec generation | Generates OpenAPI docs from the same Zod schemas used for request validation. Required for the "Structured data feeds / API" feature in PROJECT.md. |
| **`tsx`** | latest | TypeScript execution for dev | Runs TypeScript directly in Node.js without a compile step. Replaces `ts-node`. Used in `pnpm dev` script for `apps/api/`. |

---

## Installation Commands (pnpm monorepo context)

```bash
# From the monorepo root, initialise the backend workspace
mkdir -p apps/api/src
cd apps/api

# Backend framework
pnpm add hono @hono/node-server @hono/zod-openapi

# Database
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit

# Job queue
pnpm add bullmq ioredis

# LLM orchestration
pnpm add @anthropic-ai/sdk @langchain/core @langchain/anthropic @langchain/community

# Data source clients
pnpm add rss-parser @us-legal-tools/courtlistener-sdk

# Email
pnpm add resend react-email @react-email/components

# Slack
pnpm add @slack/webhook

# Observability
pnpm add pino
pnpm add -D pino-pretty tsx

# Validation (shared; may already exist in workspace)
pnpm add zod
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not Alternative |
|-------------|-------------|---------------------|
| Hono | Express | 3x worse throughput, no TS-first design, old API surface |
| Hono | Fastify | Closer call; Hono wins on multi-runtime flexibility and smaller footprint. Fastify's validation plugin is more mature, but Zod fills that gap for Hono. |
| Hono | FastAPI (Python) | Language boundary requires duplicating the TypeScript domain model in Python. No benefit when LLM calls are all HTTP-based. |
| Drizzle ORM | Prisma | Prisma 7 removed the binary engine (late 2025) but ecosystem adoption is early. Drizzle's ~7kB bundle vs Prisma's larger footprint. Drizzle schema is plain TypeScript — no DSL to learn. |
| BullMQ + Redis | Inngest | Inngest optimises for serverless workers without persistent processes. j16z runs a persistent Node.js service, making BullMQ's in-process worker simpler. |
| BullMQ + Redis | pg-boss | pg-boss uses Postgres (already have it) but has 15x fewer downloads and weaker TypeScript support. BullMQ's rate limiting is critical for respecting API rate limits on EDGAR/CourtListener. |
| Claude (Anthropic) | GPT-4o (OpenAI) | GPT-4o 128K context vs Claude 200K — long SEC filings (S-4, DEFM14A) frequently exceed 128K tokens. Claude demonstrates higher accuracy on legal clause extraction benchmarks. |
| Claude (Anthropic) | @google/genai (Gemini) | Gemini 2.x is capable but Claude's structured output reliability and legal document accuracy is better documented. `@google/genai` is already installed as a fallback / cost-tier option. |
| LangChain.js | Direct SDK calls | Direct SDK saves bundle size but means reimplementing document loading, chunking, chain composition, and output parsing. LangChain 1.x is stable and the `.withStructuredOutput()` pattern is the production standard. |
| LangChain.js | LlamaIndex JS | LlamaIndex specialises in RAG over large corpora. MVP need is structured extraction from individual documents, not semantic retrieval. Revisit if vector search becomes primary. |
| Resend | Postmark | Postmark has better deliverability history but inferior React/TypeScript DX. No React Email integration, no Edge runtime support. |
| pgvector (Supabase) | Pinecone / Qdrant | pgvector lives inside the existing Supabase Postgres. No additional service to manage. Supabase benchmarks show pgvectorscale at 471 QPS (11x faster than Qdrant at the same recall on 50M vectors). Revisit standalone vector DB only at scale. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Express.js** | Abandoned for new projects in 2025 ecosystem. No built-in TS support, no validation, 10x boilerplate vs Hono. Performance gap is significant. | Hono |
| **NestJS** | Heavyweight framework with decorator-heavy DX. Large bundle, high learning curve, overengineered for a focused MVP API. | Hono with structured route modules |
| **Bull** (original) | Deprecated. Bull has been superseded by BullMQ from the same team. Bull v3 is no longer maintained. | BullMQ |
| **LangChain v0.x** | LangChain 0.3 is the legacy version. LangChain 1.x (stable since Oct 2025) has a cleaner API, smaller bundle, and LangGraph-first architecture. | `langchain` 1.x, `@langchain/core` 1.x |
| **`node-cron` / `node-schedule`** | Standalone cron packages don't integrate with job queues. When the cron job fails, there's no retry, no monitoring, no dead-letter queue. | BullMQ `repeat` option (cron built in) |
| **SendGrid / Mailgun** | Marketing email tooling grafted onto transactional use. Clunky API for code-native workflows. | Resend |
| **`ts-node`** | Slow startup, complex tsconfig integration. Deprecated for most use cases. | `tsx` |
| **Separate vector database for MVP** | Pinecone/Qdrant add operational complexity. pgvector in Supabase is sufficient at MVP scale and already bundled. | Supabase pgvector extension |

---

## Stack Patterns by Variant

**If deploying to Vercel (serverless):**
- Hono works on Vercel via the `@hono/vercel` adapter, but BullMQ requires a persistent Redis connection. Use Upstash Redis (HTTPS-compatible ioredis adapter) and Vercel Cron for scheduling triggers.
- Consider Inngest instead of BullMQ if the entire backend goes serverless.

**If self-hosting (VPS / container):**
- Standard Node.js with `@hono/node-server`, local Redis or Redis Cloud for BullMQ.
- `pino` → structured logs → log aggregator (e.g., Logtail, Axiom).

**If LLM costs become a concern:**
- Route low-materiality event summarization through Gemini Flash (`@google/genai` already installed) at lower cost.
- Route clause extraction and high-stakes events through Claude 3.5 Sonnet.
- LangChain's provider abstraction makes this swap a config change.

**If the filing corpus grows large (>100K documents):**
- Add `pgvector` index on filing embeddings for semantic search.
- Consider Qdrant for advanced metadata filtering (by deal, by filing type) at that scale.

---

## Version Compatibility Notes

| Package | Requires | Notes |
|---------|----------|-------|
| `langchain` 1.x | `@langchain/core` 1.x | Always install matching major versions. Core is the primitive layer; `langchain` re-exports from core. |
| `bullmq` 5.x | Redis 7.x (or Upstash) | BullMQ 5.x uses Redis Streams under the hood. Redis 6.x works but 7.x is recommended. |
| `drizzle-orm` 0.45.x | `drizzle-kit` 0.27.x | Drizzle ORM and drizzle-kit versions must be kept in sync (same minor version). |
| `react-email` 5.x | React 19, Tailwind 4 | v5.0 (Nov 2025) added explicit React 19 + Tailwind 4 support — matches the frontend stack. |
| `resend` 6.x | `react-email` for JSX templates | Use `@react-email/render` to convert JSX templates to HTML strings before calling `resend.emails.send()`. |
| `hono` 4.x | Node.js 20+ | `@hono/node-server` requires Node 20+. The monorepo is on Node 22.12.0 — no compatibility issues. |

---

## Sources

- Hono official docs `hono.dev/docs/` — framework overview, Node.js adapter, Zod validator middleware — MEDIUM-HIGH confidence
- WebSearch: "Hono vs Express vs Fastify 2025" (levelup.gitconnected.com) — performance benchmarks — MEDIUM confidence
- WebSearch: "Drizzle vs Prisma 2026" (bytebase.com, makerkit.dev) — ORM comparison — MEDIUM-HIGH confidence (multiple sources agree)
- WebSearch: "BullMQ latest version" — confirmed v5.70.1 (Feb 2026) — HIGH confidence
- WebSearch: "LangChain.js latest version" — confirmed v1.2.27 (`langchain`), `@langchain/core` 1.1.28 — HIGH confidence (npm confirmed)
- WebSearch: "Anthropic TypeScript SDK npm" — confirmed `@anthropic-ai/sdk` v0.78.0 — HIGH confidence
- WebSearch: "Claude vs GPT-4o legal extraction" (galileo.ai, invofox.com) — accuracy comparison — MEDIUM confidence
- WebSearch: "Resend vs Postmark 2025" (xmit.sh, zenblog.com) — email service comparison — MEDIUM confidence
- WebSearch: "react-email latest version" — confirmed 5.2.8, React 19 + Tailwind 4 support in v5.0 — HIGH confidence
- WebSearch: "drizzle-orm npm" — confirmed 0.45.1 — HIGH confidence
- WebSearch: "ioredis latest" — confirmed 5.9.3 — HIGH confidence
- WebSearch: "resend npm latest" — confirmed 6.9.2 — HIGH confidence
- WebSearch: "CourtListener API Node.js SDK" (npmjs.com) — `@us-legal-tools/courtlistener-sdk` confirmed — MEDIUM confidence
- WebSearch: "SEC EDGAR developer resources" (sec.gov/about/developer-resources) — official free API confirmed — HIGH confidence
- WebSearch: "pgvector vs Pinecone supabase 2025" (supabase.com/blog/pgvector-vs-pinecone) — performance benchmarks — MEDIUM-HIGH confidence
- WebSearch: "FTC RSS feeds DOJ antitrust press releases" (ftc.gov/rss, justice.gov/atr) — RSS feed availability confirmed — HIGH confidence

---

*Stack research for: j16z M&A Intelligence Backend*
*Researched: 2026-02-25*
