/**
 * Alert evaluation worker — evaluates AlertRules against scored events and dispatches to channels.
 *
 * Flow:
 *   1. Early return if severity === 'INFO' (no push notifications for info events)
 *   2. Query active AlertRules matching the firm (global + deal-specific)
 *   3. Filter rules where materialityScore >= threshold
 *   4. Load full event and deal data
 *   5. Dispatch to configured channels:
 *      - email: CRITICAL only
 *      - slack: WARNING and CRITICAL
 *      - webhook: all non-INFO (if webhookUrl configured)
 */
import type { Job } from 'bullmq';
import { and, eq, isNull, or } from 'drizzle-orm';
import { adminDb } from '../db/index.js';
import { alertRules, deals, events } from '../db/schema.js';
import { deliverEmail } from './email-delivery.js';
import { deliverSlack } from './slack-delivery.js';
import type { AlertEvaluateData, DeliveryPayload } from './types.js';
import { deliverWebhook } from './webhook-delivery.js';

export async function handleAlertEvaluate(job: Job<AlertEvaluateData>): Promise<void> {
  const { eventId, firmId, dealId, materialityScore, severity } = job.data;

  // INFO events never trigger push notifications
  if (severity === 'INFO') {
    console.log(`[alert-worker] Skipping INFO event ${eventId}`);
    return;
  }

  console.log(`[alert-worker] Evaluating alerts for event ${eventId} (${severity}, score=${materialityScore})`);

  // Find matching active alert rules for this firm
  const matchingRules = await adminDb
    .select()
    .from(alertRules)
    .where(
      and(
        eq(alertRules.firmId, firmId),
        eq(alertRules.isActive, true),
        isNull(alertRules.deletedAt),
        // Match global rules (dealId IS NULL) or deal-specific rules
        dealId ? or(isNull(alertRules.dealId), eq(alertRules.dealId, dealId)) : isNull(alertRules.dealId),
      ),
    );

  // Filter by threshold
  const applicableRules = matchingRules.filter((rule) => materialityScore >= rule.threshold);

  if (applicableRules.length === 0) {
    console.log(`[alert-worker] No matching rules for event ${eventId}`);
    return;
  }

  // Load full event
  const [event] = await adminDb.select().from(events).where(eq(events.id, eventId));
  if (!event) {
    console.error(`[alert-worker] Event ${eventId} not found`);
    return;
  }

  // Load deal if dealId is set
  let deal: { id: string; acquirer: string; target: string; symbol: string; grossSpread: string | null } | null = null;
  if (dealId) {
    const [dealRow] = await adminDb.select().from(deals).where(eq(deals.id, dealId));
    if (dealRow) {
      deal = {
        id: dealRow.id,
        acquirer: dealRow.acquirer,
        target: dealRow.target,
        symbol: dealRow.symbol,
        grossSpread: dealRow.grossSpread,
      };
    }
  }

  // Dispatch to each matching rule's channels
  for (const rule of applicableRules) {
    const payload: DeliveryPayload = {
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        severity: event.severity,
        sourceUrl: event.sourceUrl,
        type: event.type,
        subType: event.subType,
      },
      deal: deal
        ? {
            id: deal.id,
            name: `${deal.acquirer} / ${deal.target}`,
            symbol: deal.symbol,
            currentSpread: deal.grossSpread,
          }
        : null,
      alertRule: {
        id: rule.id,
        name: rule.name,
        channels: rule.channels ?? [],
        webhookUrl: rule.webhookUrl,
        webhookSecret: rule.webhookSecret,
      },
    };

    const ruleContext = { id: rule.id, userId: rule.userId, firmId: rule.firmId };

    for (const channel of rule.channels ?? []) {
      switch (channel) {
        case 'email': {
          // Email only for CRITICAL events
          if (severity !== 'CRITICAL') {
            console.log(`[alert-worker] Skipping email for ${severity} event (CRITICAL only)`);
            break;
          }
          const emailResult = await deliverEmail(ruleContext, payload);
          console.log(`[alert-worker] Email delivery: ${emailResult.success ? 'sent' : 'failed'}`);
          break;
        }
        case 'slack': {
          const webhookUrl = process.env.SLACK_WEBHOOK_URL;
          if (!webhookUrl) {
            console.warn('[alert-worker] SLACK_WEBHOOK_URL not configured, skipping Slack delivery');
            break;
          }
          const slackResult = await deliverSlack(ruleContext, payload, webhookUrl);
          console.log(`[alert-worker] Slack delivery: ${slackResult.success ? 'sent' : 'failed'}`);
          break;
        }
        case 'webhook': {
          if (!rule.webhookUrl) {
            console.warn(`[alert-worker] No webhookUrl on rule ${rule.id}, skipping webhook delivery`);
            break;
          }
          const webhookResult = await deliverWebhook(
            { ...ruleContext, webhookUrl: rule.webhookUrl, webhookSecret: rule.webhookSecret },
            payload,
          );
          console.log(`[alert-worker] Webhook delivery: ${webhookResult.success ? 'sent' : 'failed'}`);
          break;
        }
        default:
          console.warn(`[alert-worker] Unknown channel: ${channel}`);
      }
    }
  }
}
