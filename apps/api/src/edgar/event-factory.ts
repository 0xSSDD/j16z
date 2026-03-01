import { adminDb } from '../db/index.js';
import * as schema from '../db/schema.js';
import type { FilingMetadata } from './types.js';

// ---------------------------------------------------------------------------
// Event factory — creates firm-scoped Event records when filings match deals.
//
// Filings are global (no firm_id), but Events are firm-scoped (have firm_id + RLS).
// This is the bridge between global ingestion and per-firm Inbox visibility.
//
// For each firm tracking a deal, one Event is created per filing.
// If no firms track the deal (e.g., auto-created deal in discovery pool),
// no events are created — firmIds is empty and we return early.
// ---------------------------------------------------------------------------

// Base materiality scores by filing type (from CLAUDE.md scoring system)
const FILING_MATERIALITY: Record<string, number> = {
  'S-4': 80,
  'S-4/A': 75,
  DEFM14A: 80,
  PREM14A: 70,
  '8-K': 60,
  '8-K/A': 55,
  'SC 13D': 50,
  'SC 13D/A': 45,
  'SC 13G': 40,
  'SC 13G/A': 35,
  'SC TO-T': 75,
  'SC TO-T/A': 70,
  'SC TO-I': 65, // Issuer tender offers — slightly lower signal than third-party
  'SC TO-I/A': 60,
  'SC 14D9': 70,
  'SC 14D9/A': 65,
};

function getSeverity(score: number): 'CRITICAL' | 'WARNING' | 'INFO' {
  if (score >= 70) return 'CRITICAL';
  if (score >= 50) return 'WARNING';
  return 'INFO';
}

/**
 * Create firm-scoped Event records for each firm that tracks this deal.
 *
 * Filings are global, but Events are firm-scoped (have firm_id + RLS).
 * This is the bridge between global ingestion and per-firm visibility.
 */
export async function createFilingEvents(
  filingId: string,
  dealId: string,
  filing: FilingMetadata,
  firmIds: string[],
): Promise<void> {
  if (firmIds.length === 0) return;

  const materialityScore = FILING_MATERIALITY[filing.filingType] ?? 40;
  const severity = getSeverity(materialityScore);

  const eventValues = firmIds.map((firmId) => ({
    firmId,
    dealId,
    type: 'FILING' as const,
    subType: filing.filingType,
    title: `${filing.filingType} filed${filing.filerName ? ` by ${filing.filerName}` : ''}`,
    description: `SEC filing ${filing.accessionNumber} (${filing.filingType}) filed on ${filing.filedDate}`,
    source: 'SEC_EDGAR' as const,
    sourceUrl: filing.primaryDocument
      ? `https://www.sec.gov/Archives/edgar/data/${filing.filerCik}/${filing.accessionNumber.replace(/-/g, '')}/${filing.primaryDocument}`
      : `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${filing.filerCik}&type=${filing.filingType}&dateb=&owner=include&count=10`,
    timestamp: new Date(filing.filedDate),
    materialityScore,
    severity,
    metadata: {
      filingId,
      accessionNumber: filing.accessionNumber,
      filingType: filing.filingType,
      filerCik: filing.filerCik,
      filerName: filing.filerName,
    },
  }));

  if (eventValues.length > 0) {
    await adminDb.insert(schema.events).values(eventValues);
    console.log(`[event-factory] Created ${eventValues.length} FILING events for filing ${filing.accessionNumber}`);
  }
}
