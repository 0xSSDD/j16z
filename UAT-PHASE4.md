# UAT Guide — Phase 4

**What was built:** Agency intelligence ingestion (FTC poller, FTC/DOJ RSS pollers), user RSS feed management (CRUD + 10-feed limit), shared fuzzy deal matcher, HSR keyword detection in 8-K pipeline, and the frontend surfaces for all of it (Settings > Integrations, Settings > RSS Feeds, Inbox event rendering).

---

## Tier 1: Automated Tests (no infra needed)

### Python tests (langextract)

```bash
cd apps/langextract
python3 -m pytest --tb=short -q
```

Expected: `107 passed, 4 skipped` in ~2s. The 4 skips are integration tests that need a live Gemini key. The deprecation warning about `google.generativeai` is expected and non-blocking.

### API deal-matcher tests

```bash
cd apps/api
npx vitest run src/tests/deal-matcher.test.ts
```

Expected: `7 passed` covering exact match, normalized match, Jaccard token overlap, suffix stripping, symbol exact-only, no-match below threshold, and multi-firm dedup.

### TypeScript type check

```bash
pnpm check
```

Expected: 0 errors. Two pre-existing warnings in `notifications-inbox.tsx` and `event-timeline.tsx` (`.materiality` field) are known and non-blocking for Phase 4.

---

## Tier 2: Frontend Visual UAT (mock data, no API needed)

Start the frontend:

```bash
cd apps/j16z-frontend
NEXT_PUBLIC_USE_MOCK_DATA=true pnpm dev
```

Open `http://localhost:3000`. Sign in (any credentials work in mock mode), then navigate to each section below.

### Settings > Integrations

Navigate to **Settings > Integrations**.

Check the "Data Source Health" section:

- [ ] Five source cards render: SEC EDGAR, FTC.gov, DOJ.gov, CourtListener, RSS Feeds
- [ ] SEC EDGAR card has a green/emerald icon (FileText icon)
- [ ] FTC.gov and DOJ.gov cards have amber icons (Shield icon)
- [ ] RSS Feeds card has a sky-blue icon (Rss icon)
- [ ] Each card shows "Last sync", "Items ingested", and "Poll interval" rows
- [ ] Status badge in top-right of each card shows "Healthy" (green check), "Degraded" (yellow triangle), or "Down" (red circle)
- [ ] Clicking "Refresh" spins the icon and re-fetches
- [ ] If a source has a last error, a red error box appears at the bottom of its card

Check the "Notification Channels" section:

- [ ] A "Slack Workspace" channel appears with an "Active" badge
- [ ] "Add Channel" button opens a modal with Slack, Email, and Webhook options
- [ ] Selecting Email shows an email input field
- [ ] Selecting Webhook shows a URL input field
- [ ] "Disconnect" removes the channel from the list

### Settings > RSS Feeds

Navigate to **Settings > RSS Feeds**.

- [ ] Empty state shows an RSS icon with "No RSS feeds configured" message
- [ ] "Add Feed" button opens a modal with "Feed Name" and "Feed URL" fields
- [ ] Submitting with an empty name shows "Name is required"
- [ ] Submitting with an invalid URL shows "Invalid URL format"
- [ ] A valid submission adds the feed to the list with an "Active" badge
- [ ] Each feed row shows: name, status badge, URL (monospace, clickable), last sync time, item count
- [ ] Pause button (Pause icon) toggles to Resume (Play icon) and back
- [ ] Paused feeds show a yellow "Paused" badge
- [ ] Delete button (X icon) removes the feed from the list
- [ ] Error feeds show a red "Error" badge and an AlertCircle icon instead of the Rss icon
- [ ] The header subtitle updates: "N feeds configured · N active · N paused"

### Inbox event rendering

Navigate to **Inbox**.

- [ ] AGENCY events render with a Shield icon in amber (`text-amber-400`)
- [ ] NEWS events render with a Newspaper icon in sky blue (`text-sky-400`)
- [ ] FILING events render with a FileText icon in emerald (`text-emerald-400`)
- [ ] COURT events render with a Scale icon in violet (`text-violet-400`)
- [ ] Subtype labels render correctly:
  - `FTC_SECOND_REQUEST` shows "FTC Second Request"
  - `HSR_EARLY_TERMINATION` shows "HSR Early Termination"
  - `FTC_PRESS_RELEASE` shows "FTC Press Release"
  - `DOJ_PRESS_RELEASE` shows "DOJ Press Release"
  - `DOJ_CIVIL_CASE` shows "DOJ Civil Case"
  - `RSS_ARTICLE` shows "RSS Article"
- [ ] Severity badges: CRITICAL shows red dot, WARNING shows yellow dot, INFO shows green dot
- [ ] Events sort by severity descending, then timestamp descending
- [ ] Arrow keys navigate between events
- [ ] Page size controls (20/30/50) and pagination work

---

## Tier 3: API Route Testing (needs API server + Postgres)

Start the API:

```bash
cd apps/api
pnpm dev
```

The API runs on port 3001 and requires a Postgres connection. Use either your Supabase project (configured in `.env`) or a local Docker Postgres from `docker-compose.test.yml`. No Redis, Docker infrastructure, or external API keys needed for this tier.

All `/api/*` routes require a JWT. To get one: sign in via the frontend at `http://localhost:3000`, open DevTools > Application > Local Storage, find the Supabase session key, and copy the `access_token` value.

```bash
TOKEN="<paste access_token here>"
```

### GET /api/integrations/health

```bash
curl -s http://localhost:3001/api/integrations/health \
  -H "Authorization: Bearer $TOKEN" | jq .
```

Expected: `{ "sources": [...] }` with rows from the `ingestion_status` table. Empty array if no pollers have run yet.

### POST /api/rss-feeds

```bash
curl -s -X POST http://localhost:3001/api/rss-feeds \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Reuters M&A", "url": "https://feeds.reuters.com/reuters/mergersNews"}' | jq .
```

Expected: 201 with the created feed object including `id`, `firmId`, `status: "active"`, `type: "custom"`.

Save the ID:

```bash
FEED_ID="<id from response>"
```

### GET /api/rss-feeds

```bash
curl -s http://localhost:3001/api/rss-feeds \
  -H "Authorization: Bearer $TOKEN" | jq .
```

Expected: array containing the feed you just created.

### PATCH /api/rss-feeds/:id (pause)

```bash
curl -s -X PATCH http://localhost:3001/api/rss-feeds/$FEED_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "paused"}' | jq .status
```

Expected: `"paused"`.

### DELETE /api/rss-feeds/:id

```bash
curl -s -o /dev/null -w "%{http_code}" -X DELETE \
  http://localhost:3001/api/rss-feeds/$FEED_ID \
  -H "Authorization: Bearer $TOKEN"
```

Expected: `204`. Subsequent GET should not return this feed (soft delete via `deleted_at`).

### 10-feed limit

Create 10 feeds (the one you deleted doesn't count if it was active):

```bash
for i in $(seq 1 10); do
  curl -s -X POST http://localhost:3001/api/rss-feeds \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"Feed $i\", \"url\": \"https://example.com/feed$i.xml\"}" > /dev/null
done
```

Then try an 11th:

```bash
curl -s -X POST http://localhost:3001/api/rss-feeds \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Feed 11", "url": "https://example.com/feed11.xml"}' | jq .
```

Expected: `400` with `{ "error": "Maximum of 10 active RSS feeds allowed per firm" }`.

---

## Tier 4: End-to-End with Live Data (needs Docker + API keys)

### Start infrastructure

```bash
docker compose -f docker-compose.test.yml up -d
```

Postgres on `localhost:5433`, Redis on `localhost:6380`. Wait for health checks to pass (~10s).

### Run migrations

```bash
cd apps/api
pnpm db:migrate
```

### Configure environment

Add to `apps/api/.env`:

```
FTC_API_KEY=<your key from api.data.gov — free, instant signup>
REDIS_URL=redis://localhost:6380
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/j16z_test
```

Override cron schedules for faster testing (optional):

```
CRON_FTC_POLL=*/2 * * * *
CRON_FTC_COMPETITION_RSS=*/3 * * * *
CRON_DOJ_ANTITRUST_RSS=*/3 * * * *
CRON_DOJ_CIVIL_RSS=*/3 * * * *
CRON_RSS_POLL=*/2 * * * *
```

### Start the worker

```bash
cd apps/api
pnpm worker
```

### Manually trigger a poller

The cleanest way is to enqueue a job directly via Redis CLI:

```bash
# Trigger FTC poll immediately
redis-cli -p 6380 LPUSH bull:ingestion:wait \
  '{"name":"ftc_poll","data":{"triggeredBy":"manual"},"opts":{"attempts":3}}'
```

Or just wait for the cron to fire (2 minutes with the overrides above).

### What to look for in worker logs

For `ftc_poll`:
```
[ftc_poll] Starting poll (triggered by: cron)
[ftc_poll] No tracked deal match for notice <id>. Skipping.   ← expected if no deals match
[ftc_poll] Complete. 0 AGENCY events created from 20 notices.
```

For `ftc_competition_rss` / `doj_antitrust_rss` / `doj_civil_rss`:
```
[ftc_rss] Starting RSS poll (triggered by: cron)
[ftc_rss] Complete. Created N agency events.
```

For `rss_poll`:
```
[rss_poll] Starting RSS poll (triggered by: unknown)
[rss_poll] Completed. feeds=N, failed=0, events=N
```

### Verify events in DB

```bash
psql postgresql://postgres:postgres@localhost:5433/j16z_test \
  -c "SELECT type, sub_type, source, title, created_at FROM events ORDER BY created_at DESC LIMIT 10;"
```

Check ingestion status:

```bash
psql postgresql://postgres:postgres@localhost:5433/j16z_test \
  -c "SELECT source_name, is_healthy, last_successful_sync, items_ingested FROM ingestion_status;"
```

---

## Tier 5: HSR Keyword Detection (Python integration)

This tests the `detect_hsr_event_type` function in `apps/langextract/pipelines/eightk.py` against a real 8-K filing via Gemini.

**Requires:** `GEMINI_API_KEY` (free tier, 5 RPM limit, daily quota applies).

The fixture `apps/langextract/tests/fixtures/discover_capital_one_8k.txt` contains an 8-K that mentions "second request" and should trigger `SECOND_REQUEST` detection.

```bash
cd apps/langextract
GEMINI_API_KEY=<your key> python3 -m pytest tests/test_integration.py -v
```

Expected behavior:
- Filing text containing "second request" returns `SECOND_REQUEST` from `detect_hsr_event_type`
- Confidence is boosted to `>= 0.95` via `apply_hsr_confidence_boost`
- The pipeline creates an event with `sub_type: "FTC_SECOND_REQUEST"` and `materiality_score: 85`

If you hit the 5 RPM rate limit, pytest will show a 429 error. Wait 60 seconds and retry.

To test the keyword detection in isolation (no API call needed):

```python
# python3 -c "..."
from pipelines.eightk import detect_hsr_event_type

print(detect_hsr_event_type("The FTC issued a second request for additional information."))
# Expected: SECOND_REQUEST

print(detect_hsr_event_type("The HSR waiting period was granted early termination."))
# Expected: HSR_EARLY_TERMINATION

print(detect_hsr_event_type("The Hart-Scott-Rodino waiting period has expired."))
# Expected: HSR_WAITING_PERIOD_EXPIRED

print(detect_hsr_event_type("Routine quarterly earnings report."))
# Expected: None
```

---

## Schedule Configuration

All cron schedules can be overridden via environment variables in `apps/api/.env`.

| Job | Env var | Default | Description |
|-----|---------|---------|-------------|
| `edgar_poll` | `CRON_EDGAR_POLL` | `*/15 * * * *` | EDGAR filing scan, every 15 min |
| `ftc_poll` | `CRON_FTC_POLL` | `0 */6 * * *` | FTC early termination API, every 6h |
| `ftc_competition_rss` | `CRON_FTC_COMPETITION_RSS` | `0 */4 * * *` | FTC press release RSS, every 4h |
| `doj_antitrust_rss` | `CRON_DOJ_ANTITRUST_RSS` | `0 1,5,9,13,17,21 * * *` | DOJ antitrust RSS, 6x/day |
| `doj_civil_rss` | `CRON_DOJ_CIVIL_RSS` | `0 */6 * * *` | DOJ civil cases RSS, every 6h |
| `rss_poll` | `CRON_RSS_POLL` | `*/30 * * * *` | User RSS feeds, every 30 min |

Schedules are registered idempotently at API startup via `upsertJobScheduler`. Changing an env var and restarting the API server updates the schedule automatically.

---

## Checklist

### Tier 1: Automated Tests

- [ ] Python tests: `107 passed, 4 skipped`
- [ ] API deal-matcher tests: `7 passed`
- [ ] TypeScript type check: 0 errors

### Tier 2: Frontend Visual UAT

**Integrations tab:**
- [ ] Five source cards render with correct icons and colors
- [ ] Status badges show correct state (Healthy/Degraded/Down)
- [ ] Last sync, items ingested, poll interval display correctly
- [ ] Error box appears when source has a last error
- [ ] Refresh button works
- [ ] Notification channels section renders
- [ ] Add Channel modal opens with Slack/Email/Webhook options

**RSS Feeds tab:**
- [ ] Empty state renders correctly
- [ ] Add Feed modal opens and validates inputs
- [ ] Feed appears in list after creation with Active badge
- [ ] Pause/Resume toggle works and updates badge
- [ ] Delete removes feed from list
- [ ] Header subtitle reflects active/paused/error counts

**Inbox:**
- [ ] AGENCY events: Shield icon, amber color
- [ ] NEWS events: Newspaper icon, sky-blue color
- [ ] FILING events: FileText icon, emerald color
- [ ] COURT events: Scale icon, violet color
- [ ] Subtype labels render human-readable strings
- [ ] Severity badges (red/yellow/green) correct
- [ ] Sort order: severity desc, then timestamp desc
- [ ] Keyboard navigation (arrow keys) works
- [ ] Pagination controls work

### Tier 3: API Routes

- [ ] GET /api/integrations/health returns 200 with sources array
- [ ] POST /api/rss-feeds returns 201 with created feed
- [ ] GET /api/rss-feeds returns array with created feed
- [ ] PATCH /api/rss-feeds/:id pauses feed (status: "paused")
- [ ] DELETE /api/rss-feeds/:id returns 204
- [ ] 11th active feed returns 400 with limit error message

### Tier 4: End-to-End

- [ ] Docker compose starts Postgres (5433) and Redis (6380)
- [ ] Migrations run without errors
- [ ] Worker starts and logs registered job handlers
- [ ] `ftc_poll` runs and logs completion (even if 0 events created)
- [ ] `ftc_competition_rss` runs and logs completion
- [ ] `doj_antitrust_rss` runs and logs completion
- [ ] `rss_poll` runs and logs completion
- [ ] `ingestion_status` table has rows for each source after pollers run
- [ ] AGENCY events appear in `events` table when deal names match

### Tier 5: HSR Keyword Detection

- [ ] `detect_hsr_event_type` returns `SECOND_REQUEST` for "second request" text
- [ ] `detect_hsr_event_type` returns `HSR_EARLY_TERMINATION` for early termination text
- [ ] `detect_hsr_event_type` returns `HSR_WAITING_PERIOD_EXPIRED` for expired waiting period text
- [ ] `detect_hsr_event_type` returns `None` for unrelated text
- [ ] Integration test runs against Gemini with the Capital One 8-K fixture
