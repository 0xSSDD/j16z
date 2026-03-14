# Tech Debt

Captured during end-to-end UAT session, March 2026.

## Critical — Fix Soon

### 1. Zod schemas written without testing against real APIs
The EDGAR EFTS and Submissions API Zod schemas used wrong field names (`entity_name` vs `display_names`, `accession_no` vs `_id`, `form_type` vs `root_forms`, `cik` as number vs string). Blocked the entire ingestion pipeline. Schemas should be validated against real API responses before shipping.

### 2. Custom Access Token Hook requires manual Dashboard activation
The auth flow depends on a Supabase Dashboard toggle being enabled. Without it: no `firm_id` in JWT → 403 on all data routes → infinite onboarding loop. Three separate fallback mechanisms were needed (DB lookup in admin middleware, client-side firm check in app-layout, 409 handler in onboarding form). Consider replacing with a simple `/api/auth/me` DB check instead of JWT claim dependency.

### 3. Frontend types ≠ backend types
`acquirerName` vs `acquirer`, `companyName` vs `target`, `currentSpread` vs `grossSpread`, `p_close_base` vs `pCloseBase`. Required a full mapping layer in `api.ts` (`mapBackendDeal`, `mapBackendEvent`). The frontend Deal/Event types were designed for mock data. Should be aligned to match the DB schema directly.

### 4. Components imported MOCK_* directly instead of through api.ts
10 components bypassed the `api.ts` abstraction and imported `MOCK_DEALS`, `MOCK_EVENTS` directly from constants. Even with `USE_MOCK_DATA=false`, they never called the API. The mock gate should only exist in `api.ts` — components should never import from constants.

## Medium — Address in Next Sprint

### 5. EFTS broad scan auto-creates noise deals
The broad scan found 27 filings and auto-created 12 unclaimed deals for random companies nobody asked for (Community West Bancshares, Pelican Holdco, GigCapital7). For a platform tracking 7-9 specific deals, CIK-based polling is sufficient. The broad scan should either be disabled or restricted to only create events (not deals) for unmatched filings.

### 6. RLS declared but not used
The "3-layer security model" includes Postgres RLS policies, but every route handler uses `adminDb` (service-role, bypasses RLS). Layer 4 is documentation theater. Either switch routes to use `db` (RLS client) and remove manual WHERE clauses, or drop the RLS policies to avoid false confidence.

### 7. 10 cron schedules for 3 working features
`ftc_poll`, `courtlistener_poll`, `market_data_poll`, `doj_antitrust_rss`, `doj_civil_rss`, `ftc_competition_rss`, `rss_poll`, `digest_daily`, `digest_weekly` are registered and running but their handlers are stubs or the polled sources don't produce actionable data. They generate noise in the admin panel and eat Redis memory.

### 8. Dual-worker architecture fragility
Node.js + Python workers subscribe to the same BullMQ queue, filtering by job type. The Python `bullmq` package broke on Python 3.14 (`asyncio.wait` rejects empty sets — required monkey-patching the installed package). Consider: single Node.js worker calling Gemini REST API directly, or a subprocess model.

### 9. CIK leading zeros in SEC Archive URLs
SEC Archives paths use CIKs WITHOUT leading zeros (`/data/1038074/`), but the submissions API and EFTS return them WITH leading zeros (`0001038074`). `buildFilingUrl` and `buildIndexUrl` must strip them. This caused 404s on filing downloads.

## Low — Cleanup When Convenient

### 10. Materiality scoring in two languages
Python (authoritative) and TypeScript (frontend fallback) implementations must stay in sync, with cross-language parity tests. Pick one. The Python worker is the authority — the frontend should display what the backend computed.

### 11. 1381-line mock constants file
`apps/j16z-frontend/src/lib/constants.ts` is 1381 lines of hand-crafted mock data. Now that all components use `api.ts`, this file is only used by `landing-hero.tsx` (marketing page). Consider extracting the landing page mock to a small local constant and deleting the rest.

### 12. Deal board row click off-by-one
The `onClickCapture` handler assumed header rows were in the same parent as data rows (checking `index > 0`). DataTable separates them into `thead`/`tbody`, so `index 0` is the first data row. Fixed to `index >= 0`, but the click delegation pattern via `onClickCapture` on the table body is fragile — consider using per-row onClick handlers instead.

### 13. Signup "check email" message with autoconfirm
When Supabase has autoconfirm enabled, `signUp()` returns a session immediately but the frontend showed "Check your email to confirm." Fixed to detect `data.session` and auto-redirect, but the original code didn't account for autoconfirm at all.

### 14. Hardcoded sidebar firm name
`app-layout.tsx` had `David's Analyst` hardcoded in the sidebar instead of fetching from API. Fixed to use `/api/auth/me`, but this was a placeholder that should have been dynamic from the start.
