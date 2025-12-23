# User Journey Analysis - MVP Frontend Screens

## Core Analyst Workflows (Top-Down)

### Journey 1: Monitor Deal Universe (Daily Routine)
**Goal**: Check all tracked deals for material changes

**Flow**:
1. Open j16z → Navigate to `/app/deals` (Deal Board)
2. Scan table for: spread changes (↑↓), status updates, outside date countdowns
3. Apply filters if needed: `CMD+K` → "Filter by High Spread" or use dropdowns
4. Click deal row → Opens Deal Card
5. Scan Key Metrics (always visible)
6. Expand Events section [▼] → Check for new FILING/COURT/AGENCY events
7. Return to Deal Board (G+D) or move to next deal

**Complexity Check**:
- ✅ No tabs - single Deal Board page
- ✅ No unnecessary navigation - direct click to deal
- ✅ CMD+K for all actions
- ✅ Filters are inline, not separate page

**Verdict**: OPTIMAL - No simplification needed

---

### Journey 2: Deep Dive on Single Deal (Event-Driven)
**Goal**: Analyze deal after material event (e.g., FTC Second Request)

**Flow**:
1. Receive alert (email/Slack) → Click link → Opens Deal Card directly
2. Key Metrics visible immediately (spread, p_close, EV)
3. Events section auto-expanded [▼] → See new event at top
4. Read event summary + click source link (FTC press release)
5. Check Regulatory/Litigation section [▼] → Assess risk level
6. Update p_close_base inline [65%]✎ → Type new value → Auto-saves
7. CMD+K → "Generate Draft" → Navigate to Research Draft
8. Edit memo sections → Auto-saves every 5s
9. CMD+K → "Export as DOCX" → Download for client

**Complexity Check**:
- ✅ No tabs - single scrollable page
- ✅ Collapsible sections prevent overwhelming
- ✅ All actions via CMD+K (no button hunting)
- ✅ Direct navigation to draft (no intermediate steps)

**Verdict**: OPTIMAL - No simplification needed

---

### Journey 3: Weekly Research Production (Batch Work)
**Goal**: Generate memos for 5-10 deals for institutional clients

**Flow**:
1. Deal Board → Filter by watchlist: `/ Search` → Type "Q4 Coverage"
2. For each deal:
   - Click row → Deal Card opens
   - Review Key Metrics + Events
   - CMD+K → "Generate Draft"
   - Edit auto-generated sections (5-10 min per deal)
   - CMD+K → "Export as DOCX"
   - G+D → Back to Deal Board
3. Repeat for next deal

**Complexity Check**:
- ✅ No tabs to remember
- ✅ Consistent CMD+K pattern across all screens
- ✅ Quick navigation (G+D) back to board
- ✅ Auto-save prevents data loss

**Verdict**: OPTIMAL - No simplification needed

---

### Journey 4: New Deal Setup (Onboarding)
**Goal**: Add new deal to tracking universe

**Flow**:
1. Deal Board → Press `C` (or CMD+K → "Create Deal")
2. Modal opens → Enter: Acquirer ticker, Target ticker, Deal name
3. Submit → Deal appears in table with status "ANNOUNCED"
4. Click deal row → Deal Card opens
5. Set initial p_close_base [85%]✎
6. Set spread_entry_threshold [2.0%]✎
7. CMD+K → "Configure Alerts" → Select event types + channels
8. CMD+K → "Add to Watchlist" → Select watchlist

**Complexity Check**:
- ✅ Single modal for creation (no multi-step wizard)
- ✅ Immediate access to deal after creation
- ✅ All configuration via CMD+K
- ✅ No separate "Settings" page needed

**Verdict**: OPTIMAL - No simplification needed

---

### Journey 5: Spread Monitoring (Intraday Trading)
**Goal**: Track spread movements for active positions

**Flow**:
1. Deal Board → Filter by "My Positions" watchlist
2. Scan spread column for changes (↑↓ indicators)
3. Deal with large move → Click row
4. Key Metrics show 24h change immediately
5. Expand Spread Chart [▼] → View intraday movement
6. Expand Events [▼] → Check if news-driven
7. Update p_close_base if needed
8. G+D → Back to board

**Complexity Check**:
- ✅ No separate "Trading" view needed
- ✅ Spread data visible in both board and card
- ✅ Chart is collapsible (not always visible)
- ✅ Quick navigation back to board

**Verdict**: OPTIMAL - No simplification needed

---

## Identified Issues & Fixes

### Issue 1: CMD+1-5 Shortcuts Still Referenced ❌
**Location**: `deal-card/spec.md` line 14
**Problem**: Spec says "keyboard shortcuts CMD+1 through CMD+5 jump to respective sections"
**Reality**: We simplified to CMD+K command palette only
**Fix**: Remove CMD+1-5 references, keep only CMD+K

### Issue 2: "Quick Action Buttons" Still in Header Spec ❌
**Location**: `deal-card/spec.md` line 35
**Problem**: Spec says "quick action buttons: Export, Draft, Alerts, Add to Watchlist"
**Reality**: We removed buttons, everything via CMD+K
**Fix**: Remove button references from spec

### Issue 3: Redundant "Deal Card Header" Requirement ❌
**Location**: `deal-card/spec.md` lines 24-35
**Problem**: Header requirement mentions buttons that don't exist
**Reality**: Header should only show: deal name, status, dates, CMD+K indicator
**Fix**: Simplify header requirement

### Issue 4: No Tabs Anywhere ✅
**Verified**: No tab navigation in any spec
**Status**: CORRECT - All specs use single-page scrollable with collapsible sections

---

## Simplification Summary

### What We're Keeping (Essential)
1. **3 Screens Only**: Deal Board, Deal Card, Research Draft
2. **Single-Page Scrollable**: No tabs, no fragmentation
3. **CMD+K for Everything**: One pattern for all actions
4. **Collapsible Sections**: Progressive disclosure, not overwhelming
5. **Inline Editing**: p_close_base + threshold directly editable
6. **Auto-Save**: 5-second debounce, no explicit save buttons

### What We're Removing (Unnecessary)
1. ❌ CMD+1-5 shortcuts (use CMD+K instead)
2. ❌ Action buttons in headers (use CMD+K instead)
3. ❌ Separate "Quick Actions" component (redundant)
4. ❌ Tab navigation (never existed, but ensuring it stays out)

---

## Implementation Reality Check

### Tech Stack Validation
- ✅ **Next.js 15 App Router**: `/app/deals/page.tsx`, `/app/deals/[id]/page.tsx`, `/app/deals/[id]/draft/page.tsx`
- ✅ **React 19**: All components are client components with hooks
- ✅ **Tailwind v4**: All styling uses utility classes
- ✅ **shadcn/ui**: Table, Badge, Button, Dialog components exist
- ✅ **Recharts**: AreaChart for spread history
- ✅ **TanStack Table**: Sorting/filtering for Deal Board
- ✅ **docx.js**: DOCX export (client-side)
- ✅ **localStorage**: Watchlists, draft edits, section state (MVP)

### Data Structure Validation (API-Grounded)
- ✅ **Deal**: Matches FMP M&A API structure (`symbol`, `companyName`, `acquisitionDate`, `reportedEquityTakeoverValue`)
- ✅ **Event**: Matches SEC 8-K filing structure (`date`, `formType`, `filingUrl`)
- ✅ **Clause**: Matches SEC S-4/DEFM extraction (`type`, `value`, `sourceSection`, `sourceUrl`)
- ✅ **MarketSnapshot**: Matches market data API (`timestamp`, `price`, `spread`)

### Component Complexity Validation
- ✅ **Deal Board**: ~300 lines (DataTable + filters)
- ✅ **Deal Card**: ~500 lines (header + metrics + 5 collapsible sections)
- ✅ **Research Draft**: ~400 lines (markdown editor + auto-save + export)
- ✅ **Total**: ~1200 lines of component code (reasonable for MVP)

---

## Final User Journey Validation

### All 8 MVP User Stories Covered
1. ✅ **Define coverage**: Watchlist management via CMD+K
2. ✅ **Understand events**: Event timeline with summaries + source links
3. ✅ **Single dashboard**: Deal Card is one scrollable page
4. ✅ **Structured exports**: CSV/Markdown/DOCX via CMD+K
5. ✅ **Probabilities**: Inline editable p_close_base + threshold
6. ✅ **Research production**: Auto-generated drafts with 5s auto-save
7. ✅ **Alerts**: Configuration via CMD+K modal
8. ✅ **Qualitative RSS**: News section with analyst notes

### No Unnecessary Complexity
- ✅ No tabs
- ✅ No multi-step wizards
- ✅ No separate settings pages
- ✅ No redundant navigation
- ✅ No action buttons (CMD+K for everything)

### Grounded in Reality
- ✅ All data structures match real APIs
- ✅ All components use existing libraries
- ✅ All interactions follow Linear/Slack patterns
- ✅ All features are implementable with current tech stack

---

## Recommendation

**Remove CMD+1-5 shortcuts and action buttons from specs** - these are the only remaining unnecessary elements. Everything else is optimized for analyst workflows and grounded in implementation reality.
