import { authRoutes } from './auth.js';
import { dealsRoutes } from './deals.js';
import { eventsRoutes } from './events.js';
import { filingsRoutes } from './filings.js';
import { watchlistsRoutes } from './watchlists.js';

export const apiRoutes = {
  auth: authRoutes,
  deals: dealsRoutes,
  events: eventsRoutes,
  filings: filingsRoutes,
  watchlists: watchlistsRoutes,
};
