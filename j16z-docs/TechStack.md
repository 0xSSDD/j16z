# J 16 Z - MVP Technical Specification

## Executive Summary

J 16 Z is an AI-powered M&A information synthesis platform designed to reduce the 70% of analyst time currently spent on information gathering. The MVP targets David's immediate needs: automated SEC filing monitoring, intelligent email digests, and AI-generated company summaries.

**Core Value Proposition:** Deliver relevant M&A intelligence directly to analysts' inboxes without manual searching across multiple sources.

---

## Tech Stack

### Frontend & Hosting
- **Next.js 14+** (App Router) - Full-stack React framework
- **Vercel** - Hosting, deployment, cron jobs
- **Shadcn/ui** - Component library built on Radix UI
- **TanStack Query** - Data fetching and caching
- **pnpm** - Package manager

### Backend & Database
- **Supabase** - PostgreSQL database, real-time subscriptions, storage
- **Supabase Auth** - Authentication and user management
- **Vercel Edge Functions** - API routes for fast response times
- **Vercel Cron Jobs** - Scheduled tasks (SEC polling, RSS feeds)

### AI & Monitoring
- **Perplexity API** - AI-powered search and synthesis
- **Helicone** - AI API monitoring, cost tracking, analytics

### Email & Communication
- **Resend** - Transactional emails and digests

### Data Sources (Phase 1)
- **SEC EDGAR** - Free REST API for regulatory filings
- **RSS Feeds** - Via built-in parsing (no external service needed)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │  Watchlist   │  │  Settings    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Routes (Next.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ /api/filings │  │ /api/company │  │ /api/digest  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │  Supabase   │  │ Perplexity  │  │   Resend    │
    │   (Data)    │  │ (AI Synth)  │  │   (Email)   │
    └─────────────┘  └─────────────┘  └─────────────┘
              │               │
              └───────────────┘
                      ▼
              ┌─────────────┐
              │  Helicone   │
              │ (Monitoring)│
              └─────────────┘
                      ▲
                      │
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Cron Jobs                          │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │ SEC Filing Monitor   │  │ RSS Feed Aggregator  │        │
│  │ (Every 15 min)       │  │ (Every 30 min)       │        │
│  └──────────────────────┘  └──────────────────────┘        │
│  ┌──────────────────────┐                                   │
│  │ Daily Email Digest   │                                   │
│  │ (7 AM user timezone) │                                   │
│  └──────────────────────┘                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Features (Must-Ship)

### 1. Company Watchlist Management

**User Story:** David can add/remove companies to monitor, specifying which filing types matter.

**Functionality:**
- Add companies by ticker symbol or CIK number
- Select filing types to monitor (10-K, 10-Q, 8-K, DEF 14A, 13F, 13D/13G)
- Set notification preferences (immediate, daily digest, both)
- Tag companies by deal stage or category

**Database Schema:**
```sql
-- Watchlist
watchlist (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  ticker varchar(10),
  company_name varchar(255),
  cik varchar(10),
  filing_types text[], -- Array of filing types to monitor
  tags text[],
  notification_preference varchar(20), -- 'immediate', 'digest', 'both'
  created_at timestamp,
  updated_at timestamp
)

-- Indexes
CREATE INDEX idx_watchlist_user ON watchlist(user_id);
CREATE INDEX idx_watchlist_ticker ON watchlist(ticker);
```

### 2. SEC Filing Alerts

**User Story:** When a watched company files with the SEC, David receives a notification with AI-generated summary.

**Functionality:**
- Poll SEC EDGAR API every 15 minutes
- Match new filings against user watchlists
- Generate AI summary using Perplexity
- Store filing metadata and summary
- Trigger notification (email or in-app)

**Implementation:**
```typescript
// app/api/cron/sec-monitor/route.ts
export async function GET(request: Request) {
  // 1. Fetch recent filings from SEC EDGAR
  // 2. Query active watchlists from Supabase
  // 3. Match filings to watchlists
  // 4. For each match:
  //    - Generate AI summary via Perplexity
  //    - Store in database
  //    - Queue notification
  // 5. Return success status
}
```

**Database Schema:**
```sql
-- SEC Filings
sec_filings (
  id uuid PRIMARY KEY,
  ticker varchar(10),
  cik varchar(10),
  filing_type varchar(20),
  filing_date date,
  accession_number varchar(25) UNIQUE,
  document_url text,
  raw_text text, -- Full filing text
  ai_summary text, -- Perplexity-generated summary
  key_highlights jsonb, -- Structured extraction
  processed_at timestamp,
  created_at timestamp
)

-- Filing Notifications (for delivery tracking)
filing_notifications (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  filing_id uuid REFERENCES sec_filings,
  notification_type varchar(20), -- 'immediate', 'digest'
  sent_at timestamp,
  read_at timestamp,
  created_at timestamp
)

-- Indexes
CREATE INDEX idx_filings_ticker ON sec_filings(ticker);
CREATE INDEX idx_filings_date ON sec_filings(filing_date DESC);
CREATE INDEX idx_filings_accession ON sec_filings(accession_number);
CREATE INDEX idx_notifications_user ON filing_notifications(user_id, sent_at DESC);
```

### 3. AI-Powered Company Summaries

**User Story:** David clicks on a company and gets an instant, comprehensive summary synthesized from multiple sources.

**Functionality:**
- Generate on-demand company profiles
- Synthesize data from:
  - Latest SEC filings (10-K, 10-Q)
  - Recent 8-Ks (material events)
  - Public news (via Perplexity search)
- Cache summaries with 24-hour TTL
- Display key metrics, recent events, risk factors

**Implementation Approach:**
```typescript
// app/api/company/[ticker]/summary/route.ts
export async function GET(
  request: Request,
  { params }: { params: { ticker: string } }
) {
  // 1. Check cache (Supabase table or Redis later)
  // 2. If stale/missing:
  //    - Query latest filings from database
  //    - Call Perplexity for synthesis
  //    - Structure response (exec summary, financials, risks)
  //    - Cache result
  // 3. Return summary
}
```

**Database Schema:**
```sql
-- Company Summaries (cached)
company_summaries (
  id uuid PRIMARY KEY,
  ticker varchar(10) UNIQUE,
  company_name varchar(255),
  executive_summary text,
  business_overview text,
  recent_events jsonb, -- Array of {date, type, description}
  financial_highlights jsonb,
  risk_factors text[],
  sources_used jsonb, -- Citation tracking
  generated_at timestamp,
  expires_at timestamp,
  created_at timestamp
)

-- Index
CREATE INDEX idx_summaries_ticker ON company_summaries(ticker);
CREATE INDEX idx_summaries_expiry ON company_summaries(expires_at);
```

### 4. Daily Email Digest

**User Story:** Every morning at 7 AM, David receives an email with overnight SEC filings, relevant news, and company updates.

**Functionality:**
- Aggregate previous 24 hours of activity
- Group by company, then by event type
- Generate concise summaries for each item
- Personalized subject line (e.g., "3 SEC filings, 2 news alerts")
- Beautiful HTML email with proper formatting
- Direct links back to platform

**Implementation:**
```typescript
// app/api/cron/daily-digest/route.ts
export async function GET(request: Request) {
  // 1. Get all users with digest enabled
  // 2. For each user:
  //    - Fetch unsent notifications from last 24h
  //    - Group by company
  //    - Generate digest HTML
  //    - Send via Resend
  //    - Mark notifications as sent
  // 3. Log delivery stats
}
```

**Email Template Structure:**
```
Subject: J 16 Z Digest: 5 updates for your watchlist

Header:
- Logo
- Date range covered
- Quick stats

Body Sections:
1. SEC Filings (grouped by company)
   - Company name, ticker
   - Filing type, date
   - AI summary (3-4 sentences)
   - "Read full analysis" link

2. Material Events (8-Ks)
   - Grouped by event type
   - Brief description
   - Link to details

3. News & Analysis
   - Aggregated relevant news
   - Sentiment indicator

Footer:
- Manage preferences link
- Unsubscribe link
```

### 5. Dashboard Interface

**User Story:** David logs in and immediately sees his watchlist, recent filings, and pending actions.

**Key Components:**

**Watchlist Table:**
- Company name, ticker, industry
- Latest filing date and type
- Quick actions (view summary, remove)
- Add new company button

**Recent Activity Feed:**
- Last 20 filings across all watched companies
- Date, company, filing type, summary snippet
- Click to expand full summary
- Filter by filing type or date range

**Quick Stats Cards:**
- Total companies watched
- Filings this week
- Pending notifications
- Most active company

**UI Framework:**
- Shadcn components throughout
- Dark mode support
- Responsive design (mobile-friendly)
- Loading states with skeletons
- Error boundaries

---

## Data Source Integrations

### SEC EDGAR API

**Endpoint:** `https://data.sec.gov/submissions/CIK##########.json`

**Authentication:** User-Agent header required
```
User-Agent: J16Z info@j16z.com
```

**Rate Limit:** 10 requests/second

**Key Filing Types:**
- **10-K**: Annual report (comprehensive company overview)
- **10-Q**: Quarterly report (financial updates)
- **8-K**: Current events (M&A, leadership, material changes)
- **DEF 14A**: Proxy statement (governance, exec comp)
- **13F**: Institutional holdings (quarterly positions)
- **13D/13G**: Beneficial ownership (5%+ stakes)

**Implementation Pattern:**
```typescript
// lib/sec-edgar.ts
export async function fetchCompanyFilings(cik: string) {
  const response = await fetch(
    `https://data.sec.gov/submissions/CIK${cik.padStart(10, '0')}.json`,
    {
      headers: {
        'User-Agent': 'J16Z info@j16z.com',
      },
    }
  );

  const data = await response.json();
  return data.filings.recent; // Last 1000 filings
}

export async function fetchFilingDocument(accessionNumber: string) {
  // Construct document URL
  // Fetch full text
  // Return processed content
}
```

**Caching Strategy:**
- Company metadata: 7 days
- Filing lists: 1 hour
- Document content: Permanent (immutable)

### RSS Feed Integration

**Target Sources (Phase 1):**
- Reuters M&A feed
- Wall Street Journal Deals
- Bloomberg M&A News
- Financial Times Mergers

**Implementation:**
```typescript
// lib/rss-parser.ts
import Parser from 'rss-parser';

const parser = new Parser();

export async function fetchRSSFeed(url: string) {
  const feed = await parser.parseURL(url);

  return feed.items.map(item => ({
    title: item.title,
    link: item.link,
    pubDate: new Date(item.pubDate),
    content: item.contentSnippet,
    source: feed.title,
  }));
}
```

**Storage:**
```sql
-- RSS Feed Items
rss_items (
  id uuid PRIMARY KEY,
  source varchar(100),
  title text,
  url text UNIQUE,
  content text,
  published_at timestamp,
  relevant_companies text[], -- Extracted tickers
  created_at timestamp
)

-- Index
CREATE INDEX idx_rss_published ON rss_items(published_at DESC);
CREATE INDEX idx_rss_companies ON rss_items USING GIN(relevant_companies);
```

---

## AI Implementation

### Perplexity API Setup

**Model Selection:** `llama-3.1-sonar-large-128k-online`
- 128k context window
- Real-time web search
- Citation support

**Use Cases:**
1. **Filing Summarization**
2. **Company Profile Generation**
3. **News Synthesis**

**Implementation via Helicone:**
```typescript
// lib/ai/perplexity.ts
import OpenAI from 'openai';

const perplexity = new OpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY,
  baseURL: 'https://gateway.helicone.ai/v1',
  defaultHeaders: {
    'Helicone-Auth': `Bearer ${process.env.HELICONE_API_KEY}`,
    'Helicone-Property-Environment': process.env.NODE_ENV,
  },
});

export async function summarizeSECFiling(
  ticker: string,
  filingType: string,
  filingText: string
) {
  const response = await perplexity.chat.completions.create({
    model: 'llama-3.1-sonar-large-128k-online',
    messages: [
      {
        role: 'system',
        content: `You are an M&A analyst assistant. Summarize SEC filings
                  with focus on material events, financial changes, and
                  deal-relevant information. Be concise and cite specific
                  sections.`,
      },
      {
        role: 'user',
        content: `Summarize this ${filingType} for ${ticker}:\n\n${filingText.slice(0, 50000)}`,
      },
    ],
    max_tokens: 1000,
  });

  return response.choices[0].message.content;
}
```

**Cost Monitoring:**
- Helicone dashboard tracks per-request costs
- Set budget alerts at $50, $100, $200 thresholds
- Monitor average cost per summary
- Optimize prompts to reduce token usage

**Prompt Templates:**

**SEC Filing Summary:**
```
Analyze this [FILING_TYPE] for [TICKER] and provide:

1. Executive Summary (2-3 sentences)
2. Key Financial Changes (if applicable)
3. Material Events or Risks
4. M&A Relevance (deal activity, acquisition mentions, strategic changes)

Filing excerpt:
[FILING_TEXT]

Format as markdown with clear sections. Cite specific item numbers or page references.
```

**Company Profile:**
```
Create a comprehensive M&A-focused profile for [COMPANY_NAME] ([TICKER]):

1. Business Overview (2-3 sentences)
2. Recent M&A Activity (last 2 years)
3. Strategic Direction
4. Financial Health (based on latest 10-K/10-Q)
5. Potential Deal Catalysts

Use recent SEC filings and current news. Include dates and sources.
```

---

## Authentication & Authorization

### Supabase Auth Configuration

**Providers Enabled:**
- Email/Password (primary)
- Magic Link (passwordless)
- Google OAuth (future: Microsoft for enterprise)

**User Flow:**
```
1. Sign up → email verification required
2. Login → JWT token issued (1 hour expiry)
3. Session refresh → automatic via Supabase client
4. Logout → token invalidation
```

**Row-Level Security (RLS):**
```sql
-- Watchlist: users can only access their own
CREATE POLICY "Users manage own watchlist"
  ON watchlist
  FOR ALL
  USING (auth.uid() = user_id);

-- Summaries: authenticated users can read
CREATE POLICY "Authenticated users read summaries"
  ON company_summaries
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Filings: public read (citations), private writes
CREATE POLICY "Public read filings"
  ON sec_filings
  FOR SELECT
  USING (true);

CREATE POLICY "System writes filings"
  ON sec_filings
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
```

**User Profile Schema:**
```sql
-- User Profiles (extends auth.users)
profiles (
  id uuid PRIMARY KEY REFERENCES auth.users,
  full_name varchar(255),
  company varchar(255),
  role varchar(100), -- 'analyst', 'banker', 'pe_associate', etc.
  timezone varchar(50) DEFAULT 'America/New_York',
  digest_time time DEFAULT '07:00:00', -- Preferred digest delivery
  email_verified boolean DEFAULT false,
  subscription_tier varchar(20) DEFAULT 'free', -- Future: 'pro', 'enterprise'
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
)

-- RLS
CREATE POLICY "Users read own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);
```

---

## Email System (Resend)

### Configuration

**Domain Setup:**
- Custom domain: `mail.j16z.com`
- SPF, DKIM, DMARC records configured
- From address: `digest@j16z.com`
- Reply-to: `support@j16z.com`

### Email Templates

**Daily Digest Template:**
```tsx
// emails/DailyDigest.tsx (React Email)
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface DigestProps {
  userName: string;
  filings: Array<{
    ticker: string;
    companyName: string;
    filingType: string;
    date: string;
    summary: string;
    url: string;
  }>;
  date: string;
}

export default function DailyDigest({ userName, filings, date }: DigestProps) {
  const previewText = `${filings.length} updates for your watchlist - ${date}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Good Morning, {userName}</Heading>
          <Text style={text}>
            Here's your M&A intelligence digest for {date}
          </Text>

          {filings.map((filing) => (
            <Section key={filing.url} style={filingSection}>
              <Heading style={h2}>
                {filing.ticker} - {filing.filingType}
              </Heading>
              <Text style={companyName}>{filing.companyName}</Text>
              <Text style={date}>{filing.date}</Text>
              <Text style={summary}>{filing.summary}</Text>
              <Link href={filing.url} style={button}>
                Read Full Analysis →
              </Link>
            </Section>
          ))}

          <Section style={footer}>
            <Link href="https://j16z.com/settings">Manage Preferences</Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles omitted for brevity
```

**Immediate Alert Template:**
```tsx
// emails/FilingAlert.tsx
// Similar structure but single filing focus
// "Breaking" banner for 8-Ks and material events
```

### Sending Implementation

```typescript
// lib/email/send-digest.ts
import { Resend } from 'resend';
import DailyDigest from '@/emails/DailyDigest';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendDailyDigest(
  userEmail: string,
  userName: string,
  filings: Filing[]
) {
  const { data, error } = await resend.emails.send({
    from: 'J 16 Z Digest <digest@mail.j16z.com>',
    to: userEmail,
    subject: `${filings.length} updates for your watchlist`,
    react: DailyDigest({
      userName,
      filings,
      date: new Date().toLocaleDateString(),
    }),
    headers: {
      'X-Entity-Ref-ID': `digest-${Date.now()}`,
    },
  });

  if (error) {
    console.error('Email send failed:', error);
    throw new Error('Failed to send digest');
  }

  return data;
}
```

**Unsubscribe Handling:**
```sql
-- Email Preferences
email_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users,
  digest_enabled boolean DEFAULT true,
  immediate_alerts_enabled boolean DEFAULT true,
  unsubscribed_at timestamp,
  updated_at timestamp
)
```

---

## Scheduled Jobs (Vercel Cron)

### Job Definitions

**vercel.json:**
```json
{
  "crons": [
    {
      "path": "/api/cron/sec-monitor",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/rss-aggregator",
      "schedule": "*/30 * * * *"
    },
    {
      "path": "/api/cron/daily-digest",
      "schedule": "0 7 * * *"
    },
    {
      "path": "/api/cron/cache-cleanup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### Job Security

```typescript
// lib/cron-auth.ts
export function verifyCronRequest(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!authHeader || !cronSecret) {
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

// Usage in each cron route:
export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Job logic here
}
```

### Job Monitoring

**Logging to Supabase:**
```sql
-- Cron Job Logs
cron_logs (
  id uuid PRIMARY KEY,
  job_name varchar(50),
  started_at timestamp,
  completed_at timestamp,
  status varchar(20), -- 'success', 'failed', 'partial'
  records_processed integer,
  error_message text,
  created_at timestamp DEFAULT now()
)

-- Index
CREATE INDEX idx_cron_logs_job ON cron_logs(job_name, started_at DESC);
```

**Implementation:**
```typescript
// lib/cron-logger.ts
export async function logCronJob(
  jobName: string,
  fn: () => Promise<{ processed: number }>
) {
  const startTime = Date.now();
  const logId = crypto.randomUUID();

  try {
    // Log start
    await supabase.from('cron_logs').insert({
      id: logId,
      job_name: jobName,
      started_at: new Date(),
      status: 'running',
    });

    // Execute job
    const result = await fn();

    // Log success
    await supabase.from('cron_logs').update({
      completed_at: new Date(),
      status: 'success',
      records_processed: result.processed,
    }).eq('id', logId);

    return result;
  } catch (error) {
    // Log failure
    await supabase.from('cron_logs').update({
      completed_at: new Date(),
      status: 'failed',
      error_message: error.message,
    }).eq('id', logId);

    throw error;
  }
}
```

---

## Environment Variables

### Required Configuration

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi... # Server-side only

# Perplexity AI
PERPLEXITY_API_KEY=pplx-xxxxx

# Helicone (AI Monitoring)
HELICONE_API_KEY=sk-helicone-xxxxx

# Resend (Email)
RESEND_API_KEY=re_xxxxx

# Cron Security
CRON_SECRET=your-random-secret-here # Generate with: openssl rand -base64 32

# App Configuration
NEXT_PUBLIC_APP_URL=https://j16z.com
NODE_ENV=production
```

### Vercel Environment Setup

**Production Variables:**
- Add all above to Vercel dashboard
- Mark `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` as sensitive
- Different values for preview/development environments

**Security Checklist:**
- ✅ Never commit `.env.local` to git
- ✅ Use Vercel's encrypted storage
- ✅ Rotate secrets every 90 days
- ✅ Different keys per environment
- ✅ Enable Vercel's WAF (Web Application Firewall)

---

## Database Schema (Complete)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Profiles
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name varchar(255),
  company varchar(255),
  role varchar(100),
  timezone varchar(50) DEFAULT 'America/New_York',
  digest_time time DEFAULT '07:00:00',
  email_verified boolean DEFAULT false,
  subscription_tier varchar(20) DEFAULT 'free',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Watchlist
CREATE TABLE watchlist (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  ticker varchar(10) NOT NULL,
  company_name varchar(255) NOT NULL,
  cik varchar(10) NOT NULL,
  filing_types text[] DEFAULT '{10-K,10-Q,8-K}',
  tags text[],
  notification_preference varchar(20) DEFAULT 'both',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- SEC Filings
CREATE TABLE sec_filings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker varchar(10) NOT NULL,
  cik varchar(10) NOT NULL,
  company_name varchar(255),
  filing_type varchar(20) NOT NULL,
  filing_date date NOT NULL,
  accession_number varchar(25) UNIQUE NOT NULL,
  document_url text NOT NULL,
  raw_text text,
  ai_summary text,
  key_highlights jsonb,
  processed_at timestamp,
  created_at timestamp DEFAULT now()
);

-- Company Summaries (Cached)
CREATE TABLE company_summaries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker varchar(10) UNIQUE NOT NULL,
  company_name varchar(255),
  executive_summary text,
  business_overview text,
  recent_events jsonb,
  financial_highlights jsonb,
  risk_factors text[],
  sources_used jsonb,
  generated_at timestamp DEFAULT now(),
  expires_at timestamp,
  created_at timestamp DEFAULT now()
);

-- Filing Notifications
CREATE TABLE filing_notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  filing_id uuid REFERENCES sec_filings ON DELETE CASCADE,
  notification_type varchar(20) NOT NULL,
  sent_at timestamp,
  read_at timestamp,
  created_at timestamp DEFAULT now()
);

-- RSS Feed Items
CREATE TABLE rss_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  source varchar(100) NOT NULL,
  title text NOT NULL,
  url text UNIQUE NOT NULL,
  content text,
  published_at timestamp NOT NULL,
  relevant_companies text[],
  created_at timestamp DEFAULT now()
);

-- Email Preferences
CREATE TABLE email_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  digest_enabled boolean DEFAULT true,
  immediate_alerts_enabled boolean DEFAULT true,
  unsubscribed_at timestamp,
  updated_at timestamp DEFAULT now()
);

-- Cron Job Logs
CREATE TABLE cron_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_name varchar(50) NOT NULL,
  started_at timestamp NOT NULL,
  completed_at timestamp,
  status varchar(20) NOT NULL,
  records_processed integer,
  error_message text,
  created_at timestamp DEFAULT now()
);

-- Indexes
CREATE INDEX idx_profiles_id ON profiles(id);
CREATE INDEX idx_watchlist_user ON watchlist(user_id);
CREATE INDEX idx_watchlist_ticker ON watchlist(ticker);
CREATE INDEX idx_filings_ticker ON sec_filings(ticker);
CREATE INDEX idx_filings_date ON sec_filings(filing_date DESC);
CREATE INDEX idx_filings_accession ON sec_filings(accession_number);
CREATE INDEX idx_summaries_ticker ON company_summaries(ticker);
CREATE INDEX idx_summaries_expiry ON company_summaries(expires_at);
CREATE INDEX idx_notifications_user ON filing_notifications(user_id, sent_at DESC);
CREATE INDEX idx_rss_published ON rss_items(published_at DESC);
CREATE INDEX idx_rss_companies ON rss_items USING GIN(relevant_companies);
CREATE INDEX idx_cron_logs_job ON cron_logs(job_name, started_at DESC);

-- Row-Level Security Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE sec_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE filing_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

-- Profiles: users manage their own
CREATE POLICY "Users manage own profile"
  ON profiles
  FOR ALL
  USING (auth.uid() = id);

-- Watchlist: users manage their own
CREATE POLICY "Users manage own watchlist"
  ON watchlist
  FOR ALL
  USING (auth.uid() = user_id);

-- SEC Filings: public read, system write
CREATE POLICY "Public read filings"
  ON sec_filings
  FOR SELECT
  USING (true);

CREATE POLICY "System writes filings"
  ON sec_filings
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Company Summaries: authenticated read
CREATE POLICY "Authenticated users read summaries"
  ON company_summaries
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "System writes summaries"
  ON company_summaries
  FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Notifications: users read their own
CREATE POLICY "Users read own notifications"
  ON filing_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System creates notifications"
  ON filing_notifications
  FOR INSERT
  WITH CHECK (true);

-- Email Preferences: users manage their own
CREATE POLICY "Users manage email preferences"
  ON email_preferences
  FOR ALL
  USING (auth.uid() = user_id);

-- Cron Logs: system only (no RLS needed - service role access)
```

---

## Implementation Steps

### Phase 1: Foundation (Days 1-3)

**1. Project Setup**
```bash
# Initialize project
pnpm create next-app@latest j16z \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*"

cd j16z

# Install dependencies
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add @tanstack/react-query
pnpm add resend react-email
pnpm add openai # For Perplexity via OpenAI SDK
pnpm add date-fns zod
pnpm add rss-parser

# Install Shadcn
pnpm dlx shadcn-ui@latest init
pnpm dlx shadcn-ui@latest add button card input table form
pnpm dlx shadcn-ui@latest add dialog dropdown-menu toast
pnpm dlx shadcn-ui@latest add select badge avatar
```

**2. Supabase Configuration**
- Create project at supabase.com
- Run database schema (from above)
- Configure authentication providers
- Set up RLS policies
- Generate API keys

**3. Environment Setup**
- Create `.env.local` with all keys
- Configure Vercel project
- Add environment variables to Vercel
- Set up Helicone account
- Configure Resend domain

### Phase 2: Core Features (Days 4-10)

**4. Authentication Flow**
```typescript
// app/login/page.tsx
// app/signup/page.tsx
// app/api/auth/callback/route.ts (OAuth handler)
// middleware.ts (protected routes)
```

**5. Watchlist CRUD**
```typescript
// app/dashboard/page.tsx
// app/api/watchlist/route.ts (GET, POST)
// app/api/watchlist/[id]/route.ts (PUT, DELETE)
// components/watchlist/AddCompanyDialog.tsx
// components/watchlist/WatchlistTable.tsx
```

**6. SEC EDGAR Integration**
```typescript
// lib/sec-edgar.ts (API client)
// app/api/cron/sec-monitor/route.ts (cron job)
// app/api/filings/[ticker]/route.ts (fetch filing)
```

**7. AI Summary Generation**
```typescript
// lib/ai/perplexity.ts (Perplexity client)
// lib/ai/prompts.ts (prompt templates)
// app/api/company/[ticker]/summary/route.ts
```

### Phase 3: Notifications & Email (Days 11-14)

**8. Email Templates**
```typescript
// emails/DailyDigest.tsx
// emails/FilingAlert.tsx
// lib/email/send-digest.ts
// lib/email/send-alert.ts
```

**9. Notification System**
```typescript
// app/api/cron/daily-digest/route.ts
// app/api/notifications/route.ts (mark as read)
// components/notifications/NotificationCenter.tsx
```

**10. Cron Job Setup**
- Configure vercel.json cron schedules
- Implement cron authentication
- Set up logging system
- Test with Vercel CLI

### Phase 4: Dashboard & UX (Days 15-17)

**11. Dashboard Components**
```typescript
// app/dashboard/page.tsx (main dashboard)
// components/dashboard/StatsCards.tsx
// components/dashboard/ActivityFeed.tsx
// components/dashboard/RecentFilings.tsx
```

**12. Company Detail View**
```typescript
// app/company/[ticker]/page.tsx
// components/company/CompanyHeader.tsx
// components/company/SummarySection.tsx
// components/company/FilingsHistory.tsx
```

**13. Settings & Preferences**
```typescript
// app/settings/page.tsx
// components/settings/ProfileForm.tsx
// components/settings/EmailPreferences.tsx
// components/settings/NotificationSettings.tsx
```

### Phase 5: Testing & Polish (Days 18-21)

**14. Testing**
- End-to-end user flow testing
- Cron job verification
- Email delivery testing
- Mobile responsiveness
- Error handling validation

**15. Performance Optimization**
- TanStack Query cache configuration
- Image optimization
- Database query optimization
- Loading state improvements

**16. Documentation**
- User onboarding guide
- API documentation
- Deployment runbook
- Troubleshooting guide

---

## Monitoring & Observability

### Helicone Dashboard

**Key Metrics:**
- Total AI API requests
- Average cost per request
- Total spend (daily/weekly/monthly)
- Error rate
- Latency (p50, p95, p99)

**Alerts to Configure:**
- Daily spend > $10
- Weekly spend > $50
- Error rate > 5%
- Latency p95 > 10s

### Vercel Analytics

**Monitor:**
- Page load times
- Core Web Vitals
- API route performance
- Function invocation counts
- Edge function cache hit rates

### Supabase Observability

**Database Metrics:**
- Connection pool usage
- Query performance (slow query log)
- Table sizes
- Index usage
- RLS policy performance

### Application Logging

```typescript
// lib/logger.ts
import { createClient } from '@/lib/supabase/server';

export async function logEvent(
  eventType: string,
  userId: string | null,
  metadata: Record<string, any>
) {
  const supabase = createClient();

  await supabase.from('event_logs').insert({
    event_type: eventType,
    user_id: userId,
    metadata,
    timestamp: new Date().toISOString(),
  });
}

// Usage:
await logEvent('filing_processed', null, {
  ticker: 'AAPL',
  filing_type: '10-K',
  processing_time_ms: 1234,
});
```

---

## Deployment Checklist

### Pre-Launch

- [ ] Database schema deployed to production
- [ ] RLS policies tested and enabled
- [ ] All environment variables set in Vercel
- [ ] Custom domain configured (j16z.com)
- [ ] SSL certificate active
- [ ] Email domain verified in Resend
- [ ] SPF/DKIM/DMARC records configured
- [ ] Cron jobs scheduled in vercel.json
- [ ] Cron secret generated and configured
- [ ] Helicone account active with budget alerts
- [ ] Error tracking configured (Sentry optional)

### Launch Day

- [ ] Deploy main branch to production
- [ ] Verify cron jobs running (check logs)
- [ ] Test email delivery (digest + alerts)
- [ ] Create first user account
- [ ] Add test companies to watchlist
- [ ] Trigger manual SEC check
- [ ] Verify AI summaries generating
- [ ] Check Helicone cost tracking
- [ ] Monitor Vercel function logs
- [ ] Test mobile responsiveness

### Post-Launch Monitoring

- [ ] Daily: Check cron job logs
- [ ] Daily: Verify email delivery rates
- [ ] Daily: Review Helicone spend
- [ ] Weekly: Review error logs
- [ ] Weekly: Check database performance
- [ ] Weekly: User feedback collection
- [ ] Monthly: Cost analysis
- [ ] Monthly: Feature usage analytics

---

## Cost Projections (First Month)

### Infrastructure

| Service | Tier | Monthly Cost |
|---------|------|--------------|
| Vercel | Hobby | $0 |
| Supabase | Free | $0 |
| Resend | Free (100/day) | $0 |
| Helicone | Free (100K req) | $0 |
| **Total Infrastructure** | | **$0** |

### Variable Costs (AI)

| Usage | Cost per Unit | Estimated Monthly | Total |
|-------|---------------|-------------------|-------|
| Perplexity API | $5/1M input tokens, $15/1M output | ~500 summaries | ~$25 |
| Email sends (if > 100/day) | $0.001/email | 0 (under free tier) | $0 |
| **Total Variable** | | | **~$25** |

**Assumptions:**
- 1 user (David)
- 20 companies in watchlist
- Average 25 filings/day matched
- 500 words AI summary per filing
- Daily digest (1 email/day)

**Scaling Projections:**
- 10 users: ~$50-75/month
- 50 users: ~$200-300/month
- 100 users: ~$500-750/month

---

## Success Metrics

### Product KPIs (Month 1)

**Engagement:**
- Daily active usage (logins per week)
- Watchlist size (# companies monitored)
- Email open rate (target: >40%)
- Email click-through rate (target: >15%)

**Value Delivery:**
- Filings processed and summarized
- Time saved (self-reported survey)
- Feature usage (watchlist, summaries, emails)

**Technical:**
- Cron job success rate (target: >99%)
- AI summary generation rate (target: >95%)
- Email delivery rate (target: >98%)
- Page load time (target: <2s)

### User Feedback Questions

After 2 weeks:
1. How much time does J 16 Z save you weekly?
2. What's the most valuable feature?
3. What's missing that you expected?
4. Would you pay for this? How much?
5. Net Promoter Score (0-10)

---

## Future Roadmap (Post-MVP)

### Phase 2 Features

**CourtListener Integration:**
- Litigation history search
- Bankruptcy case monitoring
- Regulatory action alerts

**Prediction Markets:**
- Polymarket/Kalshi integration
- Merger approval probability tracking
- Event-driven alerts

**Enhanced AI:**
- Comparative analysis across companies
- Trend detection (filing language changes)
- Risk scoring models

**Collaboration:**
- Team workspaces
- Shared watchlists
- Internal notes and tags

### Phase 3 Features

**Expert Network Integration:**
- GLG/AlphaSense transcript search
- Expert interview scheduling
- Call notes synthesis

**Data Room Processing:**
- VDR integration (Datasite, iDeals)
- Automated due diligence checklists
- Contract term extraction

**Advanced Analytics:**
- Custom dashboards
- Excel/Google Sheets plugins
- API access for power users

**Mobile App:**
- iOS/Android native apps
- Push notifications
- Offline reading

---

## Risk Mitigation

### Technical Risks

**SEC API Rate Limiting:**
- Mitigation: Implement request queuing, respect 10 req/sec limit
- Backup: Cache aggressively, use bulk data downloads for historical

**AI Hallucinations:**
- Mitigation: Require citations, fact-check critical claims
- Backup: Human review queue for flagged summaries

**Email Deliverability:**
- Mitigation: Proper SPF/DKIM, engagement monitoring
- Backup: In-app notifications as fallback

**Cost Overruns (AI):**
- Mitigation: Helicone budget alerts, prompt optimization
- Backup: Rate limiting, user quotas

### Business Risks

**Low User Engagement:**
- Mitigation: Weekly check-ins with David, rapid iteration
- Backup: A/B test digest timing, content mix

**Feature Bloat:**
- Mitigation: Ruthless prioritization, KISS principle
- Backup: User feedback drives roadmap, not assumptions

**Competition:**
- Mitigation: Move fast, differentiate on M&A workflows
- Backup: Build moats (data quality, integrations, UX)

---

## Conclusion

This technical specification provides a complete blueprint for building J 16 Z's MVP. The stack is production-ready, cost-effective, and optimized for rapid iteration. Success hinges on:

1. **Laser focus on David's needs** - Build features he'll use daily
2. **Quality over quantity** - 3 excellent features beat 10 mediocre ones
3. **Ship and iterate** - Get feedback early, improve continuously
4. **Monitor everything** - Data-driven decisions from day one

The foundation is solid. Now execute.