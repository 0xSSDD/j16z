'use client';

import { Placeholder } from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import { Underline } from '@tiptap/extension-underline';
import { EditorContent, type JSONContent, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Download, FileText, History } from 'lucide-react';
import * as React from 'react';
import { updateMemo } from '@/lib/api';
import { SectionRefreshBar } from './memo-section-refresh';
import { MemoSnapshotPanel } from './memo-snapshot-panel';
import { MemoToolbar } from './memo-toolbar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MemoEditorProps {
  initialContent: JSONContent;
  memoId: string;
  dealId: string;
  version: number;
  onVersionChange: (v: number) => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';

// ---------------------------------------------------------------------------
// MemoEditor
// ---------------------------------------------------------------------------

export function MemoEditor({ initialContent, memoId, dealId, version, onVersionChange }: MemoEditorProps) {
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>('idle');
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [showSnapshotPanel, setShowSnapshotPanel] = React.useState(false);
  const [exportLoading, setExportLoading] = React.useState<'docx' | 'pdf' | null>(null);
  const versionRef = React.useRef(version);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep versionRef in sync with prop changes (e.g., after snapshot restore)
  React.useEffect(() => {
    versionRef.current = version;
  }, [version]);

  const handleAutoSave = React.useCallback(
    async (content: JSONContent) => {
      setSaveStatus('saving');
      setSaveError(null);

      const nextVersion = versionRef.current + 1;

      try {
        await updateMemo(memoId, { content: content as Record<string, unknown>, version: nextVersion });
        versionRef.current = nextVersion;
        onVersionChange(nextVersion);
        setSaveStatus('saved');
      } catch (err) {
        if (err instanceof Error && err.message.includes('409')) {
          setSaveStatus('conflict');
          setSaveError('Version conflict — reload memo before saving');
        } else {
          setSaveStatus('error');
          setSaveError('Save failed — check connection');
        }
      }
    },
    [memoId, onVersionChange],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Underline,
      Placeholder.configure({
        placeholder: 'Begin writing your analysis...',
      }),
    ],
    content: initialContent,
    immediatelyRender: false, // Next.js SSR compat
    onUpdate: ({ editor: e }) => {
      // Clear existing debounce timer
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      setSaveStatus('idle');

      // 3-second debounce auto-save
      debounceRef.current = setTimeout(() => {
        const json = e.getJSON();
        handleAutoSave(json);
      }, 3000);
    },
  });

  // Cleanup debounce on unmount
  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // -------------------------------------------------------------------------
  // Export handlers
  // -------------------------------------------------------------------------
  const handleExportDocx = React.useCallback(async () => {
    if (!editor) return;
    setExportLoading('docx');
    try {
      const { exportMemoDocx } = await import('./memo-export');
      await exportMemoDocx(editor.getJSON(), 'deal-memo');
    } catch (err) {
      console.error('Export DOCX failed:', err);
    } finally {
      setExportLoading(null);
    }
  }, [editor]);

  const handleExportPdf = React.useCallback(async () => {
    if (!editor) return;
    setExportLoading('pdf');
    try {
      const { exportMemoPdf } = await import('./memo-export');
      await exportMemoPdf(editor.getJSON(), 'deal-memo');
    } catch (err) {
      console.error('Export PDF failed:', err);
    } finally {
      setExportLoading(null);
    }
  }, [editor]);

  // -------------------------------------------------------------------------
  // Snapshot restore handler
  // -------------------------------------------------------------------------
  const handleSnapshotRestore = React.useCallback(
    (content: JSONContent, newVersion: number) => {
      if (!editor) return;
      editor.commands.setContent(content);
      versionRef.current = newVersion;
      onVersionChange(newVersion);
      setShowSnapshotPanel(false);
    },
    [editor, onVersionChange],
  );

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-40 text-text-muted font-mono text-sm">Loading editor...</div>
    );
  }

  return (
    <div className="border border-border rounded-md overflow-hidden flex flex-col">
      {/* Toolbar */}
      <MemoToolbar editor={editor} />

      {/* Secondary toolbar: section refresh + actions */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-background border-b border-border gap-2 flex-wrap">
        <SectionRefreshBar editor={editor} dealId={dealId} />

        <div className="flex items-center gap-1">
          {/* Version History button */}
          <button
            type="button"
            onClick={() => setShowSnapshotPanel((v) => !v)}
            title="Version history"
            className={`flex items-center gap-1 px-2 py-1 rounded font-mono text-xs transition-colors ${
              showSnapshotPanel
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'text-text-muted hover:text-text-main hover:bg-surface border border-transparent'
            }`}
          >
            <History className="h-3 w-3" />
            History
          </button>

          {/* Export dropdown */}
          <div className="relative group">
            <button
              type="button"
              disabled={exportLoading !== null}
              title="Export memo"
              className="flex items-center gap-1 px-2 py-1 text-text-muted hover:text-text-main hover:bg-surface border border-transparent rounded font-mono text-xs transition-colors disabled:opacity-50"
            >
              {exportLoading ? <FileText className="h-3 w-3 animate-pulse" /> : <Download className="h-3 w-3" />}
              {exportLoading ? 'Exporting…' : 'Export'}
            </button>
            {/* Dropdown */}
            <div className="absolute right-0 top-full mt-1 w-44 bg-surface border border-border rounded-md shadow-lg z-20 hidden group-hover:block group-focus-within:block">
              <button
                type="button"
                onClick={handleExportDocx}
                disabled={exportLoading !== null}
                className="w-full text-left px-3 py-2 text-xs font-mono text-text-main hover:bg-surfaceHighlight transition-colors disabled:opacity-50"
              >
                Export as Word (.docx)
              </button>
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={exportLoading !== null}
                className="w-full text-left px-3 py-2 text-xs font-mono text-text-main hover:bg-surfaceHighlight transition-colors disabled:opacity-50"
              >
                Export as PDF (.pdf)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Save status indicator */}
      <div className="flex justify-end px-4 py-1 bg-background border-b border-border min-h-[28px]">
        {saveStatus === 'saving' && <span className="text-xs text-text-muted font-mono">Saving...</span>}
        {saveStatus === 'saved' && <span className="text-xs text-primary-500 font-mono">Saved</span>}
        {saveStatus === 'error' && <span className="text-xs text-red-500 font-mono">{saveError ?? 'Save failed'}</span>}
        {saveStatus === 'conflict' && (
          <span className="text-xs text-primary-400 font-mono">{saveError ?? 'Version conflict — reload'}</span>
        )}
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor content */}
        <div className="flex-1 overflow-auto p-4 bg-background min-h-[400px]">
          <EditorContent editor={editor} className="memo-editor-content" />
        </div>

        {/* Snapshot panel (inline sidebar) */}
        {showSnapshotPanel && (
          <div className="w-72 border-l border-border overflow-auto p-4 bg-surface flex-shrink-0">
            <MemoSnapshotPanel
              memoId={memoId}
              currentContent={editor.getJSON()}
              onRestore={handleSnapshotRestore}
              onClose={() => setShowSnapshotPanel(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
