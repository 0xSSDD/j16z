"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

interface VirtualizedDropdownProps {
  label: string;
  items: Array<{ id: string; name: string }>;
  selectedIds: string[];
  onToggle: (id: string) => void;
  placeholder?: string;
  maxHeight?: number;
}

export function VirtualizedDropdown({
  label,
  items,
  selectedIds,
  onToggle,
  placeholder = "Select items",
  maxHeight = 300,
}: VirtualizedDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Filter items based on search
  const filteredItems = React.useMemo(() => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item => item.name.toLowerCase().includes(query));
  }, [items, searchQuery]);

  // Virtual scrolling - only render visible items
  const ITEM_HEIGHT = 36;
  const [scrollTop, setScrollTop] = React.useState(0);
  const visibleStart = Math.floor(scrollTop / ITEM_HEIGHT);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(maxHeight / ITEM_HEIGHT) + 1,
    filteredItems.length
  );
  const visibleItems = filteredItems.slice(visibleStart, visibleEnd);
  const totalHeight = filteredItems.length * ITEM_HEIGHT;
  const offsetY = visibleStart * ITEM_HEIGHT;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
          selectedIds.length > 0
            ? "border-primary-500/30 bg-primary-500/10 text-primary-400"
            : "border-border bg-surface text-text-muted hover:bg-surfaceHighlight"
        }`}
      >
        {label} {selectedIds.length > 0 && `(${selectedIds.length})`}
        <ChevronDown className="h-3 w-3" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-md border border-border bg-surface shadow-lg">
          <div className="border-b border-border p-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
              className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-text-main placeholder:text-text-muted focus:border-primary-500 focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div
            className="relative overflow-y-auto"
            style={{ maxHeight }}
            onScroll={handleScroll}
          >
            <div style={{ height: totalHeight }}>
              <div style={{ transform: `translateY(${offsetY}px)` }}>
                {visibleItems.map((item, idx) => {
                  const actualIndex = visibleStart + idx;
                  const actualItem = filteredItems[actualIndex];
                  const isSelected = selectedIds.includes(actualItem.id);

                  return (
                    <label
                      key={actualItem.id}
                      className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-surfaceHighlight"
                      style={{ height: ITEM_HEIGHT }}
                    >
                      <div className="relative flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border bg-background">
                        {isSelected && (
                          <Check className="h-3 w-3 text-primary-500" />
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggle(actualItem.id)}
                        className="sr-only"
                      />
                      <span className="truncate text-text-main">{actualItem.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {filteredItems.length === 0 && (
            <div className="p-4 text-center text-xs text-text-muted">
              No items found
            </div>
          )}

          {filteredItems.length > 10 && (
            <div className="border-t border-border p-2 text-center text-xs text-text-dim">
              {filteredItems.length} items
            </div>
          )}
        </div>
      )}
    </div>
  );
}
