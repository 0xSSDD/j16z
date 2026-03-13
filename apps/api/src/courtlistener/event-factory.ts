import { adminDb } from '../db/index.js';
import * as schema from '../db/schema.js';
import { ingestionQueue } from '../queues/ingestion.js';

// ---------------------------------------------------------------------------
// COURT event creation — mirrors agency/event-factory.ts pattern
// ---------------------------------------------------------------------------

interface CreateCourtEventParams {
  firmId: string;
  dealId: string;
  subType: string;
  title: string;
  description: string;
  sourceUrl: string;
  materialityScore: number;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Insert a COURT event into the events table.
 * Source is always 'COURT_LISTENER'.
 */
export async function createCourtEvent(params: CreateCourtEventParams): Promise<void> {
  const [inserted] = await adminDb
    .insert(schema.events)
    .values({
      firmId: params.firmId,
      dealId: params.dealId,
      type: 'COURT',
      subType: params.subType,
      title: params.title,
      description: params.description,
      source: 'COURT_LISTENER',
      sourceUrl: params.sourceUrl,
      timestamp: params.timestamp ?? new Date(),
      materialityScore: params.materialityScore,
      severity: params.severity,
      metadata: params.metadata ?? null,
    })
    .returning({ id: schema.events.id });

  // Enqueue alert evaluation for the newly created event
  await ingestionQueue.add(
    'alert_evaluate',
    {
      eventId: inserted.id,
      firmId: params.firmId,
      dealId: params.dealId,
      materialityScore: params.materialityScore,
      severity: params.severity,
    },
    { delay: 5000 },
  );
}

/**
 * Base materiality scores by COURT event sub-type.
 * Scores mirror the materiality scoring spec in CLAUDE.md.
 *
 * INJUNCTION    = 90 (CRITICAL — immediate injunctive relief blocks deal)
 * COMPLAINT     = 85 (CRITICAL — initial lawsuit filed)
 * SECOND_REQUEST= 85 (CRITICAL — HSR second request in litigation context)
 * MOTION        = 70 (WARNING — e.g., motion for preliminary injunction)
 * CASE_DISCOVERED = 50 (WARNING — new case found during discovery polling)
 * DOCKET_ENTRY  = 50 (WARNING — routine docket entry)
 */
export function getCourtMaterialityScore(subType: string): number {
  switch (subType) {
    case 'INJUNCTION':
      return 90;
    case 'COMPLAINT':
      return 85;
    case 'SECOND_REQUEST':
      return 85;
    case 'MOTION':
      return 70;
    case 'CASE_DISCOVERED':
      return 50;
    case 'DOCKET_ENTRY':
      return 50;
    default:
      return 50;
  }
}

/**
 * Derive severity tier from a materiality score.
 * >=70 CRITICAL, >=50 WARNING, else INFO.
 * Threshold matches CLAUDE.md spec and TypeScript severity-scoring.ts behavior.
 */
export function getCourtSeverity(score: number): 'CRITICAL' | 'WARNING' | 'INFO' {
  if (score >= 70) return 'CRITICAL';
  if (score >= 50) return 'WARNING';
  return 'INFO';
}
