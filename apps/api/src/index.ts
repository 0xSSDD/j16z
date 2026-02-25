import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { apiRoutes } from './routes/index.js';

const app = new Hono();

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------
app.use(logger());
app.use(
  '/*',
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  }),
);

// ---------------------------------------------------------------------------
// Health check — unauthenticated, used by load balancers and CI smoke tests
// ---------------------------------------------------------------------------
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ---------------------------------------------------------------------------
// Global error handler — returns structured JSON error instead of plain text
// ---------------------------------------------------------------------------
app.onError((err, c) => {
  console.error('[j16z-api] Unhandled error:', err);
  return c.json({ error: 'Internal server error', message: err.message }, 500);
});

// ---------------------------------------------------------------------------
// API routes — mounted at /api
// NOTE: Auth middleware is NOT added here yet.
//       Plan 01-02 adds Supabase JWT verification middleware before all /api/* routes.
//       Routes currently use adminDb as a temporary stand-in.
// ---------------------------------------------------------------------------
app.route('/api', apiRoutes);

// ---------------------------------------------------------------------------
// Server startup
// ---------------------------------------------------------------------------
serve(
  { fetch: app.fetch, port: Number(process.env.PORT ?? 3001) },
  (info) => {
    console.log(`[j16z-api] Server running on http://localhost:${info.port}`);
  },
);

// Export app type for potential Hono RPC client usage
export type AppType = typeof app;
