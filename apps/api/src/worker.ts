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
import { Worker, type Job } from 'bullmq';
import { redisConnection } from './queues/connection.js';
import { handleEdgarPoll } from './edgar/poll.js';
import { handleEdgarDownload } from './edgar/download.js';

console.log('[j16z-worker] Starting ingestion worker...');

// ---------------------------------------------------------------------------
// Job handler registry — maps job names to their handler functions.
// Phase 2 handlers: edgar_poll, edgar_download.
// Future handlers (Phase 3+): courtlistener_poll, ftc_poll, llm_extract.
// ---------------------------------------------------------------------------
const handlers: Record<string, (job: Job) => Promise<void>> = {
  edgar_poll: handleEdgarPoll,
  edgar_download: handleEdgarDownload,
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
