# Phase 4: CourtListener, FTC/DOJ, and RSS Ingestion — Research

**Researched:** 2026-03-13 (forced re-research — fresh web verification)
**Domain:** External data source ingestion — legal data APIs, government RSS feeds, webhook integration
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COURT-01 | System receives CourtListener webhook notifications for docket updates on tracked cases | CourtListener v4 API confirmed: webhook push from IPs 34.210.230.218 and 54.189.59.91; Idempotency-Key header for dedup; up to 7 retries with exponential backoff; POST endpoint on Hono must be outside auth middleware |
| COURT-02 | System polls CourtListener API for initial case discovery on new deals | `GET /api/rest/v4/search/?type=d&q=caseName:...` confirmed working for docket search; fallback `GET /api/rest/v4/docket-entries/?docket=<id>&order_by=-date_filed`; 5,000 req/hr rate limit |
| COURT-03 | System ingests merger challenges, shareholder suits, and antitrust cases | Docket entry payloads contain case description; existing `events` table with `type='COURT'` and `source='COURT_LISTENER'` is the target; no new tables needed |
| COURT-04 | System monitors PACER credential health and alerts on expiry (180-day rotation) | PACER passwords expire every 180 days per federal judiciary mandate; store rotation timestamp in `PACER_PASSWORD_LAST_CHANGED` env var; compute expiry in `/api/integrations/health` response; no actual PACER API calls needed in Phase 4 |
| COURT-05 | Docket entries create events with appropriate materiality scores | Materiality score map: injunctions=90, complaints=85, second_requests=85, motions=70, docket_entry=50; existing `createEvent` pattern from agency poller is the template |
| AGENCY-01 | System monitors FTC and DOJ RSS feeds for antitrust actions and press releases | ALREADY IMPLEMENTED — `handleFtcCompetitionRss`, `handleDojAntitrustRss`, `handleDojCivilRss` in `apps/api/src/agency/rss-pollers.ts`; scheduled in `scheduler.ts` at confirmed feed URLs |
| AGENCY-02 | System detects HSR second requests, enforcement actions, and clearance decisions | SUBSTANTIALLY IMPLEMENTED — `handleFtcPoll` handles HSR early terminations; FTC press release RSS covers enforcement actions; gap: second requests detected only via press release RSS (no dedicated endpoint) |
| AGENCY-03 | System matches agency events to tracked deals by company/deal reference | ALREADY IMPLEMENTED — `findMatchingDeals` in `rss-pollers.ts` and `findMatchingDeal` in `ftc-poller.ts`; Jaccard-based scoring in shared `deal-matcher.ts` |
| AGENCY-04 | System includes canary monitoring for RSS feed format changes | NOT IMPLEMENTED — no canary exists; needs: rolling item count baseline in `ingestion_status.metadata`, 2-consecutive-zero-poll threshold before alert, 80% drop threshold for non-zero counts |
| RSS-01 | System ingests curated RSS feeds (law firm alerts, specialist newsletters) | ALREADY IMPLEMENTED — `handleRssPoll` in `apps/api/src/rss/poller.ts` polls `rssFeeds` table rows |
| RSS-02 | RSS feeds attachable to watchlists for targeted intelligence | ALREADY IMPLEMENTED — `rssFeeds.watchlistId` FK and `getDealsForFeed(firmId, watchlistId)` logic already scopes events to watchlist deals |
| RSS-03 | News items scored for relevance and surfaced in deal event timeline | PARTIALLY IMPLEMENTED — RSS items create `NEWS/RSS_ARTICLE` events with hardcoded `materialityScore: 40`; gap is keyword-based relevance scoring not yet applied |
</phase_requirements>

---

## Summary

Phase 4 is the most pre-built phase in the roadmap. A complete audit of the codebase shows that FTC/DOJ polling (AGENCY-01 through AGENCY-03) and RSS ingestion (RSS-01, RSS-02) are fully implemented in the `rehaul` branch across `apps/api/src/agency/`, `apps/api/src/rss/`, and the scheduler. The frontend has `IntegrationsTab` and `RSSFeedsTab` already wired to real API endpoints with mock data fallbacks.

The primary implementation gaps are: (1) the entire CourtListener integration — no `courtlistener/` directory exists, no webhook endpoint, no polling handler, no docket-alert subscription logic; (2) the canary monitor for RSS feed format changes (AGENCY-04) which requires tracking a rolling baseline in `ingestion_status.metadata`; (3) RSS news materiality scoring is hardcoded at 40 rather than keyword-driven (RSS-03 gap); and (4) the PACER credential health display in the integrations health endpoint (COURT-04). The frontend `IntegrationsTab` maps display names via `SOURCE_ICONS`/`SOURCE_COLORS` records keyed on human-readable strings ("CourtListener", "SEC EDGAR"), but the backend `ingestion_status` table stores raw source keys ('courtlistener', 'edgar') — a name normalization layer is needed in the integrations route.

**Critical update vs. previous research:** The prior RESEARCH.md stated docket-alert subscriptions must use the v3 endpoint. **This is now incorrect.** Current official CourtListener documentation (verified 2026-03-13) shows the docket-alerts POST endpoint is at `/api/rest/v4/docket-alerts/` — v4 is fully supported. Use v4 for all docket-alert operations.

**Primary recommendation:** Build CourtListener as a new `apps/api/src/courtlistener/` directory mirroring the `agency/` pattern (types.ts, poller.ts, webhook.ts, event-factory.ts). Add canary logic inside `handleAgencyRss`. Extend `integrations.ts` with PACER health and source name normalization. Add keyword scoring to RSS poller.

---

## Standard Stack

### Core (all already in package.json — no new installs required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `rss-parser` | ^3.13.0 | Parse RSS/Atom feeds into JS objects | Already installed; used by `agency/rss-pollers.ts` and `rss/poller.ts`; handles FTC/DOJ feed formats |
| `bullmq` | ^5.70.1 | BullMQ job queue for background polling and webhook processing | Already installed; all ingestion jobs use this pattern |
| `drizzle-orm` | ^0.44.2 | DB queries with type-safety | Already installed; adminDb pattern established |
| `hono` | ^4.7.4 | Webhook endpoint registration | Already installed |
| `zod` | ^3.24.2 | Payload schema validation for CourtListener webhook and API responses | Already installed |

### CourtListener API (external service — no npm package, raw fetch)

| Endpoint | Version | Purpose | Auth |
|----------|---------|---------|------|
| `GET /api/rest/v4/search/?type=d&q=...` | v4 | Docket search for case discovery | Token header |
| `GET /api/rest/v4/docket-entries/?docket={id}&order_by=-date_filed` | v4 | Fetch recent docket entries for known docket | Token header |
| `POST /api/rest/v4/docket-alerts/` | **v4** (confirmed current) | Subscribe to push updates for a docket | Token header |
| `DELETE /api/rest/v4/docket-alerts/{id}/` | **v4** | Unsubscribe from docket alerts | Token header |
| Our webhook receiver: `POST /api/webhooks/courtlistener` | — | Receive push from CourtListener | IP allowlist |

**Authentication:** `Authorization: Token <COURTLISTENER_API_TOKEN>` on all outbound requests.
**Rate limit:** 5,000 queries/hour per authenticated account (confirmed v4.3 docs).
**v4.3 enforcement:** Anonymous requests now return 401. Authentication is mandatory.
**Webhook security:** CourtListener does NOT sign payloads. IP allowlist: `34.210.230.218` and `54.189.59.91`. Use `Idempotency-Key` (128-bit UUID) for deduplication as the primary correctness mechanism.
**Retry behavior:** CourtListener retries up to 7 times with exponential backoff (starting ~3 min, window ~54 hours). After 8 failures, the endpoint is auto-disabled.

### FTC/DOJ RSS Feeds (already wired, confirmed URLs)

| Source | Feed URL | Current Status |
|--------|----------|---------------|
| FTC Competition press releases | `https://www.ftc.gov/feeds/press-release-competition.xml` | Used in `handleFtcCompetitionRss`; returns 403 to direct fetchers but rss-parser succeeds |
| DOJ Antitrust press releases | `https://www.justice.gov/news/rss?type[0]=press_release&field_component=376` | Used in `handleDojAntitrustRss` |
| DOJ Civil case filings | `https://www.justice.gov/media/1190096/dl?inline` | Used in `handleDojCivilRss` |

**FTC Early Termination API:** `https://api.ftc.gov/v0/hsr-early-termination-notices` (requires `FTC_API_KEY`)

### Installation

No new npm dependencies required. All needed libraries are already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
apps/api/src/
├── courtlistener/               # NEW — mirrors agency/ directory structure
│   ├── types.ts                 # Zod schemas: docketSearchResultSchema, docketEntrySchema,
│   │                            #   courtListenerWebhookSchema, docketAlertSubscriptionSchema
│   │                            #   + COURTLISTENER_API_BASE constant + COURTLISTENER_IPS Set
│   ├── poller.ts                # handleCourtListenerPoll() — case discovery + docket polling
│   ├── webhook.ts               # handleCourtListenerWebhook() — process push payloads
│   └── event-factory.ts         # createCourtEvent() + getCourtMaterialityScore() + getCourtSeverity()
├── agency/                      # EXISTING — add canary monitor only
│   └── rss-pollers.ts           # ADD: checkCanary() called inside handleAgencyRss()
├── rss/                         # EXISTING — add keyword scoring only
│   └── poller.ts                # ADD: scoreRssItem() for variable materiality
├── routes/
│   ├── webhooks.ts              # NEW — POST /api/webhooks/courtlistener (no auth middleware)
│   ├── index.ts                 # EXTEND — export webhooksRoutes
│   └── integrations.ts          # EXTEND — add PACER health + SOURCE_DISPLAY_NAMES
├── queues/
│   └── scheduler.ts             # EXTEND — add courtlistener_poll cron (*/30 * * * *)
└── worker.ts                    # EXTEND — add courtlistener_poll + courtlistener_webhook handlers
```

### Pattern 1: CourtListener Polling (mirrors agency/rss-pollers.ts)

**What:** BullMQ job handler that discovers dockets for tracked deals, creates v4 docket-alert subscriptions, stores subscription IDs in event metadata, and polls for new docket entries.
**When to use:** Triggered by `courtlistener_poll` cron (every 30 min) and optionally on new deal creation.

```typescript
// apps/api/src/courtlistener/poller.ts
// Source: mirrors apps/api/src/agency/rss-pollers.ts pattern
export async function handleCourtListenerPoll(job: Job): Promise<void> {
  const deals = await loadActiveDeals(); // adminDb select from deals where deletedAt is null

  for (const deal of deals) {
    const query = `caseName:"${deal.target}" OR caseName:"${deal.acquirer}"`;
    const searchUrl = `${COURTLISTENER_API_BASE}/api/rest/v4/search/?type=d&q=${encodeURIComponent(query)}&order_by=score+desc&count=5`;

    const res = await fetch(searchUrl, {
      headers: {
        Authorization: `Token ${process.env.COURTLISTENER_API_TOKEN}`,
        'User-Agent': 'j16z-research/1.0 (compliance@j16z.io)',
      },
    });
    const data = await res.json();
    // data.results: array of { id, case_name, docket_number, court, date_filed }

    for (const docket of data.results) {
      // Check if already subscribed via event metadata
      const existing = await adminDb.select({ id: schema.events.id }).from(schema.events)
        .where(and(
          eq(schema.events.type, 'COURT'),
          sql`metadata ->> 'courtlistenerDocketId' = ${String(docket.id)}`
        )).limit(1);

      if (existing.length === 0) {
        // Subscribe via v4 endpoint (confirmed current — NOT v3)
        const subRes = await fetch(`${COURTLISTENER_API_BASE}/api/rest/v4/docket-alerts/`, {
          method: 'POST',
          headers: {
            Authorization: `Token ${process.env.COURTLISTENER_API_TOKEN}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `docket=${docket.id}`,
        });
        const sub = await subRes.json(); // { id, docket, alert_type }

        await createCourtEvent({
          firmId: deal.firmId!,
          dealId: deal.id,
          subType: 'CASE_DISCOVERED',
          materialityScore: 50,
          metadata: {
            courtlistenerDocketId: docket.id,
            courtlistenerAlertId: sub.id,
            caseName: docket.case_name,
            court: docket.court,
            docketNumber: docket.docket_number,
          },
        });
      }
    }
  }

  await updateIngestionStatus('courtlistener', true, undefined, createdCount);
}
```

### Pattern 2: CourtListener Webhook Handler (Hono route outside auth middleware)

**What:** Hono POST endpoint registered BEFORE `api.use('/*', authMiddleware)` to avoid 401 from CourtListener pushes. Validates IP, deduplicates by Idempotency-Key, enqueues BullMQ job immediately, returns 200.
**When to use:** CourtListener pushes to our endpoint in real-time when subscribed dockets update.

```typescript
// apps/api/src/index.ts — registration order is critical
// MUST add BEFORE: api.use('/*', authMiddleware)
app.route('/api/webhooks', webhooksRoutes); // no auth middleware on this path

// apps/api/src/routes/webhooks.ts
export const webhooksRoutes = new Hono()
  .post('/courtlistener', async (c) => {
    // Log IP always (for monitoring IP address changes per pitfall 2)
    const clientIp = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? '';
    console.log(`[courtlistener webhook] incoming IP: ${clientIp}`);
    if (!COURTLISTENER_IPS.has(clientIp)) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const idempotencyKey = c.req.header('Idempotency-Key');
    if (idempotencyKey) {
      const exists = await adminDb.select({ id: schema.events.id }).from(schema.events)
        .where(sql`metadata ->> 'idempotencyKey' = ${idempotencyKey}`).limit(1);
      if (exists.length > 0) return c.json({ ok: true }); // already processed
    }

    const payload = await c.req.json();
    const parsed = courtListenerWebhookSchema.safeParse(payload);
    if (!parsed.success) return c.json({ error: 'Invalid payload' }, 400);

    // Enqueue immediately — DO NOT process synchronously (CourtListener has short timeout)
    const queue = new Queue('ingestion', { connection: redisConnection });
    await queue.add('courtlistener_webhook', { ...parsed.data, idempotencyKey }, { attempts: 3 });
    await queue.close();

    return c.json({ ok: true });
  });
```

### Pattern 3: Canary Monitor (add to handleAgencyRss)

**What:** Tracks rolling item count baseline in `ingestion_status.metadata`. Fires canary after 2+ consecutive zero-item polls OR >80% drop. Does NOT fire on a single zero-item poll (weekend protection).

```typescript
// apps/api/src/agency/rss-pollers.ts — add AFTER: const items = feed.items.slice(0, MAX_ITEMS_PER_POLL)
async function checkCanary(config: PollConfig, currentCount: number): Promise<void> {
  const rows = await adminDb.select().from(schema.ingestionStatus)
    .where(eq(schema.ingestionStatus.sourceName, config.sourceName)).limit(1);

  const meta = (rows[0]?.metadata ?? {}) as {
    canaryBaseline?: number;
    canaryZeroStreak?: number;
    lastBaselineUpdate?: string;
  };

  const baseline = meta.canaryBaseline ?? 0;
  const zeroStreak = meta.canaryZeroStreak ?? 0;

  if (baseline === 0) {
    // First run — establish baseline; no alert
    await adminDb.update(schema.ingestionStatus)
      .set({ metadata: { canaryBaseline: currentCount, canaryZeroStreak: 0, lastBaselineUpdate: new Date().toISOString() } })
      .where(eq(schema.ingestionStatus.sourceName, config.sourceName));
    return;
  }

  if (currentCount === 0 && baseline > 5) {
    const newStreak = zeroStreak + 1;
    if (newStreak >= 2) {
      // 2+ consecutive zero-item polls — fire canary
      await updateIngestionStatus(config.sourceName, false,
        `Canary alert: item count dropped from ${baseline} to 0 over ${newStreak} consecutive polls — possible feed format change`, 0);
    } else {
      // First zero — just track streak, no alert (weekend protection)
      await adminDb.update(schema.ingestionStatus)
        .set({ metadata: { ...meta, canaryZeroStreak: newStreak } })
        .where(eq(schema.ingestionStatus.sourceName, config.sourceName));
    }
  } else if (currentCount > 0 && currentCount < baseline * 0.2) {
    // >80% drop in non-zero count — fire canary immediately
    await updateIngestionStatus(config.sourceName, false,
      `Canary alert: item count dropped from ${baseline} to ${currentCount} — possible feed format change`, currentCount);
  } else if (currentCount > 0) {
    // Healthy count — update baseline, reset streak
    await adminDb.update(schema.ingestionStatus)
      .set({ metadata: { canaryBaseline: currentCount, canaryZeroStreak: 0, lastBaselineUpdate: new Date().toISOString() } })
      .where(eq(schema.ingestionStatus.sourceName, config.sourceName));
  }
}
```

### Pattern 4: PACER Credential Health in Integrations Route

**What:** Compute days-until-expiry from `PACER_PASSWORD_LAST_CHANGED` env var. Add `displayName` mapping to decouple backend `source_name` keys from frontend display expectations.

```typescript
// apps/api/src/routes/integrations.ts

const SOURCE_DISPLAY_NAMES: Record<string, string> = {
  edgar: 'SEC EDGAR',
  ftc: 'FTC.gov',
  ftc_rss: 'FTC.gov',
  doj_rss: 'DOJ.gov',
  doj_civil_rss: 'DOJ.gov',
  courtlistener: 'CourtListener',
  rss: 'RSS Feeds',
};

function getPacerCredentialHealth() {
  const lastChanged = process.env.PACER_PASSWORD_LAST_CHANGED; // ISO date e.g. '2026-01-01'
  if (!lastChanged) return { isExpiringSoon: false, daysUntilExpiry: null, expiryDate: null, lastChanged: null };
  const expiryDate = new Date(lastChanged);
  expiryDate.setDate(expiryDate.getDate() + 180);
  const daysUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return {
    isExpiringSoon: daysUntilExpiry <= 30,
    daysUntilExpiry,
    expiryDate: expiryDate.toISOString(),
    lastChanged,
  };
}

// Updated GET /health response:
return c.json({
  sources: rows.map((row) => ({
    sourceName: row.sourceName,
    displayName: SOURCE_DISPLAY_NAMES[row.sourceName] ?? row.sourceName,
    lastSuccessfulSync: row.lastSuccessfulSync,
    lastError: row.lastError,
    lastErrorAt: row.lastErrorAt,
    itemsIngested: row.itemsIngested,
    isHealthy: row.isHealthy,
  })),
  pacerCredential: getPacerCredentialHealth(),
});
```

### Pattern 5: RSS Keyword-Based Materiality Scoring

**What:** Replace hardcoded `materialityScore: 40` in `rss/poller.ts` with keyword-based scoring. Cap at 70 — news items should not reach CRITICAL threshold on keywords alone.

```typescript
// apps/api/src/rss/poller.ts
function scoreRssItem(title: string, content: string): number {
  const haystack = `${title} ${content}`.toLowerCase();
  let score = 30; // base score for NEWS/RSS_ARTICLE

  if (/merger|acquisition|deal/.test(haystack)) score += 10;
  if (/antitrust|regulatory|ftc|doj/.test(haystack)) score += 15;
  if (/injunction|block|challenge/.test(haystack)) score += 20;
  if (/second request|hsr/.test(haystack)) score += 20;
  if (/termination|break fee|mae/.test(haystack)) score += 15;
  if (/shareholder suit|litigation/.test(haystack)) score += 10;

  return Math.min(score, 70); // cap: news cannot reach CRITICAL alone
}
```

### Anti-Patterns to Avoid

- **Do not use v3 for docket-alert subscriptions.** The prior RESEARCH.md stated v3 was required. Current official docs confirm v4 is fully supported. Use `/api/rest/v4/docket-alerts/` for all docket-alert CRUD operations.
- **Do not process webhook payload synchronously.** CourtListener has a short timeout window; the Hono handler must enqueue a BullMQ job and return `{ ok: true }` immediately.
- **Do not register webhooks routes under auth middleware.** CourtListener has no JWT. Register `app.route('/api/webhooks', webhooksRoutes)` on the root `app`, not on the `api` sub-app that has `api.use('/*', authMiddleware)`. The route goes on `app` at the top level, before the `api` sub-app is mounted.
- **Do not store PACER credentials in the database.** Only store the rotation date for health tracking. No actual PACER calls needed in Phase 4.
- **Do not create a `court_cases` or `docket_subscriptions` table.** Store `courtlistenerDocketId` and `courtlistenerAlertId` in `events.metadata` jsonb on the initial COURT event. Query via SQL `metadata ->> 'courtlistenerDocketId'` before subscribing.
- **Do not fire the canary on a single zero-item poll.** Government agencies do not publish on weekends or holidays. Require 2+ consecutive polls to fire.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RSS feed parsing | Custom XML parser | `rss-parser` (already installed) | Handles Atom, RSS 0.9-2.0, encoding edge cases |
| Company name matching | New Levenshtein implementation | `findMatchingDeals` in `agency/rss-pollers.ts` or `matchCompanyToDeal` in `shared/deal-matcher.ts` | Already implemented with Jaccard similarity and normalization |
| Duplicate event detection | Custom dedup table | `metadata ->> 'sourceGuid'` SQL check (pattern in `hasExistingSourceGuid`) | Already used in rss-pollers.ts, tested |
| Ingestion status tracking | Custom health table | `updateIngestionStatus()` in `agency/event-factory.ts` | Already used by all pollers; handles both success and failure upserts |
| Webhook HTTP routing | Custom framework | Hono route with `new Hono().post('/courtlistener', ...)` | Already installed; same as all other routes |
| Job scheduling | Custom cron | `upsertJobScheduler` in BullMQ (pattern in scheduler.ts) | Idempotent, Redis-backed, survives restarts |
| Duplicate subscription check | Separate subscriptions table | SQL `metadata ->> 'courtlistenerDocketId'` query on events table | Avoids schema migration; existing jsonb pattern |

**Key insight:** The agency polling infrastructure is a complete, production-tested template. CourtListener must follow the same directory structure, handler signature, error handling, and ingestion status tracking — no new patterns invented.

---

## Common Pitfalls

### Pitfall 1: Webhook Route Inside Auth Middleware (CRITICAL)

**What goes wrong:** `POST /api/webhooks/courtlistener` returns 401; CourtListener stops sending pushes; docket updates never appear in Inbox.
**Why it happens:** `api.use('/*', authMiddleware)` applies to all routes under the `api` sub-app. If `webhooksRoutes` is registered on `api`, it inherits the auth middleware.
**How to avoid:** Register the webhooks router on the ROOT `app`, not on the `api` sub-app:
```typescript
// index.ts — CORRECT order
app.route('/api/webhooks', webhooksRoutes); // on root app, no auth
const api = app.basePath('/api');
api.use('/*', authMiddleware);             // only applies to api sub-app
```
**Warning signs:** CourtListener webhook test returns 401; no COURT events in DB despite webhook push.

### Pitfall 2: Using v3 for Docket-Alert Subscriptions (CORRECTED)

**What goes wrong:** Prior research said to use v3 (`/api/rest/v3/docket-alerts/`). This was incorrect.
**Current state:** Official docs verified 2026-03-13 show the POST endpoint is `/api/rest/v4/docket-alerts/` with the same `docket=<id>` form body. v4 is fully supported.
**How to avoid:** Use `/api/rest/v4/docket-alerts/` for all docket-alert CRUD. If v4 returns unexpected errors during implementation, fall back to v3 and document the discrepancy.
**Warning signs:** 404 on POST to v4 docket-alerts endpoint — if this occurs, try v3.

### Pitfall 3: Duplicate Docket Subscriptions

**What goes wrong:** Every `courtlistener_poll` run discovers the same dockets and tries to re-subscribe. CourtListener may return an error or create duplicate subscriptions.
**Why it happens:** Polling discovers dockets on every cycle; there is no built-in dedup in the polling loop.
**How to avoid:** Before subscribing, query `events WHERE type='COURT' AND metadata->>'courtlistenerDocketId' = ?` — if any row exists, skip subscription. Store `courtlistenerAlertId` in the same metadata on creation.
**Warning signs:** 400 errors in `courtlistener_poll` logs; rapidly growing alert count on CourtListener account.

### Pitfall 4: Source Name Mismatch in Frontend

**What goes wrong:** `IntegrationsTab` maps display names via `SOURCE_ICONS`/`SOURCE_COLORS` keyed on `"CourtListener"`, `"SEC EDGAR"`, etc. but the backend returns raw `sourceName` values like `'courtlistener'`, `'edgar'`. Without `displayName`, cards show no icon/color.
**Why it happens:** Frontend and backend use different naming conventions; the integration endpoint predates CourtListener implementation.
**How to avoid:** The `SOURCE_DISPLAY_NAMES` map in `integrations.ts` (Pattern 4 above) adds `displayName` to each source row. Update `api.ts` to use `displayName ?? sourceName` as the `source` field for `IntegrationHealth`. Existing `SOURCE_ICONS`/`SOURCE_COLORS` keys already match.
**Warning signs:** CourtListener shows as an unstyled card; FTC.gov shows no icon if `source` is `'ftc_rss'` instead of `'FTC.gov'`.

### Pitfall 5: Canary False Positives on Weekends

**What goes wrong:** FTC and DOJ publish zero press releases over weekends. Canary fires every Monday morning, causing alert spam.
**Why it happens:** A single zero-item poll trigger fires too eagerly.
**How to avoid:** Require 2 consecutive zero-item polls (`canaryZeroStreak >= 2`) before firing. A single zero poll only increments the streak counter. The streak resets to 0 on any successful non-empty poll.
**Warning signs:** Canary alerts fire every Monday; `ingestion_status.isHealthy` false for ftc_rss/doj_rss sources.

### Pitfall 6: CourtListener Auto-Disabling the Webhook

**What goes wrong:** After 8 consecutive delivery failures, CourtListener auto-disables our webhook endpoint. Docket updates stop arriving with no alert.
**Why it happens:** If the webhook endpoint is down, behind auth middleware (401), or returning 500, CourtListener counts failures toward the 8-failure auto-disable threshold.
**How to avoid:** Ensure the webhook route is always accessible without auth. Log all webhook receipts. Monitor the `ingestion_status.lastSuccessfulSync` for `courtlistener` — if it goes stale for >1 hour, investigate.
**Warning signs:** `courtlistener` `ingestion_status.isHealthy` drops to false; no new COURT events for >30 min.

### Pitfall 7: PACER Credential Health Without Real PACER Calls

**What goes wrong:** Confusion about whether Phase 4 needs to make actual PACER API calls to CourtListener's RECAP Fetch endpoint.
**What's correct:** Phase 4 does NOT need RECAP Fetch. COURT-04 only requires tracking the password rotation date for the expiry warning UI. CourtListener's own archive provides all necessary docket entry metadata without purchasing PACER documents.
**How to avoid:** Set `PACER_PASSWORD_LAST_CHANGED` env var to the ISO date of the last PACER password change. The health endpoint computes days-until-expiry in pure TypeScript arithmetic — no API call.

---

## Code Examples

### CourtListener Docket Search

```typescript
// Source: https://www.courtlistener.com/help/api/rest/v4/search/
const query = `caseName:"${targetName}" AND ("merger" OR "acquisition" OR "antitrust")`;
const url = `https://www.courtlistener.com/api/rest/v4/search/?type=d&q=${encodeURIComponent(query)}&order_by=score+desc&count=10`;

const res = await fetch(url, {
  headers: {
    Authorization: `Token ${process.env.COURTLISTENER_API_TOKEN}`,
    'User-Agent': 'j16z-research/1.0 (compliance@j16z.io)',
  },
});
const data = await res.json();
// { count: number, results: [{ id, case_name, docket_number, court, date_filed, ... }] }
```

### Subscribe to Docket Alerts (v4 — confirmed current)

```typescript
// Source: https://www.courtlistener.com/help/api/rest/alerts/ (verified 2026-03-13)
// v4 is fully supported — use /api/rest/v4/docket-alerts/
const res = await fetch('https://www.courtlistener.com/api/rest/v4/docket-alerts/', {
  method: 'POST',
  headers: {
    Authorization: `Token ${process.env.COURTLISTENER_API_TOKEN}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: `docket=${docketId}`,
});
// Returns { id, docket, alert_type } — store `id` as courtlistenerAlertId in event metadata
```

### Webhook Payload Zod Schema

```typescript
// Source: https://www.courtlistener.com/help/api/webhooks/ (verified 2026-03-13)
// Docket alert webhook — event_type 1 — sends new docket entries
const docketEntrySchema = z.object({
  id: z.number(),
  description: z.string().nullable(),
  entry_number: z.number().nullable(),
  date_filed: z.string().nullable(),
  recap_documents: z.array(z.object({
    id: z.number(),
    description: z.string().nullable(),
  })).optional(),
}).passthrough();

const courtListenerWebhookSchema = z.object({
  webhook: z.object({
    event_type: z.number(), // 1 = docket alert, 2 = search alert, 3 = old docket alert
    version: z.number(),
  }),
  payload: z.object({
    results: z.array(z.object({
      docket: z.number(),
      case_name: z.string().optional(),
      docket_entries: z.array(docketEntrySchema).optional(),
    })),
  }),
}).passthrough();
```

### Dedup by Idempotency-Key (webhook handler)

```typescript
// Source: CourtListener webhook docs — Idempotency-Key is a 128-bit UUID
// Store key in event metadata on first processing; check before processing
const idempotencyKey = c.req.header('Idempotency-Key');
if (idempotencyKey) {
  const exists = await adminDb
    .select({ id: schema.events.id })
    .from(schema.events)
    .where(sql`${schema.events.metadata} ->> 'idempotencyKey' = ${idempotencyKey}`)
    .limit(1);
  if (exists.length > 0) return c.json({ ok: true }); // idempotent
}
// When creating the first event from this webhook payload, include idempotencyKey in metadata
```

### Existing Agency RSS Pattern (confirmed working — replicate for CourtListener)

```typescript
// Source: apps/api/src/agency/rss-pollers.ts (existing, working code)
// Copy this exact try/catch + updateIngestionStatus pattern
export async function handleCourtListenerPoll(job: Job): Promise<void> {
  console.log(`[courtlistener_poll] Starting (triggered by: ${job.data.triggeredBy})`);
  let createdCount = 0;
  try {
    // ... polling logic ...
    await updateIngestionStatus('courtlistener', true, undefined, createdCount);
    console.log(`[courtlistener_poll] Complete. Created ${createdCount} COURT events.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown courtlistener_poll error';
    await updateIngestionStatus('courtlistener', false, message, createdCount);
    throw error;
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CourtListener v3 for docket-alert subscriptions | v4 for all endpoints including docket-alerts | Confirmed current (2026-03-13) | Prior research was wrong; use v4 uniformly |
| Anonymous CourtListener requests | Auth required (v4.3+) | v4.3 release | 401 for all unauthenticated v4 requests |
| Hardcoded RSS materiality score (40) | Keyword-based scoring (30-70) | Phase 4 plan | More relevant news items surface higher in Inbox |
| Manual PACER docket checks | CourtListener webhook push + fallback poll | CourtListener v4 API | Sub-30-min latency for docket updates |
| FTC Early Termination API only | FTC API + FTC press release RSS + DOJ RSS + DOJ civil RSS | Phase 4 | Full agency event coverage |

**Deprecated/outdated:**
- CourtListener v3 REST API for docket-alerts: superseded by v4; use `/api/rest/v4/docket-alerts/` for all alert CRUD operations.
- Hardcoded `materialityScore: 40` in `rss/poller.ts`: replace with `scoreRssItem()` function.

---

## Open Questions

1. **CourtListener webhook IP changes**
   - What we know: IPs `34.210.230.218` and `54.189.59.91` confirmed in current official docs (2026-03-13).
   - What's unclear: These IPs may change with infrastructure updates; CourtListener does not provide a DNS name for verification.
   - Recommendation: Log the incoming IP on every webhook call. Treat the allowlist as defense-in-depth, not sole security. Monitor logs if webhook calls stop.

2. **Docket subscription storage for deals with no firmId**
   - What we know: `deals.firmId` is nullable for auto-discovered EDGAR deals; `createCourtEvent` requires a `firmId`.
   - What's unclear: Should the poller skip deals with `firmId = null`?
   - Recommendation: Skip deals where `firmId IS NULL` in the CourtListener poller. Auto-discovered deals are unclaimed; no firm to associate the COURT event with.

3. **Canary baseline storage when ingestion_status row doesn't exist yet**
   - What we know: `updateIngestionStatus` uses `onConflictDoUpdate`; first call creates the row. The `checkCanary` function reads the row first.
   - What's unclear: On first run, the `ingestion_status` row for `ftc_rss` / `doj_rss` / `doj_civil_rss` may not exist.
   - Recommendation: `checkCanary` should handle `rows[0] === undefined` gracefully — treat as first run, do not fire canary, let `handleAgencyRss` create the row via `updateIngestionStatus`.

4. **IntegrationHealth return type change in api.ts**
   - What we know: `getIntegrationHealth()` currently returns `IntegrationHealth[]`. The new backend response is `{ sources: IntegrationHealth[], pacerCredential: {...} }`.
   - What's unclear: Whether to change the function return type or add a separate `getPacerCredentialHealth()` function.
   - Recommendation: Return the full `{ sources, pacerCredential }` object and update the `IntegrationsTab` caller to destructure. Simpler to keep one fetch call.

---

## What's Already Implemented (do NOT re-implement)

This section is critical for the planner. These features exist and are working in the `rehaul` branch:

| Feature | File | Status |
|---------|------|--------|
| FTC Early Termination API poller | `apps/api/src/agency/ftc-poller.ts` | Complete |
| FTC Competition RSS poller | `apps/api/src/agency/rss-pollers.ts:handleFtcCompetitionRss` | Complete |
| DOJ Antitrust RSS poller | `apps/api/src/agency/rss-pollers.ts:handleDojAntitrustRss` | Complete |
| DOJ Civil RSS poller | `apps/api/src/agency/rss-pollers.ts:handleDojCivilRss` | Complete |
| M&A keyword filtering | `apps/api/src/agency/rss-pollers.ts:isMaRelevant` | Complete |
| Agency event creation | `apps/api/src/agency/event-factory.ts:createAgencyEvent` | Complete |
| Ingestion status tracking | `apps/api/src/agency/event-factory.ts:updateIngestionStatus` | Complete |
| BullMQ scheduler (6 jobs) | `apps/api/src/queues/scheduler.ts` | Complete |
| Worker dispatcher (7 handlers) | `apps/api/src/worker.ts` | Complete |
| RSS feed CRUD routes | `apps/api/src/routes/rss-feeds.ts` | Complete (POST, GET, PATCH, DELETE) |
| RSS feed poller | `apps/api/src/rss/poller.ts` | Complete (keyword scoring gap only) |
| RSS feed schema | `apps/api/src/db/schema.ts:rssFeeds` | Complete |
| Integrations health endpoint | `apps/api/src/routes/integrations.ts:GET /health` | Complete (needs displayName + pacerCredential extension) |
| Frontend RSSFeedsTab | `apps/j16z-frontend/src/components/settings/rss-feeds-tab.tsx` | Complete — wired to real API |
| Frontend IntegrationsTab | `apps/j16z-frontend/src/components/settings/integrations-tab.tsx` | Complete — needs displayName wiring |
| Frontend api.ts for RSS feeds | `apps/j16z-frontend/src/lib/api.ts` | Complete (getRSSFeeds, createRSSFeed, etc.) |
| Shared deal matcher | `apps/api/src/shared/deal-matcher.ts:matchCompanyToDeal` | Complete |

**What does NOT exist yet (must build in Phase 4):**
- `apps/api/src/courtlistener/` directory (entire CourtListener integration)
- `apps/api/src/routes/webhooks.ts` (webhook Hono router)
- Canary monitor logic in `agency/rss-pollers.ts`
- `SOURCE_DISPLAY_NAMES` map and PACER health in `routes/integrations.ts`
- Keyword-based `scoreRssItem()` in `rss/poller.ts`
- `displayName` field in frontend `IntegrationHealth` type and PACER warning banner in `IntegrationsTab`

---

## Sources

### Primary (HIGH confidence — verified 2026-03-13)

- CourtListener Webhook API docs — https://www.courtlistener.com/help/api/webhooks/ — IPs (34.210.230.218, 54.189.59.91), payload format, retry behavior (7 retries, ~54hr window), Idempotency-Key
- CourtListener Alert APIs docs — https://www.courtlistener.com/help/api/rest/alerts/ — confirmed v4 for docket-alerts POST with `docket` form field; `alert_type` optional
- CourtListener REST API v4.3 overview — https://www.courtlistener.com/help/api/rest/ — 5,000 req/hr rate limit, Token auth, v4.3 enforces 401 for anonymous
- CourtListener REST API changelog — https://www.courtlistener.com/help/api/rest/changes/ — v4.4 adds bankruptcy, v4.3 enforces auth, v4.2 field selection, v4.1 count/cursor
- Codebase: `apps/api/src/agency/` — FTC/DOJ RSS pollers (directly readable, working)
- Codebase: `apps/api/src/rss/poller.ts` — RSS feed poller (directly readable, working)
- Codebase: `apps/api/src/db/schema.ts` — current schema with `ingestionStatus.metadata` jsonb

### Secondary (MEDIUM confidence)

- CourtListener v4 migration guide — https://www.courtlistener.com/help/api/rest/v4/migration-guide/ — cursor pagination, v3 non-deprecation note, search type changes
- DOJ Antitrust news feeds — https://www.justice.gov/atr/news-feeds — civil case feed URL confirmed
- npm rss-parser package — https://www.npmjs.com/package/rss-parser — current version ^3.13.0 installed, confirmed sufficient for FTC/DOJ feeds

### Tertiary (LOW confidence — verify at implementation)

- CourtListener source IPs: obtained from official docs but may rotate with infrastructure changes — log IP on every webhook call and verify against current docs at implementation time
- FTC competition RSS URL `https://www.ftc.gov/feeds/press-release-competition.xml`: confirmed in codebase but returns 403 to direct HTTP clients; rss-parser successfully fetches it — verify this still works at implementation time

---

## Metadata

**Confidence breakdown:**
- FTC/DOJ/RSS stack (AGENCY-01 to -03, RSS-01 to -02): HIGH — code exists and is directly readable
- CourtListener API (COURT-01, COURT-02): HIGH — official docs verified 2026-03-13
- Docket-alerts v4 endpoint: HIGH — confirmed by current official alert docs (corrects prior research)
- CourtListener webhook IPs: MEDIUM — from official docs but may rotate
- PACER credential 180-day policy: HIGH — confirmed in CourtListener RECAP Fetch docs
- Canary monitor pattern: HIGH — design is straightforward extension of existing ingestion status
- RSS keyword scoring (RSS-03): HIGH — pattern is clear; thresholds are discretionary

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (30 days — CourtListener API is stable; verify IP allowlist before implementation)
