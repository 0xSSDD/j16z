/**
 * Queue structural tests — validates BullMQ queue infrastructure configuration.
 *
 * These are OFFLINE tests — no live Redis connection required.
 * They verify the queue and connection are configured correctly without
 * actually connecting to Upstash.
 */
import { Queue } from 'bullmq';
import { describe, expect, it } from 'vitest';
import { redisConnection } from '../queues/connection.js';
import { ingestionQueue } from '../queues/ingestion.js';

describe('ingestionQueue (structural)', () => {
  it('is a BullMQ Queue instance', () => {
    expect(ingestionQueue).toBeInstanceOf(Queue);
  });

  it('has the correct queue name', () => {
    expect(ingestionQueue.name).toBe('ingestion');
  });
});

describe('redisConnection (structural)', () => {
  it('has the expected shape', () => {
    expect(redisConnection).toMatchObject({
      port: 6379,
      tls: {},
    });
  });

  it('includes host and password fields', () => {
    // In CI/dev without env vars, host/password will be undefined —
    // that is acceptable here since we are testing shape, not connectivity.
    expect('host' in redisConnection).toBe(true);
    expect('password' in redisConnection).toBe(true);
  });
});

describe('ingestionQueue default job options (structural)', () => {
  it('is configured with 3 retry attempts', async () => {
    // Access defaultJobOptions via the queue's internal opts
    const opts = (ingestionQueue as unknown as { opts: { defaultJobOptions: Record<string, unknown> } }).opts;
    expect(opts.defaultJobOptions?.attempts).toBe(3);
  });

  it('uses exponential backoff', async () => {
    const opts = (ingestionQueue as unknown as { opts: { defaultJobOptions: { backoff: Record<string, unknown> } } }).opts;
    expect(opts.defaultJobOptions?.backoff?.type).toBe('exponential');
  });
});
