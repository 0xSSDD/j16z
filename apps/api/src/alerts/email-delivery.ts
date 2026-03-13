/**
 * Email delivery handler — sends CRITICAL alert emails via Resend.
 *
 * Uses j16z-branded dark HTML template with severity color accent.
 * Checks notification_log for dedup before sending.
 */
import { and, eq } from 'drizzle-orm';
import { Resend } from 'resend';
import { adminDb } from '../db/index.js';
import { notificationLog } from '../db/schema.js';
import type { DeliveryPayload, DeliveryResult } from './types.js';

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

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

function severityColor(severity: string): string {
  switch (severity) {
    case 'CRITICAL':
      return '#ef4444'; // red
    case 'WARNING':
      return '#f97316'; // orange
    default:
      return '#eab308'; // yellow
  }
}

function buildEmailHtml(payload: DeliveryPayload): string {
  const { event, deal } = payload;
  const color = severityColor(event.severity);

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#18181b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#18181b;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#27272a;border-radius:8px;border-left:4px solid ${color};overflow:hidden;">
        <tr><td style="padding:24px 28px;">
          <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:${color};font-weight:600;">${event.severity}</p>
          <h1 style="margin:0 0 16px;font-size:20px;color:#fafafa;font-weight:600;">${event.title}</h1>
          ${deal ? `<p style="margin:0 0 12px;font-size:14px;color:#a1a1aa;">${deal.name} (${deal.symbol})${deal.currentSpread ? ` &middot; Spread: ${deal.currentSpread}%` : ''}</p>` : ''}
          <p style="margin:0 0 24px;font-size:14px;color:#d4d4d8;line-height:1.6;">${event.description}</p>
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:12px;">
              <a href="${event.sourceUrl}" style="display:inline-block;padding:10px 20px;background-color:${color};color:#18181b;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">View Source</a>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:12px 28px;border-top:1px solid #3f3f46;">
          <p style="margin:0;font-size:11px;color:#71717a;">j16z M&amp;A Intelligence Platform</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

export async function deliverEmail(
  rule: { id: string; userId: string; firmId: string },
  payload: DeliveryPayload,
): Promise<DeliveryResult> {
  const { event } = payload;

  // Dedup check
  if (await isDuplicate(event.id, rule.userId, 'email')) {
    console.log(`[alert-email] Skipping duplicate: event=${event.id} user=${rule.userId}`);
    return { success: true, messageId: 'dedup-skipped' };
  }

  try {
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'j16z Alerts <alerts@j16z.com>';
    const subject = `[${event.severity}] ${event.title}`;
    const html = buildEmailHtml(payload);

    const { data, error } = await getResend().emails.send({
      from: fromEmail,
      to: rule.userId, // In production, resolve userId -> email via Supabase auth
      subject,
      html,
    });

    if (error) {
      await logDelivery(rule.firmId, event.id, rule.id, rule.userId, 'email', 'failed', error.message);
      return { success: false, error: error.message };
    }

    await logDelivery(rule.firmId, event.id, rule.id, rule.userId, 'email', 'sent');
    return { success: true, messageId: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await logDelivery(rule.firmId, event.id, rule.id, rule.userId, 'email', 'failed', message);
    return { success: false, error: message };
  }
}
