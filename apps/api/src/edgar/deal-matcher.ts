import { eq, or, and, isNull } from 'drizzle-orm';
import { adminDb } from '../db/index.js';
import * as schema from '../db/schema.js';
import { HIGH_SIGNAL_TYPES } from './types.js';
import type { FilingMetadata } from './types.js';

// ---------------------------------------------------------------------------
// Deal matcher — links EDGAR filings to existing deals or auto-creates new deals.
//
// Per CONTEXT.md locked decision:
//   "high-signal filings (S-4, DEFM14A) auto-create a deal record as ANNOUNCED"
//
// Auto-created deals have firmId=null and source='auto_edgar' — they live in a
// global discovery pool until a firm claims them via watchlist.
// ---------------------------------------------------------------------------

interface MatchResult {
  dealId: string | null;
  isNewDeal: boolean;
  firmIds: string[]; // All firms tracking this deal (for event creation)
}

/**
 * Match a filing to existing deals by CIK, or auto-create a new deal for high-signal filings.
 *
 * Step 1: CIK match — check if any deal has this CIK as acquirer or target.
 * Step 2: If no match and high-signal filing, auto-create a deal (with duplicate guard).
 * Step 3: If no match and low-signal filing, return null dealId (goes to review queue).
 *
 * Returns the matched/created deal ID and all firm IDs that track it.
 * Returns null dealId if filing doesn't match any deal and isn't high-signal.
 */
export async function matchFilingToDeal(filing: FilingMetadata): Promise<MatchResult> {
  // Step 1: Try to match by CIK — check if any deal has this CIK as acquirer or target
  if (filing.filerCik) {
    const matchedDeals = await adminDb
      .select({ id: schema.deals.id, firmId: schema.deals.firmId })
      .from(schema.deals)
      .where(
        and(
          isNull(schema.deals.deletedAt),
          or(eq(schema.deals.acquirerCik, filing.filerCik), eq(schema.deals.targetCik, filing.filerCik)),
        ),
      );

    if (matchedDeals.length > 0) {
      // Filing matches existing deal(s) — return first match and all firm IDs
      const firmIds = [...new Set(matchedDeals.filter((d) => d.firmId).map((d) => d.firmId!))];
      return {
        dealId: matchedDeals[0].id,
        isNewDeal: false,
        firmIds,
      };
    }
  }

  // Step 2: No CIK match — for high-signal filings, auto-create a deal record
  // Per CONTEXT.md locked decision: S-4, DEFM14A auto-create deal as ANNOUNCED
  if (HIGH_SIGNAL_TYPES.has(filing.filingType) && filing.filerName) {
    // Check if an auto-created deal already exists for this CIK (avoid duplicates)
    if (filing.filerCik) {
      const existingAutoDeals = await adminDb
        .select({ id: schema.deals.id })
        .from(schema.deals)
        .where(
          and(
            isNull(schema.deals.deletedAt),
            eq(schema.deals.source, 'auto_edgar'),
            or(eq(schema.deals.acquirerCik, filing.filerCik), eq(schema.deals.targetCik, filing.filerCik)),
          ),
        )
        .limit(1);

      if (existingAutoDeals.length > 0) {
        // Already auto-created — return existing deal (no firm IDs since it's unclaimed)
        return {
          dealId: existingAutoDeals[0].id,
          isNewDeal: false,
          firmIds: [],
        };
      }
    }

    // Auto-create deal in global discovery pool (firmId=null, source='auto_edgar')
    // These deals are invisible to firm-scoped RLS queries until claimed.
    const [newDeal] = await adminDb
      .insert(schema.deals)
      .values({
        // firmId is null — deal is in the global discovery pool
        symbol: '', // Unknown until analyst reviews or CIK mapping resolves
        acquirer: filing.filerName, // Best guess from filing metadata
        target: '', // Unknown from filing metadata alone
        acquirerCik: filing.filerCik || null,
        status: 'ANNOUNCED',
        source: 'auto_edgar',
        announcedDate: filing.filedDate,
      })
      .returning({ id: schema.deals.id });

    console.log(
      `[deal-matcher] Auto-created deal ${newDeal.id} from ${filing.filingType}: ` +
        `${filing.filerName} (CIK: ${filing.filerCik}, accession: ${filing.accessionNumber})`,
    );

    return {
      dealId: newDeal.id,
      isNewDeal: true,
      firmIds: [], // No firms yet — deal is in discovery pool
    };
  }

  return { dealId: null, isNewDeal: false, firmIds: [] };
}
