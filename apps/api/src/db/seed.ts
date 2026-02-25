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
  status: typeof schema.deals.$inferInsert['status'];
  considerationType: typeof schema.deals.$inferInsert['considerationType'];
  dealValue: string;
  sizeBucket: string;
  announcedDate: string;
  outsideDate?: string;
}

const STARTER_DEALS: StarterDeal[] = [
  // US Steel / Nippon Steel — flagship deal David was tracking closely
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
  },
  // AI sector — Broadcom / VMware (completed, historical reference)
  {
    symbol: 'VMW',
    acquirer: 'Broadcom Inc.',
    target: 'VMware, Inc.',
    status: 'CLOSED',
    considerationType: 'MIXED',
    dealValue: '61000000000', // $61B
    sizeBucket: 'MEGA',
    announcedDate: '2022-05-26',
    outsideDate: '2024-10-30',
  },
  // Microsoft / Activision Blizzard (completed)
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
  },
  // AI infrastructure — example active deal
  {
    symbol: 'PCOR',
    acquirer: 'ServiceNow, Inc.',
    target: 'Procore Technologies, Inc.',
    status: 'ANNOUNCED',
    considerationType: 'CASH',
    dealValue: '8000000000', // ~$8B estimated
    sizeBucket: 'LARGE',
    announcedDate: '2025-06-01',
  },
];

// ---------------------------------------------------------------------------
// seedFirm — called during firm onboarding to populate starter deals
// Creates a pre-built "Top Active Deals" watchlist and links the starter deals
// ---------------------------------------------------------------------------
export async function seedFirm(firmId: string): Promise<void> {
  console.log(`[seed] Seeding starter deals for firm ${firmId}`);

  // Seed deals inserted during firm onboarding — see Plan 01-03 for full implementation
  // TODO Plan 01-03: Insert full starter deal data with events, clauses, and market snapshots

  // For now: insert stub starter deals so the firm has content on first login
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
    isStarter: true as const,
  }));

  const insertedDeals = await adminDb.insert(schema.deals).values(dealInserts).returning();

  console.log(`[seed] Inserted ${insertedDeals.length} starter deals`);

  // Create a pre-built "Top Active Deals" example watchlist
  // createdBy uses a placeholder system UUID — will be replaced with actual user ID in Plan 01-03
  // TODO Plan 01-03: Pass actual userId from onboarding context
  const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

  const [watchlist] = await adminDb
    .insert(schema.watchlists)
    .values({
      firmId,
      name: 'Top Active Deals',
      description: 'Pre-built watchlist of notable active M&A deals. Customise as needed.',
      createdBy: SYSTEM_USER_ID,
    })
    .returning();

  // Link active/announced deals to the starter watchlist
  const activeDeals = insertedDeals.filter((d) => ['ANNOUNCED', 'REGULATORY_REVIEW', 'LITIGATION'].includes(d.status ?? ''));

  if (activeDeals.length > 0 && watchlist) {
    await adminDb.insert(schema.watchlistDeals).values(
      activeDeals.map((d) => ({
        watchlistId: watchlist.id,
        dealId: d.id,
        addedBy: SYSTEM_USER_ID,
      })),
    );
    console.log(`[seed] Linked ${activeDeals.length} deals to "Top Active Deals" watchlist`);
  }

  console.log(`[seed] Seed complete for firm ${firmId}`);
}

// ---------------------------------------------------------------------------
// Standalone execution — run via: pnpm db:seed
// Requires SUPABASE_DB_URL_SERVICE_ROLE and a valid firmId arg
// Usage: FIRM_ID=<uuid> pnpm db:seed
// ---------------------------------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const firmId = process.env.FIRM_ID;
  if (!firmId) {
    console.error('[seed] ERROR: FIRM_ID environment variable is required');
    console.error('[seed] Usage: FIRM_ID=<uuid> pnpm db:seed');
    process.exit(1);
  }

  seedFirm(firmId)
    .then(() => {
      console.log('[seed] Done');
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error('[seed] Error:', err);
      process.exit(1);
    });
}
