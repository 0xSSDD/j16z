# Phase 5: Alert Delivery + Market Data - Research

**Researched:** 2026-03-13
**Domain:** Alert delivery (email/Slack/webhook), market data polling, spread computation
**Confidence:** HIGH

## Summary

Phase 5 has two distinct subsystems: (1) an alert pipeline that evaluates scored events against user-configured AlertRules and delivers notifications via email (Resend), Slack (incoming webhooks), and generic webhooks; and (2) a market data poller that fetches stock quotes, computes merger arbitrage spreads, stores snapshots, and displays data-age indicators on the deal board.

The alert pipeline follows the existing BullMQ worker pattern established in Phases 2-4. A new `alert_evaluate` job is enqueued whenever an event is created/scored. The worker loads matching AlertRules, evaluates threshold + channel config, and dispatches to delivery handlers. Resend is the standard email SDK for this stack (same ecosystem as React Email, used in Phase 6 for digests). Slack delivery uses `@slack/webhook` (official SDK). Webhook delivery is a plain `fetch()` POST with HMAC signing.

For market data, Alpha Vantage is the recommended vendor. IEX Cloud shut down August 2024 and is eliminated. Polygon.io (now Massive.com) has a free tier limited to 5 calls/minute which is insufficient for polling multiple deal tickers every 5 minutes. Alpha Vantage's free tier (25 requests/day) is also tight but their $49.99/month plan gives 75 req/min with no daily cap -- adequate for MVP. The GLOBAL_QUOTE endpoint returns last price, volume, and change -- sufficient for spread computation. The system should be vendor-agnostic with an adapter interface so switching to Polygon later is a config change.

**Primary recommendation:** Use Resend for email, @slack/webhook for Slack, Alpha Vantage (GLOBAL_QUOTE) for market data with vendor-adapter pattern, and extend the existing BullMQ worker with `alert_evaluate` and `market_data_poll` job handlers.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ALERT-01 | Email alerts on CRITICAL events (score >=70) | Resend SDK; alert-worker evaluates AlertRules; email delivery handler |
| ALERT-02 | Slack alerts on CRITICAL events (score >=70) | @slack/webhook; same alert-worker pipeline |
| ALERT-03 | Slack-only alerts on WARNING events (50-70) | AlertRule threshold + channel filtering in worker |
| ALERT-04 | Per-deal alert threshold overrides | alertRules table already exists with dealId (nullable = global) and threshold column |
| ALERT-05 | Configurable delivery channels per alert rule | alertRules.channels text array already in schema |
| ALERT-06 | Webhook delivery for external systems | fetch() POST with HMAC-SHA256 signing; notification_log for audit |
| MKT-01 | Poll market data API for spread/price | Alpha Vantage GLOBAL_QUOTE endpoint; BullMQ cron `*/5 * * * *` |
| MKT-02 | Compute implied consideration and spreads | Formula: grossSpread = (offerPrice - currentPrice) / offerPrice * 100; annualized = (1 + grossSpread/100)^(365/daysToClose) - 1 |
| MKT-03 | Store market snapshots with timestamps | marketSnapshots table already exists in schema with all needed columns |
| MKT-04 | Data-age indicator on spread display | Frontend badge: green (<5min), yellow (5-30min), red (>30min) based on latest snapshot timestamp |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| resend | ^4.0 | Email delivery API | Developer-first email API; React Email ecosystem; simple send() interface; 100 emails/day free tier |
| @slack/webhook | ^7.0 | Slack incoming webhook | Official Slack SDK; typed; handles retries; Block Kit support |
| bullmq | ^5.70 | Job queue (already installed) | Already used for ingestion jobs; extend with alert_evaluate + market_data_poll |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @react-email/components | ^0.0.30 | Email template components | Phase 6 digests primarily; Phase 5 can use simple HTML for alert emails |

### Market Data Vendor Decision

**Use Alpha Vantage** (resolves STATE.md blocker).

| Vendor | Free Tier | Paid Tier | Verdict |
|--------|-----------|-----------|---------|
| Alpha Vantage | 25 req/day, 5/min | $49.99/mo: 75/min, no daily cap | **Recommended** -- adequate for MVP; cheapest paid tier |
| Polygon.io (Massive) | 5 req/min | $29/mo Starter: unlimited | Good alternative; slightly more complex API |
| IEX Cloud | **SHUT DOWN Aug 2024** | N/A | **Eliminated** |

Alpha Vantage rationale:
- GLOBAL_QUOTE endpoint returns exactly what we need (price, volume, change)
- Free tier works for dev/testing (25 deals = 25 calls/day at once-daily polling)
- $49.99/mo production tier is cheap for a SaaS product
- No SDK needed -- plain fetch() with API key param
- Vendor-adapter pattern means switching to Polygon later is trivial

### Slack Integration Decision

**Use incoming webhooks** (resolves STATE.md blocker).

| Approach | Complexity | User Setup | Verdict |
|----------|------------|------------|---------|
| Incoming Webhook URL | Low -- user pastes URL | User creates webhook in Slack admin | **Recommended for MVP** |
| OAuth App | High -- OAuth flow, token management | User clicks "Add to Slack" | Defer to post-MVP |

Incoming webhook rationale:
- No OAuth flow needed (no Slack app review)
- User pastes webhook URL into Settings > Alert Rules
- @slack/webhook SDK handles the HTTP POST
- Block Kit formatting for rich alert messages
- Can upgrade to OAuth app later without breaking existing webhooks

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Resend | SendGrid, AWS SES | Resend is simpler API, better DX; SES is cheaper at scale but complex setup |
| Alpha Vantage | Polygon.io | Polygon has better real-time but more expensive; AV sufficient for 5-min polling |
| @slack/webhook | Plain fetch() | SDK handles retries, errors, typing; worth the 15KB dependency |

**Installation:**
```bash
cd apps/api && pnpm add resend @slack/webhook
```

No Alpha Vantage SDK needed -- use plain fetch().

## Architecture Patterns

### Recommended Project Structure
```
apps/api/src/
  alerts/
    alert-worker.ts        # BullMQ handler: evaluate AlertRules, dispatch to channels
    email-delivery.ts      # Resend email send with HTML template
    slack-delivery.ts      # @slack/webhook send with Block Kit
    webhook-delivery.ts    # Generic webhook POST with HMAC signing
    types.ts               # AlertEvaluationResult, DeliveryPayload
  market/
    market-poller.ts       # BullMQ handler: fetch quotes, compute spreads, store snapshots
    quote-adapter.ts       # Vendor-agnostic interface + Alpha Vantage implementation
    spread-calculator.ts   # Implied consideration + gross/annualized spread formulas
    types.ts               # QuoteResult, SpreadComputation
  routes/
    alert-rules.ts         # CRUD for alert_rules (already in schema)
    market-snapshots.ts    # GET latest + history for deal
  db/
    schema.ts              # Add notification_log table
```

### Pattern 1: Event-Driven Alert Evaluation
**What:** When any event is created (FILING, COURT, AGENCY, NEWS), enqueue an `alert_evaluate` job with the event ID. The alert worker loads the event, finds matching AlertRules (global + deal-specific), checks threshold, and dispatches to configured channels.
**When to use:** Every event creation across all ingestion pipelines.
**Example:**
```typescript
// In any event-factory (edgar, courtlistener, agency, rss):
// After inserting event into DB:
await ingestionQueue.add('alert_evaluate', {
  eventId: insertedEvent.id,
  firmId: insertedEvent.firmId,
  dealId: insertedEvent.dealId,
  materialityScore: insertedEvent.materialityScore,
  severity: insertedEvent.severity,
});
```

### Pattern 2: Vendor-Agnostic Market Data Adapter
**What:** Interface for fetching stock quotes, with Alpha Vantage as the default implementation. Allows swapping vendors without changing the poller.
**When to use:** All market data fetching.
**Example:**
```typescript
// Source: project architecture pattern
interface QuoteAdapter {
  getQuote(symbol: string): Promise<QuoteResult>;
}

interface QuoteResult {
  symbol: string;
  price: number;
  previousClose: number;
  volume: number;
  timestamp: Date;
}

class AlphaVantageAdapter implements QuoteAdapter {
  private apiKey: string;
  constructor(apiKey: string) { this.apiKey = apiKey; }

  async getQuote(symbol: string): Promise<QuoteResult> {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    const quote = data['Global Quote'];
    return {
      symbol: quote['01. symbol'],
      price: parseFloat(quote['05. price']),
      previousClose: parseFloat(quote['08. previous close']),
      volume: parseInt(quote['06. volume'], 10),
      timestamp: new Date(),
    };
  }
}
```

### Pattern 3: Notification Log for Dedup/Audit
**What:** Every alert delivery attempt is logged to `notification_log` table. Dedup check prevents sending the same event to the same user+channel twice. Provides audit trail for compliance.
**When to use:** Before every delivery attempt.
**Example:**
```typescript
// Check dedup before sending
const existing = await adminDb.select()
  .from(schema.notificationLog)
  .where(and(
    eq(schema.notificationLog.eventId, eventId),
    eq(schema.notificationLog.userId, userId),
    eq(schema.notificationLog.channel, channel),
  ))
  .limit(1);

if (existing.length > 0) return; // Already sent

// Send, then log
await sendEmail(/* ... */);
await adminDb.insert(schema.notificationLog).values({
  firmId, eventId, userId, channel: 'email',
  status: 'sent', sentAt: new Date(),
});
```

### Pattern 4: Spread Computation
**What:** Compute gross spread and annualized return from current price vs deal terms.
**When to use:** After fetching a new quote for a deal ticker.
**Example:**
```typescript
// Source: merger arbitrage standard formulas
interface SpreadComputation {
  grossSpread: number;       // percentage
  annualizedReturn: number;  // percentage
  impliedConsideration: number; // dollar value
}

function computeSpread(
  currentPrice: number,
  offerPrice: number,        // pricePerShare from deal
  exchangeRatio: number | null, // for STOCK deals
  acquirerPrice: number | null, // for STOCK/MIXED deals
  daysToClose: number,
): SpreadComputation {
  // For CASH deals: implied = offerPrice
  // For STOCK deals: implied = exchangeRatio * acquirerPrice
  // For MIXED: implied = cashComponent + exchangeRatio * acquirerPrice
  const impliedConsideration = exchangeRatio && acquirerPrice
    ? exchangeRatio * acquirerPrice
    : offerPrice;

  const grossSpread = ((impliedConsideration - currentPrice) / currentPrice) * 100;
  const annualizedReturn = (Math.pow(1 + grossSpread / 100, 365 / Math.max(daysToClose, 1)) - 1) * 100;

  return { grossSpread, annualizedReturn, impliedConsideration };
}
```

### Anti-Patterns to Avoid
- **Sending alerts synchronously in the event factory:** Always enqueue an `alert_evaluate` job. Never block event creation on email/Slack delivery.
- **Polling market data per-deal separately:** Batch all deal tickers into a single poller run. Use Alpha Vantage's GLOBAL_QUOTE sequentially with rate limiting (not parallel fetch storms).
- **Storing webhook secrets in alertRules table plaintext:** Use environment-level encryption or at minimum a separate secrets column with server-side-only access.
- **Hardcoding Alpha Vantage API calls:** Use the adapter interface. The vendor will likely change as the product scales.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email delivery | Custom SMTP client | Resend SDK | Deliverability, bounce handling, domain verification, analytics |
| Slack messaging | Raw HTTP POST | @slack/webhook | Retry logic, error handling, rate limiting, typed responses |
| Job scheduling | Custom setInterval loop | BullMQ cron (already in use) | Persistence, retry, concurrency control, dead letter queue |
| Spread calculation | N/A (must hand-roll) | Custom `spread-calculator.ts` | Domain-specific; no library exists. But isolate in a pure function with unit tests |
| Rate limiting (market API) | Custom counter | `limiter` (already installed) | Token bucket already used for EDGAR; reuse for Alpha Vantage |
| Email templates | String concatenation HTML | Inline HTML with template literals | Phase 5 alerts are simple; Phase 6 adds react-email for digests |

**Key insight:** The alert pipeline is a "fan-out" problem: one event triggers N notifications to M users across K channels. BullMQ handles the queue, but the evaluation logic (which users, which rules, which channels) must be carefully designed to avoid N*M*K job explosion. Evaluate all rules in a single worker job, then dispatch deliveries.

## Common Pitfalls

### Pitfall 1: Alert Storm on Bulk Ingestion
**What goes wrong:** When EDGAR poll ingests 50 filings at once, each creates an event, each enqueues alert_evaluate. 50 evaluations run simultaneously, potentially sending 50 emails in rapid succession.
**Why it happens:** No batching or debouncing in the alert pipeline.
**How to avoid:** Add a short delay (e.g., `delay: 5000` on alert_evaluate jobs). Use notification_log dedup to prevent duplicate alerts for the same deal within a configurable window (e.g., 15 minutes). Consider a per-user rate limit of max 5 emails per 15-minute window.
**Warning signs:** Users complaining about email floods; Resend rate limit errors.

### Pitfall 2: Alpha Vantage Rate Limiting
**What goes wrong:** Polling 20 deal tickers every 5 minutes = 20 API calls per run. Free tier allows 5/min. Even paid tier (75/min) can be hit if multiple pollers run concurrently.
**Why it happens:** No rate limiter on outbound API calls.
**How to avoid:** Use the existing `limiter` package (RateLimiter from `limiter` v3) at 4 req/min for free tier or 60 req/min for paid. Process tickers sequentially with the rate limiter, not in parallel.
**Warning signs:** HTTP 429 responses from Alpha Vantage; gaps in spread data.

### Pitfall 3: Stale Spread Data Outside Market Hours
**What goes wrong:** Market data poller runs 24/7 but US markets close at 4 PM ET. Weekend/after-hours polls return the same stale data, wasting API quota and creating misleading "fresh" snapshots.
**Why it happens:** No market hours awareness in the poller.
**How to avoid:** Check if current time is within market hours (9:30 AM - 4:00 PM ET, Mon-Fri) before polling. Skip polling outside market hours. Set data-age badge to show "Market Closed" state.
**Warning signs:** Flat spread history lines during weekends; API quota consumed unnecessarily.

### Pitfall 4: Slack Webhook URL Revocation
**What goes wrong:** Slack automatically revokes webhook URLs that receive too many errors (leaked secrets, invalid payloads). Once revoked, all alerts silently fail.
**Why it happens:** No error tracking or health monitoring on delivery channels.
**How to avoid:** Log delivery status in notification_log. Track consecutive failures per webhook URL. Alert the user (via email fallback) when Slack delivery has failed 3+ times. Provide a "Test Webhook" button in Settings.
**Warning signs:** notification_log shows increasing 'failed' entries for Slack channel.

### Pitfall 5: Webhook Replay Attacks
**What goes wrong:** Generic webhook delivery without signing allows attackers to forge event notifications to customer endpoints.
**Why it happens:** No request authentication on outbound webhooks.
**How to avoid:** Sign webhook payloads with HMAC-SHA256 using a per-rule secret. Include timestamp in signature to prevent replay. Document the verification process for customers.
**Warning signs:** Customer reports receiving unexpected webhook calls.

### Pitfall 6: Notification Dedup Failure
**What goes wrong:** Same event triggers alerts from multiple rule matches (global + deal-specific), sending duplicate notifications to the same user on the same channel.
**Why it happens:** Rules evaluated independently without cross-rule dedup.
**How to avoid:** notification_log with unique constraint on (eventId, userId, channel). Check before each send. Return early if already sent.
**Warning signs:** Users receiving 2-3 identical emails for one event.

## Code Examples

### Alert Worker Handler
```typescript
// Source: project architecture pattern (extends existing worker.ts pattern)
import { adminDb } from '../db/index.js';
import * as schema from '../db/schema.js';
import { and, eq, gte, isNull, or } from 'drizzle-orm';
import type { Job } from 'bullmq';

interface AlertEvaluateData {
  eventId: string;
  firmId: string;
  dealId: string | null;
  materialityScore: number;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
}

export async function handleAlertEvaluate(job: Job<AlertEvaluateData>): Promise<void> {
  const { eventId, firmId, dealId, materialityScore, severity } = job.data;

  // INFO events never trigger push alerts
  if (severity === 'INFO') return;

  // Find matching alert rules: global (dealId IS NULL) + deal-specific
  const rules = await adminDb
    .select()
    .from(schema.alertRules)
    .where(and(
      eq(schema.alertRules.firmId, firmId),
      eq(schema.alertRules.isActive, true),
      isNull(schema.alertRules.deletedAt),
      // Rule threshold must be <= event score
      // Rule must be global OR match this deal
      or(
        isNull(schema.alertRules.dealId),
        dealId ? eq(schema.alertRules.dealId, dealId) : undefined,
      ),
    ));

  // Filter by threshold
  const matchingRules = rules.filter(r => materialityScore >= r.threshold);

  // Load event details for message content
  const [event] = await adminDb
    .select()
    .from(schema.events)
    .where(eq(schema.events.id, eventId))
    .limit(1);
  if (!event) return;

  // Dispatch to channels (dedup handled in each delivery function)
  for (const rule of matchingRules) {
    for (const channel of rule.channels) {
      switch (channel) {
        case 'email':
          if (severity === 'CRITICAL') {
            await deliverEmail(rule, event);
          }
          break;
        case 'slack':
          await deliverSlack(rule, event);
          break;
        case 'webhook':
          if (rule.webhookUrl) {
            await deliverWebhook(rule, event);
          }
          break;
      }
    }
  }
}
```

### Resend Email Delivery
```typescript
// Source: Resend official docs (resend.com/docs/send-with-nodejs)
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendAlertEmail(
  to: string,
  event: { title: string; description: string; severity: string; sourceUrl: string },
  dealName: string,
): Promise<{ success: boolean; messageId?: string }> {
  const severityColor = event.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b';

  const { data, error } = await resend.emails.send({
    from: 'j16z Alerts <alerts@yourdomain.com>',
    to: [to],
    subject: `[${event.severity}] ${event.title}`,
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #18181b; color: #fafafa; padding: 24px; border-radius: 8px;">
        <div style="border-left: 4px solid ${severityColor}; padding-left: 16px; margin-bottom: 16px;">
          <h2 style="margin: 0; color: ${severityColor};">${event.severity}</h2>
          <h3 style="margin: 4px 0 0 0;">${event.title}</h3>
        </div>
        <p style="color: #a1a1aa;">${dealName}</p>
        <p>${event.description}</p>
        <a href="${event.sourceUrl}" style="color: #f59e0b;">View Source</a>
      </div>
    `,
  });

  if (error) {
    console.error('[alert-email] Send failed:', error);
    return { success: false };
  }
  return { success: true, messageId: data?.id };
}
```

### Slack Block Kit Alert Message
```typescript
// Source: Slack docs (docs.slack.dev/messaging/sending-messages-using-incoming-webhooks)
import { IncomingWebhook } from '@slack/webhook';

export async function sendSlackAlert(
  webhookUrl: string,
  event: { title: string; description: string; severity: string; sourceUrl: string },
  dealName: string,
): Promise<boolean> {
  const webhook = new IncomingWebhook(webhookUrl);
  const emoji = event.severity === 'CRITICAL' ? ':red_circle:' : ':large_orange_circle:';

  try {
    await webhook.send({
      text: `${emoji} ${event.severity}: ${event.title}`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `${event.severity}: ${event.title}` },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Deal:*\n${dealName}` },
            { type: 'mrkdwn', text: `*Severity:*\n${event.severity}` },
          ],
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: event.description },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View Source' },
              url: event.sourceUrl,
            },
          ],
        },
      ],
    });
    return true;
  } catch (err) {
    console.error('[alert-slack] Send failed:', err);
    return false;
  }
}
```

### Alpha Vantage Quote Fetch
```typescript
// Source: Alpha Vantage official docs (alphavantage.co/documentation)
export async function fetchAlphaVantageQuote(
  symbol: string,
  apiKey: string,
): Promise<QuoteResult | null> {
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const quote = data['Global Quote'];

  // Alpha Vantage returns empty object on invalid symbol or rate limit
  if (!quote || !quote['05. price']) return null;

  return {
    symbol: quote['01. symbol'],
    price: parseFloat(quote['05. price']),
    open: parseFloat(quote['02. open']),
    high: parseFloat(quote['03. high']),
    low: parseFloat(quote['04. low']),
    volume: parseInt(quote['06. volume'], 10),
    previousClose: parseFloat(quote['08. previous close']),
    change: parseFloat(quote['09. change']),
    changePercent: quote['10. change percent'],
    timestamp: new Date(),
  };
}
```

### Data-Age Badge Component
```typescript
// Source: project UX spec (CLAUDE.md)
function DataAgeBadge({ lastUpdated }: { lastUpdated: Date | null }) {
  if (!lastUpdated) return <span className="text-xs text-muted-foreground">No data</span>;

  const ageMinutes = (Date.now() - lastUpdated.getTime()) / 60000;
  const color = ageMinutes < 5 ? 'bg-green-500' : ageMinutes < 30 ? 'bg-yellow-500' : 'bg-red-500';
  const label = ageMinutes < 1 ? 'Live' : ageMinutes < 60 ? `${Math.round(ageMinutes)}m ago` : `${Math.round(ageMinutes / 60)}h ago`;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono ${color} text-zinc-950`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
```

## Schema Additions

### notification_log Table (New)
```typescript
// Add to apps/api/src/db/schema.ts
export const notificationLog = pgTable('notification_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  firmId: uuid('firm_id').references(() => firms.id).notNull(),
  eventId: uuid('event_id').references(() => events.id).notNull(),
  alertRuleId: uuid('alert_rule_id').references(() => alertRules.id).notNull(),
  userId: uuid('user_id').notNull(),
  channel: text('channel').notNull(), // 'email' | 'slack' | 'webhook'
  status: text('status').notNull().default('pending'), // 'pending' | 'sent' | 'failed'
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  ...timestamps,
}, () => firmIsolationPolicies());
```

### Existing Tables Already Sufficient
- **alertRules**: Already has `dealId` (nullable=global), `threshold`, `channels` array, `webhookUrl`, `isActive` -- no schema changes needed
- **marketSnapshots**: Already has `currentPrice`, `targetPrice`, `acquirerPrice`, `grossSpread`, `annualizedReturn`, `volume`, `timestamp` -- no schema changes needed
- **deals**: Already has `grossSpread`, `annualizedReturn`, `currentPrice` columns for denormalized latest values

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| IEX Cloud for market data | Alpha Vantage or Polygon.io | Aug 2024 (IEX shutdown) | Must use alternative vendor |
| SendGrid/Mailgun for email | Resend | 2023-present | Better DX, React Email ecosystem |
| Slack legacy webhooks | @slack/webhook v7+ | 2024 | Official SDK with Block Kit support |
| Polygon.io | Massive.com (rebranded) | 2025 | Same API, new domain name |

**Deprecated/outdated:**
- IEX Cloud: Shut down Aug 31, 2024. Do not use.
- Slack legacy token-based webhooks: Use incoming webhooks via Slack app configuration.

## Open Questions

1. **Alpha Vantage API key management**
   - What we know: API key is a single string, passed as query param
   - What's unclear: Whether to use one key per firm or one global key
   - Recommendation: Single global API key in env vars (ALPHA_VANTAGE_API_KEY). Market data is not firm-specific -- all firms see the same stock prices. Rate limit is per-key, so one key is simpler.

2. **Webhook secret generation and storage**
   - What we know: HMAC-SHA256 signing needs a per-rule secret
   - What's unclear: Where to store secrets (alertRules table vs separate vault)
   - Recommendation: Generate a random 32-byte hex secret when creating a webhook rule. Store in alertRules.webhookSecret (new column, never returned to client in list views). Display once on creation.

3. **Exchange ratio for STOCK/MIXED deals**
   - What we know: Deals table has `considerationType` but no `exchangeRatio` column
   - What's unclear: Whether to add exchangeRatio to deals schema or store in deal metadata
   - Recommendation: Add `exchangeRatio numeric` column to deals table in the migration. Required for STOCK deal spread computation. For MVP, most tracked deals are CASH (simpler), but the column should exist.

## Sources

### Primary (HIGH confidence)
- Alpha Vantage official documentation (alphavantage.co/documentation) - GLOBAL_QUOTE endpoint specification
- Resend official docs (resend.com/docs/send-with-nodejs) - Node.js SDK usage
- Slack official docs (docs.slack.dev/messaging/sending-messages-using-incoming-webhooks) - Incoming webhook format
- Project schema.ts - Existing alertRules and marketSnapshots table definitions

### Secondary (MEDIUM confidence)
- IEX Cloud shutdown confirmed via multiple sources (iexcloud.org, alphavantage.co migration guide) - Aug 31, 2024
- Alpha Vantage pricing ($49.99/mo for 75 req/min) - from alphavantage.co/premium and third-party reviews
- Polygon.io/Massive.com rebrand and pricing - from multiple sources

### Tertiary (LOW confidence)
- Specific Alpha Vantage rate limit numbers for free tier (25/day, 5/min) - WebSearch only, verify during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Resend, @slack/webhook are well-documented with official SDKs; BullMQ is already in use
- Architecture: HIGH - Follows established project patterns (worker.ts, event-factory, scheduler)
- Market data vendor: MEDIUM - Alpha Vantage recommended but pricing/limits should be verified at signup
- Pitfalls: HIGH - Based on real production patterns for alert systems and market data polling

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (30 days -- stable domain, vendor pricing may change)
