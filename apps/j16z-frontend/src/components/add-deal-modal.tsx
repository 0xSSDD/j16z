"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Deal } from "@/lib/types";

interface AddDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (deal: Deal) => void;
}

export function AddDealModal({ isOpen, onClose, onAdd }: AddDealModalProps) {
  const [acquirerTicker, setAcquirerTicker] = React.useState("");
  const [targetTicker, setTargetTicker] = React.useState("");
  const [dealName, setDealName] = React.useState("");
  const [errors, setErrors] = React.useState<{ [key: string]: string }>({});

  const validateTicker = (ticker: string): boolean => {
    return /^[A-Z]{1,5}$/.test(ticker);
  };

  const handleSubmit = () => {
    const newErrors: { [key: string]: string } = {};

    if (!acquirerTicker.trim()) {
      newErrors.acquirer = "Acquirer ticker is required";
    } else if (!validateTicker(acquirerTicker.toUpperCase())) {
      newErrors.acquirer = "Invalid ticker format (1-5 uppercase letters)";
    }

    if (!targetTicker.trim()) {
      newErrors.target = "Target ticker is required";
    } else if (!validateTicker(targetTicker.toUpperCase())) {
      newErrors.target = "Invalid ticker format (1-5 uppercase letters)";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const newDeal: Deal = {
      id: `deal-${Date.now()}`,
      symbol: targetTicker.toUpperCase(),
      acquirerSymbol: acquirerTicker.toUpperCase(),
      companyName: dealName.trim() || `${targetTicker.toUpperCase()} Inc.`,
      acquirerName: `${acquirerTicker.toUpperCase()} Corp.`,
      announcementDate: new Date().toISOString().split("T")[0],
      acquisitionDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      outsideDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      reportedEquityTakeoverValue: 0,
      considerationType: "CASH",
      p_close_base: 50,
      spread_entry_threshold: 3.0,
      currentSpread: 0,
      ev: 0,
      status: "ANNOUNCED",
      regulatoryFlags: [],
      litigationCount: 0,
    };

    onAdd(newDeal);
    setAcquirerTicker("");
    setTargetTicker("");
    setDealName("");
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-zinc-100">+ Add Deal</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-mono text-zinc-400 mb-2">
              Acquirer Ticker <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="MSFT"
              value={acquirerTicker}
              onChange={(e) => {
                setAcquirerTicker(e.target.value.toUpperCase());
                setErrors((prev) => ({ ...prev, acquirer: "" }));
              }}
              className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono uppercase"
            />
            {errors.acquirer && (
              <p className="text-xs text-red-500 font-mono mt-1">{errors.acquirer}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-mono text-zinc-400 mb-2">
              Target Ticker <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="ATVI"
              value={targetTicker}
              onChange={(e) => {
                setTargetTicker(e.target.value.toUpperCase());
                setErrors((prev) => ({ ...prev, target: "" }));
              }}
              className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono uppercase"
            />
            {errors.target && (
              <p className="text-xs text-red-500 font-mono mt-1">{errors.target}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-mono text-zinc-400 mb-2">
              Deal Name (optional)
            </label>
            <Input
              placeholder="Microsoft / Activision Blizzard"
              value={dealName}
              onChange={(e) => setDealName(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-md font-mono text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-md font-mono text-sm transition-colors"
            >
              Add Deal
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
