import { and, count, eq, isNull, max, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { adminDb } from '../db/index.js';
import * as schema from '../db/schema.js';
import type { AuthEnv } from '../middleware/auth.js';
import { testRedisConnection } from '../queues/connection.js';
import { ingestionQueue } from '../queues/ingestion.js';
import { SCHEDULE_CONFIG } from '../queues/scheduler.js';

export const adminRoutes = new Hono<AuthEnv>();

adminRoutes.get('/system', async (c) => {
  const payload = c.get('jwtPayload');
  const userId = payload.sub!;

  const [membership] = await adminDb
    .select({ firmId: schema.firmMembers.firmId })
    .from(schema.firmMembers)
    .where(and(eq(schema.firmMembers.userId, userId), isNull(schema.firmMembers.deletedAt)))
    .limit(1);

  const firmId = membership?.firmId;

  const [redisResult, dbResult, queueCounts, workers] = await Promise.all([
    testRedisConnection(),
    adminDb
      .select({ id: schema.firms.id })
      .from(schema.firms)
      .limit(1)
      .then(() => ({ success: true, error: undefined as string | undefined }))
      .catch((err: Error) => ({ success: false, error: err.message })),
    ingestionQueue.getJobCounts('wait', 'active', 'completed', 'failed', 'delayed'),
    ingestionQueue.getWorkers().catch(() => []),
  ]);

  const silentFailure = queueCounts.wait > 0 && queueCounts.active === 0 && workers.length === 0;
  const hasInfraFailure = !redisResult.success || !dbResult.success || workers.length === 0;
  const hasQueueBacklog = queueCounts.failed > 10 || silentFailure;

  let state: 'healthy' | 'degraded' | 'incident' = 'healthy';
  if (hasInfraFailure || silentFailure) state = 'incident';
  else if (hasQueueBacklog || queueCounts.failed > 0) state = 'degraded';

  return c.json({
    state,
    silentFailure,
    api: { healthy: true },
    redis: { healthy: redisResult.success, error: redisResult.error },
    postgres: { healthy: dbResult.success, error: dbResult.error },
    workers: {
      nodeJs: workers.length,
      healthy: workers.length > 0,
    },
    queue: {
      active: queueCounts.active,
      waiting: queueCounts.wait,
      completed: queueCounts.completed,
      failed: queueCounts.failed,
      delayed: queueCounts.delayed,
    },
    firm: firmId ? { id: firmId } : null,
    timestamp: new Date().toISOString(),
  });
});

adminRoutes.get('/queues', async (c) => {
  const [counts, failedJobs, schedulers] = await Promise.all([
    ingestionQueue.getJobCounts('wait', 'active', 'completed', 'failed', 'delayed'),
    ingestionQueue.getJobs(['failed'], 0, 19, false),
    ingestionQueue.getJobSchedulers(0, 99, true).catch(() => []),
  ]);

  return c.json({
    counts,
    failedJobs: failedJobs.map((j) => ({
      id: j.id,
      name: j.name,
      failedReason: j.failedReason,
      attemptsMade: j.attemptsMade,
      timestamp: j.timestamp,
      finishedOn: j.finishedOn,
    })),
    schedulers: schedulers.map((s) => ({
      id: s.id,
      name: s.name,
      pattern: s.pattern,
      next: s.next,
      tz: s.tz,
    })),
  });
});

adminRoutes.get('/schedules', async (c) => {
  const schedulers = await ingestionQueue.getJobSchedulers(0, 99, true).catch(() => []);

  return c.json({
    config: SCHEDULE_CONFIG,
    active: schedulers.map((s) => ({
      id: s.id,
      name: s.name,
      pattern: s.pattern,
      next: s.next ? new Date(s.next).toISOString() : null,
      tz: s.tz,
    })),
  });
});

adminRoutes.get('/ingestion', async (c) => {
  const rows = await adminDb.select().from(schema.ingestionStatus);
  return c.json({ sources: rows });
});

adminRoutes.get('/overview', async (c) => {
  const payload = c.get('jwtPayload');
  const userId = payload.sub!;

  const [membership] = await adminDb
    .select({ firmId: schema.firmMembers.firmId })
    .from(schema.firmMembers)
    .where(and(eq(schema.firmMembers.userId, userId), isNull(schema.firmMembers.deletedAt)))
    .limit(1);

  if (!membership) return c.json({ error: 'No firm' }, 400);
  const firmId = membership.firmId;

  const [[members], [deals], [events], [filings]] = await Promise.all([
    adminDb
      .select({ total: count() })
      .from(schema.firmMembers)
      .where(and(eq(schema.firmMembers.firmId, firmId), isNull(schema.firmMembers.deletedAt))),
    adminDb
      .select({ total: count() })
      .from(schema.deals)
      .where(and(eq(schema.deals.firmId, firmId), isNull(schema.deals.deletedAt))),
    adminDb.select({ total: count() }).from(schema.events).where(eq(schema.events.firmId, firmId)),
    adminDb.select({ total: count() }).from(schema.filings),
  ]);

  return c.json({
    firmId,
    members: members?.total ?? 0,
    deals: deals?.total ?? 0,
    events: events?.total ?? 0,
    filings: filings?.total ?? 0,
  });
});

adminRoutes.get('/pipeline', async (c) => {
  const payload = c.get('jwtPayload');
  const userId = payload.sub!;

  const [membership] = await adminDb
    .select({ firmId: schema.firmMembers.firmId })
    .from(schema.firmMembers)
    .where(and(eq(schema.firmMembers.userId, userId), isNull(schema.firmMembers.deletedAt)))
    .limit(1);

  if (!membership) return c.json({ error: 'No firm' }, 400);
  const firmId = membership.firmId;

  const [
    totalFilings,
    downloadedFilings,
    extractedFilings,
    totalEvents,
    dealFreshness,
    oldestPendingJobs,
    recentFailures,
  ] = await Promise.all([
    adminDb
      .select({ total: count() })
      .from(schema.filings)
      .then((r) => r[0]?.total ?? 0),
    adminDb
      .select({ total: count() })
      .from(schema.filings)
      .where(sql`${schema.filings.rawContent} IS NOT NULL`)
      .then((r) => r[0]?.total ?? 0),
    adminDb
      .select({ total: count() })
      .from(schema.filings)
      .where(eq(schema.filings.extracted, true))
      .then((r) => r[0]?.total ?? 0),
    adminDb
      .select({ total: count() })
      .from(schema.events)
      .where(eq(schema.events.firmId, firmId))
      .then((r) => r[0]?.total ?? 0),
    adminDb
      .select({
        dealId: schema.deals.id,
        symbol: schema.deals.symbol,
        acquirer: schema.deals.acquirer,
        target: schema.deals.target,
        status: schema.deals.status,
        lastEvent: max(schema.events.timestamp),
      })
      .from(schema.deals)
      .leftJoin(schema.events, eq(schema.deals.id, schema.events.dealId))
      .where(and(eq(schema.deals.firmId, firmId), isNull(schema.deals.deletedAt)))
      .groupBy(schema.deals.id, schema.deals.symbol, schema.deals.acquirer, schema.deals.target, schema.deals.status),
    ingestionQueue
      .getJobs(['waiting', 'delayed'], 0, 0, true)
      .then((jobs) => (jobs[0] ? Date.now() - (jobs[0].timestamp ?? Date.now()) : 0)),
    ingestionQueue.getJobs(['failed'], 0, 49, false).then((jobs) => {
      const grouped: Record<string, { count: number; lastError: string; lastTime: number }> = {};
      for (const j of jobs) {
        const cause = j.failedReason?.split('\n')[0] ?? 'Unknown';
        if (!grouped[cause]) grouped[cause] = { count: 0, lastError: cause, lastTime: 0 };
        grouped[cause].count++;
        grouped[cause].lastTime = Math.max(grouped[cause].lastTime, j.finishedOn ?? 0);
      }
      return Object.values(grouped).sort((a, b) => b.count - a.count);
    }),
  ]);

  return c.json({
    funnel: {
      discovered: totalFilings,
      downloaded: downloadedFilings,
      extracted: extractedFilings,
      eventsCreated: totalEvents,
    },
    dealFreshness: dealFreshness.map((d) => ({
      dealId: d.dealId,
      symbol: d.symbol,
      acquirer: d.acquirer,
      target: d.target,
      status: d.status,
      lastEventAt: d.lastEvent?.toISOString() ?? null,
      stale: d.lastEvent ? Date.now() - d.lastEvent.getTime() > 24 * 60 * 60 * 1000 : true,
    })),
    oldestPendingMs: oldestPendingJobs,
    failureGroups: recentFailures,
  });
});
