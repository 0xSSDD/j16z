import { alertRulesRoutes } from './alert-rules.js';
import { apiKeyRoutes } from './api-keys.js';
import { authRoutes } from './auth.js';
import { dealsRoutes } from './deals.js';
import { digestPreferencesRoutes } from './digest-preferences.js';
import { eventsRoutes } from './events.js';
import { filingsRoutes } from './filings.js';
import { integrationsRoutes } from './integrations.js';
import { marketSnapshotsRoutes } from './market-snapshots.js';
import { memosRoutes } from './memos.js';
import { rssFeedsRoutes } from './rss-feeds.js';
import { watchlistsRoutes } from './watchlists.js';
import { webhooksRoutes } from './webhooks.js';

export const apiRoutes = {
  alertRules: alertRulesRoutes,
  apiKeys: apiKeyRoutes,
  auth: authRoutes,
  deals: dealsRoutes,
  digestPreferences: digestPreferencesRoutes,
  events: eventsRoutes,
  filings: filingsRoutes,
  integrations: integrationsRoutes,
  marketSnapshots: marketSnapshotsRoutes,
  memos: memosRoutes,
  rssFeeds: rssFeedsRoutes,
  watchlists: watchlistsRoutes,
  webhooks: webhooksRoutes,
};
