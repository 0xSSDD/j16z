/**
 * Slack delivery handler — sends Block Kit cards via Incoming Webhook.
 *
 * WARNING events and above trigger Slack notifications.
 * Checks notification_log for dedup before sending.
 */
import { IncomingWebhook } from '@slack/webhook';
import { and, eq } from 'drizzle-orm';
import { adminDb } from '../db/index.js';
import { notificationLog } from '../db/schema.js';
import type { DeliveryPayload, DeliveryResult } from './types.js';

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

function severityEmoji(severity: string): string {
  switch (severity) {
    case 'CRITICAL':
      return ':red_circle:';
    case 'WARNING':
      return ':large_orange_circle:';
    default:
      return ':white_circle:';
  }
}

export async function deliverSlack(
  rule: { id: string; userId: string; firmId: string },
  payload: DeliveryPayload,
  webhookUrl: string,
): Promise<DeliveryResult> {
  const { event, deal } = payload;

  // Dedup check
  if (await isDuplicate(event.id, rule.userId, 'slack')) {
    console.log(`[alert-slack] Skipping duplicate: event=${event.id} user=${rule.userId}`);
    return { success: true, messageId: 'dedup-skipped' };
  }

  try {
    const webhook = new IncomingWebhook(webhookUrl);
    const emoji = severityEmoji(event.severity);

    await webhook.send({
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} ${event.title}`,
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Deal:* ${deal ? `${deal.name} (${deal.symbol})` : 'N/A'}`,
            },
            {
              type: 'mrkdwn',
              text: `*Severity:* ${event.severity}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: event.description,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Source',
              },
              url: event.sourceUrl,
            },
          ],
        },
      ],
    });

    await logDelivery(rule.firmId, event.id, rule.id, rule.userId, 'slack', 'sent');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await logDelivery(rule.firmId, event.id, rule.id, rule.userId, 'slack', 'failed', message);
    return { success: false, error: message };
  }
}
