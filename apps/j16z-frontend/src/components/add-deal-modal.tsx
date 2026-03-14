'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { addDaysToToday, getTodayISO } from '@/lib/date-utils';
import type { Deal } from '@/lib/types';

interface AddDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (deal: Deal) => void;
}

export function AddDealModal({ isOpen, onClose, onAdd }: AddDealModalProps) {
  const [acquirerTicker, setAcquirerTicker] = React.useState('');
  const [targetTicker, setTargetTicker] = React.useState('');
  const [dealName, setDealName] = React.useState('');
  const [errors, setErrors] = React.useState<{ [key: string]: string }>({});

  const validateTicker = (ticker: string): boolean => {
    return /^[A-Z]{1,5}$/.test(ticker);
  };

  const handleSubmit = () => {
    const newErrors: { [key: string]: string } = {};

    if (!acquirerTicker.trim()) {
      newErrors.acquirer = 'Acquirer ticker is required';
    } else if (!validateTicker(acquirerTicker.toUpperCase())) {
      newErrors.acquirer = 'Invalid ticker format (1-5 uppercase letters)';
    }

    if (!targetTicker.trim()) {
      newErrors.target = 'Target ticker is required';
    } else if (!validateTicker(targetTicker.toUpperCase())) {
      newErrors.target = 'Invalid ticker format (1-5 uppercase letters)';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const newDeal: Deal = {
      id: `deal-${Date.now()}`,
      symbol: targetTicker.toUpperCase(),
      target: dealName.trim() || `${targetTicker.toUpperCase()} Inc.`,
      acquirer: `${acquirerTicker.toUpperCase()} Corp.`,
      announcedDate: getTodayISO(),
      expectedCloseDate: addDaysToToday(180),
      outsideDate: addDaysToToday(365),
      dealValue: 0,
      considerationType: 'CASH',
      pCloseBase: 50,
      spreadEntryThreshold: 3.0,
      grossSpread: 0,
      annualizedReturn: 0,
      status: 'ANNOUNCED',
      regulatoryFlags: [],
      litigationCount: 0,
    };

    onAdd(newDeal);
    setAcquirerTicker('');
    setTargetTicker('');
    setDealName('');
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-background border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-text-main">+ Add Deal</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label htmlFor="acquirer-ticker" className="block text-sm font-mono text-text-muted mb-2">
              Acquirer Ticker <span className="text-red-500">*</span>
            </label>
            <Input
              id="acquirer-ticker"
              placeholder="MSFT"
              value={acquirerTicker}
              onChange={(e) => {
                setAcquirerTicker(e.target.value.toUpperCase());
                setErrors((prev) => ({ ...prev, acquirer: '' }));
              }}
              className="bg-surface border-border text-text-main font-mono uppercase"
            />
            {errors.acquirer && <p className="text-xs text-red-500 font-mono mt-1">{errors.acquirer}</p>}
          </div>

          <div>
            <label htmlFor="target-ticker" className="block text-sm font-mono text-text-muted mb-2">
              Target Ticker <span className="text-red-500">*</span>
            </label>
            <Input
              id="target-ticker"
              placeholder="ATVI"
              value={targetTicker}
              onChange={(e) => {
                setTargetTicker(e.target.value.toUpperCase());
                setErrors((prev) => ({ ...prev, target: '' }));
              }}
              className="bg-surface border-border text-text-main font-mono uppercase"
            />
            {errors.target && <p className="text-xs text-red-500 font-mono mt-1">{errors.target}</p>}
          </div>

          <div>
            <label htmlFor="deal-name" className="block text-sm font-mono text-text-muted mb-2">
              Deal Name (optional)
            </label>
            <Input
              id="deal-name"
              placeholder="Microsoft / Activision Blizzard"
              value={dealName}
              onChange={(e) => setDealName(e.target.value)}
              className="bg-surface border-border text-text-main font-mono"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-surface hover:bg-surfaceHighlight text-text-main rounded-md font-mono text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-background rounded-md font-mono text-sm transition-colors"
            >
              Add Deal
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
