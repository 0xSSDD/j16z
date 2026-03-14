# Tech Debt

Captured during end-to-end UAT session, March 2026. Updated with resolutions.

## ✅ Resolved

### 1. Zod schemas written without testing against real APIs
**Fixed.** EFTS schema now uses real field names (`display_names`, `root_forms`, `ciks`, `_id`). Submissions schema accepts `cik` as string or number. Accession number extracted from `_id` regex. EFTS URL no longer requests nonexistent `_source` fields.

### 2. Custom Access Token Hook — single point of failure
**Fixed.** `firmContextMiddleware` now queries `firm_members` directly by `userId` (DB-first). No dependency on JWT `app_metadata.firm_id`. The hook can still enrich JWTs for optimization, but it's no longer on the critical path. Three fallback mechanisms removed — one authoritative path.

### 3. Frontend types ≠ backend types
**Fixed.** Frontend `Deal` and `Event` types now match the backend schema exactly (`acquirer` not `acquirerName`, `target` not `companyName`, `grossSpread` not `currentSpread`, `description` not `summary`). The `mapBackendDeal()` and `mapBackendEvent()` mapping layer deleted. All 15+ component files updated.

### 4. Components imported MOCK_* directly
**Fixed.** All 10 components rewired through `api.ts`. Components never import from constants.

### 5. EFTS broad scan auto-creates noise deals
**Fixed.** Added `origin` field to `FilingMetadata` (`cik_scan` | `efts_broad`). `matchFilingToDeal` now takes `allowAutoCreate` param — only CIK-scanned filings can auto-create deals. EFTS broad scan results only match existing deals.

### 6. RLS declared but not used
**Fixed.** Created `withRLS()` helper in `db/rls.ts` — wraps queries in a transaction that sets `request.jwt.claims` via `set_config()` and switches to `authenticated` role. All 9 tenant-scoped route files migrated from `adminDb` to `withRLS`. RLS is now REAL enforcement. WHERE clauses kept as defense-in-depth.

### 7. 10 cron schedules — NOT stubs
**No change needed.** Investigation showed all 10 handlers are real implementations (99–355 lines each): FTC poller, DOJ RSS, CourtListener, market data, RSS feeds, digest handlers. The schedules are legitimate.

### 8. Dual-worker architecture fragility
**Mitigated.** Pinned `bullmq==2.19.6` (exact version) and `requires-python>=3.10,<3.13` in both `pyproject.toml` and `requirements.txt`. Python 3.14's `asyncio.wait` breaking change is blocked by the version cap.

### 9. CIK leading zeros in SEC Archive URLs
**Fixed.** `buildFilingUrl` and `buildIndexUrl` now strip leading zeros from CIK before constructing URLs.

### 10. Materiality scoring in two languages
**Fixed.** Deleted dead `materiality-scoring.ts` from frontend (0 imports). Python is the authoritative scorer.

### 11. 1381-line mock constants file
**Fixed.** Deleted `constants.ts` (0 imports). All components use `api.ts`.

### 12. Deal board row click off-by-one
**Fixed.** Changed `index > 0` to `index >= 0` and `paginatedDeals[index - 1]` to `paginatedDeals[index]`.

### 13. Signup "check email" with autoconfirm
**Fixed.** Login form now checks `data.session` after `signUp()` — auto-redirects to onboarding if session exists.

### 14. Hardcoded sidebar firm name
**Fixed.** Sidebar fetches firm name from `/api/auth/me` dynamically.

## Remaining — Not Addressed

### Python worker monkey-patch on Python 3.14
The installed `bullmq` package site-packages was monkey-patched to handle `asyncio.wait` empty set. This is a local dev workaround only — the version pin (`<3.13`) prevents this in deployment. If the project needs Python 3.13+, migrate to option C (Node.js spawns Python subprocess per extraction) per Oracle recommendation.

### Gemini API rate limiting (free tier)
LLM extraction pipeline hits 5 req/min quota on free tier. Upgrade API key to paid plan, or add per-model rate limiting in extraction pipelines.

### Old test firm data in Supabase
Multiple orphaned firms from UAT iterations (Arpans rich firm, UAT Test Firm, old UAT Capital). Should be cleaned up via admin tooling or direct DB cleanup.
