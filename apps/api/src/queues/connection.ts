import type { ConnectionOptions } from 'bullmq';

// ---------------------------------------------------------------------------
// Redis connection configuration for BullMQ
//
// Supports two modes:
//   1. REDIS_URL (local dev): parse URL into host/port/password/tls
//   2. UPSTASH_REDIS_HOST + UPSTASH_REDIS_PASSWORD (production): Upstash TLS
//
// REDIS_URL takes priority when set. This lets local dev use Docker Redis
// (redis://localhost:6380) while production uses Upstash (rediss://...).
// ---------------------------------------------------------------------------
function buildRedisConnection(): ConnectionOptions {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    const parsed = new URL(redisUrl);
    return {
      host: parsed.hostname,
      port: Number(parsed.port) || 6379,
      password: parsed.password || undefined,
      ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
    };
  }

  // Fallback: Upstash host/password env vars (production)
  return {
    host: process.env.UPSTASH_REDIS_HOST,
    port: 6379,
    password: process.env.UPSTASH_REDIS_PASSWORD,
    tls: {}, // Empty object enables TLS — required by Upstash
  };
}

export const redisConnection: ConnectionOptions = buildRedisConnection();

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
