# Phase 5: Alert Delivery + Market Data - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver push notifications (email, Slack, webhook) when material events are scored, and display live spread data with freshness indicators on the deal board. Alert rule configuration UI already exists in Settings. Digests (daily/weekly summaries) are Phase 6 — not in scope here.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
User granted full discretion on all implementation areas. The following are sensible defaults the planner should treat as locked unless a better approach emerges during planning:

**Alert Email Design:**
- Use react-email with j16z brand (dark background, Aurora palette accents)
- Content: event title, materiality badge, deal name + current spread, 1-2 sentence summary, "View in j16z" CTA button
- Keep emails minimal — this is a notification, not a digest
- Resend SDK for delivery (research recommendation)

**Slack Message Format:**
- Block Kit cards via @slack/webhook (not plain text)
- Header: materiality badge emoji + event title
- Body: deal name, event summary, source link
- Footer: "View in j16z" link
- No threading — each alert is standalone
- WARNING events (50-70) get Slack only; CRITICAL (>=70) get both email + Slack

**Alert Rule Configuration:**
- Keep existing AlertRulesTab UI as-is (threshold sliders, channel toggles, per-deal overrides)
- Wire to real API endpoints (currently localStorage-only)
- Default rule: threshold 70 (CRITICAL), channels ['email', 'slack']
- Per-deal overrides stored in alertRules table with dealId set

**Spread Display & Data Freshness:**
- Data-age badge on deal board: green dot (<5 min), yellow dot (5-30 min), red dot (>30 min)
- SpreadChart component already exists — add real data feed
- Skip polling outside market hours (weekends, US holidays, pre-9:30 AM / post-4 PM ET)
- Show "Market closed" indicator when not polling
- Alpha Vantage GLOBAL_QUOTE endpoint (research recommendation)

**Webhook Delivery:**
- POST to user-configured URL with JSON payload (event data + deal context)
- HMAC-SHA256 signature in X-Webhook-Signature header for verification
- 3 retries with exponential backoff (1s, 5s, 25s)
- Log all deliveries in notification_log table

**Alert Deduplication:**
- notification_log table tracks: alertRuleId, eventId, channel, deliveredAt, status
- Same event + same rule + same channel = skip (prevents duplicate alerts on retry/reprocessing)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User trusts Claude's judgement on all implementation details.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `alertRules` table (schema.ts:371-388): Already has threshold, channels[], webhookUrl, dealId, isActive
- `marketSnapshots` table (schema.ts:235-255): Already has currentPrice, targetPrice, grossSpread, annualizedReturn, volume
- `SpreadChart` component: Recharts area chart with time range filters, event markers, stats display
- `AlertRulesTab` component: Full UI with threshold sliders, channel toggles, per-deal overrides, digest config
- `IntegrationsTab` component: Notification channels section with Slack/Email/Webhook add/edit flows
- `severity-scoring.ts` / `materiality-scoring.ts`: Scoring functions with CRITICAL/WARNING/INFO thresholds
- `createAgencyEvent()`: Event factory pattern reusable for alert evaluation trigger
- `deal-matcher.ts`: Fuzzy matching for company-to-deal resolution (useful for market data ticker matching)

### Established Patterns
- BullMQ worker with job handlers dispatched by type (worker.ts handles 9 job types)
- Scheduler registers cron jobs via upsertJobScheduler() at API startup (scheduler.ts)
- Idempotency keys for webhook deduplication (courtlistener webhook pattern)
- RLS firm isolation on all tenant-scoped tables
- Event creation triggers downstream processing (ingestion -> scoring -> event insertion)

### Integration Points
- Worker.ts: Add `alert_evaluate` job handler alongside existing 9 handlers
- Scheduler.ts: Add `market_data_poll` schedule (every 5 min during market hours)
- Event creation: After any event is inserted, enqueue `alert_evaluate` job with eventId
- API routes: New `/api/alert-rules` CRUD endpoints, `/api/market-data` endpoints
- Frontend api.ts: Add `getAlertRules()`, `createAlertRule()`, `updateAlertRule()`, `deleteAlertRule()` functions

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-alert-delivery-market-data*
*Context gathered: 2026-03-13*
