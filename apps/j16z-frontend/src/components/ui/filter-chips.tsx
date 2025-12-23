interface FilterChipsProps {
  filters: Array<{ label: string; value: string; onRemove: () => void }>;
  onClearAll?: () => void;
}

export function FilterChips({ filters, onClearAll }: FilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-mono text-zinc-500">Active filters:</span>
      {filters.map((filter, index) => (
        <button
          key={index}
          onClick={filter.onRemove}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500/20 transition-colors font-mono text-xs"
        >
          <span>{filter.label}: {filter.value}</span>
          <span className="text-amber-400">×</span>
        </button>
      ))}
      {onClearAll && filters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-xs font-mono text-zinc-500 hover:text-zinc-300 underline"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
