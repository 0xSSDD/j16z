"use client";

import * as React from "react";

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className="border border-zinc-800 rounded-lg bg-zinc-950">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-zinc-900 transition-colors"
      >
        <h3 className="font-mono text-sm font-medium text-zinc-100 uppercase tracking-wider">
          {title}
        </h3>
        <span className="text-amber-500 font-mono text-lg">
          {isOpen ? "▼" : "▶"}
        </span>
      </button>
      {isOpen && (
        <div className="p-4 border-t border-zinc-800">
          {children}
        </div>
      )}
    </div>
  );
}
