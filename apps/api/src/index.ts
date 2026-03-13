import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Scalar } from '@scalar/hono-api-reference';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authMiddleware } from './middleware/auth.js';
import { firmContextMiddleware } from './middleware/firm-context.js';
import { registerSchedules } from './queues/scheduler.js';
import { apiRoutes } from './routes/index.js';
import { v1App } from './routes/v1/index.js';

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
// Public REST API — /v1/* with API key authentication
// Mounted BEFORE /api routes to avoid basePath conflicts
// ---------------------------------------------------------------------------
app.route('/v1', v1App);

// Scalar API docs — reads spec from /v1/doc
app.get('/docs', Scalar({ url: '/v1/doc' }));

// ---------------------------------------------------------------------------
// Webhook routes — registered BEFORE api.basePath('/api') and authMiddleware.
//
// CRITICAL: Must be registered here on the root app so CourtListener webhook
// push notifications are NOT blocked by authMiddleware. If authMiddleware runs
// first, CourtListener receives 401, retries 7 times, then auto-disables the
// subscription webhook.
// ---------------------------------------------------------------------------
app.route('/api/webhooks', apiRoutes.webhooks);

// ---------------------------------------------------------------------------
// Global error handler — returns structured JSON error instead of plain text
// ---------------------------------------------------------------------------
app.onError((err, c) => {
  console.error('[j16z-api] Unhandled error:', err);
  return c.json({ error: 'Internal server error', message: err.message }, 500);
});

// ---------------------------------------------------------------------------
// API routes — mounted at /api with auth protection
//
// Auth middleware strategy:
//   - authMiddleware: applied to ALL /api/* routes — verifies Supabase JWT
//   - firmContextMiddleware: applied only to data routes (deals, events, watchlists)
//     NOT applied to /api/auth/* — onboarding endpoints are called by first-time
//     users who may not yet have a firm_id in their JWT
// ---------------------------------------------------------------------------
const api = app.basePath('/api');

// Require valid JWT on all API routes
api.use('/*', authMiddleware);

// Require firm context on data routes only
api.use('/alert-rules/*', firmContextMiddleware);
api.use('/api-keys/*', firmContextMiddleware);
api.use('/deals/*', firmContextMiddleware);
api.use('/digest-preferences/*', firmContextMiddleware);
api.use('/events/*', firmContextMiddleware);
api.use('/filings/*', firmContextMiddleware);
api.use('/rss-feeds/*', firmContextMiddleware);
api.use('/watchlists/*', firmContextMiddleware);
api.use('/market-snapshots/*', firmContextMiddleware);
api.use('/memos/*', firmContextMiddleware);

// Mount routes
api.route('/alert-rules', apiRoutes.alertRules);
api.route('/api-keys', apiRoutes.apiKeys);
api.route('/auth', apiRoutes.auth);
api.route('/deals', apiRoutes.deals);
api.route('/digest-preferences', apiRoutes.digestPreferences);
api.route('/events', apiRoutes.events);
api.route('/filings', apiRoutes.filings);
api.route('/integrations', apiRoutes.integrations);
api.route('/rss-feeds', apiRoutes.rssFeeds);
api.route('/watchlists', apiRoutes.watchlists);
api.route('/market-snapshots', apiRoutes.marketSnapshots);
api.route('/memos', apiRoutes.memos);

// ---------------------------------------------------------------------------
// Server startup
// ---------------------------------------------------------------------------
serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 3001) }, (info) => {
  console.log(`[j16z-api] Server running on http://localhost:${info.port}`);
});

// Register recurring job schedules (idempotent — safe on restart)
registerSchedules().catch((err) => {
  console.error('[j16z-api] Failed to register schedules:', err.message);
});

// Export app type for potential Hono RPC client usage
export type AppType = typeof app;

// Export app as default for dynamic imports in tests
export default app;
