import { createMiddleware } from 'hono/factory';
import type { JWTPayload } from 'jose';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// ---------------------------------------------------------------------------
// JWKS — created once at module level to enable key caching across requests.
// Supabase uses RS256 asymmetric signing with key rotation, so we use JWKS
// rather than a static secret. The JWKS URL is the Supabase auth v1 endpoint.
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL!;
const JWKS_URL = `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`;

const JWKS = createRemoteJWKSet(new URL(JWKS_URL));

// ---------------------------------------------------------------------------
// Hono env type — re-exported so route files can share the same type
// ---------------------------------------------------------------------------
export type AuthEnv = {
  Variables: {
    jwtPayload: JWTPayload;
    firmId: string;
    userId: string;
  };
};

// ---------------------------------------------------------------------------
// authMiddleware — verifies Supabase JWT on every request.
// Must be applied to all /api/* routes (excluding /api/auth/* which need
// the auth check but not the firm context check).
// ---------------------------------------------------------------------------
export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid authorization header' }, 401);
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  try {
    const { payload } = await jwtVerify(token, JWKS);
    c.set('jwtPayload', payload);
    await next();
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
});
