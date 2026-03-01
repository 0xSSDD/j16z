import { Queue } from 'bullmq';
import { redisConnection } from './connection.js';

/**
 * Register recurring job schedules.
 *
 * Called ONCE at API server startup (NOT from worker.ts).
 * Uses upsertJobScheduler which is idempotent — safe on every restart.
 *
 * IMPORTANT: Do NOT import this from worker.ts. The scheduler registers
 * cron jobs in Redis. If called from the worker process too, each worker
 * restart would create duplicate schedule entries.
 */
export async function registerSchedules(): Promise<void> {
  const queue = new Queue('ingestion', { connection: redisConnection });

  try {
    // EDGAR poll — every 15 minutes (CONTEXT.md locked decision)
    await queue.upsertJobScheduler(
      'edgar-poll-schedule',
      { pattern: '*/15 * * * *' },
      {
        name: 'edgar_poll',
        data: { triggeredBy: 'cron' },
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      },
    );

    console.log('[j16z-api] Registered edgar_poll schedule (*/15 * * * *)');
  } finally {
    await queue.close();
  }
}
