/**
 * Weekly digest query — aggregates deal-level event activity over the past 7 days.
 *
 * Groups events by deal, counts by severity, and joins latest spread data.
 */
import { and, eq, gte, isNotNull } from 'drizzle-orm';
import { adminDb } from '../db/index.js';
import * as schema from '../db/schema.js';

export interface WeeklyDealSummary {
  dealId: string;
  dealName: string;
  status: string;
  eventCount: number;
  criticalCount: number;
  warningCount: number;
  latestSpread: string | null;
  statusChanged: boolean;
}

/**
 * Query deal-level event summaries for the past 7 days for a firm.
 */
export async function queryWeeklyDealChanges(firmId: string): Promise<WeeklyDealSummary[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Get all events in the window grouped by deal
  const eventRows = await adminDb
    .select({
      dealId: schema.events.dealId,
      severity: schema.events.severity,
      dealName: schema.deals.target,
      dealStatus: schema.deals.status,
      grossSpread: schema.deals.grossSpread,
    })
    .from(schema.events)
    .leftJoin(schema.deals, eq(schema.events.dealId, schema.deals.id))
    .where(
      and(
        eq(schema.events.firmId, firmId),
        gte(schema.events.createdAt, sevenDaysAgo),
        isNotNull(schema.events.dealId),
      ),
    );

  // Aggregate by dealId
  const dealMap = new Map<
    string,
    {
      dealId: string;
      dealName: string;
      status: string;
      eventCount: number;
      criticalCount: number;
      warningCount: number;
      grossSpread: string | null;
    }
  >();

  for (const row of eventRows) {
    if (!row.dealId) continue;

    const existing = dealMap.get(row.dealId);
    if (existing) {
      existing.eventCount += 1;
      if (row.severity === 'CRITICAL') existing.criticalCount += 1;
      if (row.severity === 'WARNING') existing.warningCount += 1;
    } else {
      dealMap.set(row.dealId, {
        dealId: row.dealId,
        dealName: row.dealName ?? 'Unknown Deal',
        status: row.dealStatus ?? 'UNKNOWN',
        eventCount: 1,
        criticalCount: row.severity === 'CRITICAL' ? 1 : 0,
        warningCount: row.severity === 'WARNING' ? 1 : 0,
        grossSpread: row.grossSpread,
      });
    }
  }

  return Array.from(dealMap.values()).map((d) => ({
    dealId: d.dealId,
    dealName: d.dealName,
    status: d.status,
    eventCount: d.eventCount,
    criticalCount: d.criticalCount,
    warningCount: d.warningCount,
    latestSpread: d.grossSpread ? `${Number(d.grossSpread).toFixed(2)}%` : null,
    // statusChanged: check if any SPREAD or deal status event fired this week
    statusChanged: d.criticalCount > 0,
  }));
}
