/**
 * EDGAR scheduler unit tests
 *
 * Covers EDGAR-01 (15-minute poll schedule).
 * Mocks bullmq entirely — no real Redis connections.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Shared mock instance — set up before vi.mock is evaluated
const mockUpsertJobScheduler = vi.fn().mockResolvedValue(undefined);
const mockClose = vi.fn().mockResolvedValue(undefined);

// Mock bullmq before importing the scheduler so Queue is replaced with our mock
vi.mock('bullmq', () => {
  // Must use a class (not arrow function) so `new Queue(...)` works
  class MockQueue {
    upsertJobScheduler = mockUpsertJobScheduler;
    close = mockClose;
  }

  return { Queue: MockQueue };
});

// Mock the redis connection to avoid environment variable requirements
vi.mock('../queues/connection.js', () => ({
  redisConnection: { host: 'mock-host', port: 6379 },
}));

describe('registerSchedules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls upsertJobScheduler with correct scheduler ID and cron pattern (EDGAR-01)', async () => {
    const { registerSchedules } = await import('../queues/scheduler.js');

    await registerSchedules();

    expect(mockUpsertJobScheduler).toHaveBeenCalledWith(
      'edgar-poll-schedule',
      { pattern: '*/15 * * * *' },
      expect.objectContaining({
        name: 'edgar_poll',
        data: { triggeredBy: 'cron' },
      }),
    );
  });

  it('includes job name edgar_poll in upsertJobScheduler call', async () => {
    const { registerSchedules } = await import('../queues/scheduler.js');

    await registerSchedules();

    const callArgs = mockUpsertJobScheduler.mock.calls[0];
    expect(callArgs[0]).toBe('edgar-poll-schedule');
    expect(callArgs[1].pattern).toBe('*/15 * * * *');
    expect(callArgs[2].name).toBe('edgar_poll');
  });

  it('closes queue after registration', async () => {
    const { registerSchedules } = await import('../queues/scheduler.js');

    await registerSchedules();

    expect(mockClose).toHaveBeenCalled();
  });

  it('closes queue even if upsertJobScheduler fails (finally block)', async () => {
    const { registerSchedules } = await import('../queues/scheduler.js');

    // Make upsertJobScheduler throw for this test
    mockUpsertJobScheduler.mockRejectedValueOnce(new Error('Redis error'));

    await expect(registerSchedules()).rejects.toThrow('Redis error');

    // close should still be called due to finally block
    expect(mockClose).toHaveBeenCalled();
  });

  it('is safe to call twice (idempotency — upsertJobScheduler handles duplicates)', async () => {
    const { registerSchedules } = await import('../queues/scheduler.js');

    // Call twice in sequence — should not throw
    await expect(registerSchedules()).resolves.toBeUndefined();
    await expect(registerSchedules()).resolves.toBeUndefined();

    // upsertJobScheduler called once per invocation
    expect(mockUpsertJobScheduler).toHaveBeenCalledTimes(2);
  });
});
