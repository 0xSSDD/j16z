# Phase 6: Digests + Deal Memo Editor - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Two sub-features: (1) Daily and weekly email digests summarizing deal activity on a schedule, and (2) a deal memo editor seeded with live extracted terms that analysts can edit freeform. Digest builds on Phase 5 alert infrastructure; memo requires real extracted terms from Phase 3.

</domain>

<decisions>
## Implementation Decisions

### Memo editor type
- Rich text (WYSIWYG) using tiptap
- Styled to match j16z dark theme (Aurora palette)
- Content stored as tiptap JSON for versioning and diffing

### Memo template scaffolding
- Full scaffold on creation: AI-drafted Executive Summary, Deal Terms table, Regulatory Status, Litigation, Key Clauses (with verbatim quotes), Spread History placeholder, Analyst Notes section
- All sections pre-filled with live deal data — analyst deletes what they don't need
- Cursor starts in Analyst Notes section

### Live data refresh
- Per-section refresh buttons pull latest data for that section only
- Analyst's edits in other sections preserved on refresh
- Refreshable sections: Deal Terms, Regulatory Status, Litigation, Spread History

### Memo navigation
- Lives inside deal card as a new tab (alongside Terms, Events, Spread History)
- Access: Deals > [deal] > Memo tab

### Memo count
- Multiple memos per deal allowed
- Memo list view on the Memo tab with create-new flow
- Analyst names each memo on creation

### Versioning & history
- Auto-save continuously (existing research-draft pattern)
- Named snapshots on explicit "Save version" action
- Analysts can browse past snapshots and restore them
- Compare between snapshot versions

### Sharing & visibility
- Memos can be private (creator only) or visible to all firm members
- Toggle per memo — default is Claude's discretion

### Export formats
- .docx (Word) — docx library already installed
- .pdf — new capability, needs PDF generation library

### Claude's Discretion
- Digest email template design and layout (react-email or raw HTML)
- Daily vs weekly digest content differentiation approach
- Digest settings UI placement and configuration flow
- PDF generation library choice
- Auto-save debounce timing
- Default memo visibility (private vs firm-visible)
- Tiptap toolbar configuration and extension selection
- Snapshot comparison UI approach

</decisions>

<specifics>
## Specific Ideas

- Memo template should mirror the preview layout: Executive Summary narrative paragraph, Deal Terms as a formatted table, Regulatory Status as bullet list, Key Clauses as blockquotes with source citations
- Per-section refresh buttons (small icon) that pull latest without disrupting analyst edits elsewhere
- Version history panel showing named snapshots with dates and restore/compare actions

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/api/src/alerts/email-delivery.ts`: Resend email sending with dedup via notification_log — extend for digest delivery
- `apps/api/src/queues/scheduler.ts`: BullMQ `upsertJobScheduler()` pattern — add digest_daily and digest_weekly cron jobs
- `apps/api/src/worker.ts`: Handler registry pattern — add digest generation handlers
- `apps/j16z-frontend/src/components/research-draft.tsx`: Auto-save pattern (5s debounce), `generateDraft()` template function, .md/.docx export — pattern for memo editor
- `apps/j16z-frontend/src/lib/file-utils.ts`: `exportTextFile()` utility — reuse for memo export
- `docx@9.5.1` library already installed for Word export
- `react-markdown@10.1.0` available in frontend deps

### Established Patterns
- Firm-scoped data: all queries filter by `firmId` from JWT context
- Settings tabs: AlertRulesTab, RSSFeedsTab, IntegrationsTab — pattern for digest config tab
- Drizzle migrations with RLS policies for multi-tenant isolation
- BullMQ cron registration at API startup in scheduler.ts

### Integration Points
- Deal card page: new Memo tab alongside existing Terms/Events/Spread tabs
- Scheduler: register digest_daily and digest_weekly alongside existing edgar_poll, ftc_poll, market_data_poll
- Worker: add handlers to existing handler registry
- Settings: digest preferences alongside existing alert rules config
- API routes: new /api/memos CRUD endpoints following deals.ts pattern

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-digests-deal-memo-editor*
*Context gathered: 2026-03-13*
