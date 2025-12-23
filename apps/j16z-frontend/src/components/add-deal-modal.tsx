"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Deal } from "@/lib/types";
import { getTodayISO, addDaysToToday } from "@/lib/date-utils";

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
      announcementDate: getTodayISO(),
      acquisitionDate: addDaysToToday(180),
      outsideDate: addDaysToToday(365),
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
      <DialogContent className="bg-background border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-foreground">+ Add Deal</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-mono text-muted-foreground mb-2">
              Acquirer Ticker <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="MSFT"
              value={acquirerTicker}
              onChange={(e) => {
                setAcquirerTicker(e.target.value.toUpperCase());
                setErrors((prev) => ({ ...prev, acquirer: "" }));
              }}
              className="bg-secondary border-border text-foreground font-mono uppercase"
            />
            {errors.acquirer && (
              <p className="text-xs text-red-500 font-mono mt-1">{errors.acquirer}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-mono text-muted-foreground mb-2">
              Target Ticker <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="ATVI"
              value={targetTicker}
              onChange={(e) => {
                setTargetTicker(e.target.value.toUpperCase());
                setErrors((prev) => ({ ...prev, target: "" }));
              }}
              className="bg-secondary border-border text-foreground font-mono uppercase"
            />
            {errors.target && (
              <p className="text-xs text-red-500 font-mono mt-1">{errors.target}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-mono text-muted-foreground mb-2">
              Deal Name (optional)
            </label>
            <Input
              placeholder="Microsoft / Activision Blizzard"
              value={dealName}
              onChange={(e) => setDealName(e.target.value)}
              className="bg-secondary border-border text-foreground font-mono"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md font-mono text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 dark:text-zinc-950 rounded-md font-mono text-sm transition-colors"
            >
              Add Deal
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
