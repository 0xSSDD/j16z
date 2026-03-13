'use client';

import type { JSONContent } from '@tiptap/react';
import { AlertTriangle, CheckCircle, Clock, Eye, GitCompare, History, Plus, RotateCcw, X } from 'lucide-react';
import * as React from 'react';
import { createMemoSnapshot, getMemoSnapshot, getMemoSnapshots, restoreMemoSnapshot } from '@/lib/api';
import { formatDate } from '@/lib/date-utils';
import type { MemoSnapshot } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MemoSnapshotPanelProps {
  memoId: string;
  currentContent: JSONContent;
  onRestore: (content: JSONContent, version: number) => void;
  onClose: () => void;
}

type PanelView = 'list' | 'preview' | 'compare';

// ---------------------------------------------------------------------------
// Recursive text extractor (for diff preview)
// ---------------------------------------------------------------------------

function extractTextLines(node: JSONContent): string[] {
  const lines: string[] = [];

  if (node.type === 'text' && node.text) {
    lines.push(node.text);
    return lines;
  }

  if (node.content) {
    for (const child of node.content) {
      const childLines = extractTextLines(child);
      lines.push(...childLines);
    }
  }

  // Add separator after block-level nodes
  if (['paragraph', 'heading', 'listItem', 'blockquote', 'tableRow'].includes(node.type ?? '')) {
    lines.push('');
  }

  return lines;
}

function flattenContent(content: JSONContent): string {
  const lines = extractTextLines(content);
  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------------------------------------------------------------------------
// Diff helper — line-level diff for side-by-side compare
// ---------------------------------------------------------------------------

type DiffLine = { text: string; status: 'same' | 'added' | 'removed' | 'modified' };

function computeDiff(leftText: string, rightText: string): { left: DiffLine[]; right: DiffLine[] } {
  const leftLines = leftText.split('\n');
  const rightLines = rightText.split('\n');
  const maxLen = Math.max(leftLines.length, rightLines.length);

  const left: DiffLine[] = [];
  const right: DiffLine[] = [];

  for (let i = 0; i < maxLen; i++) {
    const l = leftLines[i] ?? '';
    const r = rightLines[i] ?? '';

    if (l === r) {
      left.push({ text: l, status: 'same' });
      right.push({ text: r, status: 'same' });
    } else if (!l) {
      left.push({ text: '', status: 'removed' });
      right.push({ text: r, status: 'added' });
    } else if (!r) {
      left.push({ text: l, status: 'removed' });
      right.push({ text: '', status: 'added' });
    } else {
      left.push({ text: l, status: 'modified' });
      right.push({ text: r, status: 'modified' });
    }
  }

  return { left, right };
}

function diffLineClass(status: DiffLine['status']): string {
  switch (status) {
    case 'added':
      return 'border-l-2 border-green-500 bg-green-500/10 text-green-400';
    case 'removed':
      return 'border-l-2 border-red-500 bg-red-500/10 text-red-400 line-through opacity-60';
    case 'modified':
      return 'border-l-2 border-amber-400 bg-amber-500/10 text-amber-300';
    default:
      return 'text-text-muted';
  }
}

// ---------------------------------------------------------------------------
// Read-only content renderer (simple text representation)
// ---------------------------------------------------------------------------

function ContentPreview({ content }: { content: JSONContent }) {
  const text = flattenContent(content);
  return (
    <pre className="whitespace-pre-wrap font-mono text-xs text-text-muted leading-relaxed p-3 bg-background rounded border border-border overflow-auto max-h-60">
      {text || '(empty)'}
    </pre>
  );
}

// ---------------------------------------------------------------------------
// MemoSnapshotPanel
// ---------------------------------------------------------------------------

export function MemoSnapshotPanel({ memoId, currentContent, onRestore, onClose }: MemoSnapshotPanelProps) {
  const [snapshots, setSnapshots] = React.useState<MemoSnapshot[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saveName, setSaveName] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  const [panelView, setPanelView] = React.useState<PanelView>('list');
  const [selectedSnapshot, setSelectedSnapshot] = React.useState<MemoSnapshot | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = React.useState(false);

  const [confirmRestore, setConfirmRestore] = React.useState<MemoSnapshot | null>(null);
  const [restoring, setRestoring] = React.useState(false);

  // Load snapshots on mount
  React.useEffect(() => {
    setLoading(true);
    getMemoSnapshots(memoId)
      .then((list) =>
        setSnapshots(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())),
      )
      .catch(() => setSnapshots([]))
      .finally(() => setLoading(false));
  }, [memoId]);

  // -------------------------------------------------------------------------
  // Save snapshot
  // -------------------------------------------------------------------------
  const handleSave = async () => {
    if (!saveName.trim()) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const created = await createMemoSnapshot(memoId, saveName.trim());
      setSnapshots((prev) => [created, ...prev]);
      setSaveName('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // View snapshot
  // -------------------------------------------------------------------------
  const handleViewSnapshot = async (snapshot: MemoSnapshot) => {
    if (snapshot.content && Object.keys(snapshot.content).length > 0) {
      setSelectedSnapshot(snapshot);
      setPanelView('preview');
      return;
    }
    setLoadingSnapshot(true);
    try {
      const full = await getMemoSnapshot(memoId, snapshot.id);
      setSelectedSnapshot(full);
      setPanelView('preview');
    } catch (err) {
      console.error('Failed to load snapshot:', err);
    } finally {
      setLoadingSnapshot(false);
    }
  };

  // -------------------------------------------------------------------------
  // Compare snapshot
  // -------------------------------------------------------------------------
  const handleCompareSnapshot = async (snapshot: MemoSnapshot) => {
    if (snapshot.content && Object.keys(snapshot.content).length > 0) {
      setSelectedSnapshot(snapshot);
      setPanelView('compare');
      return;
    }
    setLoadingSnapshot(true);
    try {
      const full = await getMemoSnapshot(memoId, snapshot.id);
      setSelectedSnapshot(full);
      setPanelView('compare');
    } catch (err) {
      console.error('Failed to load snapshot for compare:', err);
    } finally {
      setLoadingSnapshot(false);
    }
  };

  // -------------------------------------------------------------------------
  // Restore snapshot
  // -------------------------------------------------------------------------
  const handleConfirmRestore = async () => {
    if (!confirmRestore) return;
    setRestoring(true);
    try {
      const restored = await restoreMemoSnapshot(memoId, confirmRestore.id);
      onRestore(restored.content as JSONContent, restored.version);
      setConfirmRestore(null);
    } catch (err) {
      console.error('Failed to restore snapshot:', err);
    } finally {
      setRestoring(false);
    }
  };

  // -------------------------------------------------------------------------
  // Compare view
  // -------------------------------------------------------------------------
  if (panelView === 'compare' && selectedSnapshot) {
    const snapshotText = flattenContent(selectedSnapshot.content as JSONContent);
    const currentText = flattenContent(currentContent);
    const { left, right } = computeDiff(snapshotText, currentText);

    return (
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPanelView('list')}
            className="text-xs font-mono text-text-muted hover:text-text-main transition-colors"
          >
            ← Back
          </button>
          <span className="text-xs font-mono text-text-muted">Compare: {selectedSnapshot.name}</span>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text-main">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Side-by-side diff */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs font-mono text-text-dim mb-1 uppercase tracking-wider">
              Snapshot (v{selectedSnapshot.version})
            </div>
            <div className="border border-border rounded overflow-auto max-h-80 text-xs font-mono">
              {left.map((line, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static diff lines
                <div key={i} className={`px-2 py-0.5 leading-relaxed ${diffLineClass(line.status)}`}>
                  {line.text || '\u00a0'}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-mono text-text-dim mb-1 uppercase tracking-wider">Current</div>
            <div className="border border-border rounded overflow-auto max-h-80 text-xs font-mono">
              {right.map((line, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static diff lines
                <div key={i} className={`px-2 py-0.5 leading-relaxed ${diffLineClass(line.status)}`}>
                  {line.text || '\u00a0'}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-mono text-text-dim">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm bg-green-500" />
            Added
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm bg-red-500" />
            Removed
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm bg-amber-400" />
            Modified
          </span>
        </div>

        {/* Restore from this snapshot */}
        <button
          type="button"
          onClick={() => setConfirmRestore(selectedSnapshot)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-md font-mono text-xs transition-colors border border-amber-500/20 self-start"
        >
          <RotateCcw className="h-3 w-3" />
          Restore this snapshot
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Preview view
  // -------------------------------------------------------------------------
  if (panelView === 'preview' && selectedSnapshot) {
    return (
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPanelView('list')}
            className="text-xs font-mono text-text-muted hover:text-text-main transition-colors"
          >
            ← Back
          </button>
          <span className="text-xs font-mono text-text-muted">{selectedSnapshot.name}</span>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text-main">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="text-xs font-mono text-text-dim">
          Saved {formatDate(selectedSnapshot.createdAt)} · v{selectedSnapshot.version}
        </div>

        <ContentPreview content={selectedSnapshot.content as JSONContent} />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setConfirmRestore(selectedSnapshot)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-md font-mono text-xs transition-colors border border-amber-500/20"
          >
            <RotateCcw className="h-3 w-3" />
            Restore
          </button>
          <button
            type="button"
            onClick={() => setPanelView('compare')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-text-muted hover:text-text-main rounded-md font-mono text-xs transition-colors border border-border hover:border-border"
          >
            <GitCompare className="h-3 w-3" />
            Compare with current
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // List view (default)
  // -------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-text-muted" />
          <span className="text-sm font-mono font-medium text-text-main">Version History</span>
        </div>
        <button type="button" onClick={onClose} className="text-text-muted hover:text-text-main">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Save snapshot */}
      <div className="flex flex-col gap-2 p-3 bg-surface rounded-md border border-border">
        <div className="text-xs font-mono text-text-muted uppercase tracking-wider">Save current version</div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Snapshot name (e.g., Pre-review draft)"
            className="flex-1 bg-transparent text-xs font-mono text-text-main placeholder:text-text-dim outline-none border-b border-border focus:border-amber-500/50 pb-0.5 transition-colors"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !saveName.trim()}
            className="flex items-center gap-1 px-2 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded font-mono text-xs font-medium transition-colors"
          >
            <Plus className="h-3 w-3" />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        {saveError && (
          <div className="flex items-center gap-1 text-xs font-mono text-red-400">
            <AlertTriangle className="h-3 w-3" />
            {saveError}
          </div>
        )}
        {saveSuccess && (
          <div className="flex items-center gap-1 text-xs font-mono text-green-400">
            <CheckCircle className="h-3 w-3" />
            Snapshot saved
          </div>
        )}
      </div>

      {/* Snapshot list */}
      {loading ? (
        <div className="py-4 text-center text-xs font-mono text-text-muted">Loading snapshots…</div>
      ) : snapshots.length === 0 ? (
        <div className="py-4 text-center">
          <Clock className="h-6 w-6 text-text-dim mx-auto mb-2" />
          <p className="text-xs font-mono text-text-dim">No saved snapshots yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {snapshots.map((snapshot) => (
            <div
              key={snapshot.id}
              className="p-2.5 bg-surface rounded-md border border-border group hover:border-amber-500/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-mono font-medium text-text-main truncate">{snapshot.name}</div>
                  <div className="text-xs font-mono text-text-dim mt-0.5">
                    {formatDate(snapshot.createdAt)} · v{snapshot.version}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleViewSnapshot(snapshot)}
                    disabled={loadingSnapshot}
                    title="View snapshot"
                    className="p-1 text-text-dim hover:text-text-main rounded transition-colors"
                  >
                    <Eye className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCompareSnapshot(snapshot)}
                    disabled={loadingSnapshot}
                    title="Compare with current"
                    className="p-1 text-text-dim hover:text-amber-400 rounded transition-colors"
                  >
                    <GitCompare className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRestore(snapshot)}
                    title="Restore this snapshot"
                    className="p-1 text-text-dim hover:text-amber-400 rounded transition-colors"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Restore confirm dialog */}
      {confirmRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-lg p-5 max-w-sm w-full mx-4 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-mono font-semibold text-text-main">Restore snapshot?</span>
            </div>
            <p className="text-xs font-mono text-text-muted mb-4 leading-relaxed">
              This will replace the current memo content with "{confirmRestore.name}" (v{confirmRestore.version}).
              Current unsaved changes will be lost.
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => setConfirmRestore(null)}
                className="px-3 py-1.5 text-xs font-mono text-text-muted hover:text-text-main border border-border rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={restoring}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black rounded-md font-mono text-xs font-medium transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                {restoring ? 'Restoring…' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
