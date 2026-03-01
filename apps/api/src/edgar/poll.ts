import { eq, isNull, isNotNull, or, and } from 'drizzle-orm';
import type { Job } from 'bullmq';
import { adminDb } from '../db/index.js';
import * as schema from '../db/schema.js';
import { edgarFetch, buildFilingUrl, buildIndexUrl } from './client.js';
import { TRACKED_FORM_TYPES, HIGH_SIGNAL_TYPES, submissionsResponseSchema, eftsResponseSchema } from './types.js';
import type { FilingMetadata } from './types.js';
import { matchFilingToDeal } from './deal-matcher.js';
import { createFilingEvents } from './event-factory.js';
import { ingestionQueue } from '../queues/ingestion.js';

// ---------------------------------------------------------------------------
// Stage 1 poll handler — runs every 15 minutes via BullMQ cron.
//
// Two parallel scans:
//   Scan A: CIK-based poll — fetch submissions for each tracked deal's CIK
//   Scan B: EFTS broad scan — full-text search for high-signal M&A form types
//
// After each successful insert: match to deal, create firm-scoped events,
// enqueue download job (Stage 2) for content fetch.
// ---------------------------------------------------------------------------

export async function handleEdgarPoll(job: Job): Promise<void> {
  console.log(`[edgar_poll] Starting poll (triggered by: ${job.data.triggeredBy})`);

  // Determine cutoff date: 30 days for first run, 1 hour for subsequent polls
  // (1 hour instead of 15 min provides overlap for safety)
  const lastPollDate = await getLastPollDate();
  const sinceDate = lastPollDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Scan A: CIK-based poll
  const cikFilings = await pollTrackedCiks(sinceDate);

  // Scan B: EFTS broad scan
  const broadFilings = await broadScanForNewDeals(sinceDate);

  // Merge and deduplicate
  const allFilings = deduplicateByAccession([...cikFilings, ...broadFilings]);

  // Insert new filings and enqueue downloads
  let newCount = 0;
  for (const filing of allFilings) {
    const inserted = await insertFilingIfNew(filing);
    if (inserted) {
      newCount++;

      // Enqueue download job for content fetch (Stage 2)
      await ingestionQueue.add('edgar_download', {
        filingId: inserted.id,
        accessionNumber: filing.accessionNumber,
        cik: filing.filerCik,
        primaryDocument: filing.primaryDocument,
      });

      // Match filing to deals (or AUTO-CREATE deal for high-signal filings)
      // and create firm-scoped events. This is critical — per CONTEXT.md
      // locked decision, high-signal filings (S-4, DEFM14A) MUST auto-create
      // a deal record as ANNOUNCED.
      const matchResult = await matchFilingToDeal(filing);

      // Link filing to the matched/created deal
      if (matchResult.dealId) {
        await adminDb
          .update(schema.filings)
          .set({ dealId: matchResult.dealId })
          .where(eq(schema.filings.id, inserted.id));

        // Create firm-scoped events for all firms tracking this deal
        await createFilingEvents(inserted.id, matchResult.dealId, filing, matchResult.firmIds);
      }
    }
  }

  console.log(`[edgar_poll] Complete. ${newCount} new filings ingested from ${allFilings.length} total.`);
}

// ---------------------------------------------------------------------------
// Scan A: CIK-based poll — fetch latest submissions for each tracked deal's CIK
// ---------------------------------------------------------------------------

async function pollTrackedCiks(since: Date): Promise<FilingMetadata[]> {
  // Query all deals with non-null acquirerCik or targetCik
  const trackedDeals = await adminDb
    .select({
      acquirerCik: schema.deals.acquirerCik,
      targetCik: schema.deals.targetCik,
    })
    .from(schema.deals)
    .where(
      and(
        isNull(schema.deals.deletedAt),
        or(isNotNull(schema.deals.acquirerCik), isNotNull(schema.deals.targetCik)),
      ),
    );

  // Collect unique CIKs (filter out nulls)
  const cikSet = new Set<string>();
  for (const deal of trackedDeals) {
    if (deal.acquirerCik) cikSet.add(deal.acquirerCik);
    if (deal.targetCik) cikSet.add(deal.targetCik);
  }

  const allFilings: FilingMetadata[] = [];
  const sinceIso = since.toISOString().split('T')[0];

  for (const cik of cikSet) {
    try {
      const paddedCik = cik.padStart(10, '0');
      const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;
      const res = await edgarFetch(url);
      const raw = await res.json();

      const parsed = submissionsResponseSchema.safeParse(raw);
      if (!parsed.success) {
        console.warn(`[edgar_poll] Submissions response for CIK ${cik} did not match schema:`, parsed.error.message);
        continue;
      }

      const { recent } = parsed.data.filings;
      const filerName = parsed.data.name;

      // Zip-transpose columnar arrays into row objects (Pitfall 2)
      // The submissions API returns arrays of values, NOT an array of objects
      const count = recent.accessionNumber.length;
      for (let i = 0; i < count; i++) {
        const filingType = recent.form[i];
        const filedDate = recent.filingDate[i];

        // Filter by form type
        if (!TRACKED_FORM_TYPES.has(filingType)) continue;

        // Filter by date — only process filings since last poll
        if (filedDate < sinceIso) continue;

        // Accession number comes with hyphens from Submissions API
        const accessionNumber = recent.accessionNumber[i];
        const primaryDocument = recent.primaryDocument[i] ?? '';

        allFilings.push({
          accessionNumber,
          filingType,
          filedDate,
          primaryDocument,
          filerCik: cik,
          filerName,
        });
      }
    } catch (err) {
      console.error(`[edgar_poll] Failed to poll CIK ${cik}:`, err);
      // Non-fatal — continue with other CIKs
    }
  }

  return allFilings;
}

// ---------------------------------------------------------------------------
// Scan B: EFTS broad scan — full-text search for new M&A deals
// ---------------------------------------------------------------------------

async function broadScanForNewDeals(since: Date): Promise<FilingMetadata[]> {
  const startdt = since.toISOString().split('T')[0];
  const enddt = new Date().toISOString().split('T')[0];

  // Search for high-signal M&A filing types — EFTS requires both startdt and enddt (Pitfall 6)
  const url =
    `https://efts.sec.gov/LATEST/search-index?` +
    `q=%22merger+agreement%22&forms=S-4,S-4%2FA,DEFM14A,PREM14A` +
    `&dateRange=custom&startdt=${startdt}&enddt=${enddt}` +
    `&hits.hits._source=period_of_report,entity_name,file_num,form_type,file_date,accession_no`;

  console.log(`[edgar_poll] EFTS broad scan URL: ${url}`);

  try {
    const res = await edgarFetch(url);
    const raw = await res.json();
    const parsed = eftsResponseSchema.safeParse(raw);

    if (!parsed.success) {
      console.warn('[edgar_poll] EFTS response did not match expected schema:', parsed.error.message);
      console.warn('[edgar_poll] Raw EFTS response (first 500 chars):', JSON.stringify(raw).slice(0, 500));
      return [];
    }

    return parsed.data.hits.hits.map((hit) => ({
      accessionNumber: hit._source.accession_no,
      filingType: hit._source.form_type,
      filedDate: hit._source.file_date,
      primaryDocument: '', // Will be resolved via index endpoint during download
      filerCik: '', // Not always in EFTS; resolved during download
      filerName: hit._source.entity_name,
    }));
  } catch (err) {
    console.error('[edgar_poll] EFTS broad scan failed:', err);
    return []; // Non-fatal — CIK-based poll is the primary mechanism
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the date of the most recent filing in the DB.
 * Returns null if no filings exist yet (triggers 30-day backfill).
 */
async function getLastPollDate(): Promise<Date | null> {
  const rows = await adminDb
    .select({ filedDate: schema.filings.filedDate })
    .from(schema.filings)
    .orderBy(schema.filings.filedDate)
    .limit(1);

  if (rows.length === 0) return null;

  return new Date(rows[0].filedDate);
}

/**
 * Insert a filing if it does not already exist (idempotent via accessionNumber unique constraint).
 * Returns the inserted row (with id) or null if a conflict was detected (already exists).
 *
 * High-signal filings (S-4, DEFM14A, etc.) get status 'active'.
 * Low-signal filings (8-K, 13D/13G, etc.) get status 'pending_review'.
 */
async function insertFilingIfNew(filing: FilingMetadata): Promise<{ id: string } | null> {
  const isHighSignal = HIGH_SIGNAL_TYPES.has(filing.filingType);
  const status = isHighSignal ? 'active' : 'pending_review';

  // rawUrl: build from filing metadata. For EFTS results where primaryDocument is
  // empty, use the index URL. The download handler will resolve the actual doc URL.
  const rawUrl =
    filing.primaryDocument && filing.filerCik
      ? buildFilingUrl(filing.filerCik, filing.accessionNumber, filing.primaryDocument)
      : filing.filerCik
        ? buildIndexUrl(filing.filerCik, filing.accessionNumber)
        : `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=${filing.filingType}&dateb=&owner=include&count=10`;

  const result = await adminDb
    .insert(schema.filings)
    .values({
      accessionNumber: filing.accessionNumber,
      filingType: filing.filingType,
      filerName: filing.filerName ?? null,
      filerCik: filing.filerCik || 'unknown',
      filedDate: filing.filedDate,
      rawUrl,
      rawContent: null, // Stage 1 — content is null until Stage 2 download completes
      extracted: false,
      status,
    })
    .onConflictDoNothing({ target: schema.filings.accessionNumber })
    .returning({ id: schema.filings.id });

  return result.length > 0 ? result[0] : null;
}

/**
 * Deduplicate filings by accession number before attempting DB inserts.
 * Both Scan A and Scan B may surface the same filing.
 */
function deduplicateByAccession(filings: FilingMetadata[]): FilingMetadata[] {
  const seen = new Set<string>();
  return filings.filter((f) => {
    if (seen.has(f.accessionNumber)) return false;
    seen.add(f.accessionNumber);
    return true;
  });
}
