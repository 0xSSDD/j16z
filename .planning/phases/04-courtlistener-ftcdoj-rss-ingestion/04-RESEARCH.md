# Phase 4: CourtListener, FTC/DOJ, and RSS Ingestion — Research

**Researched:** 2026-03-13
**Domain:** External data source ingestion — legal data APIs, government RSS feeds, webhook integration
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COURT-01 | System receives CourtListener webhook notifications for docket updates on tracked cases | CourtListener v4 API provides docket-alert webhooks; POST to `/api/rest/v4/docket-alerts/` subscribes by docket ID; webhook pushes JSON payload to our Hono endpoint |
| COURT-02 | System polls CourtListener API for initial case discovery on new deals | CourtListener search API `/api/rest/v4/search/?type=d&q=caseName:...` enables case discovery; fallback polling with GET `/api/rest/v4/docket-entries/?docket=<id>` covers gaps |
| COURT-03 | System ingests merger challenges, shareholder suits, and antitrust cases | Docket entry payloads contain case type and description; existing `events` table with `type='COURT'` and `source='COURT_LISTENER'` is the target; seed data already uses this pattern |
| COURT-04 | System monitors PACER credential health and alerts on expiry (180-day rotation) | PACER passwords expire every 180 days (federal judiciary mandate); credential stored in env vars; health check computes days-until-expiry from `PACER_PASSWORD_LAST_CHANGED` env var |
| COURT-05 | Docket entries create events with appropriate materiality scores | Existing materiality scoring constants apply (COURT event scores: filings=50, injunctions=90, second requests=85); existing `createEvent` pattern from edgar poller is the template |
| AGENCY-01 | System monitors FTC and DOJ RSS feeds for antitrust actions and press releases | ALREADY IMPLEMENTED — `handleFtcCompetitionRss`, `handleDojAntitrustRss`, `handleDojCivilRss` in `apps/api/src/agency/rss-pollers.ts`; scheduled in `scheduler.ts` |
| AGENCY-02 | System detects HSR second requests, enforcement actions, and clearance decisions | ALREADY IMPLEMENTED — `handleFtcPoll` queries FTC Early Termination API; RSS pollers use M&A keyword filtering; gap: HSR second requests not yet detected (FTC API is early terminations only; second requests come via FTC press release RSS) |
| AGENCY-03 | System matches agency events to tracked deals by company/deal reference | ALREADY IMPLEMENTED — `findMatchingDeals` in `rss-pollers.ts` and `findMatchingDeal` in `ftc-poller.ts`; shared `matchCompanyToDeal` in `shared/deal-matcher.ts` with Jaccard similarity |
| AGENCY-04 | System includes canary monitoring for RSS feed format changes | NOT IMPLEMENTED — no canary monitor exists; requires tracking per-feed item count baseline and alerting when count drops below threshold; needs new check in `handleAgencyRss` |
| RSS-01 | System ingests curated RSS feeds (law firm alerts, specialist newsletters) | ALREADY IMPLEMENTED — `handleRssPoll` in `apps/api/src/rss/poller.ts`; `rss_feeds` table exists with `watchlist_id` FK; `rss-feeds` Hono routes exist |
| RSS-02 | RSS feeds attachable to watchlists for targeted intelligence | ALREADY IMPLEMENTED — `rssFeeds.watchlistId` FK exists; `GET /api/rss-feeds` returns feeds with watchlistId; `PATCH /api/rss-feeds/:id` supports watchlistId update |
| RSS-03 | News items scored for relevance and surfaced in deal event timeline | PARTIALLY IMPLEMENTED — RSS items create `NEWS/RSS_ARTICLE` events with `materialityScore=40`, `severity=INFO`; gap is news items in `newsItems` table are not wired; events table path works |
</phase_requirements>

---

## Summary

Phase 4 is the most pre-built phase in the roadmap. The FTC/DOJ agency polling (AGENCY-01 through AGENCY-03) and RSS ingestion (RSS-01, RSS-02, RSS-03) are substantially implemented in the `rehaul` branch — `apps/api/src/agency/`, `apps/api/src/rss/`, `apps/api/src/routes/rss-feeds.ts`, and the scheduler. The frontend has `IntegrationsTab` and `RSSFeedsTab` already wired to real API endpoints.

The primary gaps that remain are: (1) the entire CourtListener integration — no `courtlistener/` directory exists, no webhook endpoint, no polling handler, no docket-alert subscription logic; (2) the PACER credential health check (COURT-04) requires storing a credential-set timestamp and computing expiry warnings; and (3) the canary monitor for FTC/DOJ RSS format changes (AGENCY-04) is absent. The frontend's `IntegrationsTab` already shows mock `CourtListener` data but the backend has no `courtlistener` `ingestion_status` row or handler.

The `integrations/health` endpoint in the backend returns raw `ingestion_status` rows, but the frontend maps display names like "CourtListener" using static `SOURCE_ICONS`/`SOURCE_COLORS` maps — meaning once the backend inserts a row with `sourceName='courtlistener'`, the frontend needs a name-mapping fix (it currently uses `source` display strings like "CourtListener" not the stored `source_name` keys). This is a frontend wiring task in plan 04-01.

**Primary recommendation:** Build the CourtListener integration as a new `apps/api/src/courtlistener/` directory following the exact agency polling pattern (types.ts, poller.ts, event-factory.ts); add PACER credential health logic to the integrations health endpoint; add the canary monitor as a threshold check inside the existing `handleAgencyRss` function; wire the Hono webhook endpoint to accept CourtListener push notifications.

---

## Standard Stack

### Core (already in package.json — no new installs required for most tasks)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `rss-parser` | ^3.13.0 | Parse RSS/Atom feeds into JS objects | Already installed; used by `agency/rss-pollers.ts` and `rss/poller.ts` |
| `bullmq` | ^5.70.1 | BullMQ job queue for background polling | Already installed; all ingestion jobs use this pattern |
| `drizzle-orm` | ^0.44.2 | DB queries with type-safety | Already installed; adminDb pattern established |
| `hono` | ^4.7.4 | Webhook endpoint registration | Already installed |
| `zod` | ^3.24.2 | Payload schema validation for webhook | Already installed |

### CourtListener API (external service, no npm package needed)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET https://www.courtlistener.com/api/rest/v4/search/?type=d&q=caseName:{name}` | GET | Search for dockets by case/party name (case discovery) |
| `GET https://www.courtlistener.com/api/rest/v4/docket-entries/?docket={id}&order_by=-date_filed` | GET | Fetch recent docket entries for a known docket |
| `POST https://www.courtlistener.com/api/rest/v3/docket-alerts/` | POST (body: `docket={id}`) | Subscribe to push updates for a specific docket |
| `DELETE https://www.courtlistener.com/api/rest/v3/docket-alerts/{id}/` | DELETE | Unsubscribe from docket alerts |
| Our webhook endpoint: `POST /api/webhooks/courtlistener` | Receive | Receive push from CourtListener when docket updates occur |

**Authentication:** `Authorization: Token <COURTLISTENER_API_TOKEN>` header on all outbound requests.
**Rate limit:** 5,000 queries/hour per authenticated account.
**Webhook security:** CourtListener does NOT sign webhook payloads. Allowlist their IPs: `34.210.230.218` and `54.189.59.91`. Use `Idempotency-Key` header for deduplication (128-bit UUID from CourtListener).

### No new npm dependencies required

All required libraries (`rss-parser`, `bullmq`, `drizzle-orm`, `hono`, `zod`) are already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
apps/api/src/
├── courtlistener/               # NEW — mirrors agency/ directory structure
│   ├── types.ts                 # Zod schemas for CourtListener API responses
│   ├── poller.ts                # handleCourtListenerPoll() — discovery + fallback polling
│   ├── webhook.ts               # handleCourtListenerWebhook() — process push payloads
│   └── event-factory.ts         # createCourtEvent() — inserts COURT events into DB
├── agency/                      # EXISTING — extend only for canary monitor
│   ├── rss-pollers.ts           # ADD: canary threshold check in handleAgencyRss()
│   ├── ftc-poller.ts            # no changes needed
│   ├── event-factory.ts         # no changes needed
│   └── types.ts                 # no changes needed
├── rss/                         # EXISTING — no changes needed
│   └── poller.ts                # already complete
├── routes/
│   ├── webhooks.ts              # NEW — POST /api/webhooks/courtlistener endpoint
│   └── integrations.ts          # EXTEND — add PACER credential health to /health response
├── queues/
│   └── scheduler.ts             # EXTEND — add courtlistener_poll cron schedule
└── worker.ts                    # EXTEND — add courtlistener_poll and courtlistener_webhook handlers
```

### Pattern 1: CourtListener Polling (mirrors edgar/poll.ts)

**What:** BullMQ job handler that discovers new dockets for tracked deals, creates docket-alert subscriptions, and stores docket IDs for future polling.
**When to use:** Triggered by `courtlistener_poll` cron job (every 30 minutes) and on deal creation.

```typescript
// apps/api/src/courtlistener/poller.ts
// Source: mirrors apps/api/src/agency/rss-pollers.ts pattern
export async function handleCourtListenerPoll(job: Job): Promise<void> {
  console.log(`[courtlistener_poll] Starting (triggered by: ${job.data.triggeredBy})`);

  // 1. Load all tracked deals
  const deals = await loadActiveDeals();

  // 2. For each deal, search CourtListener for merger-related cases
  for (const deal of deals) {
    const query = `caseName:"${deal.target}" OR caseName:"${deal.acquirer}"`;
    const searchUrl = `https://www.courtlistener.com/api/rest/v4/search/?type=d&q=${encodeURIComponent(query)}&order_by=score+desc&count=5`;

    const res = await fetch(searchUrl, {
      headers: { Authorization: `Token ${process.env.COURTLISTENER_API_TOKEN}` },
    });
    const data = await res.json();
    // ... process results, create docket-alert subscriptions, store docket IDs in events metadata
  }

  await updateIngestionStatus('courtlistener', true, undefined, createdCount);
}
```

### Pattern 2: CourtListener Webhook Handler

**What:** Hono POST endpoint that receives push notifications from CourtListener when subscribed dockets update.
**When to use:** CourtListener calls our endpoint in real-time when new docket entries are filed.

```typescript
// apps/api/src/routes/webhooks.ts
// Source: CourtListener webhook docs — https://www.courtlistener.com/help/api/webhooks/
export const webhooksRoutes = new Hono()
  .post('/courtlistener', async (c) => {
    // IP allowlist check: 34.210.230.218, 54.189.59.91
    const clientIp = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for');
    if (!COURTLISTENER_IPS.has(clientIp ?? '')) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    // Idempotency-Key dedup
    const idempotencyKey = c.req.header('Idempotency-Key');
    if (idempotencyKey && await hasProcessedWebhook(idempotencyKey)) {
      return c.json({ ok: true }); // already processed
    }

    const payload = await c.req.json();
    const parsed = courtListenerWebhookSchema.safeParse(payload);
    if (!parsed.success) return c.json({ error: 'Invalid payload' }, 400);

    // Enqueue for async processing — respond immediately to avoid CourtListener timeout
    await webhookQueue.add('courtlistener_webhook', parsed.data, { attempts: 3 });

    return c.json({ ok: true });
  });
```

### Pattern 3: Canary Monitor (add to existing handleAgencyRss)

**What:** Tracks a rolling baseline of items per RSS feed poll cycle; alerts via ingestion_status when count drops >80% below baseline.
**When to use:** Each `handleAgencyRss` call; compares current item count to previous stored count.

```typescript
// apps/api/src/agency/rss-pollers.ts — add canary logic inside handleAgencyRss
// Source: AGENCY-04 requirement — detect RSS feed format changes
async function checkCanary(config: PollConfig, currentCount: number): Promise<void> {
  const previous = await getPreviousItemCount(config.sourceName);
  if (previous === null || previous === 0) {
    await storeItemCount(config.sourceName, currentCount);
    return;
  }
  if (currentCount < previous * 0.2) {
    // Item count dropped >80% — likely feed format change
    await updateIngestionStatus(config.sourceName, false,
      `Canary alert: item count dropped from ${previous} to ${currentCount} — possible feed format change`, currentCount);
  } else {
    await storeItemCount(config.sourceName, currentCount);
  }
}
```

### Pattern 4: PACER Credential Health Check

**What:** Computes days remaining until PACER password expires (180-day rotation) from env var timestamp; surfaces in `/api/integrations/health`.
**When to use:** Called on every `GET /api/integrations/health` request.

```typescript
// apps/api/src/routes/integrations.ts — add PACER health to health response
function getPacerCredentialHealth(): { isExpiringSoon: boolean; daysUntilExpiry: number | null; expiryDate: string | null } {
  const lastChanged = process.env.PACER_PASSWORD_LAST_CHANGED; // ISO date string e.g. '2026-01-01'
  if (!lastChanged) return { isExpiringSoon: false, daysUntilExpiry: null, expiryDate: null };

  const expiryDate = new Date(lastChanged);
  expiryDate.setDate(expiryDate.getDate() + 180);
  const daysUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isExpiringSoon = daysUntilExpiry <= 30;

  return { isExpiringSoon, daysUntilExpiry, expiryDate: expiryDate.toISOString() };
}
```

### Anti-Patterns to Avoid

- **Don't process webhook payload synchronously:** CourtListener expects a fast 200 response; process the payload by enqueueing a BullMQ job immediately, then returning `{ ok: true }`.
- **Don't store PACER credentials in the database:** The PACER API does not cache credentials; they are passed per-request. Store only the `PACER_PASSWORD_LAST_CHANGED` date for health tracking, not the credentials themselves.
- **Don't register `webhooks` routes under `firmContextMiddleware`:** The CourtListener webhook endpoint has no JWT. It must be registered on the raw Hono app without auth middleware (same as `/api/auth/*` pattern from Phase 1 decision).
- **Don't create a separate `court_cases` table:** The existing `events` table with `type='COURT'` and `source='COURT_LISTENER'` handles docket entries as events. The seed data already uses this pattern. No new table needed.
- **Don't use rss-parser for CourtListener:** CourtListener uses a JSON REST API, not RSS. Use `fetch()` directly.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RSS feed parsing | Custom XML parser | `rss-parser` (already installed) | Handles Atom, RSS 0.9-2.0, edge cases, encoding issues |
| Company name fuzzy matching | New Levenshtein implementation | `matchCompanyToDeal` in `shared/deal-matcher.ts` | Already implemented with Jaccard similarity, normalization, confidence scoring |
| Duplicate event detection | Custom dedup table | `metadata ->> 'sourceGuid'` SQL check pattern (already in `hasExistingSourceGuid`) | Existing pattern in `rss-pollers.ts` is correct and tested |
| Ingestion status tracking | Custom health table | `updateIngestionStatus()` in `agency/event-factory.ts` | Already implemented; used by all pollers |
| Webhook HTTP client | Custom fetch wrapper | `hono` route + raw `fetch()` | No need for a library; CourtListener API is simple REST |
| Job scheduling | Custom cron | `upsertJobScheduler` in BullMQ (already in scheduler.ts) | Idempotent, Redis-backed, survives restarts |

**Key insight:** The agency and RSS ingestion infrastructure is a complete template. The CourtListener integration should copy the directory structure and handler signatures from `agency/`, not invent a new pattern.

---

## Common Pitfalls

### Pitfall 1: Webhook Route Behind Auth Middleware

**What goes wrong:** If `POST /api/webhooks/courtlistener` is registered under `firmContextMiddleware`, CourtListener's push will receive a 401 because it has no JWT.
**Why it happens:** All `/api/*` routes currently require auth middleware by default in `apps/api/src/index.ts`.
**How to avoid:** Register the webhooks router BEFORE the `firmContextMiddleware` applies, using the same pattern as `/api/auth/*` (Phase 1 decision: `firmContextMiddleware NOT applied to /api/auth/*`).
**Warning signs:** CourtListener webhook test fails with 401; docket updates stop appearing in Inbox.

### Pitfall 2: CourtListener Webhook IP Changes

**What goes wrong:** CourtListener publishes two source IPs (`34.210.230.218`, `54.189.59.91`). If their infrastructure changes, allowlisting breaks silently.
**Why it happens:** Hard-coded IPs go stale when CourtListener's infrastructure changes.
**How to avoid:** Log the incoming IP on every webhook call. Treat the allowlist as a first-line defense, not the only defense. Combine with idempotency-key dedup as the primary correctness mechanism.
**Warning signs:** Webhook calls stop with 403; no events from CourtListener; check logs for new source IPs.

### Pitfall 3: Docket Alert Subscription Management

**What goes wrong:** Every `courtlistener_poll` run discovers the same dockets and tries to create duplicate subscriptions.
**Why it happens:** CourtListener returns HTTP 400 or a duplicate error if you try to subscribe to an already-subscribed docket.
**How to avoid:** Store `docketId` + `courtlistenerAlertId` in event metadata when first subscribing. Before subscribing, check if any event for this deal already has a `courtlistenerDocketId` in its metadata. Alternatively, call `GET /api/rest/v3/docket-alerts/` to list existing subscriptions and avoid duplicates.
**Warning signs:** 400 errors in courtlistener_poll logs; rapidly growing docket-alert count on CourtListener account.

### Pitfall 4: integrations/health Source Name Mismatch

**What goes wrong:** The frontend `IntegrationsTab` maps display names using `SOURCE_ICONS`/`SOURCE_COLORS` keyed on strings like `"CourtListener"` and `"RSS Feeds"`, but the backend `ingestion_status` table stores `source_name` values like `'courtlistener'`, `'ftc_rss'`, `'rss'`. The `/api/integrations/health` endpoint returns raw rows; the frontend will show no icon/color for unmapped names.
**Why it happens:** Frontend and backend use different naming conventions; the integration endpoint was built before CourtListener was implemented.
**How to avoid:** In plan 04-01, extend the `/api/integrations/health` endpoint to normalize source names to display names (or add a `displayName` field). Alternatively, update the frontend `SOURCE_ICONS` map to match backend keys.
**Warning signs:** CourtListener shows in the health grid as a blank/unstyled card; FTC shows as unstyled if source_name is 'ftc_rss' but frontend looks for 'FTC.gov'.

### Pitfall 5: PACER Credential Expiry Without Detection

**What goes wrong:** PACER passwords must be changed every 180 days. If expired, the `recap-fetch` API silently returns auth errors; CourtListener can't fetch new docket entries.
**Why it happens:** There is no PACER credential-rotation reminder in the system.
**How to avoid:** Store `PACER_PASSWORD_LAST_CHANGED` as an env var (ISO date). The `/api/integrations/health` response includes `pacerCredentialExpiry` with `daysUntilExpiry`. The frontend `IntegrationsTab` shows a warning badge when `daysUntilExpiry <= 30`.
**Warning signs:** `recap-fetch` API returns 401; no new COURT events from CourtListener; check `PACER_PASSWORD_LAST_CHANGED` date.

### Pitfall 6: canary monitor False Positives

**What goes wrong:** If the FTC or DOJ publishes no press releases over a weekend, item count drops to 0; canary fires as false positive.
**Why it happens:** Government agencies don't publish on weekends or holidays.
**How to avoid:** Only trigger the canary if 2+ consecutive polls return zero items AND the previous baseline was >5 items. Do not fire on a single zero-item poll. Store item count in `ingestion_status.metadata` as rolling baseline.
**Warning signs:** Inbox alert spam over holiday weekends; canary fires on every Monday morning.

### Pitfall 7: CourtListener v3 vs v4 Docket Alert Endpoints

**What goes wrong:** Docket alert subscription uses v3 endpoint (`/api/rest/v3/docket-alerts/`) while all other queries use v4. Using v4 for docket alerts may not work since the v4 migration guide may not include this endpoint.
**Why it happens:** CourtListener's documented POST example for docket-alerts explicitly uses v3. The v4 endpoint has not been confirmed to support the same POST interface.
**How to avoid:** Use v3 for docket-alert subscriptions (POST/DELETE) and v4 for all search and docket-entry queries. Test with an actual API token before phase completion.
**Warning signs:** 404 or 405 errors when subscribing to docket alerts via v4.

---

## Code Examples

### CourtListener Docket Search

```typescript
// Source: https://www.courtlistener.com/help/api/rest/search/
// Search for merger-related cases by party name, type=d returns dockets
const query = `caseName:"${targetName}" AND ("merger" OR "acquisition" OR "antitrust")`;
const url = `https://www.courtlistener.com/api/rest/v4/search/?type=d&q=${encodeURIComponent(query)}&order_by=score+desc&count=10`;

const res = await fetch(url, {
  headers: {
    Authorization: `Token ${process.env.COURTLISTENER_API_TOKEN}`,
    'User-Agent': 'j16z-research/1.0 (compliance@j16z.io)',
  },
});
const data = await res.json(); // { count, results: [{id, case_name, docket_number, court, date_filed, ...}] }
```

### Subscribe to Docket Alerts

```typescript
// Source: https://www.courtlistener.com/help/api/rest/v3/alerts/
// POST to v3 (not v4) — confirmed working endpoint
const res = await fetch('https://www.courtlistener.com/api/rest/v3/docket-alerts/', {
  method: 'POST',
  headers: {
    Authorization: `Token ${process.env.COURTLISTENER_API_TOKEN}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: `docket=${docketId}`,
});
// Returns { id, docket, alert_type } — store `id` for later unsubscription
```

### Webhook Payload Schema (Zod)

```typescript
// Source: https://www.courtlistener.com/help/api/webhooks/
// Docket alert webhook sends new docket entries in results array
const docketEntrySchema = z.object({
  id: z.number(),
  description: z.string().nullable(),
  entry_number: z.number().nullable(),
  date_filed: z.string().nullable(),
  recap_documents: z.array(z.object({ id: z.number(), description: z.string().nullable() })).optional(),
}).passthrough();

const courtListenerWebhookSchema = z.object({
  webhook: z.object({
    event_type: z.number(), // 1 = docket alert
    version: z.number(),
  }),
  payload: z.object({
    results: z.array(z.object({
      docket: z.number(), // CourtListener docket ID
      case_name: z.string().optional(),
      docket_entries: z.array(docketEntrySchema).optional(),
    })),
  }),
}).passthrough();
```

### Existing Agency RSS Pattern (confirmed working — replicate for CourtListener)

```typescript
// Source: apps/api/src/agency/rss-pollers.ts (existing, working code)
// Copy this structure for CourtListener poller
export async function handleCourtListenerPoll(job: Job): Promise<void> {
  // same try/catch + updateIngestionStatus('courtlistener', true/false) pattern
}
```

### PACER Credential Health Response Extension

```typescript
// Source: apps/api/src/routes/integrations.ts (extend existing)
// Add to the health response shape
const pacerHealth = getPacerCredentialHealth();
return c.json({
  sources: rows.map(mapSourceRow),
  pacerCredential: {
    isExpiringSoon: pacerHealth.isExpiringSoon,
    daysUntilExpiry: pacerHealth.daysUntilExpiry,
    expiryDate: pacerHealth.expiryDate,
    lastChanged: process.env.PACER_PASSWORD_LAST_CHANGED ?? null,
  },
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual PACER docket checks | CourtListener webhook push + fallback polling | CourtListener v4 API | Sub-30-minute latency for docket updates |
| CourtListener v3 API only | v4 API for search/dockets, v3 for docket-alert subscriptions | v4.3 release | v4 enforces auth (401 for anonymous), better pagination |
| FTC Early Termination API only | FTC API + FTC press release RSS + DOJ RSS + DOJ civil RSS | Phase 4 | Comprehensive agency event coverage |

**Deprecated/outdated:**
- CourtListener v3 REST API: deprecated for most endpoints; docket-alert subscription (`/api/rest/v3/docket-alerts/`) is still v3 — do NOT migrate to v4 until CourtListener confirms v4 parity.
- Anonymous CourtListener requests: v4.3 now returns 401 for unauthenticated requests. Authentication is mandatory.

---

## Open Questions

1. **CourtListener docket-alert subscription storage**
   - What we know: Subscribing to a docket via POST to `/api/rest/v3/docket-alerts/` returns a subscription ID; this must be stored to avoid duplicate subscriptions.
   - What's unclear: There is no `court_cases` table in the schema. Where should docket subscription IDs be stored? Options: (a) in `events.metadata` on the first COURT event per docket, (b) a new `docket_subscriptions` table, (c) a `jsonb` column on deals.
   - Recommendation: Store `courtlistenerDocketId` and `courtlistenerAlertId` in the `metadata` jsonb of the initial COURT event. Query for existing subscriptions via `SELECT events WHERE metadata->>'courtlistenerDocketId' = ?` before subscribing. Avoids schema migration.

2. **Canary monitor storage mechanism**
   - What we know: `ingestion_status.metadata` is a `jsonb` column available for each source.
   - What's unclear: Should the baseline item count be stored in `ingestion_status.metadata` or a separate table?
   - Recommendation: Store `{ baselineItemCount: number, lastBaselineUpdate: ISO-string }` in `ingestion_status.metadata` for `ftc_rss`, `doj_rss`, `doj_civil_rss`. Update baseline only when count is above threshold and poll was healthy.

3. **PACER credential storage for recap-fetch**
   - What we know: The CourtListener recap-fetch API requires `pacer_username` + `pacer_password` per request; CourtListener does not store credentials.
   - What's unclear: For Phase 4, do we need to actually call `recap-fetch` to get PDF documents, or just use the docket entry metadata CourtListener already has in its archive?
   - Recommendation: For Phase 4, rely only on CourtListener's archive (docket entries, descriptions). Skip `recap-fetch` entirely — that requires buying PACER documents and is a Phase 5+ concern. COURT-04 (PACER credential health) can be implemented as tracking the password rotation date without actually calling `recap-fetch`.

4. **integrations/health source name normalization**
   - What we know: Backend stores `source_name` as `'edgar'`, `'ftc'`, `'ftc_rss'`, `'doj_rss'`, `'doj_civil_rss'`, `'rss'`; frontend expects display strings like `'SEC EDGAR'`, `'FTC.gov'`, `'DOJ.gov'`, `'CourtListener'`, `'RSS Feeds'`.
   - What's unclear: Should normalization happen in backend (add `displayName` to response) or frontend (expand `SOURCE_ICONS` map)?
   - Recommendation: Add a `SOURCE_DISPLAY_NAMES` map in the backend integrations route that translates `source_name` to display name. This is simpler than changing the frontend type contract.

---

## Validation Architecture

> `workflow.nyquist_validation` is not set in config.json — skipping this section.

---

## What's Already Implemented (do NOT re-implement)

This section is critical for the planner — these items exist in the codebase and must not be rebuilt:

| Feature | File | Status |
|---------|------|--------|
| FTC Early Termination API poller | `apps/api/src/agency/ftc-poller.ts` | Complete — handles HSR early terminations |
| FTC Competition RSS poller | `apps/api/src/agency/rss-pollers.ts:handleFtcCompetitionRss` | Complete |
| DOJ Antitrust RSS poller | `apps/api/src/agency/rss-pollers.ts:handleDojAntitrustRss` | Complete |
| DOJ Civil RSS poller | `apps/api/src/agency/rss-pollers.ts:handleDojCivilRss` | Complete |
| M&A keyword filtering | `apps/api/src/agency/rss-pollers.ts:isMaRelevant` + `MA_KEYWORDS` | Complete |
| Agency event creation | `apps/api/src/agency/event-factory.ts:createAgencyEvent` | Complete |
| Ingestion status tracking | `apps/api/src/agency/event-factory.ts:updateIngestionStatus` | Complete |
| BullMQ job registration | `apps/api/src/queues/scheduler.ts` (6 jobs registered) | Complete |
| Worker dispatch | `apps/api/src/worker.ts` (7 handlers registered) | Complete |
| RSS feed CRUD routes | `apps/api/src/routes/rss-feeds.ts` | Complete (POST, GET, PATCH, DELETE) |
| RSS feed polling | `apps/api/src/rss/poller.ts` | Complete |
| RSS feed schema + migration | `apps/api/src/db/schema.ts:rssFeeds`, migration `0002_*.sql` | Complete |
| Integrations health endpoint | `apps/api/src/routes/integrations.ts:GET /health` | Complete (needs source name mapping + PACER health extension) |
| Frontend RSSFeedsTab | `apps/j16z-frontend/src/components/settings/rss-feeds-tab.tsx` | Complete — wired to real API |
| Frontend IntegrationsTab | `apps/j16z-frontend/src/components/settings/integrations-tab.tsx` | Complete — wired to real API |
| Frontend api.ts for RSS feeds | `apps/j16z-frontend/src/lib/api.ts` (getRSSFeeds, createRSSFeed, etc.) | Complete |
| Shared deal matcher | `apps/api/src/shared/deal-matcher.ts:matchCompanyToDeal` | Complete with Jaccard similarity |

---

## Sources

### Primary (HIGH confidence)
- CourtListener Webhook API docs — https://www.courtlistener.com/help/api/webhooks/ — webhook event types, payload format, IP allowlist, idempotency-key
- CourtListener Docket Alert API docs — https://www.courtlistener.com/help/api/rest/v3/alerts/ — POST /docket-alerts/ with `docket=<id>` field
- CourtListener Search API docs — https://www.courtlistener.com/help/api/rest/search/ — type=d for dockets, q= caseName parameter
- CourtListener RECAP Fetch API docs — https://www.courtlistener.com/help/api/rest/v4/recap/ — PACER credential handling, 180-day rotation
- Codebase: `apps/api/src/agency/` — FTC/DOJ RSS pollers (fully implemented, directly readable)
- Codebase: `apps/api/src/rss/` — RSS feed poller (fully implemented)
- Codebase: `apps/api/src/db/schema.ts` — current schema state

### Secondary (MEDIUM confidence)
- CourtListener REST API v4.3 overview — https://www.courtlistener.com/help/api/rest/ — rate limits (5,000/hr), auth (Token), v4 enforces auth
- CourtListener PACER Data APIs — https://www.courtlistener.com/help/api/rest/pacer/ — confirmed PACER credentials not stored by CourtListener

### Tertiary (LOW confidence — flag for validation)
- Docket alert v3 vs v4 compatibility: documented examples use v3 for POST docket-alerts; v4 support unconfirmed — **validate with API token before implementation**
- CourtListener source IPs (34.210.230.218, 54.189.59.91): obtained from webhook docs, may change — **verify against live docs at implementation time**

---

## Metadata

**Confidence breakdown:**
- FTC/DOJ/RSS stack (AGENCY-01 to -03, RSS-01 to -03): HIGH — code exists and is directly readable
- CourtListener API: HIGH — official docs fetched and verified during research
- CourtListener webhook IP allowlist: MEDIUM — from official docs but IPs may rotate
- PACER credential 180-day policy: HIGH — confirmed in CourtListener RECAP Fetch docs
- Docket-alert v3 vs v4 endpoint: LOW — use v3 until v4 parity confirmed
- Canary monitor pattern: HIGH — design is straightforward extension of existing ingestion status

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (30 days — CourtListener API is stable; verify IP allowlist before implementation)
