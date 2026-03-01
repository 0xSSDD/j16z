import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { adminDb } from '../db/index.js';
import type { AuthEnv } from '../middleware/auth.js';
import * as schema from '../db/schema.js';

export const filingsRoutes = new Hono<AuthEnv>()
  // GET /api/filings/unmatched — must be before /:id to avoid route shadowing
  .get('/unmatched', async (c) => {
    const rows = await adminDb
      .select()
      .from(schema.filings)
      .where(and(isNull(schema.filings.dealId), isNull(schema.filings.deletedAt)))
      .orderBy(desc(schema.filings.filedDate));

    return c.json(rows);
  })

  // GET /api/filings — all filings for deals belonging to this firm
  .get('/', async (c) => {
    const firmId = c.get('firmId');

    // Step 1: Get all deal IDs for this firm
    const firmDeals = await adminDb
      .select({ id: schema.deals.id })
      .from(schema.deals)
      .where(and(eq(schema.deals.firmId, firmId), isNull(schema.deals.deletedAt)));

    const dealIds = firmDeals.map((d) => d.id);

    if (dealIds.length === 0) {
      return c.json([]);
    }

    // Step 2: Get filings for those deals
    const rows = await adminDb
      .select()
      .from(schema.filings)
      .where(and(inArray(schema.filings.dealId, dealIds), isNull(schema.filings.deletedAt)))
      .orderBy(desc(schema.filings.filedDate));

    return c.json(rows);
  })

  // GET /api/filings/deal/:dealId — filings for a specific deal
  .get('/deal/:dealId', async (c) => {
    const dealId = c.req.param('dealId');
    const firmId = c.get('firmId');

    // Verify the deal belongs to this firm
    const [deal] = await adminDb
      .select({ id: schema.deals.id })
      .from(schema.deals)
      .where(and(eq(schema.deals.id, dealId), eq(schema.deals.firmId, firmId)))
      .limit(1);

    if (!deal) {
      return c.json({ error: 'Deal not found' }, 404);
    }

    const rows = await adminDb
      .select()
      .from(schema.filings)
      .where(and(eq(schema.filings.dealId, dealId), isNull(schema.filings.deletedAt)))
      .orderBy(desc(schema.filings.filedDate));

    return c.json(rows);
  })

  // GET /api/filings/:id — single filing by ID
  .get('/:id', async (c) => {
    const id = c.req.param('id');

    const [row] = await adminDb
      .select()
      .from(schema.filings)
      .where(and(eq(schema.filings.id, id), isNull(schema.filings.deletedAt)))
      .limit(1);

    if (!row) {
      return c.json({ error: 'Filing not found' }, 404);
    }

    return c.json(row);
  });
