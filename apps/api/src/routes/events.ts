import { and, eq, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { adminDb } from '../db/index.js';
import * as schema from '../db/schema.js';

export const eventsRoutes = new Hono()
  .get('/', async (c) => {
    // GET /api/events — return all non-deleted events ordered by timestamp desc
    // Supports optional ?dealId= query param to filter events by deal
    const dealId = c.req.query('dealId');

    const conditions = [isNull(schema.events.deletedAt)];
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
    // GET /api/events/:id — return single event or 404
    const id = c.req.param('id');
    const [row] = await adminDb
      .select()
      .from(schema.events)
      .where(eq(schema.events.id, id))
      .limit(1);
    if (!row || row.deletedAt !== null) {
      return c.json({ error: 'Event not found' }, 404);
    }
    return c.json(row);
  });
