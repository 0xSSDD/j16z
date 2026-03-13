import { authRoutes } from './auth.js';
import { dealsRoutes } from './deals.js';
import { eventsRoutes } from './events.js';
import { filingsRoutes } from './filings.js';
import { integrationsRoutes } from './integrations.js';
import { marketSnapshotsRoutes } from './market-snapshots.js';
import { rssFeedsRoutes } from './rss-feeds.js';
import { watchlistsRoutes } from './watchlists.js';
import { webhooksRoutes } from './webhooks.js';

export const apiRoutes = {
  auth: authRoutes,
  deals: dealsRoutes,
  events: eventsRoutes,
  filings: filingsRoutes,
  integrations: integrationsRoutes,
  marketSnapshots: marketSnapshotsRoutes,
  rssFeeds: rssFeedsRoutes,
  watchlists: watchlistsRoutes,
  webhooks: webhooksRoutes,
};
