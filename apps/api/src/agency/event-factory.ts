import { adminDb } from '../db/index.js';
import * as schema from '../db/schema.js';
import { ingestionQueue } from '../queues/ingestion.js';

interface CreateAgencyEventParams {
  firmId: string;
  dealId: string;
  subType: string;
  title: string;
  description: string;
  sourceUrl: string;
  materialityScore: number;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  source?: 'FTC' | 'DOJ';
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

export async function createAgencyEvent(params: CreateAgencyEventParams): Promise<void> {
  const [inserted] = await adminDb
    .insert(schema.events)
    .values({
      firmId: params.firmId,
      dealId: params.dealId,
      type: 'AGENCY',
      subType: params.subType,
      title: params.title,
      description: params.description,
      source: params.source ?? 'FTC',
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

export async function updateIngestionStatus(
  sourceName: string,
  success: boolean,
  error?: string,
  itemCount?: number,
): Promise<void> {
  const now = new Date();

  if (success) {
    await adminDb
      .insert(schema.ingestionStatus)
      .values({
        sourceName,
        lastSuccessfulSync: now,
        lastError: null,
        lastErrorAt: null,
        itemsIngested: itemCount ?? 0,
        isHealthy: true,
      })
      .onConflictDoUpdate({
        target: schema.ingestionStatus.sourceName,
        set: {
          lastSuccessfulSync: now,
          lastError: null,
          lastErrorAt: null,
          itemsIngested: itemCount ?? 0,
          isHealthy: true,
          updatedAt: now,
        },
      });
    return;
  }

  await adminDb
    .insert(schema.ingestionStatus)
    .values({
      sourceName,
      lastError: error ?? 'Unknown agency ingestion error',
      lastErrorAt: now,
      itemsIngested: itemCount ?? 0,
      isHealthy: false,
    })
    .onConflictDoUpdate({
      target: schema.ingestionStatus.sourceName,
      set: {
        lastError: error ?? 'Unknown agency ingestion error',
        lastErrorAt: now,
        itemsIngested: itemCount ?? 0,
        isHealthy: false,
        updatedAt: now,
      },
    });
}
