'use client';

import type { JSONContent } from '@tiptap/react';
import { FileText, Lock, Plus, Users } from 'lucide-react';
import * as React from 'react';
import { createMemo, getClauses, getDeal, getEvents, getMemos, updateMemo } from '@/lib/api';
import { formatDate } from '@/lib/date-utils';
import type { Memo } from '@/lib/types';
import { MemoEditor } from './memo-editor';
import { generateMemoContent } from './memo-scaffold';

// ---------------------------------------------------------------------------
// MemoList
// ---------------------------------------------------------------------------

interface MemoListProps {
  dealId: string;
}

type View = 'list' | 'editor';

export function MemoList({ dealId }: MemoListProps) {
  const [memos, setMemos] = React.useState<Memo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [view, setView] = React.useState<View>('list');
  const [activeMemo, setActiveMemo] = React.useState<Memo | null>(null);
  const [activeVersion, setActiveVersion] = React.useState(1);
  const [togglingVisibility, setTogglingVisibility] = React.useState(false);

  // Create flow states
  const [isCreating, setIsCreating] = React.useState(false);
  const [newMemoTitle, setNewMemoTitle] = React.useState('');
  const [showTitleInput, setShowTitleInput] = React.useState(false);

  // Load memos on mount
  React.useEffect(() => {
    if (!dealId) return;
    setLoading(true);
    getMemos(dealId)
      .then(setMemos)
      .catch(() => setMemos([]))
      .finally(() => setLoading(false));
  }, [dealId]);

  // -------------------------------------------------------------------------
  // Create a new memo
  // -------------------------------------------------------------------------
  const handleCreateMemo = async () => {
    if (!newMemoTitle.trim()) return;

    setIsCreating(true);
    try {
      // Fetch live deal data for scaffold
      const [deal, clauses, events] = await Promise.all([getDeal(dealId), getClauses(dealId), getEvents(dealId)]);

      if (!deal) {
        throw new Error('Deal not found');
      }

      const scaffoldContent = generateMemoContent(deal, clauses, events);

      const created = await createMemo({
        dealId,
        title: newMemoTitle.trim(),
        content: scaffoldContent as Record<string, unknown>,
        visibility: 'private',
      });

      setMemos((prev) => [...prev, created]);
      setActiveMemo(created);
      setActiveVersion(created.version);
      setShowTitleInput(false);
      setNewMemoTitle('');
      setView('editor');
    } catch (err) {
      console.error('Failed to create memo:', err);
    } finally {
      setIsCreating(false);
    }
  };

  // -------------------------------------------------------------------------
  // Open an existing memo
  // -------------------------------------------------------------------------
  const handleOpenMemo = (memo: Memo) => {
    setActiveMemo(memo);
    setActiveVersion(memo.version);
    setView('editor');
  };

  // -------------------------------------------------------------------------
  // Version sync after auto-save
  // -------------------------------------------------------------------------
  const handleVersionChange = (v: number) => {
    setActiveVersion(v);
    if (activeMemo) {
      setActiveMemo((prev) => (prev ? { ...prev, version: v, updatedAt: new Date().toISOString() } : prev));
      setMemos((prev) =>
        prev.map((m) => (m.id === activeMemo.id ? { ...m, version: v, updatedAt: new Date().toISOString() } : m)),
      );
    }
  };

  // -------------------------------------------------------------------------
  // Visibility toggle
  // -------------------------------------------------------------------------
  const handleToggleVisibility = async () => {
    if (!activeMemo) return;
    setTogglingVisibility(true);
    const newVisibility = activeMemo.visibility === 'private' ? 'firm' : 'private';
    try {
      await updateMemo(activeMemo.id, { visibility: newVisibility, version: activeVersion });
      const updated = { ...activeMemo, visibility: newVisibility as 'private' | 'firm' };
      setActiveMemo(updated);
      setMemos((prev) => prev.map((m) => (m.id === activeMemo.id ? updated : m)));
    } catch (err) {
      console.error('Failed to update visibility:', err);
    } finally {
      setTogglingVisibility(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render: Editor view
  // -------------------------------------------------------------------------
  if (view === 'editor' && activeMemo) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setView('list')}
            className="text-sm text-text-muted hover:text-text-main font-mono flex items-center gap-1 transition-colors"
          >
            ← Back to memos
          </button>
          <div className="flex items-center gap-2">
            {/* Visibility toggle */}
            <button
              type="button"
              onClick={handleToggleVisibility}
              disabled={togglingVisibility}
              title={
                activeMemo.visibility === 'private'
                  ? 'Private — click to make visible to firm'
                  : 'Visible to firm — click to make private'
              }
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary-500/40 hover:text-primary-400"
              style={{
                borderColor: activeMemo.visibility === 'firm' ? 'rgb(245 158 11 / 0.3)' : undefined,
                color: activeMemo.visibility === 'firm' ? 'rgb(251 191 36)' : undefined,
              }}
            >
              {activeMemo.visibility === 'firm' ? (
                <>
                  <Users className="h-3 w-3" />
                  Firm
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3" />
                  Private
                </>
              )}
            </button>
            <span className="text-xs text-text-dim font-mono">v{activeVersion}</span>
          </div>
        </div>
        <h3 className="text-base font-mono font-semibold text-text-main">{activeMemo.title}</h3>
        <MemoEditor
          initialContent={activeMemo.content as JSONContent}
          memoId={activeMemo.id}
          dealId={dealId}
          version={activeVersion}
          onVersionChange={handleVersionChange}
        />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: List view
  // -------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-mono font-medium text-text-muted uppercase tracking-wider">Deal Memos</h3>
        {!showTitleInput && (
          <button
            type="button"
            onClick={() => setShowTitleInput(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 rounded-md font-mono text-xs transition-colors border border-primary-500/20"
          >
            <Plus className="h-3 w-3" />
            New Memo
          </button>
        )}
      </div>

      {/* Create new memo title input */}
      {showTitleInput && (
        <div className="flex items-center gap-2 p-3 bg-surface rounded-md border border-border">
          <FileText className="h-4 w-4 text-text-muted shrink-0" />
          <input
            type="text"
            value={newMemoTitle}
            onChange={(e) => setNewMemoTitle(e.target.value)}
            placeholder="Memo title (e.g., Initial Spread Analysis)"
            className="flex-1 bg-transparent text-sm font-mono text-text-main placeholder:text-text-dim outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateMemo();
              if (e.key === 'Escape') {
                setShowTitleInput(false);
                setNewMemoTitle('');
              }
            }}
          />
          <button
            type="button"
            onClick={handleCreateMemo}
            disabled={isCreating || !newMemoTitle.trim()}
            className="px-3 py-1 bg-primary-500 hover:bg-primary-400 disabled:opacity-50 disabled:cursor-not-allowed text-background rounded font-mono text-xs font-medium transition-colors"
          >
            {isCreating ? 'Creating...' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowTitleInput(false);
              setNewMemoTitle('');
            }}
            className="text-text-muted hover:text-text-main font-mono text-xs"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Memo list */}
      {loading ? (
        <div className="py-8 text-center text-sm text-text-muted font-mono">Loading memos...</div>
      ) : memos.length === 0 ? (
        <div className="py-8 text-center">
          <FileText className="h-8 w-8 text-text-dim mx-auto mb-2" />
          <p className="text-sm text-text-muted font-mono mb-1">No memos yet</p>
          <p className="text-xs text-text-dim font-mono">
            Create a new memo to get a pre-filled deal analysis template.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {memos.map((memo) => (
            <button
              key={memo.id}
              type="button"
              onClick={() => handleOpenMemo(memo)}
              className="w-full text-left p-3 bg-surface hover:bg-surfaceHighlight rounded-md border border-border transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-text-muted shrink-0" />
                  <span className="text-sm font-mono font-medium text-text-main group-hover:text-primary-500 transition-colors truncate">
                    {memo.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {memo.visibility === 'firm' ? (
                    <span className="flex items-center gap-1 text-xs text-text-muted font-mono">
                      <Users className="h-3 w-3" />
                      Firm
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-text-dim font-mono">
                      <Lock className="h-3 w-3" />
                      Private
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-1 flex items-center gap-3 ml-6">
                <span className="text-xs text-text-dim font-mono">Updated {formatDate(memo.updatedAt)}</span>
                <span className="text-xs text-text-dim font-mono">v{memo.version}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
