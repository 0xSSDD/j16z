/**
 * Worker entry point — runs as a SEPARATE process from the API server.
 *
 * Start with: pnpm worker (or pnpm worker:dev for watch mode)
 *
 * IMPORTANT: Do NOT import this file from src/index.ts.
 * The Queue (enqueueing) lives in the API server; the Worker (processing)
 * lives here and is started independently.
 *
 * IMPORTANT: Do NOT import registerSchedules here — scheduler lives in API
 * server only (src/index.ts). Importing from worker would cause duplicate
 * cron job registration on every worker restart.
 */
import 'dotenv/config';
import { type Job, Worker } from 'bullmq';
import { handleFtcPoll } from './agency/ftc-poller.js';
import { handleDojAntitrustRss, handleDojCivilRss, handleFtcCompetitionRss } from './agency/rss-pollers.js';
import { handleAlertEvaluate } from './alerts/alert-worker.js';
import { handleCourtListenerPoll } from './courtlistener/poller.js';
import { handleCourtListenerWebhook } from './courtlistener/webhook.js';
import { handleDigestDaily, handleDigestWeekly } from './digests/digest-handler.js';
import { handleEdgarDownload } from './edgar/download.js';
import { handleEdgarPoll } from './edgar/poll.js';
import { handleMarketDataPoll } from './market/market-poller.js';
import { redisConnection } from './queues/connection.js';
import { handleRssPoll } from './rss/poller.js';

console.log('[j16z-worker] Starting ingestion worker...');

// ---------------------------------------------------------------------------
// Job handler registry — maps job names to their handler functions.
// Phase 2 handlers: edgar_poll, edgar_download.
// Phase 3+ handlers: courtlistener_poll, ftc_poll.
//
// llm_extract: Processed by Python worker (apps/langextract/worker.py) — NOT handled here.
// The Node.js worker's fallback (below) silently warns on unknown job names,
// so llm_extract jobs enqueued by edgar_download are safely ignored here.
// ---------------------------------------------------------------------------
const handlers: Record<string, (job: Job) => Promise<void>> = {
  edgar_poll: handleEdgarPoll,
  edgar_download: handleEdgarDownload,
  ftc_poll: handleFtcPoll,
  ftc_competition_rss: handleFtcCompetitionRss,
  doj_antitrust_rss: handleDojAntitrustRss,
  doj_civil_rss: handleDojCivilRss,
  rss_poll: handleRssPoll,
  courtlistener_poll: handleCourtListenerPoll,
  courtlistener_webhook: handleCourtListenerWebhook,
  alert_evaluate: handleAlertEvaluate,
  market_data_poll: handleMarketDataPoll,
  digest_daily: handleDigestDaily,
  digest_weekly: handleDigestWeekly,
  // llm_extract: Processed by Python worker (apps/langextract/worker.py) — NOT handled here
};

// ---------------------------------------------------------------------------
// Ingestion worker — dispatches jobs from the ingestion queue to handlers.
// ---------------------------------------------------------------------------
const worker = new Worker(
  'ingestion',
  async (job: Job) => {
    const handler = handlers[job.name];
    if (!handler) {
      console.warn(`[j16z-worker] No handler for job type: ${job.name}`);
      return;
    }
    await handler(job);
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process up to 5 jobs in parallel
  },
);

// ---------------------------------------------------------------------------
// Worker event listeners
// ---------------------------------------------------------------------------
worker.on('completed', (job) => {
  console.log(`[j16z-worker] Job ${job.id} (${job.name}) completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[j16z-worker] Job ${job?.id} (${job?.name}) failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('[j16z-worker] Worker error:', err.message);
});

console.log('[j16z-worker] Ingestion worker ready. Waiting for jobs...');

// ---------------------------------------------------------------------------
// Graceful shutdown — wait for active jobs to complete before exiting
// ---------------------------------------------------------------------------
async function shutdown(signal: string) {
  console.log(`[j16z-worker] Received ${signal}. Shutting down gracefully...`);
  await worker.close();
  console.log('[j16z-worker] Worker closed. Exiting.');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
