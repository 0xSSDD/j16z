import { zValidator } from '@hono/zod-validator';
import { eq, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { adminDb } from '../db/index.js';
import * as schema from '../db/schema.js';

const createWatchlistSchema = z.object({
  name: z.string().min(1),
  firmId: z.string().uuid(),
  createdBy: z.string().uuid(),
  description: z.string().optional(),
});

export const watchlistsRoutes = new Hono()
  .get('/', async (c) => {
    // GET /api/watchlists — return all non-deleted watchlists
    const rows = await adminDb
      .select()
      .from(schema.watchlists)
      .where(isNull(schema.watchlists.deletedAt))
      .orderBy(schema.watchlists.createdAt);
    return c.json(rows);
  })
  .get('/:id', async (c) => {
    // GET /api/watchlists/:id — return single watchlist with its associated deals
    const id = c.req.param('id');
    const [watchlist] = await adminDb
      .select()
      .from(schema.watchlists)
      .where(eq(schema.watchlists.id, id))
      .limit(1);

    if (!watchlist || watchlist.deletedAt !== null) {
      return c.json({ error: 'Watchlist not found' }, 404);
    }

    // Join watchlist_deals to get associated deals
    const dealRows = await adminDb
      .select({ deal: schema.deals })
      .from(schema.watchlistDeals)
      .innerJoin(schema.deals, eq(schema.watchlistDeals.dealId, schema.deals.id))
      .where(eq(schema.watchlistDeals.watchlistId, id));

    const deals = dealRows.map((r) => r.deal).filter((d) => d.deletedAt === null);

    return c.json({ ...watchlist, deals });
  })
  .post('/', zValidator('json', createWatchlistSchema), async (c) => {
    // POST /api/watchlists — create a new watchlist
    const body = c.req.valid('json');
    const [inserted] = await adminDb
      .insert(schema.watchlists)
      .values({
        name: body.name,
        firmId: body.firmId,
        createdBy: body.createdBy,
        description: body.description,
      })
      .returning();
    return c.json(inserted, 201);
  });
