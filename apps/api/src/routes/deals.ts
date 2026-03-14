import { zValidator } from '@hono/zod-validator';
import { and, eq, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { withRLS } from '../db/rls.js';
import * as schema from '../db/schema.js';
import type { AuthEnv } from '../middleware/auth.js';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const createDealSchema = z.object({
  symbol: z.string().min(1),
  acquirer: z.string().min(1),
  target: z.string().min(1),
  status: z
    .enum(['ANNOUNCED', 'REGULATORY_REVIEW', 'LITIGATION', 'APPROVED', 'TERMINATED', 'CLOSED'])
    .optional()
    .default('ANNOUNCED'),
  considerationType: z.enum(['CASH', 'STOCK', 'MIXED']).optional().default('CASH'),
  dealValue: z.string().optional(),
  pricePerShare: z.string().optional(),
  premium: z.string().optional(),
  currentPrice: z.string().optional(),
  outsideDate: z.string().optional(),
  expectedCloseDate: z.string().optional(),
  announcedDate: z.string().optional(),
  pCloseBase: z.string().optional(),
  pBreakRegulatory: z.string().optional(),
  pBreakLitigation: z.string().optional(),
  sizeBucket: z.string().optional(),
  isStarter: z.boolean().optional().default(false),
});

// firmId is omitted — it's sourced from the JWT, never trusted from the client
const patchDealSchema = createDealSchema.partial();

export const dealsRoutes = new Hono<AuthEnv>()
  .get('/', async (c) => {
    // GET /api/deals — return all non-deleted deals for the authenticated firm
    const firmId = c.get('firmId');
    const userId = c.get('userId');
    const rows = await withRLS(firmId, userId, (tx) =>
      tx
        .select()
        .from(schema.deals)
        .where(and(eq(schema.deals.firmId, firmId), isNull(schema.deals.deletedAt)))
        .orderBy(schema.deals.createdAt),
    );
    return c.json(rows);
  })
  .get('/:id/clauses', async (c) => {
    // GET /api/deals/:id/clauses — return extracted clauses for a deal; scoped to firm
    const dealId = c.req.param('id');
    const firmId = c.get('firmId');
    const userId = c.get('userId');

    const { deal, rows } = await withRLS(firmId, userId, async (tx) => {
      const [deal] = await tx
        .select({ id: schema.deals.id })
        .from(schema.deals)
        .where(and(eq(schema.deals.id, dealId), eq(schema.deals.firmId, firmId), isNull(schema.deals.deletedAt)))
        .limit(1);

      if (!deal) {
        return { deal: null, rows: [] };
      }

      const rows = await tx
        .select()
        .from(schema.clauses)
        .where(and(eq(schema.clauses.dealId, dealId), eq(schema.clauses.firmId, firmId)))
        .orderBy(schema.clauses.createdAt);

      return { deal, rows };
    });

    if (!deal) {
      return c.json({ error: 'Deal not found' }, 404);
    }

    return c.json(rows);
  })
  .get('/:id/news', async (c) => {
    // GET /api/deals/:id/news — return news items for a deal; scoped to firm
    const dealId = c.req.param('id');
    const firmId = c.get('firmId');
    const userId = c.get('userId');

    const { deal, rows } = await withRLS(firmId, userId, async (tx) => {
      const [deal] = await tx
        .select({ id: schema.deals.id })
        .from(schema.deals)
        .where(and(eq(schema.deals.id, dealId), eq(schema.deals.firmId, firmId), isNull(schema.deals.deletedAt)))
        .limit(1);

      if (!deal) {
        return { deal: null, rows: [] };
      }

      const rows = await tx
        .select()
        .from(schema.newsItems)
        .where(and(eq(schema.newsItems.dealId, dealId), eq(schema.newsItems.firmId, firmId)))
        .orderBy(schema.newsItems.publishedAt);

      return { deal, rows };
    });

    if (!deal) {
      return c.json({ error: 'Deal not found' }, 404);
    }

    return c.json(rows);
  })
  .get('/:id', async (c) => {
    // GET /api/deals/:id — return single deal or 404; scoped to firm
    const id = c.req.param('id');
    const firmId = c.get('firmId');
    const userId = c.get('userId');
    const [row] = await withRLS(firmId, userId, (tx) =>
      tx
        .select()
        .from(schema.deals)
        .where(and(eq(schema.deals.id, id), eq(schema.deals.firmId, firmId), isNull(schema.deals.deletedAt)))
        .limit(1),
    );
    if (!row) {
      return c.json({ error: 'Deal not found' }, 404);
    }
    return c.json(row);
  })
  .post('/', zValidator('json', createDealSchema), async (c) => {
    // POST /api/deals — create a new deal; firmId sourced from JWT (never client)
    const body = c.req.valid('json');
    const firmId = c.get('firmId');
    const userId = c.get('userId');
    const [inserted] = await withRLS(firmId, userId, (tx) =>
      tx
        .insert(schema.deals)
        .values({
          firmId, // Always from JWT — never trust client-provided firm_id
          symbol: body.symbol,
          acquirer: body.acquirer,
          target: body.target,
          status: body.status,
          considerationType: body.considerationType,
          dealValue: body.dealValue,
          pricePerShare: body.pricePerShare,
          premium: body.premium,
          currentPrice: body.currentPrice,
          outsideDate: body.outsideDate,
          expectedCloseDate: body.expectedCloseDate,
          announcedDate: body.announcedDate,
          pCloseBase: body.pCloseBase,
          pBreakRegulatory: body.pBreakRegulatory,
          pBreakLitigation: body.pBreakLitigation,
          sizeBucket: body.sizeBucket,
          isStarter: body.isStarter,
        })
        .returning(),
    );
    return c.json(inserted, 201);
  })
  .patch('/:id', zValidator('json', patchDealSchema), async (c) => {
    // PATCH /api/deals/:id — partial update scoped to firm; sets updated_at to now
    const id = c.req.param('id');
    const firmId = c.get('firmId');
    const userId = c.get('userId');
    const body = c.req.valid('json');
    const [updated] = await withRLS(firmId, userId, (tx) =>
      tx
        .update(schema.deals)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(and(eq(schema.deals.id, id), eq(schema.deals.firmId, firmId)))
        .returning(),
    );
    if (!updated) {
      return c.json({ error: 'Deal not found' }, 404);
    }
    return c.json(updated);
  })
  .delete('/:id', async (c) => {
    // DELETE /api/deals/:id — soft delete scoped to firm: set deleted_at to now
    const id = c.req.param('id');
    const firmId = c.get('firmId');
    const userId = c.get('userId');
    const [deleted] = await withRLS(firmId, userId, (tx) =>
      tx
        .update(schema.deals)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(schema.deals.id, id), eq(schema.deals.firmId, firmId)))
        .returning(),
    );
    if (!deleted) {
      return c.json({ error: 'Deal not found' }, 404);
    }
    return c.json({ success: true });
  });
