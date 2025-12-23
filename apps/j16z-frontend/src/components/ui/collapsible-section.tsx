"use client";

import * as React from "react";

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  storageKey?: string;
}

export function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
  storageKey,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = React.useState(() => {
    if (storageKey && typeof window !== "undefined") {
      const stored = localStorage.getItem(`collapsible-${storageKey}`);
      if (stored !== null) {
        return stored === "true";
      }
    }
    return defaultOpen;
  });

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (storageKey && typeof window !== "undefined") {
      localStorage.setItem(`collapsible-${storageKey}`, String(newState));
    }
  };

  return (
    <div className="border border-border rounded-lg bg-background">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-surfaceHighlight transition-colors"
      >
        <h3 className="font-mono text-sm font-medium text-text-main uppercase tracking-wider">
          {title}
        </h3>
        <span className="text-primary-500 font-mono text-lg">
          {isOpen ? "▼" : "▶"}
        </span>
      </button>
      {isOpen && (
        <div className="p-4 border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
}
