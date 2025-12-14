# J 16 Z API Integration Guide

**Purpose:** Complete technical reference for integrating SEC EDGAR, CourtListener, RSS feeds, prediction markets, and email services into the M&A intelligence platform.

**Note:** All code examples use TypeScript/Node.js unless otherwise specified.

---

## Table of Contents
1. [SEC EDGAR API](#sec-edgar-api)
2. [CourtListener API](#courtlistener-api)
3. [RSS Feed Management (Miniflux)](#rss-feed-management)
4. [Prediction Market APIs](#prediction-market-apis)
5. [Email Integration (Resend)](#email-integration)
6. [Database Schema](#database-schema)

---

## SEC EDGAR API

### Overview
- **Base URL:** `https://data.sec.gov/`
- **Authentication:** None required (but User-Agent header mandatory)
- **Rate Limit:** 10 requests per second
- **Cost:** Free
- **Documentation:** https://www.sec.gov/search-filings/edgar-application-programming-interfaces

### Fair Access Policy

**CRITICAL:** The SEC requires a User-Agent header with your company name and email address:

```typescript
const SEC_HEADERS = {
  'User-Agent': 'J16Z contact@j16z.com',
  'Accept-Encoding': 'gzip, deflate',
};
```

Failure to include this header may result in IP blocking.

### Core Endpoints

#### 1. Company Submissions Endpoint

**GET** `/submissions/CIK{10-digit-cik}.json`

Returns all filings for a specific company.

```typescript
interface CompanySubmission {
  cik: string;
  entityType: string;
  sic: string;
  sicDescription: string;
  name: string;
  tickers: string[];
  exchanges: string[];
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      form: string[];
      fileNumber: string[];
      filmNumber: string[];
      items: string[];
      size: number[];
      isXBRL: number[];
      primaryDocument: string[];
      primaryDocDescription: string[];
    };
    files: Array<{
      name: string;
      filingCount: number;
      filingFrom: string;
      filingTo: string;
    }>;
  };
}

async function getCompanyFilings(cik: string): Promise<CompanySubmission> {
  const paddedCik = cik.padStart(10, '0');
  const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;
  
  const response = await fetch(url, { headers: SEC_HEADERS });
  if (!response.ok) {
    throw new Error(`SEC API error: ${response.status}`);
  }
  
  return await response.json();
}

// Example usage
const appleFilings = await getCompanyFilings('320193');
console.log(appleFilings.filings.recent.form); // ['10-K', '8-K', '10-Q', ...]
```

#### 2. Company Facts Endpoint (XBRL Financial Data)

**GET** `/api/xbrl/companyfacts/CIK{cik}.json`

Returns structured financial data from XBRL filings.

```typescript
interface CompanyFacts {
  cik: number;
  entityName: string;
  facts: {
    'us-gaap': {
      [metric: string]: {
        label: string;
        description: string;
        units: {
          [unit: string]: Array<{
            end: string;
            val: number;
            accn: string;
            fy: number;
            fp: string;
            form: string;
            filed: string;
          }>;
        };
      };
    };
  };
}

async function getCompanyFacts(cik: string): Promise<CompanyFacts> {
  const paddedCik = cik.padStart(10, '0');
  const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${paddedCik}.json`;
  
  const response = await fetch(url, { headers: SEC_HEADERS });
  return await response.json();
}

// Example: Get revenue data
const facts = await getCompanyFacts('320193');
const revenue = facts.facts['us-gaap']?.Revenues?.units?.USD;
```

#### 3. Full-Text Search Endpoint

**GET** `https://efts.sec.gov/LATEST/search-index`

Search across all SEC filings.

```typescript
interface SearchParams {
  q: string;              // Search query
  dateRange?: 'custom';
  startdt?: string;       // YYYY-MM-DD
  enddt?: string;         // YYYY-MM-DD
  forms?: string;         // Comma-separated form types
  category?: string;      // 'custom' for specific forms
}

interface SearchResult {
  hits: {
    hits: Array<{
      _id: string;
      _score: number;
      _source: {
        ciks: string[];
        display_names: string[];
        file_num: string;
        film_num: string;
        form: string;
        file_date: string;
        file_description: string;
        adsh: string;
      };
    }>;
    total: { value: number };
  };
}

async function searchFilings(params: SearchParams): Promise<SearchResult> {
  const url = new URL('https://efts.sec.gov/LATEST/search-index');
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value.toString());
  });
  
  const response = await fetch(url.toString(), { headers: SEC_HEADERS });
  return await response.json();
}

// Example: Search for merger agreements
const results = await searchFilings({
  q: 'merger agreement',
  forms: '8-K,DEFM14A,S-4',
  dateRange: 'custom',
  startdt: '2024-01-01',
  enddt: '2024-12-31',
});
```

### M&A-Critical Filing Types

| Form Type | Description | Alert Priority | Typical Contents |
|-----------|-------------|----------------|------------------|
| **8-K** | Current report - material events | 🔴 CRITICAL | M&A announcements (Item 1.01, 2.01), executive changes (Item 5.02) |
| **SC 13D** | Schedule 13D - activist ownership | 🔴 CRITICAL | >5% ownership with intent to influence control |
| **DEFM14A** | Definitive merger proxy | 🔴 CRITICAL | Final merger terms, fairness opinions, shareholder vote details |
| **PREM14A** | Preliminary merger proxy | 🟡 HIGH | Draft merger terms before finalization |
| **S-4** | Registration statement for business combination | 🔴 CRITICAL | Securities issued in merger, full deal terms |
| **SC TO** | Tender offer statement | 🔴 CRITICAL | Hostile or friendly tender offer details |
| **SC 14D9** | Solicitation/recommendation statement | 🟡 HIGH | Target company's response to tender offer |
| **425** | Filing under Securities Act Rule 425 | 🟡 HIGH | Prospectus-level merger communications |
| **SC 13G** | Schedule 13G - passive ownership | 🟢 MEDIUM | >5% ownership without control intent |
| **13-F** | Quarterly institutional holdings | 🟢 MEDIUM | Institutional investor positions |
| **DEF 14A** | Definitive proxy statement | 🟢 LOW | Annual shareholder meeting materials |

### Filing URL Construction

```typescript
function getFilingUrl(cik: string, accessionNumber: string): string {
  const accnClean = accessionNumber.replace(/-/g, '');
  return `https://www.sec.gov/Archives/edgar/data/${cik}/${accnClean}/${accessionNumber}.txt`;
}

function getFilingHtmlUrl(cik: string, accessionNumber: string, primaryDoc: string): string {
  const accnClean = accessionNumber.replace(/-/g, '');
  return `https://www.sec.gov/Archives/edgar/data/${cik}/${accnClean}/${primaryDoc}`;
}

// Example
const url = getFilingHtmlUrl('320193', '0000320193-24-000001', 'd123456d8k.htm');
// https://www.sec.gov/Archives/edgar/data/320193/000032019324000001/d123456d8k.htm
```

### Rate Limiting Implementation

```typescript
class SECClient {
  private requestQueue: Array<() => Promise<any>> = [];
  private processing = false;
  private readonly REQUEST_DELAY_MS = 100; // 10 req/sec = 100ms between requests

  async fetch<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const response = await fetch(url, { headers: SEC_HEADERS });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          resolve(await response.json());
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.requestQueue.length === 0) return;
    
    this.processing = true;
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()!;
      await request();
      await new Promise(resolve => setTimeout(resolve, this.REQUEST_DELAY_MS));
    }
    this.processing = false;
  }
}
```

### Filtering M&A-Relevant Filings

```typescript
const MA_FORM_TYPES = [
  '8-K',
  'SC 13D',
  'SC 13G',
  'DEFM14A',
  'PREM14A',
  'S-4',
  'SC TO',
  'SC TO-T',
  'SC TO-I',
  'SC 14D9',
  '425',
] as const;

function filterMAFilings(submissions: CompanySubmission, daysBack: number = 30): Array<{
  form: string;
  date: string;
  accessionNumber: string;
  description: string;
}> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  
  const recent = submissions.filings.recent;
  const maFilings = [];
  
  for (let i = 0; i < recent.form.length; i++) {
    const filingDate = new Date(recent.filingDate[i]);
    const form = recent.form[i];
    
    if (MA_FORM_TYPES.includes(form as any) && filingDate >= cutoffDate) {
      maFilings.push({
        form,
        date: recent.filingDate[i],
        accessionNumber: recent.accessionNumber[i],
        description: recent.primaryDocDescription[i] || '',
      });
    }
  }
  
  return maFilings;
}
```

### Bulk Data Access

The SEC provides nightly bulk data dumps for historical analysis:

```bash
# Download all company submissions (updated nightly at 3 AM ET)
curl -O https://www.sec.gov/Archives/edgar/daily-index/bulkdata/submissions.zip

# Download company tickers to CIK mapping
curl -O https://www.sec.gov/files/company_tickers.json

# Download mutual fund tickers
curl -O https://www.sec.gov/files/company_tickers_mf.json
```

**TypeScript example:**

```typescript
interface TickerMapping {
  [index: string]: {
    cik_str: number;
    ticker: string;
    title: string;
  };
}

async function getTickerToCikMapping(): Promise<Map<string, string>> {
  const response = await fetch('https://www.sec.gov/files/company_tickers.json');
  const data: TickerMapping = await response.json();
  
  const mapping = new Map<string, string>();
  Object.values(data).forEach(company => {
    mapping.set(company.ticker.toUpperCase(), company.cik_str.toString());
  });
  
  return mapping;
}

// Usage
const tickerMap = await getTickerToCikMapping();
const appleCik = tickerMap.get('AAPL'); // "320193"
```

---

## CourtListener API

### Overview
- **Base URL:** `https://www.courtlistener.com/api/rest/v4/`
- **Authentication:** Token-based (free account required)
- **Rate Limit:** 5,000 requests/hour (authenticated)
- **Cost:** Free for API access; bulk data via AWS S3
- **Documentation:** https://www.courtlistener.com/help/api/rest/

### Authentication

```typescript
const COURTLISTENER_TOKEN = process.env.COURTLISTENER_API_TOKEN;

const CL_HEADERS = {
  'Authorization': `Token ${COURTLISTENER_TOKEN}`,
  'Content-Type': 'application/json',
};
```

### Core Endpoints

#### 1. Search Endpoint

**GET** `/search/`

Full-text search across opinions, RECAP archive (PACER), and oral arguments.

```typescript
interface SearchParams {
  type: 'r' | 'o' | 'oa';  // r=RECAP, o=Opinions, oa=Oral Arguments
  q: string;                // Search query
  court?: string;           // Court ID (e.g., 'ca9', 'dcd')
  nature_of_suit?: string;  // Nature of suit code
  order_by?: string;        // Sort field (default: 'score desc')
}

interface SearchResult {
  count: number;
  next: string | null;
  previous: string | null;
  results: Array<{
    id: number;
    caseName: string;
    docketNumber: string;
    court: string;
    dateArgued: string | null;
    dateFiled: string;
    snippet: string;
    absolute_url: string;
  }>;
}

async function searchCases(params: SearchParams): Promise<SearchResult> {
  const url = new URL('https://www.courtlistener.com/api/rest/v4/search/');
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value.toString());
  });
  
  const response = await fetch(url.toString(), { headers: CL_HEADERS });
  return await response.json();
}

// Example: Search for Microsoft antitrust cases
const results = await searchCases({
  type: 'r',
  q: 'party:"Microsoft" AND antitrust',
  nature_of_suit: '410',  // Antitrust
  order_by: '-date_filed',
});
```

#### 2. Docket Endpoint

**GET** `/dockets/{id}/`

Retrieve metadata for a specific case.

```typescript
interface Docket {
  id: number;
  court: string;
  docket_number: string;
  case_name: string;
  case_name_short: string;
  date_filed: string;
  date_terminated: string | null;
  nature_of_suit: string;
  jury_demand: string;
  pacer_case_id: string;
  assigned_to: number | null;
  referred_to: number | null;
  parties: Array<{
    id: number;
    name: string;
    party_type: string;
  }>;
  docket_entries: string;  // URL to entries
}

async function getDocket(docketId: number): Promise<Docket> {
  const url = `https://www.courtlistener.com/api/rest/v4/dockets/${docketId}/`;
  const response = await fetch(url, { headers: CL_HEADERS });
  return await response.json();
}
```

#### 3. RECAP Documents Endpoint

**GET** `/recap-documents/{id}/`

Access PDF documents from PACER.

```typescript
interface RECAPDocument {
  id: number;
  date_created: string;
  date_modified: string;
  date_upload: string;
  document_number: string;
  attachment_number: number | null;
  pacer_doc_id: string;
  is_available: boolean;
  filepath_local: string;
  absolute_url: string;
  description: string;
  plain_text: string;
  ocr_status: number;
}

async function getRECAPDocument(docId: number): Promise<RECAPDocument> {
  const url = `https://www.courtlistener.com/api/rest/v4/recap-documents/${docId}/`;
  const response = await fetch(url, { headers: CL_HEADERS });
  return await response.json();
}
```

#### 4. Alerts Endpoint

**POST** `/alerts/`

Create real-time or scheduled search alerts.

```typescript
interface AlertConfig {
  name: string;
  query: string;  // URL-encoded search query
  rate: 'rt' | 'dly' | 'wly' | 'mly' | 'off';  // Real-time, daily, weekly, monthly, off
}

async function createAlert(config: AlertConfig): Promise<{ id: number }> {
  const url = 'https://www.courtlistener.com/api/rest/v4/alerts/';
  const response = await fetch(url, {
    method: 'POST',
    headers: CL_HEADERS,
    body: JSON.stringify(config),
  });
  return await response.json();
}

// Example: Create daily alert for SEC enforcement actions
await createAlert({
  name: 'SEC Enforcement Actions',
  query: 'q=party:"Securities and Exchange Commission"&type=r&nature_of_suit=850&order_by=score desc',
  rate: 'dly',
});
```

### Nature of Suit Codes for M&A

| Code | Category | M&A Relevance |
|------|----------|---------------|
| **410** | Antitrust | DOJ/FTC merger challenges |
| **850** | Securities/Commodities/Exchange | SEC enforcement, securities fraud |
| **422** | Bankruptcy Appeals | Chapter 11 restructuring appeals |
| **830** | Patent | IP disputes in acquisitions |
| **840** | Trademark | Brand-related acquisition issues |
| **890** | Other Statutory Actions | Various federal claims |
| **893** | Environmental Matters | Environmental liabilities in deals |

### M&A Litigation Query Examples

```typescript
// 1. Find antitrust challenges to mergers
await searchCases({
  type: 'r',
  q: '(merger OR acquisition) AND (antitrust OR "Clayton Act" OR "Hart-Scott-Rodino")',
  nature_of_suit: '410',
  order_by: '-date_filed',
});

// 2. Find SEC enforcement related to M&A
await searchCases({
  type: 'r',
  q: 'party:"SEC" AND (merger OR "tender offer" OR "going private")',
  nature_of_suit: '850',
});

// 3. Find shareholder class actions against deals
await searchCases({
  type: 'r',
  q: '"class action" AND (merger OR acquisition OR buyout)',
  nature_of_suit: '850',
});

// 4. Find bankruptcy proceedings (distressed M&A)
await searchCases({
  type: 'r',
  q: 'party:"[COMPANY_NAME]" AND "chapter 11"',
  court: 'bap1',  // Bankruptcy Appellate Panel
});
```

### Bulk Data Access via AWS S3

CourtListener provides bulk data snapshots updated monthly:

```bash
# List available bulk files
aws s3 ls s3://com-courtlistener-storage/bulk-data/ --no-sign-request

# Download dockets database (CSV)
aws s3 cp s3://com-courtlistener-storage/bulk-data/dockets-2024-12-31.csv.bz2 . --no-sign-request

# Download opinions database
aws s3 cp s3://com-courtlistener-storage/bulk-data/opinions-2024-12-31.csv.bz2 . --no-sign-request

# Download RECAP documents metadata
aws s3 cp s3://com-courtlistener-storage/bulk-data/recap-documents-2024-12-31.csv.bz2 . --no-sign-request
```

**Note:** Bulk files regenerate on the last day of each month at 3 AM PST.

### Webhook Configuration

CourtListener supports webhooks for real-time alerts (requires organizational agreement):

```typescript
// Webhook payload structure
interface WebhookPayload {
  webhook: {
    version: number;
    event_type: 'docket.alert' | 'search.alert';
    date_created: string;
  };
  payload: {
    results: Array<any>;
    alert: {
      id: number;
      name: string;
      query: string;
    };
  };
}

// Express.js webhook handler
app.post('/webhooks/courtlistener', async (req, res) => {
  const payload: WebhookPayload = req.body;
  
  // Verify HMAC signature (recommended)
  const signature = req.headers['x-courtlistener-signature'];
  // ... verify signature ...
  
  // Process alert
  for (const result of payload.payload.results) {
    await processNewCase(result);
  }
  
  res.status(200).send('OK');
});
```

**Setup requirements:**
- Contact Free Law Project for organizational webhook access
- Provide 2 source IPs to allowlist
- Implement HMAC signature verification
- Handle retry attempts (8 retries with exponential backoff)

---

## RSS Feed Management

### Recommended Solution: Miniflux

CommaFeed lacks webhook support, making **Miniflux** the superior choice for automated M&A news monitoring.

**Why Miniflux:**
- ✅ Native webhook support
- ✅ Comprehensive REST API
- ✅ PostgreSQL-powered full-text search
- ✅ Keeplist/blocklist filtering via regex
- ✅ 25+ built-in integrations

### Miniflux API

- **Base URL:** `https://your-miniflux-instance/v1/`
- **Authentication:** API token in `X-Auth-Token` header
- **Documentation:** https://miniflux.app/docs/api.html

### Authentication

```typescript
const MINIFLUX_TOKEN = process.env.MINIFLUX_API_TOKEN;

const MINIFLUX_HEADERS = {
  'X-Auth-Token': MINIFLUX_TOKEN,
  'Content-Type': 'application/json',
};
```

### Core Endpoints

#### 1. Create Feed

**POST** `/v1/feeds`

```typescript
interface CreateFeedRequest {
  feed_url: string;
  category_id?: number;
  crawler?: boolean;
  user_agent?: string;
  keeplist_rules?: string;  // Regex for filtering
  blocklist_rules?: string;
}

interface Feed {
  id: number;
  user_id: number;
  feed_url: string;
  site_url: string;
  title: string;
  category: {
    id: number;
    title: string;
  };
  parsing_error_count: number;
  parsing_error_message: string;
}

async function createFeed(config: CreateFeedRequest): Promise<Feed> {
  const url = 'https://your-miniflux.com/v1/feeds';
  const response = await fetch(url, {
    method: 'POST',
    headers: MINIFLUX_HEADERS,
    body: JSON.stringify(config),
  });
  return await response.json();
}

// Example: Add Reuters with M&A keyword filtering
await createFeed({
  feed_url: 'https://feeds.reuters.com/reuters/businessNews',
  category_id: 1,
  keeplist_rules: '(merger|acquisition|acqui|takeover|buyout|divest)',
});
```

#### 2. Get Entries (Articles)

**GET** `/v1/entries`

```typescript
interface GetEntriesParams {
  status?: 'unread' | 'read' | 'removed';
  order?: 'id' | 'status' | 'published_at' | 'category_title';
  direction?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  category_id?: number;
  feed_id?: number;
  starred?: boolean;
  search?: string;
}

interface Entry {
  id: number;
  user_id: number;
  feed_id: number;
  title: string;
  url: string;
  comments_url: string;
  author: string;
  content: string;
  hash: string;
  published_at: string;
  status: 'unread' | 'read' | 'removed';
  starred: boolean;
  feed: {
    id: number;
    title: string;
  };
}

interface EntriesResponse {
  total: number;
  entries: Entry[];
}

async function getEntries(params: GetEntriesParams): Promise<EntriesResponse> {
  const url = new URL('https://your-miniflux.com/v1/entries');
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, value.toString());
  });
  
  const response = await fetch(url.toString(), { headers: MINIFLUX_HEADERS });
  return await response.json();
}

// Example: Get unread M&A news
const news = await getEntries({
  status: 'unread',
  order: 'published_at',
  direction: 'desc',
  limit: 50,
});
```

#### 3. Update Entry Status

**PUT** `/v1/entries`

```typescript
interface UpdateEntriesRequest {
  entry_ids: number[];
  status: 'read' | 'unread' | 'removed';
}

async function markEntriesAsRead(entryIds: number[]): Promise<void> {
  const url = 'https://your-miniflux.com/v1/entries';
  await fetch(url, {
    method: 'PUT',
    headers: MINIFLUX_HEADERS,
    body: JSON.stringify({
      entry_ids: entryIds,
      status: 'read',
    }),
  });
}
```

#### 4. Create Category

**POST** `/v1/categories`

```typescript
interface CreateCategoryRequest {
  title: string;
}

async function createCategory(title: string): Promise<{ id: number; title: string }> {
  const url = 'https://your-miniflux.com/v1/categories';
  const response = await fetch(url, {
    method: 'POST',
    headers: MINIFLUX_HEADERS,
    body: JSON.stringify({ title }),
  });
  return await response.json();
}

// Setup M&A news categories
const secCategory = await createCategory('SEC Filings');
const newsCategory = await createCategory('M&A News');
const analysisCategory = await createCategory('Deal Analysis');
```

### Webhook Configuration

Miniflux can push new entries to your webhook endpoint:

```typescript
// Configure in Miniflux UI: Settings → Integrations → Webhook URL
// https://your-api.com/webhooks/miniflux

interface MinifluxWebhook {
  event_type: 'new_entries' | 'save_entry';
  entry: Entry;
}

// Express.js handler
app.post('/webhooks/miniflux', async (req, res) => {
  const webhook: MinifluxWebhook = req.body;
  
  // Verify signature
  const signature = req.headers['x-miniflux-signature'] as string;
  const secret = process.env.MINIFLUX_WEBHOOK_SECRET!;
  // HMAC-SHA256 verification...
  
  if (webhook.event_type === 'new_entries') {
    await processNewArticle(webhook.entry);
  }
  
  res.status(200).send('OK');
});
```

### Recommended RSS Feeds for M&A Monitoring

```typescript
const MA_RSS_FEEDS = [
  {
    url: 'https://feeds.reuters.com/reuters/businessNews',
    title: 'Reuters Business News',
    keeplist: '(merger|acquisition|acqui|takeover|buyout|divest|spin-off)',
  },
  {
    url: 'https://feeds.marketwatch.com/marketwatch/topstories',
    title: 'MarketWatch Top Stories',
    keeplist: '(M&A|merger|acquisition|deal)',
  },
  {
    url: 'https://seekingalpha.com/feed.xml',
    title: 'Seeking Alpha',
    keeplist: '(merger|acquisition|buyout)',
  },
  {
    url: 'https://corpgov.law.harvard.edu/category/mergers-acquisition/feed',
    title: 'Harvard Law Forum on Corporate Governance',
    keeplist: '',  // All articles relevant
  },
  {
    url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=8-K&company=&dateb=&owner=include&count=100&output=atom',
    title: 'SEC EDGAR - All 8-K Filings',
    keeplist: '',
  },
];

// Setup all feeds
for (const feed of MA_RSS_FEEDS) {
  await createFeed({
    feed_url: feed.url,
    category_id: newsCategory.id,
    keeplist_rules: feed.keeplist,
  });
}
```

### Docker Deployment

```yaml
version: '3'
services:
  miniflux:
    image: miniflux/miniflux:latest
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgres://miniflux:secret@db/miniflux?sslmode=disable
      - RUN_MIGRATIONS=1
      - CREATE_ADMIN=1
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=changeme123
      - POLLING_FREQUENCY=15  # minutes
      - BATCH_SIZE=100
    depends_on:
      - db
  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=miniflux
      - POSTGRES_PASSWORD=secret
      - POSTGRES_DB=miniflux
    volumes:
      - miniflux-db:/var/lib/postgresql/data
volumes:
  miniflux-db:
```

**Deploy command:**
```bash
docker-compose up -d
```

---

## Prediction Market APIs

### Polymarket API

- **Gamma API:** `https://gamma-api.polymarket.com` (market discovery)
- **CLOB API:** `https://clob.polymarket.com` (order book, pricing)
- **Documentation:** https://docs.polymarket.com/

**Note:** Polymarket operates on Polygon blockchain. For read-only price data, no wallet required.

#### Get Active Markets

**GET** `https://gamma-api.polymarket.com/events`

```typescript
interface PolymarketEvent {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  markets: Array<{
    id: string;
    question: string;
    outcomes: string[];
    clobTokenIds: string[];
    volume: string;
  }>;
}

async function getActiveMarkets(): Promise<PolymarketEvent[]> {
  const url = 'https://gamma-api.polymarket.com/events?closed=false&limit=100';
  const response = await fetch(url);
  return await response.json();
}

// Filter for M&A-related markets
function filterMAMarkets(events: PolymarketEvent[]): PolymarketEvent[] {
  const keywords = ['merger', 'acquisition', 'acquire', 'takeover', 'buyout', 'deal'];
  return events.filter(event => {
    const text = `${event.title} ${event.description}`.toLowerCase();
    return keywords.some(kw => text.includes(kw));
  });
}
```

#### Get Market Price

**GET** `https://clob.polymarket.com/price`

```typescript
interface PriceResponse {
  price: string;  // Decimal between 0-1 (probability)
  timestamp: string;
}

async function getMarketPrice(tokenId: string): Promise<number> {
  const url = `https://clob.polymarket.com/price?token_id=${tokenId}&side=buy`;
  const response = await fetch(url);
  const data: PriceResponse = await response.json();
  return parseFloat(data.price);
}

// Example: Microsoft-Activision deal completion odds
const probability = await getMarketPrice('21742633143463906290569050155826241533067272736897614950488156847949938836455');
console.log(`Deal completion probability: ${(probability * 100).toFixed(1)}%`);
```

#### TypeScript SDK

```bash
npm install @polymarket/clob-client
```

```typescript
import { ClobClient } from '@polymarket/clob-client';

const client = new ClobClient('https://clob.polymarket.com');

// Get orderbook for a market
const orderbook = await client.getOrderBook('0x123...');

// Get recent trades
const trades = await client.getTrades({ market: '0x123...' });
```

### Kalshi API

- **Base URL:** `https://api.kalshi.com/trade-api/v2`
- **Documentation:** https://docs.kalshi.com/
- **Authentication:** API key required (free account)

**Note:** Kalshi is CFTC-regulated, making it legal for US users.

#### Authentication

```typescript
const KALSHI_API_KEY = process.env.KALSHI_API_KEY;
const KALSHI_API_SECRET = process.env.KALSHI_API_SECRET;

async function getKalshiToken(): Promise<string> {
  const response = await fetch('https://api.kalshi.com/trade-api/v2/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: KALSHI_API_KEY,
      password: KALSHI_API_SECRET,
    }),
  });
  const data = await response.json();
  return data.token;
}
```

#### Get Markets

**GET** `/markets`

```typescript
interface KalshiMarket {
  ticker: string;
  event_ticker: string;
  market_type: string;
  title: string;
  subtitle: string;
  yes_ask: number;
  yes_bid: number;
  volume: number;
  open_interest: number;
  close_time: string;
}

async function getKalshiMarkets(token: string, category?: string): Promise<KalshiMarket[]> {
  const url = new URL('https://api.kalshi.com/trade-api/v2/markets');
  if (category) url.searchParams.set('category', category);
  
  const response = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await response.json();
  return data.markets;
}

// Example: Get economics-related markets
const token = await getKalshiToken();
const markets = await getKalshiMarkets(token, 'economics');
```

---

## Email Integration

### Resend API

- **Base URL:** `https://api.resend.com`
- **Documentation:** https://resend.com/docs
- **Free Tier:** 3,000 emails/month, 100 emails/day
- **Pricing:** $20/month for 50,000 emails

#### Authentication

```typescript
const RESEND_API_KEY = process.env.RESEND_API_KEY;

const RESEND_HEADERS = {
  'Authorization': `Bearer ${RESEND_API_KEY}`,
  'Content-Type': 'application/json',
};
```

#### Send Email

**POST** `/emails`

```typescript
interface SendEmailRequest {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  reply_to?: string;
  tags?: Array<{ name: string; value: string }>;
}

interface SendEmailResponse {
  id: string;
}

async function sendEmail(email: SendEmailRequest): Promise<SendEmailResponse> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: RESEND_HEADERS,
    body: JSON.stringify(email),
  });
  return await response.json();
}

// Example: Send M&A digest
await sendEmail({
  from: 'alerts@j16z.com',
  to: 'analyst@firm.com',
  subject: 'M&A Digest: 5 new filings, 12 news articles',
  html: `
    <h1>M&A Intelligence Digest</h1>
    <h2>SEC Filings (5)</h2>
    <ul>
      <li><strong>8-K</strong> - Microsoft: Material definitive agreement</li>
      <li><strong>SC 13D</strong> - Tesla: Activist investor Elliot Management</li>
    </ul>
    <h2>News Articles (12)</h2>
    <ul>
      <li>Reuters: Adobe abandons Figma acquisition after regulatory pressure</li>
    </ul>
  `,
});
```

#### Email Template (TypeScript/React)

```bash
npm install react-email @react-email/components
```

```typescript
import { Html, Head, Body, Container, Heading, Text, Link } from '@react-email/components';

interface DigestEmailProps {
  filings: Array<{ form: string; company: string; description: string; url: string }>;
  news: Array<{ title: string; source: string; url: string }>;
  date: string;
}

export default function DigestEmail({ filings, news, date }: DigestEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f4f4' }}>
        <Container style={{ backgroundColor: 'white', padding: '20px', maxWidth: '600px' }}>
          <Heading>M&A Intelligence Digest</Heading>
          <Text>Your daily summary for {date}</Text>
          
          <Heading as="h2">🔔 SEC Filings ({filings.length})</Heading>
          {filings.map((filing, i) => (
            <div key={i} style={{ marginBottom: '10px' }}>
              <strong>{filing.form}</strong> - {filing.company}
              <br />
              {filing.description}
              <br />
              <Link href={filing.url}>View on SEC EDGAR →</Link>
            </div>
          ))}
          
          <Heading as="h2">📰 News Articles ({news.length})</Heading>
          {news.map((article, i) => (
            <div key={i} style={{ marginBottom: '10px' }}>
              <Link href={article.url}>{article.title}</Link>
              <br />
              <Text style={{ color: '#666', fontSize: '12px' }}>{article.source}</Text>
            </div>
          ))}
          
          <Link href="https://j16z.com/dashboard">View Full Dashboard →</Link>
        </Container>
      </Body>
    </Html>
  );
}

// Render to HTML
import { render } from '@react-email/render';
const html = render(<DigestEmail filings={[...]} news={[...]} date="Dec 13, 2024" />);
```

---

## Database Schema

### PostgreSQL Schema for M&A Intelligence Platform

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  ticker VARCHAR(10) UNIQUE,
  cik VARCHAR(10) UNIQUE,
  sector VARCHAR(100),
  industry VARCHAR(100),
  market_cap BIGINT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User watchlists
CREATE TABLE watchlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,  -- Clerk user ID
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- SEC filings
CREATE TABLE filings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  form_type VARCHAR(20) NOT NULL,
  filing_date DATE NOT NULL,
  accession_number VARCHAR(25) UNIQUE NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  primary_document VARCHAR(255),
  items TEXT[],  -- Array of Item numbers (e.g., ['1.01', '2.01'])
  raw_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_filings_company_date (company_id, filing_date DESC),
  INDEX idx_filings_form_date (form_type, filing_date DESC),
  INDEX idx_filings_accession (accession_number)
);

-- News articles (from RSS)
CREATE TABLE news_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  source VARCHAR(100),
  author VARCHAR(255),
  published_at TIMESTAMP,
  content TEXT,
  summary TEXT,
  sentiment_score DECIMAL(4,3),  -- -1.000 to 1.000
  company_mentions UUID[],  -- Array of company IDs
  raw_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_news_published (published_at DESC),
  INDEX idx_news_company_mentions USING GIN(company_mentions)
);

-- Court cases
CREATE TABLE court_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  courtlistener_id INTEGER UNIQUE,
  docket_number VARCHAR(50),
  court VARCHAR(50),
  case_name TEXT,
  date_filed DATE,
  date_terminated DATE,
  nature_of_suit VARCHAR(10),
  status VARCHAR(50),
  parties JSONB,
  company_id UUID REFERENCES companies(id),
  url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_cases_company (company_id, date_filed DESC),
  INDEX idx_cases_nos (nature_of_suit, date_filed DESC)
);

-- Prediction markets
CREATE TABLE prediction_markets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform VARCHAR(50),  -- 'polymarket', 'kalshi'
  market_id VARCHAR(255) UNIQUE,
  title TEXT,
  question TEXT,
  outcomes JSONB,
  current_probability DECIMAL(5,4),  -- 0.0000 to 1.0000
  volume BIGINT,
  company_id UUID REFERENCES companies(id),
  end_date TIMESTAMP,
  url TEXT,
  last_updated TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_markets_company (company_id, last_updated DESC)
);

-- User alerts configuration
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  alert_type VARCHAR(50),  -- 'filing', 'news', 'litigation', 'prediction'
  enabled BOOLEAN DEFAULT TRUE,
  frequency VARCHAR(20) DEFAULT 'daily',  -- 'realtime', 'daily', 'weekly'
  config JSONB,  -- Alert-specific configuration
  last_triggered TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_alerts_user_enabled (user_id, enabled)
);

-- Email digest logs
CREATE TABLE digest_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  filings_count INTEGER DEFAULT 0,
  news_count INTEGER DEFAULT 0,
  cases_count INTEGER DEFAULT 0,
  email_id VARCHAR(100),  -- Resend message ID
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  INDEX idx_digests_user_sent (user_id, sent_at DESC)
);

-- Full-text search
CREATE INDEX idx_filings_description_fts ON filings USING gin(to_tsvector('english', description));
CREATE INDEX idx_news_content_fts ON news_articles USING gin(to_tsvector('english', title || ' ' || content));

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Rate Limiting & Cost Management

| Service | Rate Limit | Free Tier | Paid Plan | Notes |
|---------|------------|-----------|-----------|-------|
| SEC EDGAR | 10 req/sec | Unlimited | N/A | User-Agent required |
| CourtListener | 5,000/hour | ✅ | N/A | Token auth |
| Miniflux | Self-hosted | ✅ | N/A | No external limits |
| Polymarket | 1,000/hour | ✅ | Premium available | Read-only free |
| Kalshi | 100/min | ✅ | Enterprise | Requires account |
| Resend | 100/day | 3,000/month free | $20/mo for 50K | SOC 2 Type II |

### Recommended Rate Limiting Strategy

```typescript
// Generic rate limiter using p-queue
import PQueue from 'p-queue';

class RateLimitedClient {
  private queue: PQueue;
  
  constructor(requestsPerSecond: number) {
    this.queue = new PQueue({
      interval: 1000,
      intervalCap: requestsPerSecond,
    });
  }
  
  async fetch<T>(url: string, options?: RequestInit): Promise<T> {
    return this.queue.add(async () => {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    });
  }
}

// Usage
const secClient = new RateLimitedClient(10);  // 10 req/sec
const clClient = new RateLimitedClient(83);   // 5,000/hour ≈ 83/min
```

---

## Error Handling Best Practices

```typescript
class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public service: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        // Rate limited - exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (!response.ok) {
        throw new APIError(
          `HTTP ${response.status}`,
          response.status,
          new URL(url).hostname,
          response.status >= 500
        );
      }
      
      return await response.json();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      if (error instanceof APIError && !error.retryable) throw error;
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

---

## Environment Variables Checklist

```bash
# SEC EDGAR (no auth needed, but recommended)
SEC_USER_AGENT="J16Z contact@j16z.com"

# CourtListener
COURTLISTENER_API_TOKEN="your_token_here"

# Miniflux
MINIFLUX_URL="https://miniflux.yourserver.com"
MINIFLUX_API_TOKEN="your_token_here"
MINIFLUX_WEBHOOK_SECRET="webhook_secret_here"

# Polymarket (optional - read-only works without)
# POLYMARKET_API_KEY="not_required_for_read"

# Kalshi
KALSHI_API_KEY="your_email@example.com"
KALSHI_API_SECRET="your_password"

# Resend
RESEND_API_KEY="re_your_key_here"
RESEND_FROM_EMAIL="alerts@j16z.com"

# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# App Config
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://j16z.com"
```

---

## Next Steps

1. **Set up development environment**
   - Install Node.js 18+, PostgreSQL 15+
   - Create accounts: Clerk, Resend, CourtListener
   - Deploy Miniflux via Docker

2. **Build core API routes**
   - `/api/companies` - CRUD for watchlist
   - `/api/filings` - SEC EDGAR integration
   - `/api/alerts` - Alert configuration
   - `/api/webhooks/miniflux` - RSS webhook handler

3. **Implement background jobs**
   - Scheduled SEC polling (every 15 min)
   - Daily digest generation (7 AM ET)
   - News article processing (on webhook)

4. **Create frontend**
   - Dashboard with filing feed
   - Watchlist management UI
   - Alert configuration page

5. **Deploy to production**
   - Railway or Render for backend
   - Vercel for frontend
   - Set up monitoring (Sentry)

