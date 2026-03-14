import { Queue } from 'bullmq';
import { redisConnection } from './connection.js';

// ---------------------------------------------------------------------------
// ingestionQueue — BullMQ queue for background ingestion jobs.
//
// This queue is used for:
//   - EDGAR filing polling (Phase 2)
//   - CourtListener case updates (Phase 2)
//   - FTC/DOJ press release scraping (Phase 2)
//   - LLM extraction on new filings (Phase 3)
//
// Job retry strategy: 3 attempts with exponential backoff starting at 5s.
// Completed jobs retained for audit (1000 max); failed jobs retained longer (5000).
//
// IMPORTANT: The Queue class (for enqueueing) lives here in the API server.
// The Worker class (for processing) lives in src/worker.ts and is started
// as a separate process — do NOT import workers in src/index.ts.
// ---------------------------------------------------------------------------
export const ingestionQueue = new Queue('ingestion', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5s, 25s, 125s
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});
