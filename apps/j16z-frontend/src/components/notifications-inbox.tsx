'use client';

import { FileText, Newspaper, Scale, Shield, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { MOCK_EVENTS } from '@/lib/constants';

const EVENT_TYPE_STYLE: Record<string, { color: string; bg: string; icon: typeof FileText }> = {
  FILING: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: FileText },
  COURT: { color: 'text-violet-400', bg: 'bg-violet-500/10', icon: Scale },
  AGENCY: { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Shield },
  SPREAD_MOVE: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', icon: TrendingUp },
  NEWS: { color: 'text-sky-400', bg: 'bg-sky-500/10', icon: Newspaper },
};

export function NotificationsInbox() {
  const router = useRouter();
  const [events] = React.useState(MOCK_EVENTS);
  const [filter, setFilter] = React.useState<string>('all');
  const [readEvents, setReadEvents] = React.useState<Set<string>>(new Set());

  const filteredEvents = React.useMemo(() => {
    if (filter === 'all') return events;
    return events.filter((e) => e.type === filter);
  }, [events, filter]);

  const toggleRead = (eventId: string) => {
    setReadEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const markAllRead = () => {
    setReadEvents(new Set(events.map((e) => e.id)));
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-mono font-bold text-text-main">Notifications</h1>
          <p className="text-sm text-text-muted font-mono mt-1">
            {filteredEvents.length} events • {events.length - readEvents.size} unread
          </p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          className="px-4 py-2 border border-border bg-surface hover:bg-surfaceHighlight text-text-main rounded-md font-mono text-sm transition-colors"
        >
          Mark All Read
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'FILING', 'COURT', 'AGENCY', 'SPREAD_MOVE', 'NEWS'].map((type) => (
          <button
            type="button"
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1.5 rounded-md font-mono text-xs transition-colors ${
              filter === type ? 'bg-primary-500 text-white' : 'bg-surface text-text-muted hover:bg-surfaceHighlight'
            }`}
          >
            {type === 'all' ? 'All' : type}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filteredEvents.map((event) => {
          const isRead = readEvents.has(event.id);
          return (
            <div
              key={event.id}
              className={`border border-border rounded-lg p-4 transition-colors ${
                isRead ? 'bg-surface/50' : 'bg-surface'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-text-muted">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-mono ${
                        event.severity === 'CRITICAL'
                          ? 'bg-red-500/10 text-red-500'
                          : event.severity === 'WARNING'
                            ? 'bg-yellow-500/10 text-yellow-500'
                            : 'bg-surface text-text-muted'
                      }`}
                    >
                      {event.severity}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono ${EVENT_TYPE_STYLE[event.type]?.bg ?? 'bg-surfaceHighlight'} ${EVENT_TYPE_STYLE[event.type]?.color ?? 'text-text-muted'}`}
                    >
                      {(() => {
                        const config = EVENT_TYPE_STYLE[event.type];
                        if (config) {
                          const Icon = config.icon;
                          return <Icon className="h-3 w-3" />;
                        }
                        return null;
                      })()}
                      {event.type}
                    </span>
                  </div>
                  <h3 className={`font-mono text-sm mb-2 ${isRead ? 'text-text-muted' : 'text-text-main font-medium'}`}>
                    {event.title}
                  </h3>
                  <p className="text-sm text-text-muted leading-relaxed">{event.summary}</p>
                  <div className="flex gap-3 mt-3">
                    <button
                      type="button"
                      onClick={() => router.push(`/app/deals/${event.dealId}`)}
                      className="text-xs text-primary-500 hover:text-primary-600 font-mono"
                    >
                      View Deal →
                    </button>
                    {event.sourceUrl && (
                      <a
                        href={event.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary-500 hover:text-primary-600 font-mono"
                      >
                        Source →
                      </a>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleRead(event.id)}
                  className="text-xs font-mono text-text-muted hover:text-text-main"
                >
                  {isRead ? 'Mark Unread' : 'Mark Read'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
