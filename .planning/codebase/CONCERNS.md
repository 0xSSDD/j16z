# Codebase Concerns

**Analysis Date:** 2026-02-25

## Tech Debt

**Mock Data Embedded in Production Code:**
- Issue: The entire application relies on `MOCK_DEALS`, `MOCK_EVENTS`, `MOCK_CLAUSES`, and `MOCK_MARKET_SNAPSHOTS` defined in `src/lib/constants.ts` (1381 lines). This is a massive hardcoded dataset with no actual API integration.
- Files: `src/lib/constants.ts`, `src/lib/api.ts`
- Impact: Cannot scale beyond the ~15 hardcoded deals. Every real deal or event requires adding to constants.ts. No real-time data capability.
- Fix approach: Implement real API layer behind feature flags. Move mock data to dev-only utilities. All API functions in `src/lib/api.ts` have TODO comments indicating stub implementation.

**Incomplete API Abstraction:**
- Issue: `src/lib/api.ts` contains functions that switch between mock mode and real API, but the real API paths are unimplemented (all have `// TODO: Replace with real API call`).
- Files: `src/lib/api.ts` (lines 25, 40, 58, 73, 88, 103, 115, 120, 135, 156, 175)
- Impact: Switching `NEXT_PUBLIC_USE_MOCK_DATA=false` will break the app because `/api/deals`, `/api/events`, etc. don't exist.
- Fix approach: Implement actual backend API endpoints or integrate with real data service (Supabase indicated in package.json but not used).

**Event-Based Inter-Component Communication:**
- Issue: Components use `window.dispatchEvent()` and `window.addEventListener()` for modal triggers and state updates instead of proper state management.
- Files: `src/components/deal-board.tsx` (lines 56-62), `src/components/command-palette.tsx` (lines 106-109, 121-124), `src/components/app-layout.tsx`, `src/app/app/inbox/page.tsx` (line 134)
- Impact: Fragile coupling between components. Hard to debug. No type safety. Easy to miss event listeners and cause memory leaks.
- Fix approach: Migrate to proper state management (Zustand is installed but underused). Centralize modal state in root layout or context.

**Unstructured localStorage Usage:**
- Issue: Multiple components read/write directly to localStorage with string keys and no schema validation.
- Files: `src/components/command-palette.tsx` (line 49, 58), `src/components/app-layout.tsx` (line 92), `src/app/app/inbox/page.tsx` (line 19), various components
- Impact: Silent failures on JSON.parse errors (catch blocks swallow errors). No versioning of stored data format. Prone to typos in key names.
- Fix approach: Create a centralized localStorage abstraction with typed getters/setters. Use zod for schema validation.

**Hydration Mismatch Workarounds:**
- Issue: Code uses `typeof window !== "undefined"` checks and timestamp hacks (line 22 in `src/components/chat-assistant.tsx`: `timestamp: 0`) to avoid hydration mismatches.
- Files: `src/components/command-palette.tsx` (line 48), `src/components/chat-assistant.tsx` (line 22), `src/app/app/inbox/page.tsx` (line 18)
- Impact: Suggests deeper SSR issues. These are patches, not solutions.
- Fix approach: Use proper suppressHydrationWarning on problem elements or refactor components to be fully client-side from start.

**No Error Boundaries:**
- Issue: No React Error Boundaries implemented. If a component crashes, the entire page may fail silently.
- Files: Root layout `src/app/layout.tsx` and no error.tsx pages found
- Impact: User gets blank screen on error. No fallback UI. Exception tracking nonexistent.
- Fix approach: Add error.tsx files to key routes. Implement Error Boundary wrapper components.

**Settings Component State Not Persisted:**
- Issue: `src/components/settings.tsx` maintains UI state (`config`, `saved`) but has no actual persistence mechanism or API calls.
- Files: `src/components/settings.tsx` (lines 46-69)
- Impact: Settings changes are lost on page refresh. Mock "Save Config" button just toggles UI state.
- Fix approach: Wire settings to localStorage or backend. Validate before saving. Show actual success/error states.

## Known Bugs

**Login Form Accepts Any Input:**
- Symptoms: Login page doesn't validate credentials. Hardcoded email/password shown in form (defaultValue). Form always "succeeds" after 1.5 second delay.
- Files: `src/components/login-form.tsx` (lines 49, 59, 14-17)
- Trigger: Any input in email/password fields, click "Initialize Session"
- Workaround: None—this is demo-only code. Production auth is not implemented.

**Custom Events May Fail on CSR-Only Components:**
- Symptoms: Command palette uses `require()` at runtime to dynamically load functions (line 132-133, 141 in `src/app/app/inbox/page.tsx`). This defeats static analysis.
- Files: `src/app/app/inbox/page.tsx` (lines 132, 141)
- Trigger: Pressing 'e' key or 'v' key in inbox
- Workaround: Import at top of file instead of inline require()

**Missing Deal Data in Pages:**
- Symptoms: Pages like `/app/discovery`, `/app/intelligence`, `/app/feed` likely exist but reference undefined mock data.
- Files: Multiple page files may reference data sources not in constants.ts
- Trigger: Navigate to pages that aren't the main dashboard/deals/watchlists
- Workaround: Check each page individually for MOCK_* references that don't exist

**Unread Count Event Not Type-Safe:**
- Symptoms: Custom event `"inbox:unread-updated"` dispatched from multiple locations with no shared event type definition.
- Files: `src/components/app-layout.tsx`, `src/app/app/inbox/page.tsx` (line 134), `src/components/inbox/inbox-side-panel.tsx`, `src/components/inbox/inbox-timeline.tsx`
- Trigger: Marking events as read
- Workaround: Standardize event name and add JSDoc type hints

## Security Considerations

**Hardcoded Credentials in Login Form:**
- Risk: Production email and password visible in source code
- Files: `src/components/login-form.tsx` (lines 49, 59: `defaultValue="david.analyst@j16z.com"` and `defaultValue="password"`)
- Current mitigation: None—this is demo code
- Recommendations: Remove defaults before deploying. Implement real auth (Supabase SDK is installed but unused). Never commit credentials to repo.

**No CSRF Protection:**
- Risk: State-changing operations (DELETE, PATCH, POST in `src/lib/api.ts`) have no CSRF token validation
- Files: `src/lib/api.ts` (lines 136-142, 157-163, 176-179)
- Current mitigation: None in frontend
- Recommendations: Backend must implement CSRF tokens and validate on server-side. Frontend should include token from cookies in request headers.

**dangerouslySetInnerHTML Usage:**
- Risk: Inline script in root layout. If compromised, attacker can execute arbitrary JS.
- Files: `src/app/layout.tsx` (lines 37-48)
- Current mitigation: Script is hardcoded; not user-generated. But still risky.
- Recommendations: Move theme logic to CSS-in-JS or CSS variables only. Avoid inline scripts if possible.

**Window Location Direct Assignment:**
- Risk: OAuth redirect URL constructed from `window.location.origin`. Could be exploited if XSS exists elsewhere.
- Files: `src/components/settings/integrations-tab.tsx`: `window.location.href = authUrl`
- Current mitigation: URL is hardcoded for now
- Recommendations: Validate redirectUri against allowlist on backend. Implement Sec-Fetch-Site checks.

**No Input Validation on User Data:**
- Risk: Form inputs (deal creation, alert rules, RSS feeds) don't validate beyond error messages.
- Files: `src/components/settings/rss-feeds-tab.tsx` (URL validation), settings components
- Current mitigation: Client-side try/catch for URL parsing only
- Recommendations: Use Zod schema validation for all form inputs. Validate on backend too.

**API Keys Displayed in Settings (Mock):**
- Risk: `src/components/settings/api-keys-tab.tsx` shows mock API keys in plaintext
- Files: `src/components/settings/api-keys-tab.tsx`
- Current mitigation: Keys are fake demo values
- Recommendations: Never display full API keys in UI. Show masked tokens (last 4 chars only). Require confirmation to view.

## Performance Bottlenecks

**1381-Line Constants File:**
- Problem: `src/lib/constants.ts` is a monolithic hardcoded dataset. Every code change invalidates entire module.
- Files: `src/lib/constants.ts`
- Cause: All mock data (MOCK_DEALS, MOCK_EVENTS, MOCK_CLAUSES, MOCK_MARKET_SNAPSHOTS) bundled together. No pagination or lazy loading.
- Improvement path: Split into separate files per data type. Implement pagination in API layer. Load data on-demand from backend.

**No Pagination in Data Tables:**
- Problem: Deal board loads ALL deals at once. Memory grows with dataset size.
- Files: `src/components/deal-board.tsx` (line 21: `[deals, setDeals]` loads entire MOCK_DEALS), `src/components/ui/data-table.tsx`
- Cause: TanStack React Table configured but pagination not fully integrated across all pages
- Improvement path: Implement server-side pagination. Fetch data in chunks from API. Add infinite scroll or page navigation.

**No Memoization on Expensive Renders:**
- Problem: Landing page re-renders charts on every parent update
- Files: `src/components/landing-page.tsx` (Recharts AreaChart at line 73-86)
- Cause: No React.memo wrapping chart components. Charts re-calculate on scroll events.
- Improvement path: Wrap chart components with React.memo. Debounce scroll listeners. Use useMemo for computed data.

**Event Listeners Not Cleaned Up in Some Components:**
- Problem: Multiple `addEventListener` calls without corresponding cleanup in all cases
- Files: `src/components/landing-page.tsx` (line 183-184 has proper cleanup), but check `src/components/app-layout.tsx` and other components
- Cause: Some components may be missing cleanup in useEffect return
- Improvement path: Audit all useEffect hooks. Ensure all listeners are removed in cleanup function.

**Large JavaScript Bundle:**
- Problem: Next.js exports entire Recharts library (3KB chart), JSON.stringify serialization, markdown parser
- Files: Implicit in package.json: `recharts`, `react-markdown`, `papaparse`, `docx`
- Cause: All dependencies bundled even if not used on every page
- Improvement path: Code-split heavy dependencies. Load Recharts only on dashboard. Lazy-load markdown parser.

## Fragile Areas

**Deal Detail Page Dynamic Routes:**
- Files: `src/app/app/deals/[id]/page.tsx`, `src/app/app/deals/[id]/draft/page.tsx`
- Why fragile: Assumes deal with `[id]` exists in MOCK_DEALS. No 404 handling if deal not found. No loading state during fetch.
- Safe modification: Add null checks and error boundaries. Test with invalid IDs.
- Test coverage: Unknown if test files exist

**Inbox Timeline and Filters:**
- Files: `src/components/inbox/inbox-timeline.tsx`, `src/components/inbox/inbox-filters.tsx`, `src/app/app/inbox/page.tsx`
- Why fragile: Multiple filter state updates (line 104-127 in inbox page). Keyboard event handler at line 42-157 is complex with mutable gPressed flag. JSON.parse in line 22 can throw.
- Safe modification: Extract keyboard logic to custom hook. Validate localStorage data before use. Add comprehensive tests.
- Test coverage: Unknown

**Settings Tab Components:**
- Files: `src/components/settings/team-tab.tsx`, `src/components/settings/integrations-tab.tsx`, `src/components/settings/alert-rules-tab.tsx`, `src/components/settings/api-keys-tab.tsx`, `src/components/settings/rss-feeds-tab.tsx` (each ~300-400 lines)
- Why fragile: High complexity, multiple state managers, form validation scattered. No unit tests referenced.
- Safe modification: Refactor into smaller sub-components. Extract form logic to custom hooks. Add Zod validation.
- Test coverage: None detected

**Command Palette Filtering:**
- Files: `src/components/command-palette.tsx` (lines 143-147)
- Why fragile: Uses simple string includes() for filtering. Case-insensitive filter logic duplicated. No debouncing on large command sets.
- Safe modification: Extract filter logic to utility. Add memoization. Test with 100+ commands.
- Test coverage: None detected

## Scaling Limits

**Hardcoded Deal Dataset:**
- Current capacity: ~15 sample deals in MOCK_DEALS
- Limit: UI untested with >100 deals. No virtualization in data tables.
- Scaling path: Implement server-side pagination. Virtualize tables with TanStack React Table scroll. Test with 1000+ deals.

**In-Memory Event Storage:**
- Current capacity: All events (MOCK_EVENTS) loaded into memory
- Limit: ~50-100 events. No filtering on backend.
- Scaling path: Move to real database. Implement cursor-based pagination. Add server-side filters.

**localStorage for Preferences:**
- Current capacity: ~5KB per user in browser storage
- Limit: localStorage has ~5-10MB total per domain, but storing large filter states will fill it
- Scaling path: Move user preferences to backend. Sync via API on login. Cache in browser.

**Single-Page Static Deployment:**
- Current capacity: Frontend handles all state. No real API backend.
- Limit: Cannot support concurrent users or real-time updates. No sessions/auth tokens.
- Scaling path: Implement backend server (Node.js, Python, etc.). Add session management. Implement WebSockets for live updates.

## Dependencies at Risk

**Unimplemented Supabase Integration:**
- Risk: Supabase SDK installed (`@supabase/supabase-js`, `@supabase/ssr`) but not used anywhere
- Impact: Credentials in .env (unverified, but likely unused). Dead code.
- Migration plan: Either integrate Supabase for auth and real-time subscriptions, or remove package to reduce bundle size.

**Google Gemini AI Not Integrated:**
- Risk: `@google/genai` installed but chat component uses mock responses
- Impact: Chat page renders but doesn't call real API. Credentials potentially wasted.
- Migration plan: Integrate Gemini API for actual AI responses. Move API calls to server-side route. Handle streaming responses.

**React 19 with React Compiler (Experimental):**
- Risk: React Compiler enabled in `next.config.ts` (`reactCompiler: true`). Still early/unstable.
- Impact: May cause unexpected rendering behavior. Difficult to debug compiler issues.
- Migration plan: Monitor React team announcements. Be prepared to disable if issues arise. Test thoroughly.

**Recharts Version Mismatch Risk:**
- Risk: `recharts@^3.5.1` used but no type definitions checked
- Impact: Charts may break on minor version updates
- Migration plan: Pin exact version or add integration tests for chart rendering

**Biome for Linting (Not ESLint):**
- Risk: Using Biome instead of ESLint (non-standard for Next.js ecosystem)
- Impact: Fewer community rules/plugins available. Custom rules harder to implement.
- Migration plan: If Biome becomes unmaintained, migration to ESLint would require rewriting all rules

## Missing Critical Features

**Real Authentication:**
- Problem: No actual auth system. Hardcoded credentials in login form. No session management.
- Blocks: Cannot support multiple users. No access control. No audit trail.

**Persistent Data Storage:**
- Problem: All data is in-memory mock data. No database connection.
- Blocks: Cannot save user data, preferences, or deals. Every reload loses state except localStorage.

**Real-Time Updates:**
- Problem: No WebSocket or polling mechanism for live event feeds
- Blocks: Cannot show real-time deal updates or price movements. Users don't see new filings immediately.

**Robust Error Handling:**
- Problem: Few error boundaries or user-facing error messages. Errors swallowed in catch blocks.
- Blocks: Users see blank screens instead of helpful error messages. Cannot retry failed operations.

**API Rate Limiting & Retry Logic:**
- Problem: Fetch calls in `src/lib/api.ts` have no retry mechanism or rate limit awareness
- Blocks: Transient network errors will fail immediately. No exponential backoff.

## Test Coverage Gaps

**No Tests Found in Repository:**
- What's not tested: Entire codebase. No `.test.tsx`, `.spec.ts` files detected.
- Files: All files in `src/`
- Risk: Any component change could break others silently. Regression bugs hide until production.
- Priority: **CRITICAL** — Add unit tests for utility functions first (`src/lib/api.ts`, `src/lib/date-utils.ts`, scoring functions). Add integration tests for key user flows (deal creation, filtering).

**Complex Logic Without Tests:**
- What's not tested: Scoring systems (`src/lib/severity-scoring.ts`, `src/lib/materiality-scoring.ts`), filter logic, keyboard shortcuts
- Files: `src/lib/severity-scoring.ts`, `src/lib/materiality-scoring.ts`, `src/app/app/inbox/page.tsx` (keyboard handler)
- Risk: Scoring algorithm changes silently affect deal urgency. Keyboard shortcuts may break on refactor.
- Priority: **HIGH** — Add unit tests for scoring functions. Add E2E test for keyboard navigation in inbox.

**Component Snapshot Tests Missing:**
- What's not tested: UI rendering, props validation, edge cases (empty states, error states)
- Files: All components in `src/components/`
- Risk: Visual regressions not caught. Components may render incorrectly with unexpected data.
- Priority: **MEDIUM** — Add Vitest setup. Start with critical components: `DealBoard`, `InboxTimeline`, `Settings`.

**No E2E Tests:**
- What's not tested: Full user journeys (login → view deals → create watchlist → manage settings)
- Files: No e2e/ directory or test files
- Risk: Integration between pages may break. Cross-page navigation could fail silently.
- Priority: **MEDIUM** — Set up Playwright or Cypress. Add happy-path tests for main features.

---

*Concerns audit: 2026-02-25*
