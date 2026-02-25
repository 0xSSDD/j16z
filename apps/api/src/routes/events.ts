import { and, eq, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { adminDb } from '../db/index.js';
import type { AuthEnv } from '../middleware/auth.js';
import * as schema from '../db/schema.js';

export const eventsRoutes = new Hono<AuthEnv>()
  .get('/', async (c) => {
    // GET /api/events — return all non-deleted events for the authenticated firm
    // Supports optional ?dealId= query param to filter events by deal
    const dealId = c.req.query('dealId');
    const firmId = c.get('firmId');

    const conditions = [eq(schema.events.firmId, firmId), isNull(schema.events.deletedAt)];
    if (dealId) {
      conditions.push(eq(schema.events.dealId, dealId));
    }

    const rows = await adminDb
      .select()
      .from(schema.events)
      .where(and(...conditions))
      .orderBy(schema.events.timestamp);
    return c.json(rows);
  })
  .get('/:id', async (c) => {
    // GET /api/events/:id — return single event or 404; scoped to firm
    const id = c.req.param('id');
    const firmId = c.get('firmId');
    const [row] = await adminDb
      .select()
      .from(schema.events)
      .where(and(eq(schema.events.id, id), eq(schema.events.firmId, firmId), isNull(schema.events.deletedAt)))
      .limit(1);
    if (!row) {
      return c.json({ error: 'Event not found' }, 404);
    }
    return c.json(row);
  });
