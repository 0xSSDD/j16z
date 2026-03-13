/**
 * Webhook delivery handler — POSTs JSON with HMAC-SHA256 signature.
 *
 * Includes retry logic: 3 attempts with exponential backoff (1s, 5s, 25s).
 * Checks notification_log for dedup before sending.
 */
import crypto from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { adminDb } from '../db/index.js';
import { notificationLog } from '../db/schema.js';
import type { DeliveryPayload, DeliveryResult } from './types.js';

const RETRY_DELAYS = [1000, 5000, 25000]; // ms

/** Check if a notification was already sent for this event+user+channel */
async function isDuplicate(eventId: string, userId: string, channel: string): Promise<boolean> {
  const existing = await adminDb
    .select()
    .from(notificationLog)
    .where(
      and(
        eq(notificationLog.eventId, eventId),
        eq(notificationLog.userId, userId),
        eq(notificationLog.channel, channel),
      ),
    );
  return existing.length > 0;
}

/** Log a delivery attempt to notification_log */
async function logDelivery(
  firmId: string,
  eventId: string,
  alertRuleId: string,
  userId: string,
  channel: string,
  status: 'sent' | 'failed',
  errorMessage?: string,
): Promise<void> {
  await adminDb.insert(notificationLog).values({
    firmId,
    eventId,
    alertRuleId,
    userId,
    channel,
    status,
    errorMessage: errorMessage ?? null,
    sentAt: status === 'sent' ? new Date() : null,
  });
}

function sign(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function deliverWebhook(
  rule: { id: string; userId: string; firmId: string; webhookUrl: string; webhookSecret: string | null },
  payload: DeliveryPayload,
): Promise<DeliveryResult> {
  const { event } = payload;

  // Dedup check
  if (await isDuplicate(event.id, rule.userId, 'webhook')) {
    console.log(`[alert-webhook] Skipping duplicate: event=${event.id} user=${rule.userId}`);
    return { success: true, messageId: 'dedup-skipped' };
  }

  const body = JSON.stringify(payload);
  const timestamp = new Date().toISOString();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Webhook-Timestamp': timestamp,
  };

  if (rule.webhookSecret) {
    headers['X-Webhook-Signature'] = sign(body, rule.webhookSecret);
  }

  let lastError: string | undefined;

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const response = await fetch(rule.webhookUrl, {
        method: 'POST',
        headers,
        body,
      });

      if (response.ok) {
        await logDelivery(rule.firmId, event.id, rule.id, rule.userId, 'webhook', 'sent');
        return { success: true };
      }

      lastError = `HTTP ${response.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Unknown error';
    }

    // Retry with backoff if not last attempt
    if (attempt < RETRY_DELAYS.length) {
      console.log(`[alert-webhook] Retry ${attempt + 1}/${RETRY_DELAYS.length} after ${RETRY_DELAYS[attempt]}ms`);
      await sleep(RETRY_DELAYS[attempt]);
    }
  }

  await logDelivery(rule.firmId, event.id, rule.id, rule.userId, 'webhook', 'failed', lastError);
  return { success: false, error: lastError ?? 'Unknown error' };
}
