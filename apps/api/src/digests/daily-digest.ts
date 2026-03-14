/**
 * Daily digest query — fetches overnight HIGH + MEDIUM severity events per firm.
 *
 * "Overnight" window: from yesterday 8:00 AM ET to today 8:00 AM ET.
 * Severity filter: CRITICAL and WARNING only (INFO events are too noisy for digests).
 */
import { and, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import { adminDb } from '../db/index.js';
import * as schema from '../db/schema.js';

export interface DailyDigestEvent {
  id: string;
  title: string;
  type: string;
  subType: string;
  severity: string;
  materialityScore: number;
  dealName: string | null;
  sourceUrl: string;
  createdAt: Date;
}

/**
 * Returns the boundaries of the "overnight" window in UTC.
 * Window: yesterday 8:00 AM ET → today 8:00 AM ET.
 * Uses Intl.DateTimeFormat to determine the correct UTC offset for ET.
 */
function getOvernightWindowUtc(): { from: Date; to: Date } {
  const now = new Date();

  // Get current ET offset by checking what time it is in ET right now
  const etFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false,
  });

  // Build today 8:00 AM ET in UTC
  const etParts = etFormatter.formatToParts(now);
  const etYearStr = etParts.find((p) => p.type === 'year')?.value ?? '';
  const etMonthStr = etParts.find((p) => p.type === 'month')?.value ?? '';
  const etDayStr = etParts.find((p) => p.type === 'day')?.value ?? '';

  // Construct 8 AM ET today using the Date constructor with UTC offset calculation
  const etNowString = `${etYearStr}-${etMonthStr}-${etDayStr}T08:00:00`;
  const todayAt8amEt = new Date(`${etNowString} GMT-0${Math.abs(getEtUtcOffset(now))}:00`);

  // Yesterday 8 AM ET
  const yesterdayAt8amEt = new Date(todayAt8amEt.getTime() - 24 * 60 * 60 * 1000);

  return { from: yesterdayAt8amEt, to: todayAt8amEt };
}

/**
 * Get the current ET UTC offset in hours (negative = behind UTC).
 * EST = -5, EDT = -4.
 */
function getEtUtcOffset(date: Date): number {
  const utcMs = date.getTime();
  const etMs = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' })).getTime();
  // Round to nearest hour to get offset cleanly
  return Math.round((etMs - utcMs) / (1000 * 60 * 60));
}

/**
 * Query overnight HIGH + MEDIUM severity events for a firm.
 * Returns events ordered by materialityScore DESC.
 */
export async function queryOvernightEvents(firmId: string): Promise<DailyDigestEvent[]> {
  const { from, to } = getOvernightWindowUtc();

  const rows = await adminDb
    .select({
      id: schema.events.id,
      title: schema.events.title,
      type: schema.events.type,
      subType: schema.events.subType,
      severity: schema.events.severity,
      materialityScore: schema.events.materialityScore,
      dealName: schema.deals.target,
      sourceUrl: schema.events.sourceUrl,
      createdAt: schema.events.createdAt,
    })
    .from(schema.events)
    .leftJoin(schema.deals, eq(schema.events.dealId, schema.deals.id))
    .where(
      and(
        eq(schema.events.firmId, firmId),
        inArray(schema.events.severity, ['CRITICAL', 'WARNING']),
        gte(schema.events.createdAt, from),
        lte(schema.events.createdAt, to),
      ),
    )
    .orderBy(desc(schema.events.materialityScore));

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    subType: r.subType,
    severity: r.severity,
    materialityScore: r.materialityScore,
    dealName: r.dealName,
    sourceUrl: r.sourceUrl,
    createdAt: r.createdAt,
  }));
}
