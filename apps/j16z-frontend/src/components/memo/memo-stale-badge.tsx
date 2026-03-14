'use client';

interface StaleBadgeProps {
  count: number;
}

export function StaleBadge({ count }: StaleBadgeProps) {
  if (count === 0) return null;

  return (
    <output
      className="inline-flex items-center rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-mono font-medium text-amber-400"
      aria-label={`${count} new event${count !== 1 ? 's' : ''} since last refresh`}
    >
      {count} new
    </output>
  );
}
