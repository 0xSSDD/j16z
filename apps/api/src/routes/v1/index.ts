import { OpenAPIHono } from '@hono/zod-openapi';
import type { ApiKeyEnv } from '../../middleware/api-key-auth.js';
import { apiKeyAuthMiddleware } from '../../middleware/api-key-auth.js';
import { clausesV1Routes } from './clauses.js';
import { dealsV1Routes } from './deals.js';
import { eventsV1Routes } from './events.js';
import { spreadsV1Routes } from './spreads.js';

// ---------------------------------------------------------------------------
// v1App — public REST API sub-application
// All routes require a valid x-api-key header (sk_live_ prefix)
// ---------------------------------------------------------------------------
export const v1App = new OpenAPIHono<ApiKeyEnv>();

// Register API key security scheme for OpenAPI spec generation
v1App.openAPIRegistry.registerComponent('securitySchemes', 'ApiKey', {
  type: 'apiKey',
  name: 'x-api-key',
  in: 'header',
  description: 'API key with sk_live_ prefix. Create in Settings > API Keys.',
});

// Apply API key authentication to all /v1/* routes
v1App.use('/*', apiKeyAuthMiddleware);

// Mount sub-routes
v1App.route('/deals', dealsV1Routes);

// Mount deal sub-resources as nested routes on dealsV1Routes
dealsV1Routes.route('/:dealId/events', eventsV1Routes);
dealsV1Routes.route('/:dealId/clauses', clausesV1Routes);
dealsV1Routes.route('/:dealId/spreads', spreadsV1Routes);

// Generate OpenAPI spec at /v1/doc
v1App.doc('/doc', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'J16Z Public API',
    description:
      'Structured M&A deal data for programmatic access. Authenticate with your sk_live_ API key via the x-api-key header. Create keys in Settings > API Keys.',
  },
  servers: [
    {
      url: 'http://localhost:3001/v1',
      description: 'Development',
    },
    {
      url: 'https://api.j16z.com/v1',
      description: 'Production',
    },
  ],
});
