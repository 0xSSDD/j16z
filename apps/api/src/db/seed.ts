import 'dotenv/config';
import { adminDb } from './index.js';
import * as schema from './schema.js';

// ---------------------------------------------------------------------------
// Starter deal data — real, notable M&A deals from research
// These are inserted as copies per firm (not shared global records) so each
// firm can independently soft-delete/restore them without affecting others.
// is_starter: true marks them as seed data for the UI badge.
// ---------------------------------------------------------------------------

interface StarterDeal {
  symbol: string;
  acquirer: string;
  target: string;
  status: (typeof schema.deals.$inferInsert)['status'];
  considerationType: (typeof schema.deals.$inferInsert)['considerationType'];
  dealValue: string;
  sizeBucket: string;
  announcedDate: string;
  outsideDate?: string;
  pCloseBase?: string;
  pBreakRegulatory?: string;
  grossSpread?: string;
  regulatoryFlags?: string[];
  litigationCount?: number;
}

const STARTER_DEALS: StarterDeal[] = [
  // US Steel / Nippon Steel — flagship deal, regulatory review
  {
    symbol: 'X',
    acquirer: 'Nippon Steel Corporation',
    target: 'United States Steel Corporation',
    status: 'REGULATORY_REVIEW',
    considerationType: 'CASH',
    dealValue: '14900000000', // $14.9B
    sizeBucket: 'MEGA',
    announcedDate: '2023-12-18',
    outsideDate: '2024-12-24',
    pCloseBase: '42',
    pBreakRegulatory: '48',
    grossSpread: '3.2',
    regulatoryFlags: ['CFIUS', 'DOJ', 'National Security Review'],
    litigationCount: 2,
  },
  // Juniper Networks / HPE — networking acquisition
  {
    symbol: 'JNPR',
    acquirer: 'Hewlett Packard Enterprise Co.',
    target: 'Juniper Networks, Inc.',
    status: 'REGULATORY_REVIEW',
    considerationType: 'CASH',
    dealValue: '14000000000', // $14B
    sizeBucket: 'MEGA',
    announcedDate: '2024-01-09',
    outsideDate: '2025-01-09',
    pCloseBase: '72',
    pBreakRegulatory: '22',
    grossSpread: '1.8',
    regulatoryFlags: ['DOJ', 'EU Commission'],
    litigationCount: 0,
  },
  // HashiCorp / IBM — DevOps infrastructure
  {
    symbol: 'HCP',
    acquirer: 'International Business Machines Corp.',
    target: 'HashiCorp, Inc.',
    status: 'CLOSED',
    considerationType: 'CASH',
    dealValue: '6400000000', // $6.4B
    sizeBucket: 'LARGE',
    announcedDate: '2024-04-24',
    outsideDate: '2025-01-01',
    pCloseBase: '98',
    pBreakRegulatory: '2',
    grossSpread: '0.1',
    regulatoryFlags: [],
    litigationCount: 0,
  },
  // Figma / Adobe — terminated (historical reference)
  {
    symbol: 'FIGM',
    acquirer: 'Adobe Inc.',
    target: 'Figma, Inc.',
    status: 'TERMINATED',
    considerationType: 'MIXED',
    dealValue: '20000000000', // $20B
    sizeBucket: 'MEGA',
    announcedDate: '2022-09-15',
    outsideDate: '2024-03-31',
    pCloseBase: '0',
    pBreakRegulatory: '100',
    regulatoryFlags: ['EU Commission', 'UK CMA', 'DOJ'],
    litigationCount: 1,
  },
  // Activision Blizzard / Microsoft — closed deal (historical reference)
  {
    symbol: 'ATVI',
    acquirer: 'Microsoft Corporation',
    target: 'Activision Blizzard, Inc.',
    status: 'CLOSED',
    considerationType: 'CASH',
    dealValue: '68700000000', // $68.7B
    sizeBucket: 'MEGA',
    announcedDate: '2022-01-18',
    outsideDate: '2023-10-13',
    pCloseBase: '100',
    pBreakRegulatory: '0',
    regulatoryFlags: [],
    litigationCount: 0,
  },
  // Discover Financial / Capital One — fintech mega deal
  {
    symbol: 'DFS',
    acquirer: 'Capital One Financial Corporation',
    target: 'Discover Financial Services',
    status: 'REGULATORY_REVIEW',
    considerationType: 'STOCK',
    dealValue: '35300000000', // $35.3B
    sizeBucket: 'MEGA',
    announcedDate: '2024-02-19',
    outsideDate: '2025-02-19',
    pCloseBase: '62',
    pBreakRegulatory: '28',
    grossSpread: '4.1',
    regulatoryFlags: ['Federal Reserve', 'OCC', 'DOJ'],
    litigationCount: 3,
  },
  // Hess / Chevron — energy sector
  {
    symbol: 'HES',
    acquirer: 'Chevron Corporation',
    target: 'Hess Corporation',
    status: 'REGULATORY_REVIEW',
    considerationType: 'STOCK',
    dealValue: '53000000000', // $53B
    sizeBucket: 'MEGA',
    announcedDate: '2023-10-23',
    outsideDate: '2025-10-23',
    pCloseBase: '58',
    pBreakRegulatory: '32',
    grossSpread: '5.7',
    regulatoryFlags: ['FTC', 'DOJ'],
    litigationCount: 1,
  },
];

// ---------------------------------------------------------------------------
// Starter events for key deals
// ---------------------------------------------------------------------------
interface StarterEvent {
  dealSymbol: string;
  type: (typeof schema.events.$inferInsert)['type'];
  subType: string;
  title: string;
  description: string;
  source: string;
  sourceUrl: string;
  offsetDays: number; // days before now
  materialityScore: number;
  severity: (typeof schema.events.$inferInsert)['severity'];
}

const STARTER_EVENTS: StarterEvent[] = [
  {
    dealSymbol: 'X',
    type: 'AGENCY',
    subType: 'cfius_review',
    title: 'CFIUS Initiates National Security Review of Nippon Steel / US Steel',
    description:
      'The Committee on Foreign Investment in the United States (CFIUS) has formally initiated a national security review of the proposed acquisition. The review focuses on the strategic importance of US domestic steel production capacity.',
    source: 'FTC',
    sourceUrl:
      'https://home.treasury.gov/policy-issues/international/the-committee-on-foreign-investment-in-the-united-states-cfius',
    offsetDays: 30,
    materialityScore: 85,
    severity: 'CRITICAL',
  },
  {
    dealSymbol: 'X',
    type: 'COURT',
    subType: 'injunction_filed',
    title: 'Steel Workers Union Files Lawsuit to Block Nippon Steel Acquisition',
    description:
      'The United Steelworkers union has filed suit in the DC Circuit Court seeking to block the acquisition on national security and labor grounds. The filing argues the deal would undermine domestic steel production critical to US defense supply chains.',
    source: 'COURT_LISTENER',
    sourceUrl: 'https://www.courtlistener.com/',
    offsetDays: 20,
    materialityScore: 80,
    severity: 'CRITICAL',
  },
  {
    dealSymbol: 'DFS',
    type: 'AGENCY',
    subType: 'second_request',
    title: 'DOJ Issues Second Request for Capital One / Discover Merger',
    description:
      'The Department of Justice has issued a Second Request for information in the Capital One acquisition of Discover Financial. The extended review focuses on potential anticompetitive effects in the credit card network market and consumer lending.',
    source: 'DOJ',
    sourceUrl: 'https://www.justice.gov/atr',
    offsetDays: 45,
    materialityScore: 85,
    severity: 'CRITICAL',
  },
  {
    dealSymbol: 'HES',
    type: 'COURT',
    subType: 'arbitration',
    title: 'ExxonMobil Pursues Arbitration Over Hess Guyana Assets in Chevron Deal',
    description:
      "ExxonMobil Corp. has initiated arbitration proceedings over a right of first refusal claim on Hess Corporation's stake in the Guyana oil field. The outcome could materially affect deal terms or closing timeline for the Chevron acquisition.",
    source: 'COURT_LISTENER',
    sourceUrl: 'https://www.courtlistener.com/',
    offsetDays: 15,
    materialityScore: 90,
    severity: 'CRITICAL',
  },
];

// ---------------------------------------------------------------------------
// seedFirm — called during firm onboarding to populate starter deals + events
// Creates a pre-built "Top Active Deals" watchlist and links the starter deals
// ---------------------------------------------------------------------------
export async function seedFirm(firmId: string, userId: string): Promise<void> {
  console.log(`[seed] Seeding starter deals for firm ${firmId}`);

  // 1. Insert starter deals
  const dealInserts = STARTER_DEALS.map((d) => ({
    firmId,
    symbol: d.symbol,
    acquirer: d.acquirer,
    target: d.target,
    status: d.status,
    considerationType: d.considerationType,
    dealValue: d.dealValue,
    sizeBucket: d.sizeBucket,
    announcedDate: d.announcedDate,
    outsideDate: d.outsideDate,
    pCloseBase: d.pCloseBase,
    pBreakRegulatory: d.pBreakRegulatory,
    grossSpread: d.grossSpread,
    regulatoryFlags: d.regulatoryFlags,
    litigationCount: d.litigationCount ?? 0,
    isStarter: true as const,
  }));

  const insertedDeals = await adminDb.insert(schema.deals).values(dealInserts).returning();

  console.log(`[seed] Inserted ${insertedDeals.length} starter deals`);

  // Build a symbol → deal ID map for event seeding
  const dealBySymbol = Object.fromEntries(insertedDeals.map((d) => [d.symbol, d]));

  // 2. Insert starter events for key deals
  const now = new Date();
  const eventInserts = STARTER_EVENTS.flatMap((e) => {
    const deal = dealBySymbol[e.dealSymbol];
    if (!deal) return [];
    const eventTime = new Date(now.getTime() - e.offsetDays * 24 * 60 * 60 * 1000);
    return [
      {
        firmId,
        dealId: deal.id,
        type: e.type,
        subType: e.subType,
        title: e.title,
        description: e.description,
        source: e.source,
        sourceUrl: e.sourceUrl,
        timestamp: eventTime,
        materialityScore: e.materialityScore,
        severity: e.severity,
      },
    ];
  });

  if (eventInserts.length > 0) {
    await adminDb.insert(schema.events).values(eventInserts);
    console.log(`[seed] Inserted ${eventInserts.length} starter events`);
  }

  // 3. Create "Top Active Deals" watchlist
  const [watchlist] = await adminDb
    .insert(schema.watchlists)
    .values({
      firmId,
      name: 'Top Active Deals',
      description: 'Pre-built watchlist of notable active M&A deals. Customise as needed.',
      createdBy: userId,
    })
    .returning();

  if (!watchlist) {
    console.error('[seed] Failed to create watchlist');
    return;
  }

  // 4. Link active/announced/review deals to the starter watchlist
  const activeStatuses = ['ANNOUNCED', 'REGULATORY_REVIEW', 'LITIGATION'];
  const activeDeals = insertedDeals.filter((d) => activeStatuses.includes(d.status ?? ''));

  if (activeDeals.length > 0) {
    await adminDb.insert(schema.watchlistDeals).values(
      activeDeals.map((d) => ({
        watchlistId: watchlist.id,
        dealId: d.id,
        addedBy: userId,
      })),
    );
    console.log(`[seed] Linked ${activeDeals.length} deals to "Top Active Deals" watchlist`);
  }

  // 5. Audit log entries for seeded entities
  await adminDb.insert(schema.auditLog).values(
    insertedDeals.map((d) => ({
      firmId,
      userId,
      entityType: 'deal',
      entityId: d.id,
      action: 'create',
      changes: { isStarter: true, acquirer: d.acquirer, target: d.target },
    })),
  );

  console.log(`[seed] Seed complete for firm ${firmId}`);
}

// ---------------------------------------------------------------------------
// Standalone execution — run via: pnpm db:seed
// Requires SUPABASE_DB_URL_SERVICE_ROLE and valid FIRM_ID + USER_ID env vars
// Usage: FIRM_ID=<uuid> USER_ID=<uuid> pnpm db:seed
// ---------------------------------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const firmId = process.env.FIRM_ID;
  const userId = process.env.USER_ID;
  if (!firmId || !userId) {
    console.error('[seed] ERROR: FIRM_ID and USER_ID environment variables are required');
    console.error('[seed] Usage: FIRM_ID=<uuid> USER_ID=<uuid> pnpm db:seed');
    process.exit(1);
  }

  seedFirm(firmId, userId)
    .then(() => {
      console.log('[seed] Done');
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error('[seed] Error:', err);
      process.exit(1);
    });
}
