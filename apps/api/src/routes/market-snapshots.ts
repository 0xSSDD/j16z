import { and, desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { withRLS } from '../db/rls.js';
import * as schema from '../db/schema.js';
import type { AuthEnv } from '../middleware/auth.js';

export const marketSnapshotsRoutes = new Hono<AuthEnv>()
  // GET /api/market-snapshots/:dealId/latest — most recent snapshot
  // Registered BEFORE /:dealId to prevent path param capture
  .get('/:dealId/latest', async (c) => {
    const firmId = c.get('firmId');
    const userId = c.get('userId');
    const dealId = c.req.param('dealId');

    const rows = await withRLS(firmId, userId, (tx) =>
      tx
        .select()
        .from(schema.marketSnapshots)
        .where(and(eq(schema.marketSnapshots.dealId, dealId), eq(schema.marketSnapshots.firmId, firmId)))
        .orderBy(desc(schema.marketSnapshots.timestamp))
        .limit(1),
    );

    if (rows.length === 0) {
      return c.json({ error: 'No snapshots found' }, 404);
    }

    return c.json(rows[0]);
  })

  // GET /api/market-snapshots/:dealId — last 100 snapshots
  .get('/:dealId', async (c) => {
    const firmId = c.get('firmId');
    const userId = c.get('userId');
    const dealId = c.req.param('dealId');

    const rows = await withRLS(firmId, userId, (tx) =>
      tx
        .select()
        .from(schema.marketSnapshots)
        .where(and(eq(schema.marketSnapshots.dealId, dealId), eq(schema.marketSnapshots.firmId, firmId)))
        .orderBy(desc(schema.marketSnapshots.timestamp))
        .limit(100),
    );

    return c.json(rows);
  });
