'use client';

import { Placeholder } from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import { Underline } from '@tiptap/extension-underline';
import { EditorContent, type JSONContent, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import * as React from 'react';
import { updateMemo } from '@/lib/api';
import { MemoToolbar } from './memo-toolbar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MemoEditorProps {
  initialContent: JSONContent;
  memoId: string;
  version: number;
  onVersionChange: (v: number) => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';

// ---------------------------------------------------------------------------
// MemoEditor
// ---------------------------------------------------------------------------

export function MemoEditor({ initialContent, memoId, version, onVersionChange }: MemoEditorProps) {
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>('idle');
  const [saveError, setSaveError] = React.useState<string | null>(null);
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

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-40 text-text-muted font-mono text-sm">Loading editor...</div>
    );
  }

  return (
    <div className="border border-border rounded-md overflow-hidden flex flex-col">
      {/* Toolbar */}
      <MemoToolbar editor={editor} />

      {/* Save status indicator */}
      <div className="flex justify-end px-4 py-1 bg-background border-b border-border min-h-[28px]">
        {saveStatus === 'saving' && <span className="text-xs text-text-muted font-mono">Saving...</span>}
        {saveStatus === 'saved' && <span className="text-xs text-green-500 font-mono">Saved</span>}
        {saveStatus === 'error' && <span className="text-xs text-red-500 font-mono">{saveError ?? 'Save failed'}</span>}
        {saveStatus === 'conflict' && (
          <span className="text-xs text-amber-400 font-mono">{saveError ?? 'Version conflict — reload'}</span>
        )}
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-auto p-4 bg-background min-h-[400px]">
        <EditorContent editor={editor} className="memo-editor-content" />
      </div>
    </div>
  );
}
