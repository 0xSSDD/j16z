import type { Job } from 'bullmq';
import { and, eq, isNull, or, sql } from 'drizzle-orm';
import { adminDb } from '../db/index.js';
import * as schema from '../db/schema.js';
import { createAgencyEvent, updateIngestionStatus } from './event-factory.js';
import { FTC_API_BASE, type FtcEarlyTermination, ftcEarlyTerminationResponseSchema } from './types.js';

export async function handleFtcPoll(job: Job): Promise<void> {
  console.log(`[ftc_poll] Starting poll (triggered by: ${job.data.triggeredBy})`);

  try {
    const apiKey = process.env.FTC_API_KEY;
    if (!apiKey) {
      throw new Error('FTC_API_KEY is not set');
    }

    const url = `${FTC_API_BASE}?api_key=${apiKey}&sort=-early_termination_date&page[limit]=20`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`FTC API request failed with status ${response.status}`);
    }

    const raw = await response.json();
    const parsed = ftcEarlyTerminationResponseSchema.safeParse(raw);

    if (!parsed.success) {
      throw new Error(`FTC response schema validation failed: ${parsed.error.message}`);
    }

    let createdCount = 0;
    for (const notice of parsed.data.data) {
      const alreadyProcessed = await eventExistsForNotice(notice.id);
      if (alreadyProcessed) {
        continue;
      }

      const matchedDeal = await findMatchingDeal(notice);
      if (!matchedDeal) {
        console.log(`[ftc_poll] No tracked deal match for notice ${notice.id}. Skipping.`);
        continue;
      }

      if (!matchedDeal.firmId) {
        console.log(`[ftc_poll] Matched deal ${matchedDeal.id} has no firm_id. Skipping notice ${notice.id}.`);
        continue;
      }

      const earlyTerminationDate = notice.attributes.early_termination_date || notice.attributes.date_terminated;
      const title = `FTC granted HSR early termination: ${notice.attributes.acquiring_party} / ${notice.attributes.acquired_party}`;
      const description =
        `HSR early termination notice ${notice.id}` +
        `${earlyTerminationDate ? ` on ${earlyTerminationDate}` : ''}` +
        `${notice.attributes.transaction_value ? ` (transaction value: ${notice.attributes.transaction_value})` : ''}`;

      await createAgencyEvent({
        firmId: matchedDeal.firmId,
        dealId: matchedDeal.id,
        subType: 'HSR_EARLY_TERMINATION',
        title,
        description,
        sourceUrl: `${FTC_API_BASE}/${notice.id}`,
        materialityScore: 80,
        severity: 'CRITICAL',
        metadata: {
          ftcNoticeId: notice.id,
          acquiringParty: notice.attributes.acquiring_party,
          acquiredParty: notice.attributes.acquired_party,
          earlyTerminationDate: notice.attributes.early_termination_date,
          dateTerminated: notice.attributes.date_terminated,
          transactionValue: notice.attributes.transaction_value,
        },
      });

      createdCount++;
    }

    await updateIngestionStatus('ftc', true, undefined, createdCount);
    console.log(`[ftc_poll] Complete. ${createdCount} AGENCY events created from ${parsed.data.data.length} notices.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown FTC poll error';
    await updateIngestionStatus('ftc', false, message, 0);
    console.error('[ftc_poll] Failed:', error);
  }
}

async function eventExistsForNotice(noticeId: string): Promise<boolean> {
  const existing = await adminDb
    .select({ id: schema.events.id })
    .from(schema.events)
    .where(
      and(
        eq(schema.events.type, 'AGENCY'),
        eq(schema.events.subType, 'HSR_EARLY_TERMINATION'),
        eq(schema.events.source, 'FTC'),
        sql`${schema.events.metadata} ->> 'ftcNoticeId' = ${noticeId}`,
      ),
    )
    .limit(1);

  return existing.length > 0;
}

async function findMatchingDeal(notice: FtcEarlyTermination): Promise<{ id: string; firmId: string | null } | null> {
  const acquiringParty = normalizeCompanyName(notice.attributes.acquiring_party);
  const acquiredParty = normalizeCompanyName(notice.attributes.acquired_party);

  if (!acquiringParty && !acquiredParty) {
    return null;
  }

  const dealMatches = await adminDb
    .select({
      id: schema.deals.id,
      firmId: schema.deals.firmId,
      acquirer: schema.deals.acquirer,
      target: schema.deals.target,
    })
    .from(schema.deals)
    .where(
      and(
        isNull(schema.deals.deletedAt),
        or(
          acquiringParty ? sql`lower(${schema.deals.acquirer}) = ${acquiringParty}` : undefined,
          acquiringParty ? sql`lower(${schema.deals.target}) = ${acquiringParty}` : undefined,
          acquiredParty ? sql`lower(${schema.deals.acquirer}) = ${acquiredParty}` : undefined,
          acquiredParty ? sql`lower(${schema.deals.target}) = ${acquiredParty}` : undefined,
        ),
      ),
    )
    .limit(10);

  if (dealMatches.length === 0) {
    return null;
  }

  const ranked = dealMatches
    .map((deal) => {
      const acquirer = normalizeCompanyName(deal.acquirer);
      const target = normalizeCompanyName(deal.target);

      let score = 0;
      if (acquiringParty && acquirer === acquiringParty) score += 3;
      if (acquiredParty && target === acquiredParty) score += 3;
      if (acquiringParty && target === acquiringParty) score += 1;
      if (acquiredParty && acquirer === acquiredParty) score += 1;

      return { deal, score };
    })
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.deal ?? null;
}

function normalizeCompanyName(name: string | null | undefined): string {
  return (name ?? '').trim().toLowerCase();
}
