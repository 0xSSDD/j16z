import { zValidator } from '@hono/zod-validator';
import { and, desc, eq, isNull, or } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { withRLS } from '../db/rls.js';
import * as schema from '../db/schema.js';
import type { AuthEnv } from '../middleware/auth.js';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const createMemoSchema = z.object({
  dealId: z.string().uuid(),
  title: z.string().min(1).max(255),
  content: z.record(z.unknown()), // tiptap JSON
  visibility: z.enum(['private', 'firm']).optional().default('private'),
});

const patchMemoSchema = z.object({
  content: z.record(z.unknown()).optional(),
  title: z.string().min(1).max(255).optional(),
  visibility: z.enum(['private', 'firm']).optional(),
  version: z.number().int().min(1),
});

const createSnapshotSchema = z.object({
  name: z.string().min(1).max(255),
});

export const memosRoutes = new Hono<AuthEnv>()

  // ---------------------------------------------------------------------------
  // GET /api/memos?dealId={id} — list memos for a deal OR all firm memos
  // Returns: id, dealId, title, createdBy, visibility, version, createdAt, updatedAt, dealTitle
  // No content field — too large for list view
  // dealTitle = acquirer / target (from deals table)
  // ---------------------------------------------------------------------------
  .get('/', async (c) => {
    const firmId = c.get('firmId');
    const userId = c.get('userId');
    const dealId = c.req.query('dealId');

    return withRLS(firmId, userId, async (tx) => {
      if (dealId) {
        // Verify the deal belongs to this firm
        const [deal] = await tx
          .select({ id: schema.deals.id })
          .from(schema.deals)
          .where(and(eq(schema.deals.id, dealId), eq(schema.deals.firmId, firmId), isNull(schema.deals.deletedAt)))
          .limit(1);
        if (!deal) {
          return c.json({ error: 'Deal not found' }, 404);
        }

        // Return creator's own memos + firm-visible memos for this deal
        const rows = await tx
          .select({
            id: schema.memos.id,
            dealId: schema.memos.dealId,
            title: schema.memos.title,
            createdBy: schema.memos.createdBy,
            visibility: schema.memos.visibility,
            version: schema.memos.version,
            createdAt: schema.memos.createdAt,
            updatedAt: schema.memos.updatedAt,
          })
          .from(schema.memos)
          .where(
            and(
              eq(schema.memos.dealId, dealId),
              eq(schema.memos.firmId, firmId),
              isNull(schema.memos.deletedAt),
              or(eq(schema.memos.createdBy, userId), eq(schema.memos.visibility, 'firm')),
            ),
          )
          .orderBy(desc(schema.memos.updatedAt));

        return c.json(rows);
      }

      // No dealId: return all memos for the firm (joined with deals for dealTitle)
      const rows = await tx
        .select({
          id: schema.memos.id,
          dealId: schema.memos.dealId,
          title: schema.memos.title,
          createdBy: schema.memos.createdBy,
          visibility: schema.memos.visibility,
          version: schema.memos.version,
          createdAt: schema.memos.createdAt,
          updatedAt: schema.memos.updatedAt,
          acquirer: schema.deals.acquirer,
          target: schema.deals.target,
        })
        .from(schema.memos)
        .innerJoin(schema.deals, eq(schema.memos.dealId, schema.deals.id))
        .where(
          and(
            eq(schema.memos.firmId, firmId),
            isNull(schema.memos.deletedAt),
            or(eq(schema.memos.createdBy, userId), eq(schema.memos.visibility, 'firm')),
          ),
        )
        .orderBy(desc(schema.memos.updatedAt));

      // Map to construct dealTitle as "acquirer / target"
      const mappedRows = rows.map((row) => ({
        id: row.id,
        dealId: row.dealId,
        title: row.title,
        createdBy: row.createdBy,
        visibility: row.visibility,
        version: row.version,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        dealTitle: `${row.acquirer} / ${row.target}`,
      }));

      return c.json(mappedRows);
    });
  })

  // ---------------------------------------------------------------------------
  // GET /api/memos/:id — get single memo with full content
  // ---------------------------------------------------------------------------
  .get('/:id', async (c) => {
    const firmId = c.get('firmId');
    const userId = c.get('userId');
    const id = c.req.param('id');

    return withRLS(firmId, userId, async (tx) => {
      const [memo] = await tx
        .select()
        .from(schema.memos)
        .where(and(eq(schema.memos.id, id), eq(schema.memos.firmId, firmId), isNull(schema.memos.deletedAt)))
        .limit(1);

      if (!memo) {
        return c.json({ error: 'Memo not found' }, 404);
      }

      // Visibility check: creator always has access; firm-visible accessible to all firm members
      if (memo.createdBy !== userId && memo.visibility !== 'firm') {
        return c.json({ error: 'Forbidden' }, 403);
      }

      return c.json(memo);
    });
  })

  // ---------------------------------------------------------------------------
  // POST /api/memos — create memo
  // ---------------------------------------------------------------------------
  .post('/', zValidator('json', createMemoSchema), async (c) => {
    const firmId = c.get('firmId');
    const userId = c.get('userId');
    const body = c.req.valid('json');

    return withRLS(firmId, userId, async (tx) => {
      // Verify the deal belongs to this firm
      const [deal] = await tx
        .select({ id: schema.deals.id })
        .from(schema.deals)
        .where(and(eq(schema.deals.id, body.dealId), eq(schema.deals.firmId, firmId), isNull(schema.deals.deletedAt)))
        .limit(1);
      if (!deal) {
        return c.json({ error: 'Deal not found' }, 404);
      }

      const [inserted] = await tx
        .insert(schema.memos)
        .values({
          firmId,
          dealId: body.dealId,
          title: body.title,
          content: body.content,
          createdBy: userId,
          visibility: body.visibility,
          version: 1,
        })
        .returning();

      return c.json(inserted, 201);
    });
  })

  // ---------------------------------------------------------------------------
  // PATCH /api/memos/:id — update memo (auto-save target)
  // Optimistic concurrency: reject if incoming version <= stored version
  // ---------------------------------------------------------------------------
  .patch('/:id', zValidator('json', patchMemoSchema), async (c) => {
    const firmId = c.get('firmId');
    const userId = c.get('userId');
    const id = c.req.param('id');
    const body = c.req.valid('json');

    return withRLS(firmId, userId, async (tx) => {
      const [memo] = await tx
        .select({ id: schema.memos.id, createdBy: schema.memos.createdBy, version: schema.memos.version })
        .from(schema.memos)
        .where(and(eq(schema.memos.id, id), eq(schema.memos.firmId, firmId), isNull(schema.memos.deletedAt)))
        .limit(1);

      if (!memo) {
        return c.json({ error: 'Memo not found' }, 404);
      }

      // Only creator can edit
      if (memo.createdBy !== userId) {
        return c.json({ error: 'Forbidden' }, 403);
      }

      // Optimistic concurrency check: incoming version must be > stored version
      if (body.version <= memo.version) {
        return c.json({ error: 'Version conflict — reload memo before saving', stored: memo.version }, 409);
      }

      const updateFields: Partial<typeof schema.memos.$inferInsert> = {
        version: body.version,
        updatedAt: new Date(),
      };
      if (body.content !== undefined) updateFields.content = body.content;
      if (body.title !== undefined) updateFields.title = body.title;
      if (body.visibility !== undefined) updateFields.visibility = body.visibility;

      const [updated] = await tx
        .update(schema.memos)
        .set(updateFields)
        .where(and(eq(schema.memos.id, id), eq(schema.memos.firmId, firmId)))
        .returning();

      return c.json(updated);
    });
  })

  // ---------------------------------------------------------------------------
  // DELETE /api/memos/:id — soft delete
  // ---------------------------------------------------------------------------
  .delete('/:id', async (c) => {
    const firmId = c.get('firmId');
    const userId = c.get('userId');
    const id = c.req.param('id');

    return withRLS(firmId, userId, async (tx) => {
      const [memo] = await tx
        .select({ id: schema.memos.id, createdBy: schema.memos.createdBy })
        .from(schema.memos)
        .where(and(eq(schema.memos.id, id), eq(schema.memos.firmId, firmId), isNull(schema.memos.deletedAt)))
        .limit(1);

      if (!memo) {
        return c.json({ error: 'Memo not found' }, 404);
      }

      if (memo.createdBy !== userId) {
        return c.json({ error: 'Forbidden' }, 403);
      }

      await tx
        .update(schema.memos)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(schema.memos.id, id), eq(schema.memos.firmId, firmId)));

      return c.json({ success: true });
    });
  })

  // ---------------------------------------------------------------------------
  // POST /api/memos/:id/snapshots — create named snapshot
  // ---------------------------------------------------------------------------
  .post('/:id/snapshots', zValidator('json', createSnapshotSchema), async (c) => {
    const firmId = c.get('firmId');
    const userId = c.get('userId');
    const id = c.req.param('id');
    const body = c.req.valid('json');

    return withRLS(firmId, userId, async (tx) => {
      const [memo] = await tx
        .select()
        .from(schema.memos)
        .where(and(eq(schema.memos.id, id), eq(schema.memos.firmId, firmId), isNull(schema.memos.deletedAt)))
        .limit(1);

      if (!memo) {
        return c.json({ error: 'Memo not found' }, 404);
      }

      if (memo.createdBy !== userId && memo.visibility !== 'firm') {
        return c.json({ error: 'Forbidden' }, 403);
      }

      const [snapshot] = await tx
        .insert(schema.memoSnapshots)
        .values({
          memoId: memo.id,
          firmId,
          name: body.name,
          content: memo.content,
          version: memo.version,
          createdBy: userId,
        })
        .returning();

      return c.json(snapshot, 201);
    });
  })

  // ---------------------------------------------------------------------------
  // GET /api/memos/:id/snapshots — list snapshots (no content for list)
  // ---------------------------------------------------------------------------
  .get('/:id/snapshots', async (c) => {
    const firmId = c.get('firmId');
    const userId = c.get('userId');
    const id = c.req.param('id');

    return withRLS(firmId, userId, async (tx) => {
      const [memo] = await tx
        .select({ id: schema.memos.id, createdBy: schema.memos.createdBy, visibility: schema.memos.visibility })
        .from(schema.memos)
        .where(and(eq(schema.memos.id, id), eq(schema.memos.firmId, firmId), isNull(schema.memos.deletedAt)))
        .limit(1);

      if (!memo) {
        return c.json({ error: 'Memo not found' }, 404);
      }

      if (memo.createdBy !== userId && memo.visibility !== 'firm') {
        return c.json({ error: 'Forbidden' }, 403);
      }

      const rows = await tx
        .select({
          id: schema.memoSnapshots.id,
          memoId: schema.memoSnapshots.memoId,
          name: schema.memoSnapshots.name,
          version: schema.memoSnapshots.version,
          createdBy: schema.memoSnapshots.createdBy,
          createdAt: schema.memoSnapshots.createdAt,
        })
        .from(schema.memoSnapshots)
        .where(and(eq(schema.memoSnapshots.memoId, id), eq(schema.memoSnapshots.firmId, firmId)))
        .orderBy(schema.memoSnapshots.createdAt);

      return c.json(rows);
    });
  })

  // ---------------------------------------------------------------------------
  // GET /api/memos/:id/snapshots/:snapshotId — get single snapshot with content
  // ---------------------------------------------------------------------------
  .get('/:id/snapshots/:snapshotId', async (c) => {
    const firmId = c.get('firmId');
    const userId = c.get('userId');
    const id = c.req.param('id');
    const snapshotId = c.req.param('snapshotId');

    return withRLS(firmId, userId, async (tx) => {
      const [memo] = await tx
        .select({ id: schema.memos.id, createdBy: schema.memos.createdBy, visibility: schema.memos.visibility })
        .from(schema.memos)
        .where(and(eq(schema.memos.id, id), eq(schema.memos.firmId, firmId), isNull(schema.memos.deletedAt)))
        .limit(1);

      if (!memo) {
        return c.json({ error: 'Memo not found' }, 404);
      }

      if (memo.createdBy !== userId && memo.visibility !== 'firm') {
        return c.json({ error: 'Forbidden' }, 403);
      }

      const [snapshot] = await tx
        .select()
        .from(schema.memoSnapshots)
        .where(
          and(
            eq(schema.memoSnapshots.id, snapshotId),
            eq(schema.memoSnapshots.memoId, id),
            eq(schema.memoSnapshots.firmId, firmId),
          ),
        )
        .limit(1);

      if (!snapshot) {
        return c.json({ error: 'Snapshot not found' }, 404);
      }

      return c.json(snapshot);
    });
  })

  // ---------------------------------------------------------------------------
  // POST /api/memos/:id/snapshots/:snapshotId/restore — restore from snapshot
  // ---------------------------------------------------------------------------
  .post('/:id/snapshots/:snapshotId/restore', async (c) => {
    const firmId = c.get('firmId');
    const userId = c.get('userId');
    const id = c.req.param('id');
    const snapshotId = c.req.param('snapshotId');

    return withRLS(firmId, userId, async (tx) => {
      const [memo] = await tx
        .select()
        .from(schema.memos)
        .where(and(eq(schema.memos.id, id), eq(schema.memos.firmId, firmId), isNull(schema.memos.deletedAt)))
        .limit(1);

      if (!memo) {
        return c.json({ error: 'Memo not found' }, 404);
      }

      // Only creator can restore
      if (memo.createdBy !== userId) {
        return c.json({ error: 'Forbidden' }, 403);
      }

      const [snapshot] = await tx
        .select()
        .from(schema.memoSnapshots)
        .where(
          and(
            eq(schema.memoSnapshots.id, snapshotId),
            eq(schema.memoSnapshots.memoId, id),
            eq(schema.memoSnapshots.firmId, firmId),
          ),
        )
        .limit(1);

      if (!snapshot) {
        return c.json({ error: 'Snapshot not found' }, 404);
      }

      const [updated] = await tx
        .update(schema.memos)
        .set({
          content: snapshot.content,
          version: memo.version + 1,
          updatedAt: new Date(),
        })
        .where(and(eq(schema.memos.id, id), eq(schema.memos.firmId, firmId)))
        .returning();

      return c.json(updated);
    });
  });
