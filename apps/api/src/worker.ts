/**
 * Worker entry point — runs as a SEPARATE process from the API server.
 *
 * Start with: pnpm worker (or pnpm worker:dev for watch mode)
 *
 * IMPORTANT: Do NOT import this file from src/index.ts.
 * The Queue (enqueueing) lives in the API server; the Worker (processing)
 * lives here and is started independently.
 */
import 'dotenv/config';
import { Worker } from 'bullmq';
import { redisConnection } from './queues/connection.js';

console.log('[j16z-worker] Starting ingestion worker...');

// ---------------------------------------------------------------------------
// Ingestion worker — processes jobs from the ingestion queue.
// Actual ingestion logic (EDGAR polling, CourtListener, etc.) is added in Phase 2.
// ---------------------------------------------------------------------------
const worker = new Worker(
  'ingestion',
  async (job) => {
    console.log(`[j16z-worker] Processing job ${job.id} (${job.name}):`, job.data);
    // Phase 2 will implement handlers for each job type:
    //   - edgar_poll: Fetch new M&A filings from SEC EDGAR
    //   - courtlistener_poll: Fetch case docket updates
    //   - ftc_poll: Fetch FTC enforcement actions
    //   - llm_extract: Run LLM extraction on a filing document
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
