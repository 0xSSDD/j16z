import type { ConnectionOptions } from 'bullmq';

// ---------------------------------------------------------------------------
// Upstash Redis connection configuration for BullMQ
//
// Upstash provides a serverless Redis instance with TLS support.
// An empty tls: {} object enables TLS, which is required by Upstash.
//
// Note on costs: BullMQ polls Redis continuously. Use Upstash Fixed plan
// (not pay-as-you-go) during development to avoid surprise charges.
// ---------------------------------------------------------------------------
export const redisConnection: ConnectionOptions = {
  host: process.env.UPSTASH_REDIS_HOST,
  port: 6379,
  password: process.env.UPSTASH_REDIS_PASSWORD,
  tls: {}, // Empty object enables TLS — required by Upstash
};

// ---------------------------------------------------------------------------
// testRedisConnection — validates connectivity before startup.
// Used by health check endpoint and CI validation.
// Creates a temporary Queue client, pings via Redis PING, then disconnects.
// ---------------------------------------------------------------------------
export async function testRedisConnection(): Promise<{ success: boolean; error?: string }> {
  const { Queue } = await import('bullmq');
  const testQueue = new Queue('_ping_test_', { connection: redisConnection });
  try {
    // getJobCounts will fail immediately if Redis is unreachable
    await testQueue.getJobCounts('waiting');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  } finally {
    await testQueue.close();
  }
}
