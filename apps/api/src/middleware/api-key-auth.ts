import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import { adminDb } from '../db/index.js';
import * as schema from '../db/schema.js';

// ---------------------------------------------------------------------------
// ApiKeyEnv — Hono context variables set by apiKeyAuthMiddleware.
// Used by /v1/* route handlers to access the firm in scope.
// ---------------------------------------------------------------------------
export type ApiKeyEnv = {
  Variables: {
    firmId: string;
  };
};

// ---------------------------------------------------------------------------
// apiKeyAuthMiddleware — validates x-api-key header for public /v1/* routes.
//
// Flow:
//   1. Extract x-api-key header; reject if missing or wrong prefix
//   2. Hash with SHA-256 and look up in api_keys table
//   3. If found: set firmId in context, update lastUsedAt, call next()
//   4. If not found: return 401 Unauthorized
// ---------------------------------------------------------------------------
export const apiKeyAuthMiddleware = createMiddleware<ApiKeyEnv>(async (c, next) => {
  const rawKey = c.req.header('x-api-key');

  if (!rawKey || !rawKey.startsWith('sk_live_')) {
    return c.json({ error: 'Unauthorized', message: 'Valid x-api-key header required (sk_live_ prefix)' }, 401);
  }

  const keyHash = createHash('sha256').update(rawKey).digest('hex');

  const [apiKey] = await adminDb
    .select({ id: schema.apiKeys.id, firmId: schema.apiKeys.firmId })
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.keyHash, keyHash))
    .limit(1);

  if (!apiKey) {
    return c.json({ error: 'Unauthorized', message: 'Invalid or revoked API key' }, 401);
  }

  // Set firm context for downstream route handlers
  c.set('firmId', apiKey.firmId);

  // Update lastUsedAt asynchronously — don't block the request
  adminDb
    .update(schema.apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.apiKeys.id, apiKey.id))
    .catch((err) => {
      console.error('[api-key-auth] Failed to update lastUsedAt:', err.message);
    });

  await next();
});
