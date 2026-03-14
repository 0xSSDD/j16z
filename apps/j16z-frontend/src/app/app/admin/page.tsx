'use client';

import { formatDistanceToNow } from 'date-fns';
import { Activity, AlertTriangle, ArrowRight, CheckCircle, Clock, RefreshCw, Server, XCircle, Zap } from 'lucide-react';
import { Fragment, useEffect, useRef, useState } from 'react';
import {
  type AdminPipeline,
  type AdminQueueData,
  type AdminRecentFiling,
  type AdminScheduleData,
  type AdminSystemHealth,
  getAdminPipeline,
  getAdminQueues,
  getAdminRecentFilings,
  getAdminSchedules,
  getAdminSystemHealth,
  triggerEdgarPoll,
} from '@/lib/api';

function Shimmer({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surfaceHighlight ${className}`} />;
}

function getFreshnessLevel(lastEventAt: string | null): 'fresh' | 'aging' | 'stale' {
  if (!lastEventAt) return 'stale';
  const hours = (Date.now() - new Date(lastEventAt).getTime()) / 3_600_000;
  if (hours <= 24) return 'fresh';
  if (hours <= 48) return 'aging';
  return 'stale';
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'Never';
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

function isFunnelBlocked(upstream: number, downstream: number): boolean {
  if (upstream === 0) return false;
  return (upstream - downstream) / upstream > 0.15;
}

function StatusBadge({ state }: { state: AdminSystemHealth['state'] }) {
  const config: Record<AdminSystemHealth['state'], { className: string; Icon: typeof Zap }> = {
    healthy: { className: 'bg-emerald-400 text-emerald-950', Icon: CheckCircle },
    degraded: { className: 'bg-amber-400 text-amber-950', Icon: AlertTriangle },
    incident: { className: 'bg-red-500 text-white animate-pulse', Icon: Zap },
  };
  const { className, Icon } = config[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${className}`}
    >
      <Icon className="h-3 w-3" />
      {state}
    </span>
  );
}

function FreshnessDot({ level }: { level: 'fresh' | 'aging' | 'stale' }) {
  const color = { fresh: 'bg-emerald-400', aging: 'bg-amber-400', stale: 'bg-red-400' };
  return <span className={`inline-block h-2 w-2 rounded-full ${color[level]}`} />;
}

function getPipelineStatus(filing: AdminRecentFiling): {
  label: 'Extracted' | 'Downloaded' | 'Pending download';
  dotClass: string;
} {
  if (!filing.hasContent) {
    return { label: 'Pending download', dotClass: 'bg-red-400' };
  }

  if (filing.extracted) {
    return { label: 'Extracted', dotClass: 'bg-emerald-400' };
  }

  return { label: 'Downloaded', dotClass: 'bg-amber-400' };
}

function ZoneError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-950/20 px-4 py-3 text-xs text-red-400">
      <XCircle className="h-3.5 w-3.5 shrink-0" />
      {message}
    </div>
  );
}

export default function AdminPage() {
  const [health, setHealth] = useState<AdminSystemHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [pipeline, setPipeline] = useState<AdminPipeline | null>(null);
  const [pipelineLoading, setPipelineLoading] = useState(true);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  const [queues, setQueues] = useState<AdminQueueData | null>(null);
  const [queuesLoading, setQueuesLoading] = useState(true);
  const [queuesError, setQueuesError] = useState<string | null>(null);

  const [schedules, setSchedules] = useState<AdminScheduleData | null>(null);
  const [schedulesLoading, setSchedulesLoading] = useState(true);
  const [schedulesError, setSchedulesError] = useState<string | null>(null);

  const [recentFilings, setRecentFilings] = useState<AdminRecentFiling[]>([]);
  const [recentFilingsLoading, setRecentFilingsLoading] = useState(true);
  const [recentFilingsError, setRecentFilingsError] = useState<string | null>(null);
  const [pollTriggerError, setPollTriggerError] = useState<string | null>(null);
  const [triggeringPoll, setTriggeringPoll] = useState(false);

  const [elapsed, setElapsed] = useState(0);
  const [tick, setTick] = useState(0);
  const lastFetchRef = useRef(Date.now());

  function triggerRefresh() {
    setTick((n) => n + 1);
  }

  async function handleTriggerPoll() {
    setTriggeringPoll(true);
    setPollTriggerError(null);
    try {
      await triggerEdgarPoll();
      triggerRefresh();
    } catch {
      setPollTriggerError('Failed to trigger EDGAR poll');
    } finally {
      setTriggeringPoll(false);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: tick is the manual refresh trigger
  useEffect(() => {
    lastFetchRef.current = Date.now();
    setElapsed(0);

    setHealthLoading(true);
    getAdminSystemHealth()
      .then((d) => {
        setHealth(d);
        setHealthError(null);
      })
      .catch(() => setHealthError('Failed to load system health'))
      .finally(() => setHealthLoading(false));

    setPipelineLoading(true);
    getAdminPipeline()
      .then((d) => {
        setPipeline(d);
        setPipelineError(null);
      })
      .catch(() => setPipelineError('Failed to load pipeline data'))
      .finally(() => setPipelineLoading(false));

    setQueuesLoading(true);
    getAdminQueues()
      .then((d) => {
        setQueues(d);
        setQueuesError(null);
      })
      .catch(() => setQueuesError('Failed to load queue data'))
      .finally(() => setQueuesLoading(false));

    setSchedulesLoading(true);
    getAdminSchedules()
      .then((d) => {
        setSchedules(d);
        setSchedulesError(null);
      })
      .catch(() => setSchedulesError('Failed to load schedules'))
      .finally(() => setSchedulesLoading(false));

    setRecentFilingsLoading(true);
    getAdminRecentFilings()
      .then((d) => {
        setRecentFilings(d);
        setRecentFilingsError(null);
      })
      .catch(() => setRecentFilingsError('Failed to load recent filings'))
      .finally(() => setRecentFilingsLoading(false));
  }, [tick]);

  useEffect(() => {
    const interval = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - lastFetchRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const sortedDeals = pipeline
    ? [...pipeline.dealFreshness].sort((a, b) => {
        const at = a.lastEventAt ? new Date(a.lastEventAt).getTime() : 0;
        const bt = b.lastEventAt ? new Date(b.lastEventAt).getTime() : 0;
        return at - bt;
      })
    : [];

  const hasQueueActivity = health
    ? health.queue.active + health.queue.waiting + health.queue.failed + health.queue.delayed > 0
    : false;

  const sortedFailures = pipeline ? [...pipeline.failureGroups].sort((a, b) => b.count - a.count) : [];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-sm font-semibold tracking-tight text-text-main">System Operations</h1>

      {healthLoading && !health ? (
        <Shimmer className="h-12 w-full" />
      ) : healthError && !health ? (
        <ZoneError message={healthError} />
      ) : health ? (
        <>
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-2.5">
            <StatusBadge state={health.state} />
            <div className="hidden flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-text-muted md:flex">
              <span className="inline-flex items-center gap-1.5">
                <Server className="h-3 w-3 text-text-dim" />
                Workers: {health.workers.nodeJs}
              </span>
              <span className="text-text-dim">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Activity className="h-3 w-3 text-text-dim" />
                Active: {health.queue.active}
              </span>
              <span className="text-text-dim">·</span>
              <span className={health.queue.failed > 0 ? 'text-red-400' : ''}>Failed: {health.queue.failed}</span>
              <span className="text-text-dim">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-text-dim" />
                Oldest: {formatDuration(pipeline?.oldestPendingMs ?? 0)}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-[11px] text-text-dim">{elapsed}s ago</span>
              <button
                type="button"
                onClick={triggerRefresh}
                className="rounded-md p-1.5 text-text-dim transition-colors hover:bg-surfaceHighlight hover:text-text-main"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {health.silentFailure && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/20 px-4 py-2.5 text-xs font-medium text-red-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              SILENT FAILURE: Jobs waiting but no workers connected
            </div>
          )}
        </>
      ) : null}

      {pipelineLoading && !pipeline ? (
        <div className="flex items-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Shimmer key={i} className="h-20 flex-1" />
          ))}
        </div>
      ) : pipelineError && !pipeline ? (
        <ZoneError message={pipelineError} />
      ) : pipeline ? (
        <>
          <div className="flex items-stretch">
            {[
              { label: 'Discovered', value: pipeline.funnel.discovered },
              { label: 'Downloaded', value: pipeline.funnel.downloaded },
              { label: 'Extracted', value: pipeline.funnel.extracted },
              { label: 'Events Created', value: pipeline.funnel.eventsCreated },
            ].map((stage, i, arr) => (
              <Fragment key={stage.label}>
                <div className="flex flex-1 flex-col items-center justify-center rounded border border-border bg-surface px-4 py-3 md:px-6">
                  <span className="text-[10px] uppercase tracking-wider text-text-dim">{stage.label}</span>
                  <span className="mt-1 font-mono text-xl font-bold text-text-main md:text-2xl">
                    {stage.value.toLocaleString()}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div
                    className={`flex items-center px-1 md:px-1.5 ${
                      isFunnelBlocked(arr[i].value, arr[i + 1].value) ? 'text-red-400' : 'text-text-dim'
                    }`}
                  >
                    <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </div>
                )}
              </Fragment>
            ))}
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="border-b border-border px-4 py-2">
              <span className="text-xs font-medium text-text-main">Deal Freshness</span>
            </div>
            {sortedDeals.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-text-dim">No tracked deals</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-text-dim">
                      <th className="px-4 py-2 text-left font-medium">Deal</th>
                      <th className="px-4 py-2 text-left font-medium">Status</th>
                      <th className="px-4 py-2 text-right font-medium">Last Event</th>
                      <th className="w-14 px-4 py-2 text-center font-medium">Fresh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDeals.map((deal) => (
                      <tr
                        key={deal.dealId}
                        className="border-b border-border/40 transition-colors last:border-0 hover:bg-surfaceHighlight/30"
                      >
                        <td className="px-4 py-1.5">
                          <span className="font-mono text-primary-400">{deal.symbol}</span>
                          <span className="ml-2 text-text-muted">
                            {deal.acquirer} → {deal.target}
                          </span>
                        </td>
                        <td className="px-4 py-1.5 text-text-muted">{deal.status}</td>
                        <td className="px-4 py-1.5 text-right font-mono text-text-muted">
                          {formatRelative(deal.lastEventAt)}
                        </td>
                        <td className="px-4 py-1.5 text-center">
                          <FreshnessDot level={getFreshnessLevel(deal.lastEventAt)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <span className="text-xs font-medium text-text-main">Recent Pipeline Activity</span>
              <button
                type="button"
                onClick={handleTriggerPoll}
                disabled={triggeringPoll}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-text-muted transition-colors hover:bg-surfaceHighlight hover:text-text-main disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${triggeringPoll ? 'animate-spin' : ''}`} />
                Trigger EDGAR Poll
              </button>
            </div>

            {pollTriggerError && (
              <div className="border-b border-border px-4 py-1.5 text-[11px] text-red-400">{pollTriggerError}</div>
            )}

            {recentFilingsLoading ? (
              <div className="space-y-2 p-4">
                <Shimmer className="h-6 w-full" />
                <Shimmer className="h-6 w-full" />
                <Shimmer className="h-6 w-full" />
              </div>
            ) : recentFilingsError ? (
              <div className="p-4 text-xs text-red-400">{recentFilingsError}</div>
            ) : recentFilings.length === 0 ? (
              <div className="px-4 py-5 text-center text-xs text-text-dim">No recent filings</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border text-text-dim">
                      <th className="px-4 py-2 text-left font-medium">Filing Type</th>
                      <th className="px-4 py-2 text-left font-medium">Filer</th>
                      <th className="px-4 py-2 text-left font-medium">Filed Date</th>
                      <th className="px-4 py-2 text-left font-medium">Status</th>
                      <th className="px-4 py-2 text-left font-medium">Deal linked?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentFilings.map((filing) => {
                      const pipelineStatus = getPipelineStatus(filing);
                      return (
                        <tr
                          key={filing.id}
                          className="border-b border-border/40 last:border-0 hover:bg-surfaceHighlight/30"
                        >
                          <td className="px-4 py-1.5 font-mono text-text-main">{filing.filingType}</td>
                          <td className="px-4 py-1.5 text-text-muted">
                            {filing.filerName ?? 'Unknown filer'}
                            <span className="ml-1.5 font-mono text-[11px] text-text-dim">{filing.filerCik}</span>
                          </td>
                          <td className="px-4 py-1.5 font-mono text-text-muted">{filing.filedDate}</td>
                          <td className="px-4 py-1.5">
                            <span className="inline-flex items-center gap-1.5 font-mono text-text-muted">
                              <span className={`h-1.5 w-1.5 rounded-full ${pipelineStatus.dotClass}`} />
                              {pipelineStatus.label}
                            </span>
                          </td>
                          <td className="px-4 py-1.5">
                            <span className={`font-mono ${filing.dealId ? 'text-emerald-400' : 'text-text-dim'}`}>
                              {filing.dealId ? 'Yes' : 'No'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="border-b border-border px-4 py-2">
            <span className="text-xs font-medium text-text-main">Failure Groups</span>
          </div>
          {pipelineLoading && !pipeline ? (
            <div className="space-y-2 p-4">
              <Shimmer className="h-10 w-full" />
              <Shimmer className="h-10 w-full" />
            </div>
          ) : pipelineError && !pipeline ? (
            <div className="p-4 text-xs text-red-400">{pipelineError}</div>
          ) : sortedFailures.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-4 text-xs text-text-dim">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
              No failures
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {sortedFailures.map((group) => (
                <div
                  key={`${group.count}-${group.lastTime}`}
                  className="flex items-start gap-3 rounded border border-border/40 px-3 py-2"
                >
                  <span className="shrink-0 font-mono text-xs font-bold text-red-400">{group.count}×</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs text-text-muted">{group.lastError}</p>
                    <p className="mt-0.5 text-[10px] text-text-dim">
                      {formatDistanceToNow(group.lastTime, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="border-b border-border px-4 py-2">
            <span className="text-xs font-medium text-text-main">Cron Schedules</span>
          </div>
          {schedulesLoading && !schedules ? (
            <div className="space-y-2 p-4">
              <Shimmer className="h-5 w-full" />
              <Shimmer className="h-5 w-full" />
              <Shimmer className="h-5 w-full" />
            </div>
          ) : schedulesError && !schedules ? (
            <div className="p-4 text-xs text-red-400">{schedulesError}</div>
          ) : schedules && schedules.active.length === 0 ? (
            <div className="px-4 py-4 text-xs text-text-dim">No schedules configured</div>
          ) : schedules ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-text-dim">
                  <th className="px-4 py-1.5 text-left font-medium">Job</th>
                  <th className="px-4 py-1.5 text-left font-medium">Schedule</th>
                  <th className="px-4 py-1.5 text-right font-medium">Next Run</th>
                </tr>
              </thead>
              <tbody>
                {schedules.active.map((sched) => {
                  const nextAt = sched.next ? new Date(sched.next) : null;
                  const overdue = nextAt !== null && nextAt.getTime() < Date.now();
                  return (
                    <tr key={sched.id} className="border-b border-border/40 last:border-0">
                      <td className="px-4 py-1.5 text-text-main">{sched.name}</td>
                      <td className="px-4 py-1.5 font-mono text-text-dim">{sched.pattern}</td>
                      <td className="px-4 py-1.5 text-right">
                        <span
                          className={`inline-flex items-center gap-1.5 font-mono ${
                            overdue ? 'text-amber-400' : 'text-text-muted'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${overdue ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                          {nextAt ? formatDistanceToNow(nextAt, { addSuffix: true }) : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}
        </div>
      </div>

      {queuesLoading && !queues ? (
        <Shimmer className="h-10 w-full" />
      ) : queuesError && !queues ? (
        <ZoneError message={queuesError} />
      ) : hasQueueActivity && health ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg border border-border bg-surface px-4 py-2.5 text-xs">
          <span className="font-medium text-text-main">Queue</span>
          <span className="text-text-dim">
            Waiting <span className="font-mono text-text-muted">{health.queue.waiting}</span>
          </span>
          <span className="text-text-dim">
            Active <span className="font-mono text-text-muted">{health.queue.active}</span>
          </span>
          <span className="text-text-dim">
            Completed <span className="font-mono text-text-muted">{health.queue.completed}</span>
          </span>
          <span className="text-text-dim">
            Failed{' '}
            <span className={`font-mono ${health.queue.failed > 0 ? 'text-red-400' : 'text-text-muted'}`}>
              {health.queue.failed}
            </span>
          </span>
          <span className="text-text-dim">
            Delayed <span className="font-mono text-text-muted">{health.queue.delayed}</span>
          </span>
          {queues && queues.failedJobs.length > 0 && (
            <span className="ml-auto text-text-dim">
              Recent jobs failed <span className="font-mono text-red-400">{queues.failedJobs.length}</span>
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}
