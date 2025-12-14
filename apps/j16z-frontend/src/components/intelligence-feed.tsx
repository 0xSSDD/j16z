"use client";

import React, { useState } from "react";
import { MOCK_ITEMS } from "@/lib/constants";
import { IntelligenceItem, ItemType, Priority } from "@/lib/types";
import { DetailView } from "@/components/intelligence-item-detail";

const PriorityBadge = ({ priority }: { priority: Priority }) => {
  const styles: Record<Priority, string> = {
    [Priority.CRITICAL]: "text-rose-500 bg-rose-950/30 border-rose-900",
    [Priority.HIGH]: "text-primary-500 bg-primary-950/30 border-primary-900",
    [Priority.MEDIUM]: "text-zinc-400 bg-zinc-900 border-zinc-700",
    [Priority.LOW]: "text-zinc-600 bg-zinc-950 border-zinc-800",
  };

  return (
    <span
      className={`border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${styles[priority]}`}
    >
      {priority.substring(0, 1)}
    </span>
  );
};

export const IntelligenceFeed: React.FC = () => {
  const [selectedItem, setSelectedItem] = useState<IntelligenceItem | null>(
    null,
  );
  const [filter, setFilter] = useState<string>("ALL");

  const filteredItems =
    filter === "ALL"
      ? MOCK_ITEMS
      : MOCK_ITEMS.filter((item) => item.type === filter);

  return (
    <div className="flex h-full flex-col font-mono">
      <div className="mb-6 flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="font-narrative text-xl font-bold uppercase text-zinc-100">
            Raw Intelligence Feed
          </h1>
          <p className="mt-1 text-xs uppercase tracking-widest text-zinc-600">
            Unfiltered Signal Stream
          </p>
        </div>

        <div className="flex gap-2">
          <div className="flex border border-zinc-800 bg-zinc-950">
            {["ALL", ItemType.LITIGATION, ItemType.SEC_FILING, ItemType.NEWS].map(
              (f) => (
                <button
                  key={f}
                  onClick={() => setFilter(String(f))}
                  className={`border-r border-zinc-800 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider last:border-r-0 transition-colors ${filter === f ? "bg-zinc-800 text-zinc-100" : "text-zinc-600 hover:bg-zinc-900 hover:text-zinc-300"}`}
                >
                  {f === "ALL" ? "ALL" : String(f).split("_")[0]}
                </button>
              ),
            )}
          </div>
          <button className="border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 transition-colors hover:border-zinc-600 hover:text-zinc-100">
            Filter Params
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col border border-zinc-800 bg-zinc-950">
        <div className="grid grid-cols-12 gap-4 border-b border-zinc-800 bg-zinc-900 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          <div className="col-span-1">Pri</div>
          <div className="col-span-1">Type</div>
          <div className="col-span-5">Subject</div>
          <div className="col-span-2">Source</div>
          <div className="col-span-2">Tags</div>
          <div className="col-span-1 text-right">Time</div>
        </div>

        <div className="flex-1 divide-y divide-zinc-800/50 overflow-auto">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="group grid cursor-pointer grid-cols-12 items-center gap-4 px-4 py-3 text-xs transition-colors hover:bg-zinc-900"
            >
              <div className="col-span-1">
                <PriorityBadge priority={item.priority} />
              </div>
              <div className="col-span-1 text-zinc-500 group-hover:text-zinc-300">
                {item.type.split("_")[0]}
              </div>
              <div className="col-span-5">
                <div className="flex flex-col">
                  <div className="truncate font-bold text-zinc-300 transition-colors group-hover:text-primary-500">
                    {item.title}
                  </div>
                  <div className="mt-0.5 flex gap-2">
                    {item.ticker && (
                      <span className="border border-primary-900/20 bg-primary-900/10 px-1 text-[10px] text-primary-600">
                        {item.ticker}
                      </span>
                    )}
                    <span className="max-w-[200px] truncate text-[10px] text-zinc-600">
                      {item.content.substring(0, 50)}...
                    </span>
                  </div>
                </div>
              </div>
              <div className="col-span-2 text-[10px] font-mono uppercase text-zinc-500">
                {item.source}
              </div>
              <div className="col-span-2">
                <div className="flex flex-wrap gap-1">
                  {item.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="border border-zinc-800 px-1 py-0.5 text-[9px] uppercase text-zinc-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="col-span-1 text-right text-[10px] font-mono text-zinc-600">
                {new Date(item.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-900 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
          <span>Total Items: {filteredItems.length}</span>
          <div className="flex gap-4">
            <button className="hover:text-zinc-300">Prev</button>
            <button className="hover:text-zinc-300">Next</button>
          </div>
        </div>
      </div>

      {selectedItem && (
        <DetailView item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
};
