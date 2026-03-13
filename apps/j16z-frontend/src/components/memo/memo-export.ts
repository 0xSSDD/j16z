'use client';

/**
 * memo-export.ts
 *
 * Export memo tiptap JSON content to .docx and .pdf formats.
 * Uses:
 *   - docx (9.5.1) — Word export
 *   - @react-pdf/renderer — PDF export
 */

import type { JSONContent } from '@tiptap/react';
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';

// ---------------------------------------------------------------------------
// Shared download trigger
// ---------------------------------------------------------------------------

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// DOCX export
// ---------------------------------------------------------------------------

/** Extract text runs from a node's content, applying marks for formatting. */
function extractTextRuns(node: JSONContent): TextRun[] {
  if (node.type === 'text') {
    const marks = node.marks ?? [];
    const bold = marks.some((m) => m.type === 'bold');
    const italic = marks.some((m) => m.type === 'italic');
    const underline = marks.some((m) => m.type === 'underline');
    return [
      new TextRun({
        text: node.text ?? '',
        bold,
        italics: italic,
        underline: underline ? {} : undefined,
      }),
    ];
  }

  if (node.content) {
    return node.content.flatMap(extractTextRuns);
  }

  return [];
}

/** Convert a tiptap node to zero or more docx paragraphs/tables. */
function nodeToDocxBlocks(node: JSONContent): (Paragraph | Table)[] {
  const type = node.type ?? '';

  switch (type) {
    case 'heading': {
      const level = (node.attrs?.level as number) ?? 1;
      const headingLevelMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
        1: HeadingLevel.HEADING_1,
        2: HeadingLevel.HEADING_2,
        3: HeadingLevel.HEADING_3,
      };
      return [
        new Paragraph({
          heading: headingLevelMap[level] ?? HeadingLevel.HEADING_2,
          children: extractTextRuns(node),
          spacing: { before: 200, after: 100 },
        }),
      ];
    }

    case 'paragraph': {
      const children = extractTextRuns(node);
      return [
        new Paragraph({
          children: children.length > 0 ? children : [new TextRun('')],
          spacing: { after: 100 },
        }),
      ];
    }

    case 'bulletList':
    case 'orderedList': {
      const isOrdered = type === 'orderedList';
      const items = node.content ?? [];
      return items.flatMap((item, idx) => {
        const runs = extractTextRuns(item);
        return [
          new Paragraph({
            children: runs,
            bullet: isOrdered ? undefined : { level: 0 },
            numbering: isOrdered ? { reference: 'default-numbering', level: 0, instance: idx } : undefined,
            spacing: { after: 60 },
          }),
        ];
      });
    }

    case 'listItem': {
      // Handled by parent list type; here just flatten children
      return (node.content ?? []).flatMap(nodeToDocxBlocks);
    }

    case 'blockquote': {
      const lines = (node.content ?? []).flatMap(nodeToDocxBlocks);
      return lines.map((block) =>
        block instanceof Paragraph
          ? new Paragraph({
              children: [new TextRun({ text: '  ', italics: true }), ...extractTextRuns(node)],
              indent: { left: 720 },
              spacing: { after: 100 },
            })
          : block,
      );
    }

    case 'table': {
      const tableRows = (node.content ?? []).map((row) => {
        const cells = (row.content ?? []).map((cell) => {
          const cellParagraphs = (cell.content ?? []).flatMap(nodeToDocxBlocks);
          return new TableCell({
            children: cellParagraphs.filter((b): b is Paragraph => b instanceof Paragraph),
            width: { size: 4000, type: WidthType.DXA },
          });
        });
        return new TableRow({ children: cells });
      });

      return [
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      ];
    }

    case 'horizontalRule': {
      return [
        new Paragraph({
          children: [],
          border: { bottom: { color: '999999', size: 6, style: 'single' } },
          spacing: { before: 200, after: 200 },
        }),
      ];
    }

    case 'doc': {
      return (node.content ?? []).flatMap(nodeToDocxBlocks);
    }

    default: {
      // Fallback: treat as paragraph
      if (node.content) {
        return node.content.flatMap(nodeToDocxBlocks);
      }
      return [];
    }
  }
}

/**
 * Export tiptap JSONContent to a .docx Word document and download it.
 */
export async function exportMemoDocx(content: JSONContent, filename: string): Promise<void> {
  const blocks = nodeToDocxBlocks(content);

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: blocks.filter((b): b is Paragraph | Table => b instanceof Paragraph || b instanceof Table),
      },
    ],
    styles: {
      paragraphStyles: [
        {
          id: 'Normal',
          name: 'Normal',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { font: 'Calibri', size: 22 },
        },
      ],
    },
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${filename}.docx`);
}

// ---------------------------------------------------------------------------
// PDF export
// ---------------------------------------------------------------------------

/** Flatten nested content into a plain string for PDF rendering. */
function flattenText(node: JSONContent): string {
  if (node.type === 'text') return node.text ?? '';
  return (node.content ?? []).map(flattenText).join('');
}

/** Recursively convert tiptap node tree into @react-pdf element descriptors. */
type PdfElement = {
  type: 'text' | 'view' | 'separator';
  text?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  color?: string;
  marginBottom?: number;
  marginLeft?: number;
  borderLeft?: boolean;
  children?: PdfElement[];
  isBullet?: boolean;
};

function nodeToElements(node: JSONContent): PdfElement[] {
  const type = node.type ?? '';

  switch (type) {
    case 'heading': {
      const level = (node.attrs?.level as number) ?? 1;
      const fontSize = level === 1 ? 18 : level === 2 ? 14 : 12;
      const color = level === 2 ? '#f59e0b' : '#f1f5f9'; // amber for H2
      return [
        {
          type: 'text',
          text: flattenText(node),
          fontSize,
          bold: true,
          color,
          marginBottom: 6,
        },
      ];
    }

    case 'paragraph': {
      const text = flattenText(node);
      if (!text) return [{ type: 'text', text: '', marginBottom: 4 }];
      return [{ type: 'text', text, fontSize: 10, color: '#cbd5e1', marginBottom: 4 }];
    }

    case 'bulletList': {
      return (node.content ?? []).flatMap((item) => {
        const lines = (item.content ?? []).flatMap(nodeToElements);
        return lines.map((el) => ({ ...el, isBullet: true, marginLeft: 12 }));
      });
    }

    case 'orderedList': {
      return (node.content ?? []).flatMap((item, idx) => {
        const lines = (item.content ?? []).flatMap(nodeToElements);
        return lines.map((el, i) => ({
          ...el,
          text: i === 0 ? `${idx + 1}. ${el.text ?? ''}` : el.text,
          marginLeft: 12,
        }));
      });
    }

    case 'listItem': {
      return (node.content ?? []).flatMap(nodeToElements);
    }

    case 'blockquote': {
      return (node.content ?? []).flatMap(nodeToElements).map((el) => ({
        ...el,
        borderLeft: true,
        marginLeft: 16,
        italic: true,
        color: '#94a3b8',
      }));
    }

    case 'table': {
      // Flatten table to simple text lines for PDF
      const rows = (node.content ?? []).map((row) => {
        const cells = (row.content ?? []).map((cell) => flattenText(cell));
        return cells.join(' | ');
      });
      return rows.map((text, i) => ({
        type: 'text' as const,
        text,
        fontSize: 9,
        color: i === 0 ? '#f59e0b' : '#cbd5e1',
        bold: i === 0,
        marginBottom: 2,
        marginLeft: 0,
      }));
    }

    case 'horizontalRule': {
      return [{ type: 'separator' }];
    }

    case 'doc': {
      return (node.content ?? []).flatMap(nodeToElements);
    }

    default: {
      if (node.content) {
        return node.content.flatMap(nodeToElements);
      }
      return [];
    }
  }
}

/**
 * Export tiptap JSONContent to a styled PDF document and download it.
 * Uses @react-pdf/renderer with j16z brand colors.
 */
export async function exportMemoPdf(content: JSONContent, filename: string): Promise<void> {
  // Dynamically import @react-pdf/renderer to avoid SSR issues
  const { Document: PdfDocument, Page, Text, View, StyleSheet, pdf } = await import('@react-pdf/renderer');
  const { createElement } = await import('react');

  const styles = StyleSheet.create({
    page: {
      backgroundColor: '#0f172a',
      padding: 40,
      fontFamily: 'Helvetica',
    },
    separator: {
      borderBottomWidth: 1,
      borderBottomColor: '#334155',
      marginVertical: 8,
    },
    bulletMarker: {
      width: 12,
      fontSize: 10,
      color: '#f59e0b',
    },
    bulletRow: {
      flexDirection: 'row',
      marginBottom: 3,
    },
    footer: {
      position: 'absolute',
      bottom: 24,
      left: 40,
      right: 40,
      fontSize: 8,
      color: '#475569',
      textAlign: 'center',
    },
  });

  const elements = nodeToElements(content);

  // Build React element tree
  const pageChildren = elements.map((el, idx) => {
    if (el.type === 'separator') {
      return createElement(View, { key: idx, style: styles.separator });
    }

    const textStyle = {
      fontSize: el.fontSize ?? 10,
      color: el.color ?? '#cbd5e1',
      fontFamily: el.bold ? 'Helvetica-Bold' : el.italic ? 'Helvetica-Oblique' : 'Helvetica',
      marginBottom: el.marginBottom ?? 3,
      marginLeft: el.marginLeft ?? 0,
      borderLeftWidth: el.borderLeft ? 2 : 0,
      borderLeftColor: '#f59e0b',
      paddingLeft: el.borderLeft ? 6 : 0,
    };

    if (el.isBullet) {
      return createElement(
        View,
        { key: idx, style: styles.bulletRow },
        createElement(Text, { style: styles.bulletMarker }, '•'),
        createElement(Text, { style: { ...textStyle, marginLeft: 0 } }, el.text ?? ''),
      );
    }

    return createElement(Text, { key: idx, style: textStyle }, el.text ?? '');
  });

  const footer = createElement(Text, {
    style: styles.footer,
    render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
      `j16z — Page ${pageNumber} of ${totalPages}`,
  });

  const page = createElement(Page, { style: styles.page }, ...pageChildren, footer);
  const doc = createElement(PdfDocument, {}, page);

  const blob = await pdf(doc).toBlob();
  downloadBlob(blob, `${filename}.pdf`);
}
