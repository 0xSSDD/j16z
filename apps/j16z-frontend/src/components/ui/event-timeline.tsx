import { FileText, Newspaper, Scale, Shield, TrendingUp } from 'lucide-react';
import type { Event } from '@/lib/types';

interface EventTimelineProps {
  events: Event[];
}

const EVENT_ICON_CONFIG: Record<string, { icon: typeof FileText; color: string }> = {
  FILING: { icon: FileText, color: 'text-primary-400' },
  COURT: { icon: Scale, color: 'text-text-muted' },
  AGENCY: { icon: Shield, color: 'text-primary-500' },
  SPREAD_MOVE: { icon: TrendingUp, color: 'text-primary-300' },
  NEWS: { icon: Newspaper, color: 'text-primary-400' },
};

const SUBTYPE_LABELS: Record<string, string> = {
  FTC_SECOND_REQUEST: 'FTC Second Request',
  HSR_EARLY_TERMINATION: 'HSR Early Termination',
  FTC_PRESS_RELEASE: 'FTC Press Release',
  DOJ_PRESS_RELEASE: 'DOJ Press Release',
  DOJ_CIVIL_CASE: 'DOJ Civil Case',
  RSS_ARTICLE: 'RSS Article',
};

const EventIcon = ({ type }: { type: Event['type'] }) => {
  const config = EVENT_ICON_CONFIG[type] ?? EVENT_ICON_CONFIG.FILING;
  const Icon = config.icon;
  return <Icon className={`h-4 w-4 ${config.color}`} />;
};

export function EventTimeline({ events }: EventTimelineProps) {
  const severityColors: Record<string, string> = {
    CRITICAL: 'border-red-500 bg-red-500/10',
    WARNING: 'border-primary-500 bg-primary-500/10',
    INFO: 'border-border bg-surface',
  };

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={event.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${severityColors[event.severity] ?? severityColors.INFO}`}
            >
              <EventIcon type={event.type} />
            </div>
            {index < events.length - 1 && <div className="w-0.5 h-full bg-border mt-2" />}
          </div>
          <div className="flex-1 pb-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-text-muted">
                    {new Date(event.timestamp).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${severityColors[event.severity] ?? severityColors.INFO}`}
                  >
                    {event.severity}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-mono bg-surface text-text-muted">
                    {SUBTYPE_LABELS[event.subType] ?? event.subType}
                  </span>
                </div>
                <h4 className="font-mono text-sm font-medium text-text-main mb-2">{event.title}</h4>
                <p className="text-sm text-text-muted leading-relaxed">{event.description}</p>
                {event.sourceUrl && (
                  <a
                    href={event.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-primary-500 hover:text-primary-400 font-mono"
                  >
                    View Source →
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
