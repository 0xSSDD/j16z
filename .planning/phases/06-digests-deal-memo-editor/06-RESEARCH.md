# Phase 6: Digests + Deal Memo Editor - Research

**Researched:** 2026-03-13
**Domain:** Email digest scheduling + Rich text editor with live data scaffolding
**Confidence:** HIGH

## Summary

Phase 6 has two distinct sub-features: (1) scheduled email digests that aggregate events and send branded summaries on daily/weekly cadences, and (2) a tiptap-based deal memo editor embedded in the deal card page. Both build on existing infrastructure: digests extend the BullMQ scheduler and Resend email delivery from Phase 5; the memo editor replaces the plaintext `research-draft.tsx` with a full WYSIWYG editor storing content as tiptap JSON with named snapshots.

The digest system requires two new BullMQ cron schedules with timezone support (`tz: 'America/New_York'`), a digest generation handler that queries overnight/weekly events per firm, and react-email templates rendered to HTML server-side before sending via Resend. The memo editor requires tiptap with table/blockquote extensions, new `memos` and `memo_snapshots` DB tables, CRUD API endpoints, and a per-section refresh mechanism that merges live deal data into the editor without overwriting analyst edits.

**Primary recommendation:** Use react-email for digest templates (rendered server-side via `render()`, sent through existing Resend integration) and tiptap with StarterKit + Table extension for the memo editor (content stored as JSON in Postgres, exported to .docx via existing `docx` library and .pdf via `@react-pdf/renderer`).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Rich text (WYSIWYG) using tiptap, styled to match j16z dark theme (Aurora palette), content stored as tiptap JSON for versioning and diffing
- Full scaffold on creation: AI-drafted Executive Summary, Deal Terms table, Regulatory Status, Litigation, Key Clauses (with verbatim quotes), Spread History placeholder, Analyst Notes section
- All sections pre-filled with live deal data; analyst deletes what they don't need; cursor starts in Analyst Notes section
- Per-section refresh buttons pull latest data for that section only; analyst's edits in other sections preserved
- Refreshable sections: Deal Terms, Regulatory Status, Litigation, Spread History
- Memo lives inside deal card as a new tab (alongside Terms, Events, Spread History)
- Multiple memos per deal allowed; memo list view on Memo tab with create-new flow; analyst names each memo on creation
- Auto-save continuously (existing research-draft pattern); named snapshots on explicit "Save version" action; analysts can browse past snapshots and restore them; compare between snapshot versions
- Memos can be private (creator only) or visible to all firm members; toggle per memo
- Export formats: .docx (Word) using existing docx library + .pdf (new capability)

### Claude's Discretion
- Digest email template design and layout (react-email or raw HTML)
- Daily vs weekly digest content differentiation approach
- Digest settings UI placement and configuration flow
- PDF generation library choice
- Auto-save debounce timing
- Default memo visibility (private vs firm-visible)
- Tiptap toolbar configuration and extension selection
- Snapshot comparison UI approach

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DIGEST-01 | System sends daily email digest at 8:00 AM ET summarizing overnight HIGH + MEDIUM events | BullMQ cron with `tz: 'America/New_York'` + react-email template + Resend delivery |
| DIGEST-02 | System sends weekly email digest Friday 5:00 PM ET summarizing all deal changes | Same BullMQ scheduler pattern with weekly cron; content query spans full week |
| DIGEST-03 | Digest emails use react-email templates matching j16z brand (dark, Aurora palette) | react-email components with inline dark styles; `render()` to HTML server-side |
| DIGEST-04 | User can suppress weekend digests | `digest_preferences` DB table with `suppress_weekend` boolean; checked by digest handler before sending |
| MEMO-01 | User can create a deal memo from a template seeded with live deal terms, events, and timeline | Tiptap editor with `generateMemoContent()` function pulling live deal/clause/event/market data |
| MEMO-02 | User can edit memo freeform with rich text editor after template scaffolding | Tiptap with StarterKit + Table + custom dark theme styling |
| MEMO-03 | User can pull in live deal data (terms, spreads, events) into memo body | Per-section refresh buttons that fetch latest data and replace specific tiptap JSON nodes |
| MEMO-04 | System tracks memo edit history | `memo_snapshots` table storing named tiptap JSON snapshots with timestamps |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tiptap/react` | ^2.x | React WYSIWYG editor | Most popular ProseMirror wrapper; JSON-native storage; rich extension ecosystem |
| `@tiptap/pm` | ^2.x | ProseMirror peer dependency | Required by tiptap |
| `@tiptap/starter-kit` | ^2.x | Bundle of common extensions | Includes Bold, Italic, Heading, BulletList, OrderedList, Blockquote, Code, HorizontalRule |
| `@tiptap/extension-table` | ^2.x | Table support in editor | Deal Terms displayed as tables; not included in StarterKit |
| `@tiptap/extension-table-row` | ^2.x | Table row nodes | Required companion to table extension |
| `@tiptap/extension-table-cell` | ^2.x | Table cell nodes | Required companion to table extension |
| `@tiptap/extension-table-header` | ^2.x | Table header cells | Required companion to table extension |
| `@tiptap/extension-underline` | ^2.x | Underline formatting | Useful for memo editing; not in StarterKit |
| `@tiptap/extension-placeholder` | ^2.x | Placeholder text | Shows hints in empty sections |
| `react-email` | ^5.x | Email template components | React-based email templates; native Resend integration; React 19 compatible |
| `@react-email/components` | latest | Pre-built email components | Html, Head, Body, Container, Section, Text, Hr, Link, Img |
| `@react-pdf/renderer` | ^4.x | PDF generation from React | Declarative PDF generation; matches React paradigm; strong community |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `docx` | 9.5.1 (installed) | Word document generation | .docx export -- already in frontend deps |
| `resend` | 6.9.3 (installed) | Email delivery | Already used for alert emails in Phase 5 |
| `date-fns` | 4.1.0 (installed) | Date formatting | Already used throughout frontend; use for digest date ranges |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-email | Raw HTML templates | react-email gives component reuse, dark mode testing, Resend integration; raw HTML is what Phase 5 already does but harder to maintain for complex digest layouts |
| @react-pdf/renderer | jsPDF | jsPDF is lighter but struggles with rich text formatting and external CSS; @react-pdf/renderer matches React paradigm |
| tiptap | Lexical (Meta) | Lexical is newer but tiptap has more mature extension ecosystem, better docs, and JSON-native storage is ideal for versioning |

**Installation (frontend):**
```bash
cd apps/j16z-frontend
pnpm add @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header @tiptap/extension-underline @tiptap/extension-placeholder @react-pdf/renderer
```

**Installation (API):**
```bash
cd apps/api
pnpm add react-email @react-email/components react react-dom
```

> Note: react-email `render()` requires React as a peer dep in the API project. Since the API is a Node.js Hono server, these are server-side only dependencies for template rendering.

## Architecture Patterns

### Recommended Project Structure (API additions)
```
apps/api/src/
├── digests/
│   ├── digest-handler.ts      # BullMQ job handler for digest generation
│   ├── daily-digest.ts        # Query + aggregate overnight events per firm
│   ├── weekly-digest.ts       # Query + aggregate weekly deal changes per firm
│   └── templates/
│       ├── daily-digest.tsx   # react-email template for daily digest
│       └── weekly-digest.tsx  # react-email template for weekly digest
├── routes/
│   ├── memos.ts               # CRUD endpoints for memos
│   └── digest-preferences.ts  # Digest settings endpoints
```

### Recommended Project Structure (Frontend additions)
```
apps/j16z-frontend/src/
├── components/
│   ├── memo/
│   │   ├── memo-editor.tsx        # Tiptap editor wrapper with toolbar
│   │   ├── memo-list.tsx          # List of memos for a deal
│   │   ├── memo-toolbar.tsx       # Editor toolbar (bold, italic, table, etc.)
│   │   ├── memo-scaffold.ts      # generateMemoContent() — builds tiptap JSON from deal data
│   │   ├── memo-section-refresh.tsx  # Per-section refresh button component
│   │   ├── memo-snapshot-panel.tsx   # Version history sidebar
│   │   └── memo-export.ts        # .docx and .pdf export functions
│   ├── settings/
│   │   └── digest-preferences-tab.tsx  # Digest config in Settings
```

### Pattern 1: BullMQ Cron with Timezone (Digest Scheduling)
**What:** Register daily and weekly digest jobs using `upsertJobScheduler` with timezone
**When to use:** All digest schedule registration
**Example:**
```typescript
// In scheduler.ts — add alongside existing schedules
await queue.upsertJobScheduler(
  'digest-daily-schedule',
  {
    pattern: SCHEDULE_CONFIG.digest_daily,  // '0 8 * * *' (8 AM)
    tz: 'America/New_York',                // ET timezone
  },
  {
    name: 'digest_daily',
    data: { triggeredBy: 'cron' },
    opts: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
  },
);

await queue.upsertJobScheduler(
  'digest-weekly-schedule',
  {
    pattern: SCHEDULE_CONFIG.digest_weekly,  // '0 17 * * 5' (5 PM Friday)
    tz: 'America/New_York',
  },
  {
    name: 'digest_weekly',
    data: { triggeredBy: 'cron' },
    opts: { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
  },
);
```

### Pattern 2: react-email Template Rendering
**What:** Build email as React component, render to HTML, send via Resend
**When to use:** Digest email generation
**Example:**
```typescript
// daily-digest.tsx — react-email template
import { Html, Head, Body, Container, Section, Text, Hr, Link } from '@react-email/components';

interface DailyDigestProps {
  events: Array<{ title: string; severity: string; dealName: string; sourceUrl: string }>;
  dateRange: string;
}

export function DailyDigestEmail({ events, dateRange }: DailyDigestProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#18181b', fontFamily: 'sans-serif' }}>
        <Container style={{ backgroundColor: '#27272a', borderRadius: '8px', padding: '24px' }}>
          <Text style={{ color: '#f5a623', fontSize: '11px', textTransform: 'uppercase' }}>
            Daily Digest — {dateRange}
          </Text>
          {events.map((event, i) => (
            <Section key={i} style={{ borderBottom: '1px solid #3f3f46', padding: '12px 0' }}>
              <Text style={{ color: '#fafafa', fontSize: '14px' }}>{event.title}</Text>
              <Text style={{ color: '#a1a1aa', fontSize: '12px' }}>{event.dealName}</Text>
            </Section>
          ))}
        </Container>
      </Body>
    </Html>
  );
}

// digest-handler.ts — rendering and sending
import { render } from '@react-email/components';
import { DailyDigestEmail } from './templates/daily-digest.js';

const html = await render(DailyDigestEmail({ events, dateRange }));
await resend.emails.send({ from: fromEmail, to: userEmail, subject, html });
```

### Pattern 3: Tiptap JSON Storage and Section-Based Refresh
**What:** Store editor content as tiptap JSON; refresh individual sections by replacing specific nodes
**When to use:** Memo editor auto-save and per-section data refresh
**Example:**
```typescript
// Tiptap editor setup
const editor = useEditor({
  extensions: [
    StarterKit,
    Table.configure({ resizable: true }),
    TableRow, TableHeader, TableCell,
    Underline,
    Placeholder.configure({ placeholder: 'Start writing...' }),
  ],
  content: initialContent, // tiptap JSON from DB
  immediatelyRender: false, // Required for Next.js SSR compat
  onUpdate: ({ editor }) => {
    debouncedAutoSave(editor.getJSON());
  },
});

// Per-section refresh: replace content between section markers
function refreshSection(editor: Editor, sectionId: string, newContent: JSONContent) {
  // Find the section heading node, replace content until next heading
  const { doc } = editor.state;
  let startPos = -1;
  let endPos = -1;
  doc.descendants((node, pos) => {
    if (node.type.name === 'heading' && node.textContent === sectionId) {
      startPos = pos;
    } else if (startPos > -1 && endPos === -1 && node.type.name === 'heading') {
      endPos = pos;
    }
  });
  if (startPos > -1) {
    const tr = editor.state.tr;
    tr.replaceWith(startPos, endPos > -1 ? endPos : doc.content.size, newContent);
    editor.view.dispatch(tr);
  }
}
```

### Pattern 4: Memo Scaffold Generation
**What:** Build full tiptap JSON document from live deal data on memo creation
**When to use:** "Create new memo" action
**Example:**
```typescript
// memo-scaffold.ts
import type { JSONContent } from '@tiptap/react';

export function generateMemoContent(deal: Deal, clauses: Clause[], events: Event[], snapshots: MarketSnapshot[]): JSONContent {
  return {
    type: 'doc',
    content: [
      heading(1, `${deal.acquirer} / ${deal.target} — Deal Memo`),
      heading(2, 'Executive Summary'),
      paragraph(`${deal.acquirer} announced acquisition of ${deal.target}...`),
      heading(2, 'Deal Terms'),
      dealTermsTable(deal),
      heading(2, 'Regulatory Status'),
      bulletList(events.filter(e => e.type === 'AGENCY').map(e => e.title)),
      heading(2, 'Litigation'),
      bulletList(events.filter(e => e.type === 'COURT').map(e => e.title)),
      heading(2, 'Key Clauses'),
      ...clauses.map(c => blockquote(c.verbatimText, c.sourceLocation)),
      heading(2, 'Spread History'),
      paragraph('[Spread chart placeholder — refresh to update]'),
      heading(2, 'Analyst Notes'),
      paragraph(''),  // Cursor starts here
    ],
  };
}
```

### Anti-Patterns to Avoid
- **Storing HTML instead of JSON:** Tiptap JSON is diffable, versionable, and round-trips perfectly. HTML lossy on re-parse.
- **Full document replacement on section refresh:** Must surgically replace only the target section nodes to preserve analyst edits elsewhere.
- **Rendering react-email in browser:** react-email templates must render server-side in the API process, not in Next.js client components.
- **Single cron for both daily and weekly:** Keep as separate job schedulers for independent retry/failure handling.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rich text editing | Custom contentEditable | tiptap + ProseMirror | Selection handling, undo/redo, paste sanitization, IME support are impossibly complex |
| Email rendering | Manual HTML string concatenation for complex layouts | react-email components | Handles email client quirks (Outlook, Gmail), inline styles, responsive tables |
| PDF generation | HTML-to-PDF via headless browser | @react-pdf/renderer | Deterministic output, no browser dependency, React-native API |
| Cron timezone handling | Manual UTC offset calculation | BullMQ `tz` option | Handles DST transitions automatically |
| JSON diffing for snapshots | Custom diff algorithm | `json-diff` or structural comparison | Edge cases in nested object comparison |

**Key insight:** Email rendering and rich text editing are two of the most deceptively complex frontend problems. Email clients have wildly inconsistent rendering engines, and contentEditable is notoriously broken across browsers. Use battle-tested libraries for both.

## Common Pitfalls

### Pitfall 1: Tiptap SSR Hydration Mismatch
**What goes wrong:** Tiptap renders differently on server vs client, causing React hydration errors
**Why it happens:** ProseMirror depends on browser APIs not available during SSR
**How to avoid:** Set `immediatelyRender: false` in useEditor options; wrap in `"use client"` directive
**Warning signs:** Console hydration warnings, editor content flashing on load

### Pitfall 2: react-email React Version Conflict
**What goes wrong:** API project may have different React version than frontend, causing JSX transform issues
**Why it happens:** react-email requires React as peer dep; API project doesn't normally include React
**How to avoid:** Install `react` and `react-dom` in API deps explicitly for template rendering; ensure compatible version (19.x)
**Warning signs:** "Invalid hook call" or JSX transform errors during email rendering

### Pitfall 3: Digest Sends During Maintenance Windows
**What goes wrong:** Digest fires during deploy/restart, sending partial or empty digests
**Why it happens:** BullMQ processes missed cron jobs immediately on worker restart
**How to avoid:** Check if events exist before sending; skip digest if zero events (don't send "nothing happened" emails)
**Warning signs:** Users receiving empty digest emails

### Pitfall 4: Auto-save Race Conditions
**What goes wrong:** Rapid typing triggers overlapping save requests; later content overwrites with stale data
**Why it happens:** Debounced saves can fire out of order under network latency
**How to avoid:** Use monotonic version counter; API rejects saves with version <= stored version
**Warning signs:** Content reverting to earlier state after save

### Pitfall 5: Per-Section Refresh Losing Cursor Position
**What goes wrong:** Refreshing a section resets the user's cursor to document start
**Why it happens:** ProseMirror transaction replaces content, invalidating cursor position
**How to avoid:** Save cursor position before refresh, restore after transaction; if cursor is inside refreshed section, place at section end
**Warning signs:** User cursor jumping during refresh

### Pitfall 6: Weekend Digest Suppression Logic
**What goes wrong:** Digest sends on Saturday when user suppressed weekend digests
**Why it happens:** Cron fires at 8 AM ET Saturday; handler doesn't check user preferences
**How to avoid:** Daily digest handler: check day-of-week + user preferences BEFORE generating content; skip users with weekend suppression on Sat/Sun
**Warning signs:** User complaints about weekend emails despite suppression toggle

## Code Examples

### Database Schema: Memos and Snapshots
```typescript
// In schema.ts — new tables

export const memos = pgTable(
  'memos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firmId: uuid('firm_id').references(() => firms.id).notNull(),
    dealId: uuid('deal_id').references(() => deals.id).notNull(),
    title: text('title').notNull(),
    content: jsonb('content').notNull(), // tiptap JSON
    createdBy: uuid('created_by').notNull(),
    visibility: text('visibility').notNull().default('private'), // 'private' | 'firm'
    version: integer('version').notNull().default(1), // monotonic counter for optimistic concurrency
    ...timestamps,
  },
  () => firmIsolationPolicies(),
);

export const memoSnapshots = pgTable(
  'memo_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    memoId: uuid('memo_id').references(() => memos.id).notNull(),
    firmId: uuid('firm_id').references(() => firms.id).notNull(),
    name: text('name').notNull(), // user-provided snapshot name
    content: jsonb('content').notNull(), // tiptap JSON at snapshot time
    version: integer('version').notNull(),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  () => firmIsolationPolicies(),
);

export const digestPreferences = pgTable(
  'digest_preferences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firmId: uuid('firm_id').references(() => firms.id).notNull(),
    userId: uuid('user_id').notNull(),
    dailyEnabled: boolean('daily_enabled').notNull().default(true),
    weeklyEnabled: boolean('weekly_enabled').notNull().default(true),
    suppressWeekend: boolean('suppress_weekend').notNull().default(false),
    ...timestamps,
  },
  () => firmIsolationPolicies(),
);
```

### Digest Handler Pattern
```typescript
// digest-handler.ts
import { render } from '@react-email/components';
import { DailyDigestEmail } from './templates/daily-digest.js';

export async function handleDigestDaily(job: Job): Promise<void> {
  const now = new Date();
  const isWeekend = [0, 6].includes(now.getDay());

  // Get all firms with active users
  const firms = await adminDb.select().from(schema.firms);

  for (const firm of firms) {
    // Get users with digest preferences
    const members = await adminDb.select()
      .from(schema.firmMembers)
      .where(eq(schema.firmMembers.firmId, firm.id));

    for (const member of members) {
      // Check preferences
      const [prefs] = await adminDb.select()
        .from(schema.digestPreferences)
        .where(and(
          eq(schema.digestPreferences.userId, member.userId),
          eq(schema.digestPreferences.firmId, firm.id),
        ));

      if (prefs && !prefs.dailyEnabled) continue;
      if (prefs && prefs.suppressWeekend && isWeekend) continue;

      // Query overnight events (since yesterday 8 AM ET)
      const events = await queryOvernightEvents(firm.id);
      if (events.length === 0) continue; // Don't send empty digests

      const html = await render(DailyDigestEmail({ events, dateRange: '...' }));
      await getResend().emails.send({
        from: 'j16z Digests <digests@j16z.com>',
        to: member.userId, // resolve to email
        subject: `j16z Daily Digest — ${format(now, 'MMM d, yyyy')}`,
        html,
      });
    }
  }
}
```

### Tiptap Editor Component
```typescript
// memo-editor.tsx
'use client';

import { useEditor, EditorContent, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';

interface MemoEditorProps {
  initialContent: JSONContent;
  onAutoSave: (content: JSONContent, version: number) => void;
}

export function MemoEditor({ initialContent, onAutoSave }: MemoEditorProps) {
  const versionRef = useRef(0);
  const saveTimerRef = useRef<NodeJS.Timeout>();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      Underline,
      Placeholder.configure({ placeholder: 'Start writing...' }),
    ],
    content: initialContent,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        versionRef.current++;
        onAutoSave(editor.getJSON(), versionRef.current);
      }, 3000); // 3 second debounce
    },
  });

  return (
    <div className="memo-editor rounded-lg border border-border bg-surface">
      <MemoToolbar editor={editor} />
      <EditorContent editor={editor} className="prose prose-invert max-w-none p-6" />
    </div>
  );
}
```

### Memo Export to PDF
```typescript
// memo-export.ts
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import type { JSONContent } from '@tiptap/react';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica' },
  heading1: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  heading2: { fontSize: 14, fontWeight: 'bold', marginBottom: 6, marginTop: 12 },
  paragraph: { marginBottom: 4, lineHeight: 1.5 },
  blockquote: { marginLeft: 12, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: '#999', fontStyle: 'italic' },
});

function renderNode(node: JSONContent): React.ReactNode {
  switch (node.type) {
    case 'heading':
      const level = node.attrs?.level ?? 1;
      return <Text style={level === 1 ? styles.heading1 : styles.heading2}>{extractText(node)}</Text>;
    case 'paragraph':
      return <Text style={styles.paragraph}>{extractText(node)}</Text>;
    case 'blockquote':
      return <View style={styles.blockquote}>{node.content?.map(renderNode)}</View>;
    default:
      return node.content?.map(renderNode);
  }
}

export async function exportMemoPdf(content: JSONContent, title: string): Promise<void> {
  const doc = (
    <Document>
      <Page style={styles.page}>
        {content.content?.map(renderNode)}
      </Page>
    </Document>
  );
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}.pdf`;
  a.click();
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw HTML email strings | react-email components | 2023+ | Component-based, testable, dark mode support |
| Draft.js | tiptap/Lexical | 2022+ | Draft.js is deprecated; tiptap has active development |
| Store HTML in DB | Store tiptap JSON | Current best practice | Lossless round-trips, diffable, versionable |
| react-email v1/v2 | react-email v5.0 | 2025 | React 19.2 + Next.js 16 + Tailwind 4 support |
| bull (v3) repeatable | BullMQ upsertJobScheduler | BullMQ v5+ | Timezone-aware cron, idempotent upsert |

**Deprecated/outdated:**
- Draft.js: Officially deprecated by Meta; use tiptap or Lexical
- react-email v1/v2 render API: v5 uses updated render function; ensure import from `@react-email/components`
- BullMQ repeatable jobs: Replaced by Job Schedulers with `upsertJobScheduler`

## Discretion Recommendations

### Digest Email Template: react-email (not raw HTML)
**Recommendation:** Use react-email components. The existing Phase 5 alert email uses raw HTML string templates, which works for simple single-event alerts. Digests are more complex (multiple events, tables, sections) and benefit from component composition. react-email supports React 19.2 and integrates natively with Resend.

### Daily vs Weekly Content Differentiation
**Recommendation:** Daily digest shows only overnight HIGH + MEDIUM severity events as a flat list grouped by deal. Weekly digest shows a deal-level summary: status changes, spread movement, new events count, and regulatory/litigation updates per deal as a summary table. This gives daily = "what happened last night" and weekly = "weekly deal board snapshot."

### Digest Settings UI: New Tab in Settings
**Recommendation:** Add a "Digests" tab to the Settings page (between Alert Rules and Integrations). Contains: daily/weekly toggle switches, suppress-weekend checkbox, email preview button. Follows existing tab pattern with icon (Mail icon from lucide-react).

### PDF Generation: @react-pdf/renderer
**Recommendation:** Use `@react-pdf/renderer` over jsPDF. It provides a declarative React API that maps well to tiptap JSON traversal. Client-side rendering (no server needed). The tiptap JSON -> PDF node mapping is straightforward with a recursive renderer.

### Auto-save Debounce: 3 seconds
**Recommendation:** 3-second debounce (not 5s from research-draft.tsx). Shorter debounce reduces data loss risk while keeping API load manageable. Show "Saving..." indicator during debounce, "Saved" after confirmation.

### Default Memo Visibility: Private
**Recommendation:** Default to private. Analysts draft memos with preliminary analysis and personal notes; sharing should be an explicit action. The toggle is prominently placed in the memo header.

### Tiptap Toolbar Configuration
**Recommendation:** Minimal toolbar matching analyst workflow: Bold, Italic, Underline | H1, H2, H3 | Bullet List, Ordered List | Blockquote | Table (insert/delete) | Horizontal Rule | Undo, Redo. No code blocks (not relevant for deal memos). Toolbar is sticky at top of editor area.

### Snapshot Comparison UI
**Recommendation:** Side-by-side view in a full-width modal/drawer. Left panel = selected snapshot (read-only rendered tiptap), right panel = current version or second snapshot. Changed sections highlighted with a subtle diff color (green for added, red for removed). Simple structural comparison at the node level, not character-level diff.

## Open Questions

1. **User email resolution for digest delivery**
   - What we know: Alert delivery currently sends to `rule.userId` with a comment "In production, resolve userId -> email via Supabase auth"
   - What's unclear: Whether a user email lookup utility already exists or needs to be built
   - Recommendation: Build a `resolveUserEmail(userId)` utility using Supabase admin API (`supabase.auth.admin.getUserById()`) and cache results; reuse for both alert and digest delivery

2. **Tiptap table styling in dark theme**
   - What we know: Tiptap renders HTML with CSS classes; dark theme requires custom styling
   - What's unclear: How tiptap table CSS integrates with Tailwind v4's `@theme` approach
   - Recommendation: Use tiptap's `editorProps.attributes.class` for base styling + custom CSS in globals.css for `.ProseMirror table` selectors

## Sources

### Primary (HIGH confidence)
- Tiptap official docs: Next.js installation, StarterKit extension contents, JSON persistence, setContent API
- BullMQ official docs: Job Schedulers with timezone support, upsertJobScheduler API
- react-email GitHub + docs: Component API, render function, React 19 compatibility
- Existing codebase: scheduler.ts, worker.ts, email-delivery.ts, research-draft.tsx patterns

### Secondary (MEDIUM confidence)
- @react-pdf/renderer npm: v4.3.2, declarative PDF generation API
- react-email dark mode: GitHub discussions confirm `prefers-color-scheme` and inline style approaches

### Tertiary (LOW confidence)
- Tiptap paid conversion API for DOCX export: Not needed since we use the standalone `docx` library already installed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - tiptap, react-email, and @react-pdf/renderer are well-documented with clear APIs; all verified via official docs
- Architecture: HIGH - Extends proven patterns from Phase 5 (BullMQ scheduler, Resend, worker handlers); memo follows research-draft.tsx precedent
- Pitfalls: HIGH - SSR hydration, auto-save race conditions, and timezone cron are well-documented common issues

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable domain; libraries are mature)
