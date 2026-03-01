import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Reusable timestamp column helper (all entity tables get these)
// ---------------------------------------------------------------------------
const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};

// ---------------------------------------------------------------------------
// RLS policy SQL expression helper
// Wraps auth.jwt() in a subquery to evaluate once per statement (not per-row)
// Uses app_metadata.firm_id injected by custom access token hook
// ---------------------------------------------------------------------------
const firmIdFromJwt = sql`(select ((auth.jwt() -> 'app_metadata')::jsonb ->> 'firm_id')::uuid)`;

// Helper that creates 4 firm-isolation RLS policies for a table
function firmIsolationPolicies() {
  return [
    pgPolicy('firm_isolation_select', {
      for: 'select',
      to: 'authenticated',
      using: sql`firm_id = ${firmIdFromJwt}`,
    }),
    pgPolicy('firm_isolation_insert', {
      for: 'insert',
      to: 'authenticated',
      withCheck: sql`firm_id = ${firmIdFromJwt}`,
    }),
    pgPolicy('firm_isolation_update', {
      for: 'update',
      to: 'authenticated',
      using: sql`firm_id = ${firmIdFromJwt}`,
      withCheck: sql`firm_id = ${firmIdFromJwt}`,
    }),
    pgPolicy('firm_isolation_delete', {
      for: 'delete',
      to: 'authenticated',
      using: sql`firm_id = ${firmIdFromJwt}`,
    }),
  ];
}

// ---------------------------------------------------------------------------
// firms — top-level tenant entity; no firm_id (IS the firm); no RLS (admin-only)
// ---------------------------------------------------------------------------
export const firms = pgTable('firms', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// firm_members — links Supabase auth.users to a firm with a role
// ---------------------------------------------------------------------------
export const firmMembers = pgTable(
  'firm_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firmId: uuid('firm_id')
      .references(() => firms.id)
      .notNull(),
    userId: uuid('user_id').notNull(), // references auth.users
    role: text('role').notNull().default('member'), // 'admin' | 'member'
    invitedBy: uuid('invited_by'), // references auth.users, nullable
    ...timestamps,
  },
  () => firmIsolationPolicies(),
);

// ---------------------------------------------------------------------------
// invites — pending invite tokens for new team members
// ---------------------------------------------------------------------------
export const invites = pgTable(
  'invites',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firmId: uuid('firm_id')
      .references(() => firms.id)
      .notNull(),
    email: text('email').notNull(),
    role: text('role').notNull().default('member'), // 'admin' | 'member'
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    createdBy: uuid('created_by').notNull(), // references auth.users
    ...timestamps,
  },
  () => firmIsolationPolicies(),
);

// ---------------------------------------------------------------------------
// deals — core M&A deal entity
// ---------------------------------------------------------------------------
export const deals = pgTable(
  'deals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firmId: uuid('firm_id')
      .references(() => firms.id), // NOW NULLABLE — auto-discovered deals have no firm until claimed
    symbol: text('symbol').notNull(),
    acquirer: text('acquirer').notNull(),
    target: text('target').notNull(),
    dealValue: numeric('deal_value'),
    pricePerShare: numeric('price_per_share'),
    premium: numeric('premium'),
    currentPrice: numeric('current_price'),
    grossSpread: numeric('gross_spread'),
    annualizedReturn: numeric('annualized_return'),
    status: text('status').notNull().default('ANNOUNCED'),
    considerationType: text('consideration_type').notNull().default('CASH'),
    announcedDate: date('announced_date'),
    expectedCloseDate: date('expected_close_date'),
    outsideDate: date('outside_date'),
    pCloseBase: numeric('p_close_base'),
    pBreakRegulatory: numeric('p_break_regulatory'),
    pBreakLitigation: numeric('p_break_litigation'),
    regulatoryFlags: text('regulatory_flags').array().default(sql`'{}'::text[]`),
    litigationCount: integer('litigation_count').notNull().default(0),
    spreadEntryThreshold: numeric('spread_entry_threshold'),
    sizeBucket: text('size_bucket'),
    isStarter: boolean('is_starter').notNull().default(false),
    acquirerCik: text('acquirer_cik'), // nullable — auto-resolved via SEC company_tickers.json
    targetCik: text('target_cik'), // nullable — auto-resolved via SEC company_tickers.json
    source: text('source'), // nullable — 'auto_edgar' for auto-created deals, null for user-created
    ...timestamps,
  },
  () => firmIsolationPolicies(),
);

// ---------------------------------------------------------------------------
// events — unified event feed (FILING | COURT | AGENCY | SPREAD_MOVE | NEWS)
// ---------------------------------------------------------------------------
export const events = pgTable(
  'events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firmId: uuid('firm_id')
      .references(() => firms.id)
      .notNull(),
    dealId: uuid('deal_id').references(() => deals.id),
    type: text('type').notNull(), // EventType
    subType: text('sub_type').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    source: text('source').notNull(), // SourceType
    sourceUrl: text('source_url').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    materialityScore: integer('materiality_score').notNull().default(0),
    severity: text('severity').notNull().default('INFO'), // Severity
    metadata: jsonb('metadata'),
    ...timestamps,
  },
  () => firmIsolationPolicies(),
);

// ---------------------------------------------------------------------------
// filings — SEC EDGAR filings (global/shared table — no firm_id, no RLS)
//
// Global ingestion stream: All filings are ingested into this table regardless
// of firm. Firm-scoped Event records are created when a filing matches a firm's
// deals (via watchlist). This is a CONTEXT.md locked decision.
// ---------------------------------------------------------------------------
export const filings = pgTable('filings', {
  id: uuid('id').defaultRandom().primaryKey(),
  dealId: uuid('deal_id').references(() => deals.id),
  accessionNumber: text('accession_number').notNull().unique(),
  filingType: text('filing_type').notNull(), // e.g. '8-K', 'S-4', 'DEFM14A'
  filerName: text('filer_name'), // nullable — EFTS broad scan results may not have entity name immediately
  filerCik: text('filer_cik').notNull(),
  filedDate: date('filed_date').notNull(),
  rawUrl: text('raw_url').notNull(),
  rawContent: text('raw_content'), // nullable — stores raw filing text
  extracted: boolean('extracted').notNull().default(false),
  status: text('status').notNull().default('active'), // 'pending_review' | 'active' | 'dismissed'
  ...timestamps, // PRESERVE — provides createdAt, updatedAt, deletedAt (required by 02-03 queries)
});

// ---------------------------------------------------------------------------
// clauses — extracted deal clauses from filings
// ---------------------------------------------------------------------------
export const clauses = pgTable(
  'clauses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firmId: uuid('firm_id')
      .references(() => firms.id)
      .notNull(),
    dealId: uuid('deal_id')
      .references(() => deals.id)
      .notNull(),
    filingId: uuid('filing_id')
      .references(() => filings.id)
      .notNull(),
    type: text('type').notNull(), // ClauseType
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    verbatimText: text('verbatim_text').notNull(),
    sourceLocation: text('source_location').notNull(),
    extractedAt: timestamp('extracted_at', { withTimezone: true }).notNull(),
    ...timestamps,
  },
  () => firmIsolationPolicies(),
);

// ---------------------------------------------------------------------------
// market_snapshots — point-in-time spread/price snapshots for a deal
// ---------------------------------------------------------------------------
export const marketSnapshots = pgTable(
  'market_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firmId: uuid('firm_id')
      .references(() => firms.id)
      .notNull(),
    dealId: uuid('deal_id')
      .references(() => deals.id)
      .notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    currentPrice: numeric('current_price').notNull(),
    targetPrice: numeric('target_price').notNull(),
    acquirerPrice: numeric('acquirer_price').notNull(),
    grossSpread: numeric('gross_spread').notNull(),
    annualizedReturn: numeric('annualized_return').notNull(),
    volume: integer('volume').notNull().default(0),
    ...timestamps,
  },
  () => firmIsolationPolicies(),
);

// ---------------------------------------------------------------------------
// news_items — news articles related to deals
// ---------------------------------------------------------------------------
export const newsItems = pgTable(
  'news_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firmId: uuid('firm_id')
      .references(() => firms.id)
      .notNull(),
    dealId: uuid('deal_id').references(() => deals.id), // nullable — can be general news
    title: text('title').notNull(),
    source: text('source').notNull(),
    url: text('url').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    summary: text('summary').notNull(),
    ...timestamps,
  },
  () => firmIsolationPolicies(),
);

// ---------------------------------------------------------------------------
// watchlists — user-curated lists of deals to track
// ---------------------------------------------------------------------------
export const watchlists = pgTable(
  'watchlists',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firmId: uuid('firm_id')
      .references(() => firms.id)
      .notNull(),
    name: text('name').notNull(),
    description: text('description'),
    createdBy: uuid('created_by').notNull(), // references auth.users
    ...timestamps,
  },
  () => firmIsolationPolicies(),
);

// ---------------------------------------------------------------------------
// watchlist_deals — junction table linking watchlists to deals
// ---------------------------------------------------------------------------
export const watchlistDeals = pgTable(
  'watchlist_deals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    watchlistId: uuid('watchlist_id')
      .references(() => watchlists.id)
      .notNull(),
    dealId: uuid('deal_id')
      .references(() => deals.id)
      .notNull(),
    addedAt: timestamp('added_at', { withTimezone: true }).defaultNow().notNull(),
    addedBy: uuid('added_by').notNull(), // references auth.users
  },
  (t) => [
    // RLS: users can only see watchlist_deals for watchlists in their firm
    // This joins through the watchlist's firm isolation
    pgPolicy('firm_isolation_select', {
      for: 'select',
      to: 'authenticated',
      using: sql`exists (
        select 1 from watchlists w
        where w.id = ${t.watchlistId}
        and w.firm_id = ${firmIdFromJwt}
        and w.deleted_at is null
      )`,
    }),
    pgPolicy('firm_isolation_insert', {
      for: 'insert',
      to: 'authenticated',
      withCheck: sql`exists (
        select 1 from watchlists w
        where w.id = watchlist_id
        and w.firm_id = ${firmIdFromJwt}
        and w.deleted_at is null
      )`,
    }),
    pgPolicy('firm_isolation_delete', {
      for: 'delete',
      to: 'authenticated',
      using: sql`exists (
        select 1 from watchlists w
        where w.id = ${t.watchlistId}
        and w.firm_id = ${firmIdFromJwt}
        and w.deleted_at is null
      )`,
    }),
  ],
);

// ---------------------------------------------------------------------------
// alert_rules — notification rules per firm (can be global or deal-specific)
// ---------------------------------------------------------------------------
export const alertRules = pgTable(
  'alert_rules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firmId: uuid('firm_id')
      .references(() => firms.id)
      .notNull(),
    dealId: uuid('deal_id').references(() => deals.id), // nullable — null = global rule
    userId: uuid('user_id').notNull(), // references auth.users
    name: text('name').notNull(),
    threshold: integer('threshold').notNull().default(50), // materiality_score threshold
    channels: text('channels').array().notNull().default(sql`'{}'::text[]`), // ['email', 'slack', 'webhook']
    webhookUrl: text('webhook_url'),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  () => firmIsolationPolicies(),
);

// ---------------------------------------------------------------------------
// audit_log — immutable change log; no deleted_at (records are never removed)
// ---------------------------------------------------------------------------
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    firmId: uuid('firm_id')
      .references(() => firms.id)
      .notNull(),
    userId: uuid('user_id').notNull(), // references auth.users
    entityType: text('entity_type').notNull(), // e.g. 'deal', 'event', 'watchlist'
    entityId: uuid('entity_id').notNull(),
    action: text('action').notNull(), // 'create' | 'update' | 'delete' | 'restore'
    changes: jsonb('changes'), // JSON diff of before/after state
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  },
  () => [
    pgPolicy('firm_isolation_select', {
      for: 'select',
      to: 'authenticated',
      using: sql`firm_id = ${firmIdFromJwt}`,
    }),
    pgPolicy('firm_isolation_insert', {
      for: 'insert',
      to: 'authenticated',
      withCheck: sql`firm_id = ${firmIdFromJwt}`,
    }),
    // No UPDATE or DELETE policies on audit_log — records are immutable
  ],
);
