import { Queue } from 'bullmq';
import { redisConnection } from './connection.js';

/**
 * Cron schedule configuration with environment variable overrides.
 * Each schedule can be customized via CRON_* environment variables.
 */
export const SCHEDULE_CONFIG = {
  edgar_poll: process.env.CRON_EDGAR_POLL ?? '*/15 * * * *',
  ftc_poll: process.env.CRON_FTC_POLL ?? '0 */6 * * *',
  ftc_competition_rss: process.env.CRON_FTC_COMPETITION_RSS ?? '0 */4 * * *',
  doj_antitrust_rss: process.env.CRON_DOJ_ANTITRUST_RSS ?? '0 1,5,9,13,17,21 * * *',
  doj_civil_rss: process.env.CRON_DOJ_CIVIL_RSS ?? '0 */6 * * *',
  rss_poll: process.env.CRON_RSS_POLL ?? '*/30 * * * *',
  courtlistener_poll: process.env.CRON_COURTLISTENER_POLL ?? '*/30 * * * *',
  market_data_poll: process.env.CRON_MARKET_DATA_POLL ?? '*/5 * * * *',
} satisfies Record<string, string>;

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
      { pattern: SCHEDULE_CONFIG.edgar_poll },
      {
        name: 'edgar_poll',
        data: { triggeredBy: 'cron' },
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      },
    );

    console.log(`[j16z-api] Registered edgar_poll schedule (${SCHEDULE_CONFIG.edgar_poll})`);

    await queue.upsertJobScheduler(
      'ftc-poll-schedule',
      { pattern: SCHEDULE_CONFIG.ftc_poll },
      {
        name: 'ftc_poll',
        data: { triggeredBy: 'cron' },
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      },
    );

    console.log(`[j16z-api] Registered ftc_poll schedule (${SCHEDULE_CONFIG.ftc_poll})`);

    await queue.upsertJobScheduler(
      'ftc-competition-rss-schedule',
      { pattern: SCHEDULE_CONFIG.ftc_competition_rss },
      {
        name: 'ftc_competition_rss',
        data: { triggeredBy: 'cron' },
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      },
    );

    console.log(`[j16z-api] Registered ftc_competition_rss schedule (${SCHEDULE_CONFIG.ftc_competition_rss})`);

    await queue.upsertJobScheduler(
      'doj-antitrust-rss-schedule',
      { pattern: SCHEDULE_CONFIG.doj_antitrust_rss },
      {
        name: 'doj_antitrust_rss',
        data: { triggeredBy: 'cron' },
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      },
    );

    console.log(`[j16z-api] Registered doj_antitrust_rss schedule (${SCHEDULE_CONFIG.doj_antitrust_rss})`);

    await queue.upsertJobScheduler(
      'doj-civil-rss-schedule',
      { pattern: SCHEDULE_CONFIG.doj_civil_rss },
      {
        name: 'doj_civil_rss',
        data: { triggeredBy: 'cron' },
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      },
    );

    console.log(`[j16z-api] Registered doj_civil_rss schedule (${SCHEDULE_CONFIG.doj_civil_rss})`);

    await queue.upsertJobScheduler(
      'rss-poll-schedule',
      { pattern: SCHEDULE_CONFIG.rss_poll },
      {
        name: 'rss_poll',
        data: { triggeredBy: 'cron' },
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      },
    );

    console.log(`[j16z-api] Registered rss_poll schedule (${SCHEDULE_CONFIG.rss_poll})`);

    await queue.upsertJobScheduler(
      'courtlistener-poll-schedule',
      { pattern: SCHEDULE_CONFIG.courtlistener_poll },
      {
        name: 'courtlistener_poll',
        data: { triggeredBy: 'cron' },
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      },
    );

    console.log(`[j16z-api] Registered courtlistener_poll schedule (${SCHEDULE_CONFIG.courtlistener_poll})`);

    // Market data poll — every 5 minutes during market hours
    await queue.upsertJobScheduler(
      'market-data-poll-schedule',
      { pattern: SCHEDULE_CONFIG.market_data_poll },
      {
        name: 'market_data_poll',
        data: { triggeredBy: 'cron' },
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      },
    );

    console.log(`[j16z-api] Registered market_data_poll schedule (${SCHEDULE_CONFIG.market_data_poll})`);
  } finally {
    await queue.close();
  }
}
