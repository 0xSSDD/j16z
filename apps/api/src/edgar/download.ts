import { eq, and, isNull } from 'drizzle-orm';
import type { Job } from 'bullmq';
import { adminDb } from '../db/index.js';
import * as schema from '../db/schema.js';
import { edgarFetch, buildFilingUrl, buildIndexUrl } from './client.js';
import { ingestionQueue } from '../queues/ingestion.js';

// ---------------------------------------------------------------------------
// Stage 2 download handler — fetches filing HTML and converts to plain text.
//
// Triggered by edgar_download jobs enqueued by the Stage 1 poll handler.
// BullMQ retries up to 3 times with exponential backoff on failure.
// If all retries exhausted, filing remains with rawContent=null —
// the UI shows "content pending" and the analyst can click the raw EDGAR link.
// ---------------------------------------------------------------------------

export async function handleEdgarDownload(job: Job): Promise<void> {
  const { filingId, accessionNumber, cik, primaryDocument } = job.data as {
    filingId: string;
    accessionNumber: string;
    cik: string;
    primaryDocument: string;
  };

  console.log(`[edgar_download] Downloading filing ${accessionNumber}`);

  let docUrl: string;

  if (primaryDocument) {
    docUrl = buildFilingUrl(cik, accessionNumber, primaryDocument);
  } else {
    // EFTS results may not have primaryDocument — resolve via index
    const indexUrl = buildIndexUrl(cik, accessionNumber);
    const indexRes = await edgarFetch(indexUrl);
    const indexData = await indexRes.json();
    // The index lists all documents; pick the first HTML/HTM document
    const primaryDoc = resolvePrimaryDocument(indexData);
    if (!primaryDoc) {
      console.warn(`[edgar_download] Could not resolve primary document for ${accessionNumber}`);
      return;
    }
    docUrl = buildFilingUrl(cik, accessionNumber, primaryDoc);
  }

  // Fetch the filing HTML — must go through edgarFetch for rate limiting (EDGAR-04)
  const res = await edgarFetch(docUrl);
  const html = await res.text();

  // Convert HTML to plain text — strip tags, scripts, styles (not raw HTML)
  const { htmlToText } = await import('html-to-text');
  const plainText = htmlToText(html, {
    wordwrap: false,
    selectors: [
      { selector: 'script', format: 'skip' },
      { selector: 'style', format: 'skip' },
      { selector: 'table', options: { uppercaseHeaderCells: false } },
    ],
  });

  // Update filing row with content
  await adminDb
    .update(schema.filings)
    .set({
      rawContent: plainText,
      rawUrl: docUrl, // Update rawUrl in case it was constructed from index resolution
      updatedAt: new Date(),
    })
    .where(eq(schema.filings.id, filingId));

  console.log(`[edgar_download] Stored ${plainText.length} chars for filing ${accessionNumber}`);

  // ---------------------------------------------------------------------------
  // Stage 3: Enqueue LLM extraction job for the Python worker (apps/langextract/)
  //
  // NOTE: Do NOT pass rawContent inline — it can be 400-800KB for S-4 filings
  // and would bloat Redis memory (Pitfall 1 from RESEARCH.md).
  // The Python worker fetches rawContent from DB via filing_id.
  // ---------------------------------------------------------------------------

  // Resolve filingType and dealId from the updated filing row
  const [filingRow] = await adminDb
    .select({ filingType: schema.filings.filingType, dealId: schema.filings.dealId })
    .from(schema.filings)
    .where(eq(schema.filings.id, filingId));

  // Resolve firmIds from the deal's firm ownership
  const firmIds: string[] = [];
  if (filingRow?.dealId) {
    const dealRows = await adminDb
      .select({ firmId: schema.deals.firmId })
      .from(schema.deals)
      .where(and(eq(schema.deals.id, filingRow.dealId), isNull(schema.deals.deletedAt)));
    firmIds.push(...dealRows.filter((d) => d.firmId).map((d) => d.firmId!));
  }

  await ingestionQueue.add('llm_extract', {
    filingId,
    filingType: filingRow?.filingType ?? null,
    dealId: filingRow?.dealId ?? null,
    firmIds,
  });

  console.log(`[edgar_download] Enqueued llm_extract for filing ${accessionNumber} (${filingRow?.filingType ?? 'unknown type'})`);
}

/**
 * Resolve the primary HTML document from a filing index JSON response.
 *
 * The filing index JSON has a directory.item array with name and type.
 * We pick the first HTML/HTM document as the primary document.
 */
function resolvePrimaryDocument(indexData: unknown): string | null {
  try {
    const data = indexData as { directory?: { item?: Array<{ name?: string; type?: string }> } };
    const items = data?.directory?.item;
    if (!Array.isArray(items)) return null;
    const htmlDoc = items.find((item) => item.name?.endsWith('.htm') || item.name?.endsWith('.html'));
    return htmlDoc?.name ?? null;
  } catch {
    return null;
  }
}
