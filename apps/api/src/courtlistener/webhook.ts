import type { Job } from 'bullmq';
import { and, eq, sql } from 'drizzle-orm';
import { updateIngestionStatus } from '../agency/event-factory.js';
import { adminDb } from '../db/index.js';
import * as schema from '../db/schema.js';
import { createCourtEvent, getCourtMaterialityScore, getCourtSeverity } from './event-factory.js';
import { courtListenerWebhookSchema } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Infer COURT event sub-type from a docket entry description.
 * Mirrors the logic in poller.ts for consistent classification.
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
 * Find the deal associated with a CourtListener docket ID.
 * Looks up an existing COURT event that has courtlistenerDocketId in metadata.
 * Returns {firmId, dealId} or null if no matching tracked docket exists.
 */
async function findDealForDocket(docketId: number): Promise<{ firmId: string; dealId: string } | null> {
  const existing = await adminDb
    .select({
      firmId: schema.events.firmId,
      dealId: schema.events.dealId,
    })
    .from(schema.events)
    .where(
      and(
        eq(schema.events.type, 'COURT'),
        sql`${schema.events.metadata} ->> 'courtlistenerDocketId' = ${String(docketId)}`,
      ),
    )
    .limit(1);

  if (existing.length === 0 || !existing[0].dealId) return null;
  return { firmId: existing[0].firmId, dealId: existing[0].dealId };
}

/**
 * Check if a COURT event already exists for a given entry sourceGuid.
 */
async function hasDocketEntryEvent(sourceGuid: string): Promise<boolean> {
  const existing = await adminDb
    .select({ id: schema.events.id })
    .from(schema.events)
    .where(
      and(
        eq(schema.events.type, 'COURT'),
        sql`${schema.events.metadata} ->> 'sourceGuid' = ${sourceGuid}`,
      ),
    )
    .limit(1);
  return existing.length > 0;
}

// ---------------------------------------------------------------------------
// BullMQ job handler — processes enqueued webhook payloads
// ---------------------------------------------------------------------------

/**
 * handleCourtListenerWebhook — processes a CourtListener webhook payload.
 *
 * Invoked by the BullMQ worker when a 'courtlistener_webhook' job is dequeued.
 * The HTTP route enqueues the job immediately (CourtListener has short response
 * timeout and retries up to 7 times if it doesn't get a 2xx quickly).
 *
 * For each result:
 * 1. Find the tracked deal via courtlistenerDocketId.
 * 2. Deduplicate each docket entry by sourceGuid.
 * 3. Infer sub-type from entry description keywords.
 * 4. Create a COURT event with appropriate materiality score.
 */
export async function handleCourtListenerWebhook(job: Job): Promise<void> {
  const idempotencyKey: string | undefined = job.data?.idempotencyKey;

  const parsed = courtListenerWebhookSchema.safeParse(job.data);
  if (!parsed.success) {
    console.warn('[courtlistener_webhook] Invalid webhook payload in job:', parsed.error.message);
    return;
  }

  const { payload } = parsed.data;
  let createdCount = 0;

  try {
    for (const result of payload.results) {
      const docketId = result.docket;

      // Find the tracked deal for this docket
      const dealContext = await findDealForDocket(docketId);
      if (!dealContext) {
        console.warn(`[courtlistener_webhook] No tracked deal found for docket ${docketId} — skipping (orphaned webhook)`);
        continue;
      }

      const { firmId, dealId } = dealContext;
      const entries = result.docket_entries ?? [];

      for (const entry of entries) {
        const sourceGuid = `cl:entry:${entry.id}`;
        const isDuplicate = await hasDocketEntryEvent(sourceGuid);
        if (isDuplicate) continue;

        const subType = inferSubTypeFromDescription(entry.description);
        const score = getCourtMaterialityScore(subType);

        await createCourtEvent({
          firmId,
          dealId,
          subType,
          title: entry.description ?? `Docket entry #${entry.entry_number ?? entry.id}`,
          description: entry.description ?? `New docket entry filed on ${entry.date_filed ?? 'unknown date'}.`,
          sourceUrl: `https://www.courtlistener.com/docket/${docketId}/#entry-${entry.id}`,
          materialityScore: score,
          severity: getCourtSeverity(score),
          timestamp: entry.date_filed ? new Date(entry.date_filed) : new Date(),
          metadata: {
            sourceGuid,
            idempotencyKey: idempotencyKey ?? null,
            courtlistenerDocketId: docketId,
            courtlistenerEntryId: entry.id,
          },
        });

        createdCount++;
      }
    }

    await updateIngestionStatus('courtlistener', true, undefined, createdCount);
    console.log(`[courtlistener_webhook] Complete. Created ${createdCount} COURT events.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown courtlistener webhook processing error';
    await updateIngestionStatus('courtlistener', false, message, createdCount);
    throw error;
  }
}
