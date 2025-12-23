import { Event } from "@/lib/types";
import { FileText, Scale, Building2, TrendingUp, Newspaper } from "lucide-react";

interface EventTimelineProps {
  events: Event[];
}

const EventIcon = ({ type }: { type: Event["type"] }) => {
  const iconProps = { className: "h-4 w-4" };

  switch (type) {
    case "FILING":
      return <FileText {...iconProps} />;
    case "COURT":
      return <Scale {...iconProps} />;
    case "AGENCY":
      return <Building2 {...iconProps} />;
    case "SPREAD_MOVE":
      return <TrendingUp {...iconProps} />;
    case "NEWS":
      return <Newspaper {...iconProps} />;
    default:
      return <FileText {...iconProps} />;
  }
};

export function EventTimeline({ events }: EventTimelineProps) {
  const materialityColors = {
    HIGH: "border-red-500 bg-red-500/10",
    MEDIUM: "border-yellow-500 bg-yellow-500/10",
    LOW: "border-zinc-500 bg-zinc-500/10",
  };

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={event.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${materialityColors[event.materiality]}`}
            >
              <EventIcon type={event.type} />
            </div>
            {index < events.length - 1 && (
              <div className="w-0.5 h-full bg-border mt-2" />
            )}
          </div>
          <div className="flex-1 pb-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-muted-foreground">
                    {new Date(event.timestamp).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${materialityColors[event.materiality]}`}
                  >
                    {event.materiality}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-mono bg-secondary text-muted-foreground">
                    {event.subtype}
                  </span>
                </div>
                <h4 className="font-mono text-sm font-medium text-foreground mb-2">
                  {event.title}
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {event.summary}
                </p>
                {event.sourceUrl && (
                  <a
                    href={event.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-amber-500 hover:text-amber-400 font-mono"
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
