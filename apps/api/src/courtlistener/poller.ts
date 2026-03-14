import type { Job } from 'bullmq';
import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { updateIngestionStatus } from '../agency/event-factory.js';
import { adminDb } from '../db/index.js';
import * as schema from '../db/schema.js';
import { createCourtEvent, getCourtMaterialityScore, getCourtSeverity } from './event-factory.js';
import {
  COURTLISTENER_API_BASE,
  type DocketSearchResult,
  docketEntrySchema,
  docketSearchResponseSchema,
} from './types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const USER_AGENT = 'j16z-research/1.0 (compliance@j16z.io)';
const MAX_DOCKET_RESULTS = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Return auth headers for CourtListener API requests.
 * Requires COURTLISTENER_API_TOKEN env var.
 */
function courtListenerHeaders(): Record<string, string> {
  const token = process.env.COURTLISTENER_API_TOKEN;
  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
  };
  if (token) {
    headers.Authorization = `Token ${token}`;
  }
  return headers;
}

/**
 * Infer COURT event sub-type from a docket entry description.
 * Keywords are matched case-insensitively against the full description text.
 */
function inferSubTypeFromDescription(description: string | null | undefined): string {
  if (!description) return 'DOCKET_ENTRY';
  const lower = description.toLowerCase();
  if (lower.includes('injunction')) return 'INJUNCTION';
  if (lower.includes('complaint')) return 'COMPLAINT';
  if (lower.includes('motion')) return 'MOTION';
  return 'DOCKET_ENTRY';
}

/**
 * Check whether a COURT event already exists for a given docket entry sourceGuid.
 * sourceGuid format: 'cl:entry:{entry.id}'
 */
async function hasDocketEntryEvent(sourceGuid: string): Promise<boolean> {
  const existing = await adminDb
    .select({ id: schema.events.id })
    .from(schema.events)
    .where(and(eq(schema.events.type, 'COURT'), sql`${schema.events.metadata} ->> 'sourceGuid' = ${sourceGuid}`))
    .limit(1);
  return existing.length > 0;
}

/**
 * Check whether a COURT event already exists for a given CourtListener docket ID.
 * Used to avoid creating duplicate CASE_DISCOVERED events and duplicate subscriptions.
 */
async function hasDocketSubscription(docketId: number): Promise<boolean> {
  const existing = await adminDb
    .select({ id: schema.events.id })
    .from(schema.events)
    .where(
      and(
        eq(schema.events.type, 'COURT'),
        sql`${schema.events.metadata} ->> 'courtlistenerDocketId' = ${String(docketId)}`,
      ),
    )
    .limit(1);
  return existing.length > 0;
}

// ---------------------------------------------------------------------------
// Main poll handler
// ---------------------------------------------------------------------------

/**
 * handleCourtListenerPoll — BullMQ job handler.
 *
 * 1. Load all active deals with a firmId.
 * 2. For each deal, search CourtListener v4 for merger-related dockets by
 *    target and acquirer name.
 * 3. For each newly discovered docket, subscribe via v4 docket-alerts and
 *    create a CASE_DISCOVERED event.
 * 4. For already-known dockets, fetch recent entries and create COURT events
 *    for any new ones (deduped via sourceGuid).
 *
 * CRITICAL: Uses v4 endpoints exclusively — v3 is deprecated.
 */
export async function handleCourtListenerPoll(job: Job): Promise<void> {
  console.log(`[courtlistener_poll] Starting (triggered by: ${job.data?.triggeredBy ?? 'unknown'})`);

  let createdCount = 0;

  try {
    // Load active deals that have a firmId (unclaimed deals have firmId=null)
    const deals = await adminDb
      .select({
        id: schema.deals.id,
        firmId: schema.deals.firmId,
        acquirer: schema.deals.acquirer,
        target: schema.deals.target,
      })
      .from(schema.deals)
      .where(and(isNotNull(schema.deals.firmId), isNull(schema.deals.deletedAt)));

    for (const deal of deals) {
      if (!deal.firmId) continue; // TypeScript narrowing — isNotNull above guarantees this

      // Search for merger-related dockets by deal company names (v4 search API)
      const searchUrl =
        `${COURTLISTENER_API_BASE}/api/rest/v4/search/?type=d` +
        `&q=caseName:"${encodeURIComponent(deal.target)}" OR caseName:"${encodeURIComponent(deal.acquirer)}"` +
        `&order_by=score+desc&count=${MAX_DOCKET_RESULTS}`;

      let searchData: { count: number; results: DocketSearchResult[] };

      try {
        const searchRes = await fetch(searchUrl, { headers: courtListenerHeaders() });
        if (!searchRes.ok) {
          console.warn(`[courtlistener_poll] Search failed for deal ${deal.id}: HTTP ${searchRes.status}`);
          continue;
        }
        const parsed = docketSearchResponseSchema.safeParse(await searchRes.json());
        if (!parsed.success) {
          console.warn(`[courtlistener_poll] Search response parse error for deal ${deal.id}:`, parsed.error.message);
          continue;
        }
        searchData = parsed.data;
      } catch (fetchErr) {
        console.warn(
          `[courtlistener_poll] Fetch error for deal ${deal.id}:`,
          fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
        );
        continue;
      }

      for (const docket of searchData.results) {
        const alreadySubscribed = await hasDocketSubscription(docket.docket_id);

        if (!alreadySubscribed) {
          // Subscribe to docket alerts via v4 endpoint (NOT v3)
          let alertId: number | undefined;
          try {
            const subRes = await fetch(`${COURTLISTENER_API_BASE}/api/rest/v4/docket-alerts/`, {
              method: 'POST',
              headers: {
                ...courtListenerHeaders(),
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: `docket=${docket.docket_id}`,
            });

            if (subRes.ok) {
              const subBody = (await subRes.json()) as { id?: number };
              alertId = typeof subBody.id === 'number' ? subBody.id : undefined;
            } else {
              console.warn(
                `[courtlistener_poll] Docket-alert subscription failed for docket ${docket.docket_id}: HTTP ${subRes.status}`,
              );
            }
          } catch (subErr) {
            console.warn(
              `[courtlistener_poll] Subscription error for docket ${docket.docket_id}:`,
              subErr instanceof Error ? subErr.message : String(subErr),
            );
          }

          // Create CASE_DISCOVERED event regardless of whether subscription succeeded
          await createCourtEvent({
            firmId: deal.firmId,
            dealId: deal.id,
            subType: 'CASE_DISCOVERED',
            title: `Case discovered: ${docket.caseName}`,
            description: `CourtListener docket ${docket.docketNumber ?? docket.docket_id} in ${docket.court} — newly matched to deal.`,
            sourceUrl: `${COURTLISTENER_API_BASE}/docket/${docket.docket_id}/`,
            materialityScore: getCourtMaterialityScore('CASE_DISCOVERED'),
            severity: getCourtSeverity(getCourtMaterialityScore('CASE_DISCOVERED')),
            timestamp: docket.dateFiled ? new Date(docket.dateFiled) : new Date(),
            metadata: {
              courtlistenerDocketId: docket.docket_id,
              courtlistenerAlertId: alertId ?? null,
              caseName: docket.caseName,
              court: docket.court,
              docketNumber: docket.docketNumber ?? null,
            },
          });

          createdCount++;
        } else {
          // Already subscribed — fetch recent docket entries and create events for new ones
          let entriesData: Array<{
            id: number;
            description: string | null;
            entry_number: number | null;
            date_filed: string | null;
          }>;

          try {
            const entriesRes = await fetch(
              `${COURTLISTENER_API_BASE}/api/rest/v4/docket-entries/?docket=${docket.docket_id}&order_by=-date_filed`,
              { headers: courtListenerHeaders() },
            );

            if (!entriesRes.ok) {
              console.warn(
                `[courtlistener_poll] Entries fetch failed for docket ${docket.docket_id}: HTTP ${entriesRes.status}`,
              );
              continue;
            }

            const rawEntries = (await entriesRes.json()) as { results?: unknown[] };
            const rawResults = rawEntries.results ?? [];
            entriesData = rawResults
              .map((r) => {
                const parsed = docketEntrySchema.safeParse(r);
                return parsed.success ? parsed.data : null;
              })
              .filter((e): e is NonNullable<typeof e> => e !== null);
          } catch (fetchErr) {
            console.warn(
              `[courtlistener_poll] Entries fetch error for docket ${docket.docket_id}:`,
              fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
            );
            continue;
          }

          for (const entry of entriesData) {
            const sourceGuid = `cl:entry:${entry.id}`;
            const isDuplicate = await hasDocketEntryEvent(sourceGuid);
            if (isDuplicate) continue;

            const subType = inferSubTypeFromDescription(entry.description);
            const score = getCourtMaterialityScore(subType);

            await createCourtEvent({
              firmId: deal.firmId,
              dealId: deal.id,
              subType,
              title: entry.description ?? `Docket entry #${entry.entry_number ?? entry.id}`,
              description: entry.description ?? `New docket entry filed on ${entry.date_filed ?? 'unknown date'}.`,
              sourceUrl: `${COURTLISTENER_API_BASE}/docket/${docket.docket_id}/#entry-${entry.id}`,
              materialityScore: score,
              severity: getCourtSeverity(score),
              timestamp: entry.date_filed ? new Date(entry.date_filed) : new Date(),
              metadata: {
                sourceGuid,
                courtlistenerDocketId: docket.docket_id,
                courtlistenerEntryId: entry.id,
                caseName: docket.caseName,
                court: docket.court,
                docketNumber: docket.docketNumber ?? null,
              },
            });

            createdCount++;
          }
        }
      }
    }

    await updateIngestionStatus('courtlistener', true, undefined, createdCount);
    console.log(`[courtlistener_poll] Complete. Created ${createdCount} COURT events.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown courtlistener poll error';
    await updateIngestionStatus('courtlistener', false, message, createdCount);
    throw error;
  }
}
