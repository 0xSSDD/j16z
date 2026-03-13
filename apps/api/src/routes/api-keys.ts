import { zValidator } from '@hono/zod-validator';
import { createHash, randomBytes } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { adminDb } from '../db/index.js';
import * as schema from '../db/schema.js';
import type { AuthEnv } from '../middleware/auth.js';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
});

// ---------------------------------------------------------------------------
// API key routes — protected by JWT auth + firmContextMiddleware
// ---------------------------------------------------------------------------
export const apiKeyRoutes = new Hono<AuthEnv>()
  .post('/', zValidator('json', createApiKeySchema), async (c) => {
    // POST /api/api-keys — generate a new API key for the firm
    const firmId = c.get('firmId');
    const { name } = c.req.valid('json');

    // Generate raw key: sk_live_ prefix + 32 random bytes as hex (64 chars)
    const rawKey = `sk_live_${randomBytes(32).toString('hex')}`;

    // Store SHA-256 hash — never the plaintext key
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    const [created] = await adminDb
      .insert(schema.apiKeys)
      .values({ firmId, name, keyHash })
      .returning({ id: schema.apiKeys.id, name: schema.apiKeys.name, createdAt: schema.apiKeys.createdAt });

    // Return the raw key once — client must copy and store it
    return c.json({ id: created.id, name: created.name, key: rawKey, createdAt: created.createdAt }, 201);
  })

  .get('/', async (c) => {
    // GET /api/api-keys — list all API keys for the firm (id, name, dates — never hash)
    const firmId = c.get('firmId');

    const rows = await adminDb
      .select({
        id: schema.apiKeys.id,
        name: schema.apiKeys.name,
        createdAt: schema.apiKeys.createdAt,
        lastUsedAt: schema.apiKeys.lastUsedAt,
      })
      .from(schema.apiKeys)
      .where(and(eq(schema.apiKeys.firmId, firmId), isNull(schema.apiKeys.deletedAt)))
      .orderBy(schema.apiKeys.createdAt);

    return c.json(rows);
  })

  .delete('/:id', async (c) => {
    // DELETE /api/api-keys/:id — hard-delete the key for the firm (defense-in-depth)
    const firmId = c.get('firmId');
    const id = c.req.param('id');

    const [deleted] = await adminDb
      .delete(schema.apiKeys)
      .where(and(eq(schema.apiKeys.id, id), eq(schema.apiKeys.firmId, firmId)))
      .returning({ id: schema.apiKeys.id });

    if (!deleted) {
      return c.json({ error: 'API key not found' }, 404);
    }

    return c.json({ success: true, id: deleted.id });
  });
