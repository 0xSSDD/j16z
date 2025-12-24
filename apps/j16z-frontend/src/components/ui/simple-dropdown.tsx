"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

interface SimpleDropdownProps {
  label: string;
  items: Array<{ id: string; name: string }>;
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export function SimpleDropdown({
  label,
  items,
  selectedIds,
  onToggle,
}: SimpleDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
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
        <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-md border border-border bg-surface shadow-lg">
          <div className="max-h-64 overflow-y-auto p-2">
            {items.map((item) => {
              const isSelected = selectedIds.includes(item.id);

              return (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors hover:bg-surfaceHighlight"
                >
                  <div className="relative flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border bg-background">
                    {isSelected && (
                      <Check className="h-3 w-3 text-primary-500" />
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(item.id)}
                    className="sr-only"
                  />
                  <span className="text-text-main">{item.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
