import { zValidator } from '@hono/zod-validator';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { withRLS } from '../db/rls.js';
import * as schema from '../db/schema.js';
import type { AuthEnv } from '../middleware/auth.js';

const httpUrlSchema = z
  .string()
  .url()
  .refine((value) => value.startsWith('http://') || value.startsWith('https://'), {
    message: 'URL must start with http:// or https://',
  });

const createRssFeedSchema = z.object({
  name: z.string().min(1),
  url: httpUrlSchema,
  watchlistId: z.string().uuid().optional(),
});

const patchRssFeedSchema = z
  .object({
    name: z.string().min(1).optional(),
    status: z.enum(['active', 'paused']).optional(),
    watchlistId: z.string().uuid().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const rssFeedsRoutes = new Hono<AuthEnv>()
  .post('/', zValidator('json', createRssFeedSchema), async (c) => {
    const firmId = c.get('firmId');
    const userId = c.get('userId');
    const body = c.req.valid('json');

    return withRLS(firmId, userId, async (tx) => {
      const [feedCountRow] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(schema.rssFeeds)
        .where(
          and(
            eq(schema.rssFeeds.firmId, firmId),
            eq(schema.rssFeeds.status, 'active'),
            isNull(schema.rssFeeds.deletedAt),
          ),
        );

      const activeFeedCount = Number(feedCountRow?.count ?? 0);
      if (activeFeedCount >= 10) {
        return c.json({ error: 'Maximum of 10 active RSS feeds allowed per firm' }, 400);
      }

      if (body.watchlistId) {
        const [watchlist] = await tx
          .select({ id: schema.watchlists.id })
          .from(schema.watchlists)
          .where(
            and(
              eq(schema.watchlists.id, body.watchlistId),
              eq(schema.watchlists.firmId, firmId),
              isNull(schema.watchlists.deletedAt),
            ),
          )
          .limit(1);

        if (!watchlist) {
          return c.json({ error: 'Watchlist not found' }, 404);
        }
      }

      const [inserted] = await tx
        .insert(schema.rssFeeds)
        .values({
          firmId,
          watchlistId: body.watchlistId ?? null,
          name: body.name,
          url: body.url,
          type: 'custom',
          status: 'active',
        })
        .returning();

      return c.json(inserted, 201);
    });
  })
  .get('/', async (c) => {
    const firmId = c.get('firmId');
    const userId = c.get('userId');
    const rows = await withRLS(firmId, userId, (tx) =>
      tx
        .select()
        .from(schema.rssFeeds)
        .where(and(eq(schema.rssFeeds.firmId, firmId), isNull(schema.rssFeeds.deletedAt)))
        .orderBy(schema.rssFeeds.createdAt),
    );

    return c.json(rows);
  })
  .get('/:id', async (c) => {
    const firmId = c.get('firmId');
    const userId = c.get('userId');
    const id = c.req.param('id');

    const [row] = await withRLS(firmId, userId, (tx) =>
      tx
        .select()
        .from(schema.rssFeeds)
        .where(and(eq(schema.rssFeeds.id, id), eq(schema.rssFeeds.firmId, firmId), isNull(schema.rssFeeds.deletedAt)))
        .limit(1),
    );

    if (!row) {
      return c.json({ error: 'RSS feed not found' }, 404);
    }

    return c.json(row);
  })
  .patch('/:id', zValidator('json', patchRssFeedSchema), async (c) => {
    const firmId = c.get('firmId');
    const userId = c.get('userId');
    const id = c.req.param('id');
    const body = c.req.valid('json');

    return withRLS(firmId, userId, async (tx) => {
      const [existing] = await tx
        .select({ id: schema.rssFeeds.id })
        .from(schema.rssFeeds)
        .where(and(eq(schema.rssFeeds.id, id), eq(schema.rssFeeds.firmId, firmId), isNull(schema.rssFeeds.deletedAt)))
        .limit(1);

      if (!existing) {
        return c.json({ error: 'RSS feed not found' }, 404);
      }

      if (body.watchlistId !== undefined && body.watchlistId !== null) {
        const [watchlist] = await tx
          .select({ id: schema.watchlists.id })
          .from(schema.watchlists)
          .where(
            and(
              eq(schema.watchlists.id, body.watchlistId),
              eq(schema.watchlists.firmId, firmId),
              isNull(schema.watchlists.deletedAt),
            ),
          )
          .limit(1);

        if (!watchlist) {
          return c.json({ error: 'Watchlist not found' }, 404);
        }
      }

      const updateData: {
        name?: string;
        status?: 'active' | 'paused';
        watchlistId?: string | null;
        updatedAt: Date;
      } = {
        updatedAt: new Date(),
      };

      if (body.name !== undefined) {
        updateData.name = body.name;
      }
      if (body.status !== undefined) {
        updateData.status = body.status;
      }
      if (body.watchlistId !== undefined) {
        updateData.watchlistId = body.watchlistId;
      }

      const [updated] = await tx
        .update(schema.rssFeeds)
        .set(updateData)
        .where(and(eq(schema.rssFeeds.id, id), eq(schema.rssFeeds.firmId, firmId), isNull(schema.rssFeeds.deletedAt)))
        .returning();

      if (!updated) {
        return c.json({ error: 'RSS feed not found' }, 404);
      }

      return c.json(updated);
    });
  })
  .delete('/:id', async (c) => {
    const firmId = c.get('firmId');
    const userId = c.get('userId');
    const id = c.req.param('id');

    const [deleted] = await withRLS(firmId, userId, (tx) =>
      tx
        .update(schema.rssFeeds)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(schema.rssFeeds.id, id), eq(schema.rssFeeds.firmId, firmId), isNull(schema.rssFeeds.deletedAt)))
        .returning({ id: schema.rssFeeds.id }),
    );

    if (!deleted) {
      return c.json({ error: 'RSS feed not found' }, 404);
    }

    return c.body(null, 204);
  });
