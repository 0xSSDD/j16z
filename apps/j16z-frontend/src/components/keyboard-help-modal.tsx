"use client";

import React from "react";
import { X } from "lucide-react";

interface KeyboardHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardHelpModal({ isOpen, onClose }: KeyboardHelpModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    {
      category: "Navigation",
      items: [
        { keys: ["g", "i"], description: "Go to Inbox" },
        { keys: ["g", "d"], description: "Go to Deals" },
        { keys: ["g", "w"], description: "Go to Watchlists" },
        { keys: ["g", "s"], description: "Go to Settings" },
        { keys: ["⌘", "k"], description: "Open command palette" },
      ],
    },
    {
      category: "Inbox",
      items: [
        { keys: ["↑", "↓"], description: "Navigate events" },
        { keys: ["e"], description: "Mark event as read" },
        { keys: ["v"], description: "View deal card" },
        { keys: ["1"], description: "Toggle HIGH filter" },
        { keys: ["2"], description: "Toggle MEDIUM filter" },
        { keys: ["3"], description: "Toggle LOW filter" },
        { keys: ["Esc"], description: "Close side panel" },
      ],
    },
    {
      category: "General",
      items: [
        { keys: ["?"], description: "Show this help" },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg border border-border bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-main">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-text-muted transition-colors hover:bg-surfaceHighlight hover:text-text-main"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="mb-3 text-sm font-medium text-text-muted">{section.category}</h3>
              <div className="space-y-2">
                {section.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-text-main">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, keyIdx) => (
                        <React.Fragment key={keyIdx}>
                          <kbd className="rounded border border-border bg-surfaceHighlight px-2 py-1 font-mono text-xs text-text-main">
                            {key}
                          </kbd>
                          {keyIdx < item.keys.length - 1 && (
                            <span className="text-xs text-text-muted">then</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
