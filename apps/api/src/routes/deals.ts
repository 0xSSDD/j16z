import { zValidator } from '@hono/zod-validator';
import { eq, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { adminDb } from '../db/index.js';
import * as schema from '../db/schema.js';

const createDealSchema = z.object({
  symbol: z.string().min(1),
  acquirer: z.string().min(1),
  target: z.string().min(1),
  firmId: z.string().uuid(),
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

const patchDealSchema = createDealSchema.partial().omit({ firmId: true });

export const dealsRoutes = new Hono()
  .get('/', async (c) => {
    // GET /api/deals — return all non-deleted deals ordered by created_at desc
    // Uses adminDb temporarily; Plan 01-02 adds auth middleware to switch to RLS-scoped db
    const rows = await adminDb
      .select()
      .from(schema.deals)
      .where(isNull(schema.deals.deletedAt))
      .orderBy(schema.deals.createdAt);
    return c.json(rows);
  })
  .get('/:id', async (c) => {
    // GET /api/deals/:id — return single deal or 404
    const id = c.req.param('id');
    const [row] = await adminDb
      .select()
      .from(schema.deals)
      .where(eq(schema.deals.id, id))
      .limit(1);
    if (!row || row.deletedAt !== null) {
      return c.json({ error: 'Deal not found' }, 404);
    }
    return c.json(row);
  })
  .post('/', zValidator('json', createDealSchema), async (c) => {
    // POST /api/deals — create a new deal
    const body = c.req.valid('json');
    const [inserted] = await adminDb
      .insert(schema.deals)
      .values({
        firmId: body.firmId,
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
      .returning();
    return c.json(inserted, 201);
  })
  .patch('/:id', zValidator('json', patchDealSchema), async (c) => {
    // PATCH /api/deals/:id — partial update; sets updated_at to now
    const id = c.req.param('id');
    const body = c.req.valid('json');
    const [updated] = await adminDb
      .update(schema.deals)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(schema.deals.id, id))
      .returning();
    if (!updated) {
      return c.json({ error: 'Deal not found' }, 404);
    }
    return c.json(updated);
  })
  .delete('/:id', async (c) => {
    // DELETE /api/deals/:id — soft delete: set deleted_at to now, do NOT hard delete
    const id = c.req.param('id');
    const [deleted] = await adminDb
      .update(schema.deals)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.deals.id, id))
      .returning();
    if (!deleted) {
      return c.json({ error: 'Deal not found' }, 404);
    }
    return c.json({ success: true });
  });
