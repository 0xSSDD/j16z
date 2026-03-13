'use client';

/**
 * DataAgeBadge — shows how fresh market data is.
 *
 * Colors: green (<5 min), yellow (5-30 min), red (>30 min)
 * Labels: "Live" (<1 min), "{N}m ago" (<60 min), "{N}h ago" (>=60 min)
 * Shows "Market Closed" variant when US market is not open.
 * Shows "No data" when lastUpdated is null.
 */

interface DataAgeBadgeProps {
  lastUpdated: Date | string | null;
}

function isMarketOpen(): boolean {
  // Check if current time is during US market hours (9:30 AM - 4:00 PM ET, Mon-Fri)
  const now = new Date();
  const etFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    weekday: 'short',
  });

  const parts = etFormatter.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';

  // Weekend check
  if (weekday === 'Sat' || weekday === 'Sun') return false;

  const totalMinutes = hour * 60 + minute;
  // Market hours: 9:30 AM (570 min) to 4:00 PM (960 min) ET
  return totalMinutes >= 570 && totalMinutes < 960;
}

export function DataAgeBadge({ lastUpdated }: DataAgeBadgeProps) {
  if (!lastUpdated) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
        No data
      </span>
    );
  }

  const updatedDate = typeof lastUpdated === 'string' ? new Date(lastUpdated) : lastUpdated;
  const ageMinutes = (Date.now() - updatedDate.getTime()) / 60000;

  // Market closed variant
  if (!isMarketOpen() && ageMinutes > 30) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
        Market Closed
      </span>
    );
  }

  // Determine color and label
  let colorClasses: string;
  let label: string;

  if (ageMinutes < 1) {
    label = 'Live';
  } else if (ageMinutes < 60) {
    label = `${Math.floor(ageMinutes)}m ago`;
  } else {
    label = `${Math.floor(ageMinutes / 60)}h ago`;
  }

  if (ageMinutes < 5) {
    // Green
    colorClasses = 'bg-primary-500/10 text-primary-400 border-primary-500/20';
  } else if (ageMinutes < 30) {
    // Yellow
    colorClasses = 'bg-primary-500/10 text-primary-400 border-primary-500/20';
  } else {
    // Red
    colorClasses = 'bg-red-500/10 text-red-400 border-red-500/20';
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${colorClasses}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          ageMinutes < 5 ? 'bg-primary-400' : ageMinutes < 30 ? 'bg-primary-400' : 'bg-red-400'
        }`}
      />
      {label}
    </span>
  );
}
