import { zValidator } from '@hono/zod-validator';
import { and, eq, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { adminDb } from '../db/index.js';
import * as schema from '../db/schema.js';
import type { AuthEnv } from '../middleware/auth.js';

const createWatchlistSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

// firmId and createdBy are sourced from JWT — never trusted from client

export const watchlistsRoutes = new Hono<AuthEnv>()
  .get('/', async (c) => {
    // GET /api/watchlists — return all non-deleted watchlists for the authenticated firm
    const firmId = c.get('firmId');
    const rows = await adminDb
      .select()
      .from(schema.watchlists)
      .where(and(eq(schema.watchlists.firmId, firmId), isNull(schema.watchlists.deletedAt)))
      .orderBy(schema.watchlists.createdAt);
    return c.json(rows);
  })
  .get('/:id', async (c) => {
    // GET /api/watchlists/:id — return single watchlist with its associated deals (scoped to firm)
    const id = c.req.param('id');
    const firmId = c.get('firmId');
    const [watchlist] = await adminDb
      .select()
      .from(schema.watchlists)
      .where(
        and(eq(schema.watchlists.id, id), eq(schema.watchlists.firmId, firmId), isNull(schema.watchlists.deletedAt)),
      )
      .limit(1);

    if (!watchlist) {
      return c.json({ error: 'Watchlist not found' }, 404);
    }

    // Join watchlist_deals to get associated deals scoped to firm
    const dealRows = await adminDb
      .select({ deal: schema.deals })
      .from(schema.watchlistDeals)
      .innerJoin(schema.deals, eq(schema.watchlistDeals.dealId, schema.deals.id))
      .where(and(eq(schema.watchlistDeals.watchlistId, id), eq(schema.deals.firmId, firmId)));

    const deals = dealRows.map((r) => r.deal).filter((d) => d.deletedAt === null);

    return c.json({ ...watchlist, deals });
  })
  .post('/', zValidator('json', createWatchlistSchema), async (c) => {
    // POST /api/watchlists — create watchlist; firmId and createdBy from JWT
    const body = c.req.valid('json');
    const firmId = c.get('firmId');
    const userId = c.get('userId');
    const [inserted] = await adminDb
      .insert(schema.watchlists)
      .values({
        name: body.name,
        firmId, // Always from JWT — never trust client-provided firm_id
        createdBy: userId, // Always from JWT
        description: body.description,
      })
      .returning();
    return c.json(inserted, 201);
  });
