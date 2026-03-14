import { Hono } from 'hono';
import { adminDb } from '../db/index.js';
import * as schema from '../db/schema.js';
import type { AuthEnv } from '../middleware/auth.js';

const SOURCE_DISPLAY_NAMES: Record<string, string> = {
  edgar: 'SEC EDGAR',
  ftc: 'FTC.gov',
  ftc_rss: 'FTC.gov',
  doj_rss: 'DOJ.gov',
  doj_civil_rss: 'DOJ.gov',
  courtlistener: 'CourtListener',
  rss: 'RSS Feeds',
};

function getPacerCredentialHealth(): {
  isExpiringSoon: boolean;
  daysUntilExpiry: number | null;
  expiryDate: string | null;
  lastChanged: string | null;
} {
  const lastChanged = process.env.PACER_PASSWORD_LAST_CHANGED; // ISO date e.g. '2026-01-01'
  if (!lastChanged) return { isExpiringSoon: false, daysUntilExpiry: null, expiryDate: null, lastChanged: null };
  const expiryDate = new Date(lastChanged);
  expiryDate.setDate(expiryDate.getDate() + 180); // PACER passwords expire every 180 days
  const daysUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return {
    isExpiringSoon: daysUntilExpiry <= 30,
    daysUntilExpiry,
    expiryDate: expiryDate.toISOString(),
    lastChanged,
  };
}

export const integrationsRoutes = new Hono<AuthEnv>().get('/health', async (c) => {
  // GET /api/integrations/health — return health status of all ingestion sources
  // System-wide endpoint (no firm_id filtering) but requires authentication
  const rows = await adminDb.select().from(schema.ingestionStatus).orderBy(schema.ingestionStatus.sourceName);

  return c.json({
    sources: rows.map((row) => ({
      sourceName: row.sourceName,
      displayName: SOURCE_DISPLAY_NAMES[row.sourceName] ?? row.sourceName,
      lastSuccessfulSync: row.lastSuccessfulSync,
      lastError: row.lastError,
      lastErrorAt: row.lastErrorAt,
      itemsIngested: row.itemsIngested,
      isHealthy: row.isHealthy,
    })),
    pacerCredential: getPacerCredentialHealth(),
  });
});
