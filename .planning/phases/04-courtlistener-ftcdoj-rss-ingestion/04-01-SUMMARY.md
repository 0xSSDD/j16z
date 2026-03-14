---
phase: 04-courtlistener-ftcdoj-rss-ingestion
plan: 01
subsystem: api
tags: [courtlistener, bullmq, webhooks, hono, drizzle, zod, ingestion]

# Dependency graph
requires:
  - phase: 02-sec-edgar-ingestion
    provides: BullMQ worker pattern, agency/event-factory.ts, scheduler.ts with upsertJobScheduler, ingestion queue
  - phase: 03-llm-extraction-pipeline
    provides: DB schema (events table, metadata jsonb), adminDb service-role client
provides:
  - CourtListener v4 docket search and polling for merger-related cases
  - v4 docket-alert subscription creation (POST /api/rest/v4/docket-alerts/)
  - COURT event creation with materiality scores (injunction=90, complaint=85, motion=70, entry=50)
  - Webhook endpoint POST /api/webhooks/courtlistener with IP allowlist and idempotency dedup
  - handleCourtListenerPoll and handleCourtListenerWebhook BullMQ job handlers
  - courtlistener_poll cron schedule (every 30 minutes)
affects:
  - 04-02 (FTC/DOJ ingestion — same ingestion queue/worker pattern)
  - 04-03 (RSS ingestion — same pattern)
  - Phase 5 alerts (COURT events feed alert rules)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "courtlistener/ directory mirrors agency/ pattern: types.ts, event-factory.ts, poller.ts, webhook.ts"
    - "Webhook route registered on root app BEFORE basePath/authMiddleware to avoid 401 auto-disable"
    - "IP allowlist (Set<string>) for validating CourtListener push origin IPs"
    - "Idempotency-Key header dedup against events.metadata->>'idempotencyKey'"
    - "sourceGuid pattern cl:entry:{id} for docket entry dedup (mirrors agency sourceGuid)"
    - "inferSubTypeFromDescription: keyword-matching description text for INJUNCTION/COMPLAINT/MOTION/DOCKET_ENTRY"

key-files:
  created:
    - apps/api/src/courtlistener/types.ts
    - apps/api/src/courtlistener/event-factory.ts
    - apps/api/src/courtlistener/poller.ts
    - apps/api/src/courtlistener/webhook.ts
    - apps/api/src/routes/webhooks.ts
  modified:
    - apps/api/src/routes/index.ts
    - apps/api/src/index.ts
    - apps/api/src/queues/scheduler.ts
    - apps/api/src/worker.ts

key-decisions:
  - "Webhook route registered on root Hono app before api.basePath('/api') — CourtListener auto-disables webhooks that return 401 after 7 retries"
  - "v4 endpoints used exclusively: /api/rest/v4/search/, /api/rest/v4/docket-alerts/, /api/rest/v4/docket-entries/ — v3 is deprecated"
  - "IP allowlist uses COURTLISTENER_IPS Set (34.210.230.218, 54.189.59.91) for origin validation"
  - "Async processing via BullMQ — HTTP route enqueues immediately and returns 200; CourtListener has short response timeout"
  - "courtlistener_poll reuses updateIngestionStatus from agency/event-factory.ts (not duplicated)"
  - "CASE_DISCOVERED events created on first subscription — stores courtlistenerDocketId in metadata for later webhook→deal lookup"
  - "Severity threshold >=70 CRITICAL (not >70) — matches CLAUDE.md spec and existing TypeScript behavior"

patterns-established:
  - "External webhook integration pattern: IP allowlist → idempotency dedup → schema validate → enqueue → return 200"
  - "sourceGuid dedup pattern for all COURT events: cl:entry:{entry.id}"
  - "Deal-docket association via events.metadata->>courtlistenerDocketId (no separate subscription table needed)"

requirements-completed: [COURT-01, COURT-02, COURT-03, COURT-05]

# Metrics
duration: 4min
completed: 2026-03-13
---

# Phase 04 Plan 01: CourtListener Integration Summary

**CourtListener v4 webhook push + polling integration: IP-verified endpoint enqueues docket-alert payloads for async COURT event creation with injunction/complaint/motion materiality scoring**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-13T06:16:31Z
- **Completed:** 2026-03-13T06:20:00Z
- **Tasks:** 2
- **Files modified:** 9 (5 created, 4 modified)

## Accomplishments
- Full CourtListener v4 polling: searches for merger-related dockets by deal target/acquirer, subscribes via /api/rest/v4/docket-alerts/, creates CASE_DISCOVERED events
- Webhook endpoint POST /api/webhooks/courtlistener with IP allowlist (CourtListener's two documented IPs), Idempotency-Key dedup, schema validation, and BullMQ async enqueue
- COURT materiality scoring: INJUNCTION=90, COMPLAINT=85, MOTION=70, CASE_DISCOVERED/DOCKET_ENTRY=50; severity >=70 CRITICAL
- Worker and scheduler wired: courtlistener_poll (every 30 min) + courtlistener_webhook handlers registered in handlers registry

## Task Commits

Each task was committed atomically:

1. **Task 1: CourtListener types, event factory, and poller** - `0f4cf28` (feat)
2. **Task 2: Webhook endpoint, scheduler, and worker wiring** - `5ffc2fd` (feat)

**Plan metadata:** (docs commit after SUMMARY creation)

## Files Created/Modified
- `apps/api/src/courtlistener/types.ts` — Zod schemas for CourtListener v4 API + COURTLISTENER_API_BASE/COURTLISTENER_IPS constants
- `apps/api/src/courtlistener/event-factory.ts` — createCourtEvent, getCourtMaterialityScore, getCourtSeverity
- `apps/api/src/courtlistener/poller.ts` — handleCourtListenerPoll: deal search, v4 docket-alert subscription, entry dedup
- `apps/api/src/courtlistener/webhook.ts` — handleCourtListenerWebhook: BullMQ job handler for async webhook processing
- `apps/api/src/routes/webhooks.ts` — Hono router POST /courtlistener with IP allowlist, idempotency, BullMQ enqueue
- `apps/api/src/routes/index.ts` — Added webhooks export to apiRoutes
- `apps/api/src/index.ts` — Registered app.route('/api/webhooks', apiRoutes.webhooks) before basePath/authMiddleware
- `apps/api/src/queues/scheduler.ts` — Added courtlistener_poll to SCHEDULE_CONFIG + upsertJobScheduler call
- `apps/api/src/worker.ts` — Imported and registered courtlistener_poll + courtlistener_webhook handlers

## Decisions Made
- Webhook route registered on root Hono app before `api.basePath('/api')` so CourtListener is never blocked by authMiddleware (CourtListener auto-disables after 7 failed attempts)
- v4 endpoints used exclusively — `/api/rest/v4/docket-alerts/` not the deprecated v3 path
- IP allowlist validation using `COURTLISTENER_IPS` Set (34.210.230.218, 54.189.59.91)
- Reused `updateIngestionStatus` from `agency/event-factory.ts` — no duplication
- CASE_DISCOVERED event metadata stores `courtlistenerDocketId` enabling webhook handler to look up the associated deal without a separate subscription table
- Severity threshold >= 70 for CRITICAL (consistent with CLAUDE.md spec and existing TypeScript severity-scoring.ts)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
None — TypeScript compiled clean on first run for both tasks.

## User Setup Required

**External service requires API token configuration.**

- `COURTLISTENER_API_TOKEN` — CourtListener account → Profile → API Key (https://www.courtlistener.com/profile/)
- `CRON_COURTLISTENER_POLL` — optional override for poll interval (default: `*/30 * * * *`)

Webhook endpoint `POST /api/webhooks/courtlistener` must be registered in CourtListener dashboard under Alerts → Webhooks with the deployed API URL.

## Next Phase Readiness
- CourtListener integration fully wired; poller and webhook handler ready to activate once `COURTLISTENER_API_TOKEN` is set
- Pattern established for Phase 04-02 (FTC/DOJ) and 04-03 (RSS) — same worker/queue/scheduler structure
- COURT events feed into alert rules (Phase 5) via events table with materiality scores

---
*Phase: 04-courtlistener-ftcdoj-rss-ingestion*
*Completed: 2026-03-13*
