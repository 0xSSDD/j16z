/**
 * BullMQ job handlers for daily and weekly email digests.
 *
 * digest_daily: fires 8:00 AM ET daily — sends overnight CRITICAL+WARNING events per user
 * digest_weekly: fires 5:00 PM ET Friday — sends deal-level weekly summary per user
 *
 * Empty digests (zero events/deals) are skipped — no "nothing happened" emails.
 * Weekend suppression is honoured per user digest_preferences.
 */
import { render } from '@react-email/components';
import type { Job } from 'bullmq';
import { and, eq } from 'drizzle-orm';
import { Resend } from 'resend';
import { adminDb } from '../db/index.js';
import * as schema from '../db/schema.js';
import { queryOvernightEvents } from './daily-digest.js';
import { DailyDigestEmail } from './templates/daily-digest.js';
import { WeeklyDigestEmail } from './templates/weekly-digest.js';
import { queryWeeklyDealChanges } from './weekly-digest.js';

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

/**
 * Check if today (in ET) is a weekend day.
 */
function isTodayWeekendInEt(): boolean {
  const etDayOfWeek = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
  }).format(new Date());
  return etDayOfWeek === 'Saturday' || etDayOfWeek === 'Sunday';
}

/**
 * Get the current date formatted as "Month D, YYYY" in ET.
 */
function getTodayLabelEt(): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());
}

/**
 * Get "Week of Month D – Month D, YYYY" label in ET.
 */
function getWeekRangeLabel(): string {
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
  return `${fmt(weekStart)} – ${fmt(now)}`;
}

// ---------------------------------------------------------------------------
// Get all firms and their members for digest dispatch
// ---------------------------------------------------------------------------
async function getFirmsWithMembers(): Promise<{ firmId: string; userId: string }[]> {
  const members = await adminDb
    .select({
      firmId: schema.firmMembers.firmId,
      userId: schema.firmMembers.userId,
    })
    .from(schema.firmMembers);
  return members;
}

// ---------------------------------------------------------------------------
// Get user's digest preferences (defaults to enabled if no row)
// ---------------------------------------------------------------------------
async function getDigestPrefs(
  firmId: string,
  userId: string,
): Promise<{ dailyEnabled: boolean; weeklyEnabled: boolean; suppressWeekend: boolean }> {
  const [pref] = await adminDb
    .select({
      dailyEnabled: schema.digestPreferences.dailyEnabled,
      weeklyEnabled: schema.digestPreferences.weeklyEnabled,
      suppressWeekend: schema.digestPreferences.suppressWeekend,
    })
    .from(schema.digestPreferences)
    .where(and(eq(schema.digestPreferences.firmId, firmId), eq(schema.digestPreferences.userId, userId)));

  // Default: all enabled, no weekend suppression
  return pref ?? { dailyEnabled: true, weeklyEnabled: true, suppressWeekend: false };
}

// ---------------------------------------------------------------------------
// Resolve userId to email address via Supabase admin API
// In production this calls supabase.auth.admin.getUserById — fallback to userId
// ---------------------------------------------------------------------------
async function resolveEmail(userId: string): Promise<string | null> {
  // Import supabase client lazily to avoid circular deps
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL ?? '', process.env.SUPABASE_SECRET_KEY ?? '');
    const { data } = await supabase.auth.admin.getUserById(userId);
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Daily digest handler
// ---------------------------------------------------------------------------
export async function handleDigestDaily(_job: Job): Promise<void> {
  console.log('[digest-daily] Starting daily digest run...');

  const isWeekend = isTodayWeekendInEt();
  const dateRange = getTodayLabelEt();
  const members = await getFirmsWithMembers();

  let sent = 0;
  let skipped = 0;

  for (const { firmId, userId } of members) {
    const prefs = await getDigestPrefs(firmId, userId);

    if (!prefs.dailyEnabled) {
      skipped++;
      continue;
    }

    if (isWeekend && prefs.suppressWeekend) {
      console.log(`[digest-daily] Skipping ${userId} (weekend suppression)`);
      skipped++;
      continue;
    }

    const events = await queryOvernightEvents(firmId);

    if (events.length === 0) {
      console.log(`[digest-daily] Skipping ${userId} (no overnight events)`);
      skipped++;
      continue;
    }

    const email = await resolveEmail(userId);
    if (!email) {
      console.warn(`[digest-daily] Could not resolve email for user ${userId} — skipping`);
      skipped++;
      continue;
    }

    try {
      const html = await render(DailyDigestEmail({ events, dateRange, userName: email.split('@')[0] }));

      const { error } = await getResend().emails.send({
        from: 'j16z Digests <digests@j16z.com>',
        to: email,
        subject: `j16z Daily Digest — ${dateRange}`,
        html,
      });

      if (error) {
        console.error(`[digest-daily] Failed to send to ${email}:`, error.message);
      } else {
        sent++;
        console.log(`[digest-daily] Sent daily digest to ${email} (${events.length} events)`);
      }
    } catch (err) {
      console.error(`[digest-daily] Error rendering/sending to ${email}:`, err);
    }
  }

  console.log(`[digest-daily] Done. Sent: ${sent}, Skipped: ${skipped}`);
}

// ---------------------------------------------------------------------------
// Weekly digest handler
// ---------------------------------------------------------------------------
export async function handleDigestWeekly(_job: Job): Promise<void> {
  console.log('[digest-weekly] Starting weekly digest run...');

  const weekRange = getWeekRangeLabel();
  const members = await getFirmsWithMembers();

  let sent = 0;
  let skipped = 0;

  for (const { firmId, userId } of members) {
    const prefs = await getDigestPrefs(firmId, userId);

    if (!prefs.weeklyEnabled) {
      skipped++;
      continue;
    }

    const deals = await queryWeeklyDealChanges(firmId);

    if (deals.length === 0) {
      console.log(`[digest-weekly] Skipping ${userId} (no deal activity this week)`);
      skipped++;
      continue;
    }

    const email = await resolveEmail(userId);
    if (!email) {
      console.warn(`[digest-weekly] Could not resolve email for user ${userId} — skipping`);
      skipped++;
      continue;
    }

    try {
      const html = await render(WeeklyDigestEmail({ deals, weekRange, userName: email.split('@')[0] }));

      const { error } = await getResend().emails.send({
        from: 'j16z Digests <digests@j16z.com>',
        to: email,
        subject: `j16z Weekly Digest — ${weekRange}`,
        html,
      });

      if (error) {
        console.error(`[digest-weekly] Failed to send to ${email}:`, error.message);
      } else {
        sent++;
        console.log(`[digest-weekly] Sent weekly digest to ${email} (${deals.length} deals)`);
      }
    } catch (err) {
      console.error(`[digest-weekly] Error rendering/sending to ${email}:`, err);
    }
  }

  console.log(`[digest-weekly] Done. Sent: ${sent}, Skipped: ${skipped}`);
}
