import { Queue } from 'bullmq';
import { and, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { adminDb } from '../db/index.js';
import * as schema from '../db/schema.js';
import { redisConnection } from '../queues/connection.js';
import { COURTLISTENER_IPS, courtListenerWebhookSchema } from '../courtlistener/types.js';

// ---------------------------------------------------------------------------
// Webhook routes — NO auth middleware
//
// These routes are registered on the ROOT Hono app (before api.basePath('/api'))
// so that CourtListener push notifications are never rejected by authMiddleware.
//
// CourtListener retries webhooks up to 7 times if it doesn't receive a 2xx
// response quickly. All processing is async (enqueued via BullMQ).
// ---------------------------------------------------------------------------
export const webhooksRoutes = new Hono();

/**
 * POST /api/webhooks/courtlistener
 *
 * Receives push notifications from CourtListener when a tracked docket
 * receives a new entry. Pipeline:
 *
 *   CourtListener server → POST here (IP-verified) → BullMQ queue
 *   → handleCourtListenerWebhook (worker.ts) → COURT events
 *
 * Security layers:
 * 1. IP allowlist: Only CourtListener's documented IPs are accepted.
 * 2. Idempotency-Key dedup: Prevents duplicate processing on retries.
 * 3. Schema validation: Invalid payloads are rejected with 400.
 */
webhooksRoutes.post('/courtlistener', async (c) => {
  // Log incoming IP for debugging and audit
  const clientIp =
    c.req.header('cf-connecting-ip') ??
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    '';
  console.log('[courtlistener webhook] incoming IP:', clientIp);

  // IP allowlist check
  if (!COURTLISTENER_IPS.has(clientIp)) {
    console.warn(`[courtlistener webhook] Rejected request from non-allowlisted IP: ${clientIp}`);
    return c.json({ error: 'Forbidden' }, 403);
  }

  // Idempotency-Key deduplication
  const idempotencyKey = c.req.header('Idempotency-Key');
  if (idempotencyKey) {
    const existing = await adminDb
      .select({ id: schema.events.id })
      .from(schema.events)
      .where(
        and(
          eq(schema.events.type, 'COURT'),
          sql`${schema.events.metadata} ->> 'idempotencyKey' = ${idempotencyKey}`,
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      console.log(`[courtlistener webhook] Duplicate idempotency key ${idempotencyKey} — returning cached ok`);
      return c.json({ ok: true });
    }
  }

  // Parse and validate webhook payload
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const parsed = courtListenerWebhookSchema.safeParse(body);
  if (!parsed.success) {
    console.warn('[courtlistener webhook] Schema validation failed:', parsed.error.message);
    return c.json({ error: 'Invalid webhook payload', details: parsed.error.message }, 400);
  }

  // Enqueue for async processing — respond immediately so CourtListener doesn't timeout
  const queue = new Queue('ingestion', { connection: redisConnection });
  try {
    await queue.add(
      'courtlistener_webhook',
      { ...parsed.data, idempotencyKey },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  } finally {
    await queue.close();
  }

  return c.json({ ok: true });
});
