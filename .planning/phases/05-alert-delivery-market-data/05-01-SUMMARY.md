---
phase: 05-alert-delivery-market-data
plan: 01
subsystem: alerts
tags: [resend, slack-webhook, hmac, bullmq, drizzle, notification]

# Dependency graph
requires:
  - phase: 01-backend-foundation-auth
    provides: "schema.ts tables (alertRules, events, deals), worker.ts handler registry, adminDb"
  - phase: 04-courtlistener-ftcdoj-rss
    provides: "event factories that produce scored events for alert evaluation"
provides:
  - "notificationLog table for alert delivery tracking and dedup"
  - "webhookSecret column on alertRules for HMAC-SHA256 signing"
  - "exchangeRatio column on deals for STOCK/MIXED spread computation"
  - "handleAlertEvaluate BullMQ handler for alert evaluation"
  - "deliverEmail via Resend (CRITICAL events)"
  - "deliverSlack via @slack/webhook Block Kit (WARNING+ events)"
  - "deliverWebhook with HMAC-SHA256 signing and retry logic"
  - "AlertEvaluateData, DeliveryPayload, DeliveryResult types"
affects: [05-02-market-data, 05-03-frontend-alerts, alert-rules-api]

# Tech tracking
tech-stack:
  added: [resend, "@slack/webhook"]
  patterns: [notification-dedup-via-log, hmac-webhook-signing, severity-gated-channels]

key-files:
  created:
    - apps/api/src/alerts/types.ts
    - apps/api/src/alerts/alert-worker.ts
    - apps/api/src/alerts/email-delivery.ts
    - apps/api/src/alerts/slack-delivery.ts
    - apps/api/src/alerts/webhook-delivery.ts
    - apps/api/drizzle/0003_chemical_grim_reaper.sql
    - apps/api/src/tests/alert-worker.test.ts
  modified:
    - apps/api/src/db/schema.ts
    - apps/api/src/worker.ts
    - apps/api/package.json
    - apps/api/drizzle/meta/_journal.json

key-decisions:
  - "Resend SDK for email delivery -- ESM-native, simple API, good DX for transactional emails"
  - "@slack/webhook IncomingWebhook pattern (not OAuth app) for Slack delivery -- simpler setup, matches RESEARCH.md recommendation"
  - "Notification dedup via notification_log table (eventId+userId+channel unique check) -- prevents alert storms on retry"
  - "CRITICAL events get email+slack; WARNING gets slack-only; INFO gets no push -- matches CLAUDE.md materiality spec"

patterns-established:
  - "notification-dedup: Check notification_log for existing (eventId, userId, channel) before any delivery attempt"
  - "severity-gated-channels: Switch on severity to determine which channels fire (email=CRITICAL only, slack=WARNING+)"
  - "hmac-webhook-signing: HMAC-SHA256 with X-Webhook-Signature + X-Webhook-Timestamp headers for webhook verification"
  - "exponential-backoff-retry: Webhook retries at [1s, 5s, 25s] intervals before marking failed"

requirements-completed: [ALERT-01, ALERT-02, ALERT-03, ALERT-06]

# Metrics
duration: 5min
completed: 2026-03-13
---

# Phase 5 Plan 01: Alert Delivery Infrastructure Summary

**Alert evaluation pipeline with Resend email (CRITICAL), Slack Block Kit (WARNING+), and HMAC-signed webhook delivery, plus notification_log dedup and schema migration**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-13T20:46:00Z
- **Completed:** 2026-03-13T20:52:00Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Schema migration adding notificationLog table, webhookSecret on alertRules, exchangeRatio on deals
- Alert worker evaluating AlertRules against scored events with severity-gated channel dispatch
- Three delivery handlers: Resend email with dark-themed HTML, Slack Block Kit cards, HMAC-signed webhooks with retry
- 6 unit tests covering all severity paths, dedup, and HMAC signing
- 40 structural schema tests updated and passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema migration + alert types** - `aa92c3f` (feat)
2. **Task 2: Alert worker + delivery handlers** - `37954b4` (feat)

## Files Created/Modified
- `apps/api/src/alerts/types.ts` - AlertEvaluateData, DeliveryPayload, DeliveryResult interfaces
- `apps/api/src/alerts/alert-worker.ts` - handleAlertEvaluate BullMQ handler
- `apps/api/src/alerts/email-delivery.ts` - Resend email delivery with dark HTML template
- `apps/api/src/alerts/slack-delivery.ts` - Slack Block Kit card delivery
- `apps/api/src/alerts/webhook-delivery.ts` - HMAC-SHA256 signed webhook with 3x retry
- `apps/api/src/db/schema.ts` - notificationLog table, webhookSecret, exchangeRatio columns
- `apps/api/src/worker.ts` - alert_evaluate handler registration (10 handlers total)
- `apps/api/drizzle/0003_chemical_grim_reaper.sql` - Migration SQL
- `apps/api/src/tests/alert-worker.test.ts` - 6 alert worker unit tests
- `apps/api/src/tests/db-schema.test.ts` - 9 new structural tests for schema additions

## Decisions Made
- Resend SDK for email delivery -- ESM-native, simple API, good DX for transactional emails
- @slack/webhook IncomingWebhook pattern (not OAuth app) for Slack delivery -- simpler setup per RESEARCH.md
- Notification dedup via notification_log table (eventId+userId+channel check) -- prevents alert storms
- CRITICAL events get email+slack; WARNING gets slack-only; INFO gets no push -- matches CLAUDE.md materiality spec

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript exactOptionalPropertyTypes error in webhook-delivery.ts**
- **Found during:** Task 2 (type-checking)
- **Issue:** `lastError` variable could be `undefined` which is not assignable to `string` with exactOptionalPropertyTypes
- **Fix:** Added null coalescing `?? 'Unknown error'` to ensure string type
- **Files modified:** apps/api/src/alerts/webhook-delivery.ts
- **Committed in:** 37954b4 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed Vitest mock class pattern for Resend and IncomingWebhook**
- **Found during:** Task 2 (test implementation)
- **Issue:** `vi.fn().mockImplementation()` pattern for constructors caused "did not use 'function' or 'class'" warning and broken mock chain
- **Fix:** Used `class MockResend` / `class MockIncomingWebhook` pattern instead
- **Files modified:** apps/api/src/tests/alert-worker.test.ts
- **Committed in:** 37954b4 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed items above.

## User Setup Required

External services require manual configuration before alert delivery works in production:

**Resend (email delivery):**
- `RESEND_API_KEY` - Resend Dashboard -> API Keys -> Create API Key
- `RESEND_FROM_EMAIL` - Resend Dashboard -> Domains -> verified sender

**Slack (incoming webhook):**
- `SLACK_WEBHOOK_URL` - Slack Admin -> Apps -> Incoming Webhooks -> Add New Webhook

## Next Phase Readiness
- Alert evaluation handler is registered and ready to be triggered by event factories in Plan 03
- Market data integration (Plan 02) can use the new exchangeRatio column for STOCK/MIXED spread computation
- Frontend alert settings UI (Plan 03) can wire to the alertRules table with webhookSecret

---
## Self-Check: PASSED

All 8 created files verified on disk. Both task commits (aa92c3f, 37954b4) verified in git log.

---
*Phase: 05-alert-delivery-market-data*
*Completed: 2026-03-13*
