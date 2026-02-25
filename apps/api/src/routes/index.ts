import { Hono } from 'hono';
import { dealsRoutes } from './deals.js';
import { eventsRoutes } from './events.js';
import { watchlistsRoutes } from './watchlists.js';

const router = new Hono();

router.route('/deals', dealsRoutes);
router.route('/events', eventsRoutes);
router.route('/watchlists', watchlistsRoutes);

export { router as apiRoutes };
