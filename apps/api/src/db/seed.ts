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
  acquirerCik?: string;
  targetCik?: string;
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
    targetCik: '0000100885',
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
    acquirerCik: '0001645590',
    targetCik: '0001043604',
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
    acquirerCik: '0000051143',
    targetCik: '0001720671',
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
    acquirerCik: '0000796343',
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
    acquirerCik: '0000789019',
    targetCik: '0000718877',
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
    acquirerCik: '0000927628',
    targetCik: '0001393612',
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
    acquirerCik: '0000093410',
    targetCik: '0000004447',
    regulatoryFlags: ['FTC', 'DOJ'],
    litigationCount: 1,
  },
  {
    symbol: 'SLAB',
    acquirer: 'Texas Instruments Incorporated',
    target: 'Silicon Laboratories Inc.',
    status: 'REGULATORY_REVIEW',
    considerationType: 'CASH',
    dealValue: '5800000000',
    sizeBucket: 'LARGE',
    announcedDate: '2025-12-16',
    outsideDate: '2026-06-30',
    pCloseBase: '78',
    pBreakRegulatory: '15',
    grossSpread: '2.4',
    acquirerCik: '0000097476',
    targetCik: '0001038074',
    regulatoryFlags: ['DOJ', 'EU Commission'],
    litigationCount: 0,
  },
  {
    symbol: 'CTRA',
    acquirer: 'Devon Energy Corporation',
    target: 'Coterra Energy Inc.',
    status: 'REGULATORY_REVIEW',
    considerationType: 'STOCK',
    dealValue: '27400000000',
    sizeBucket: 'MEGA',
    announcedDate: '2026-01-07',
    outsideDate: '2026-09-30',
    pCloseBase: '85',
    pBreakRegulatory: '10',
    grossSpread: '1.2',
    acquirerCik: '0001090012',
    targetCik: '0000858470',
    regulatoryFlags: ['FTC'],
    litigationCount: 0,
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
    dealSymbol: 'JNPR',
    type: 'AGENCY',
    subType: 'antitrust_investigation',
    title: 'DOJ Antitrust Division Opens Investigation into HPE / Juniper Merger',
    description:
      'The Department of Justice Antitrust Division has opened an investigation into the proposed HPE acquisition of Juniper, reviewing competition concerns in enterprise networking markets.',
    source: 'DOJ',
    sourceUrl: 'https://www.justice.gov/atr',
    offsetDays: 25,
    materialityScore: 75,
    severity: 'CRITICAL',
  },
  {
    dealSymbol: 'JNPR',
    type: 'AGENCY',
    subType: 'phase_ii_review',
    title: 'EU Commission Launches Phase II Review of HPE / Juniper Deal',
    description:
      'The European Commission has opened an in-depth Phase II investigation to assess whether the merger could reduce competition in networking equipment markets.',
    source: 'FTC',
    sourceUrl: 'https://competition-policy.ec.europa.eu/',
    offsetDays: 40,
    materialityScore: 70,
    severity: 'WARNING',
  },
  {
    dealSymbol: 'HCP',
    type: 'AGENCY',
    subType: 'clearance',
    title: 'FTC Clears IBM Acquisition of HashiCorp Without Conditions',
    description:
      'The Federal Trade Commission completed antitrust review of the IBM acquisition of HashiCorp without issuing a second request or requiring remedies.',
    source: 'FTC',
    sourceUrl: 'https://www.ftc.gov/',
    offsetDays: 60,
    materialityScore: 50,
    severity: 'INFO',
  },
  {
    dealSymbol: 'HCP',
    type: 'FILING',
    subType: 'definitive_proxy',
    title: 'IBM Files Definitive Proxy Statement for HashiCorp Acquisition',
    description:
      'IBM and HashiCorp filed definitive proxy materials with the SEC in connection with the shareholder vote on the proposed acquisition.',
    source: 'SEC',
    sourceUrl: 'https://www.sec.gov/edgar/search/',
    offsetDays: 55,
    materialityScore: 40,
    severity: 'INFO',
  },
  {
    dealSymbol: 'FIGM',
    type: 'AGENCY',
    subType: 'phase_ii_final_report',
    title: 'UK CMA Issues Phase II Final Report Blocking Adobe / Figma Deal',
    description:
      'The UK Competition and Markets Authority concluded the transaction would substantially lessen competition in interactive design software and moved to block the deal.',
    source: 'FTC',
    sourceUrl: 'https://www.gov.uk/cma-cases',
    offsetDays: 90,
    materialityScore: 95,
    severity: 'CRITICAL',
  },
  {
    dealSymbol: 'FIGM',
    type: 'AGENCY',
    subType: 'statement_of_objections',
    title: 'EU Commission Raises Serious Doubts About Adobe / Figma Merger',
    description:
      'The European Commission issued a Statement of Objections citing serious competition concerns about the impact of the merger on digital design tools.',
    source: 'FTC',
    sourceUrl: 'https://competition-policy.ec.europa.eu/',
    offsetDays: 100,
    materialityScore: 85,
    severity: 'CRITICAL',
  },
  {
    dealSymbol: 'ATVI',
    type: 'COURT',
    subType: 'administrative_complaint',
    title: 'FTC Files Administrative Complaint to Block Microsoft / Activision Deal',
    description:
      "The FTC filed an administrative complaint challenging Microsoft's proposed acquisition of Activision Blizzard, alleging harm to competition in gaming markets.",
    source: 'FTC',
    sourceUrl: 'https://www.ftc.gov/',
    offsetDays: 120,
    materialityScore: 90,
    severity: 'CRITICAL',
  },
  {
    dealSymbol: 'ATVI',
    type: 'AGENCY',
    subType: 'uk_cma_clearance',
    title: 'UK CMA Approves Restructured Microsoft / Activision Deal',
    description:
      'The UK CMA approved a restructured version of the transaction after Microsoft offered a cloud gaming rights divestiture remedy.',
    source: 'FTC',
    sourceUrl: 'https://www.gov.uk/cma-cases',
    offsetDays: 80,
    materialityScore: 65,
    severity: 'INFO',
  },
  {
    dealSymbol: 'DFS',
    type: 'FILING',
    subType: 'definitive_proxy',
    title: 'Capital One and Discover File Preliminary Proxy Materials with SEC',
    description:
      'The parties filed merger-related proxy disclosures with the SEC outlining transaction terms and shareholder voting mechanics.',
    source: 'SEC',
    sourceUrl: 'https://www.sec.gov/edgar/search/',
    offsetDays: 35,
    materialityScore: 45,
    severity: 'INFO',
  },
  {
    dealSymbol: 'HES',
    type: 'AGENCY',
    subType: 'hsr_review',
    title: 'FTC Continues HSR Review of Chevron / Hess Transaction',
    description:
      'The Federal Trade Commission continues its Hart-Scott-Rodino review of the Chevron acquisition of Hess, with timing impacted by parallel arbitration uncertainty.',
    source: 'FTC',
    sourceUrl: 'https://www.ftc.gov/',
    offsetDays: 10,
    materialityScore: 70,
    severity: 'WARNING',
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
  {
    dealSymbol: 'SLAB',
    type: 'FILING',
    subType: 'prem14a',
    title: 'Silicon Labs Files Preliminary Proxy for Texas Instruments Acquisition',
    description:
      'Silicon Laboratories filed a PREM14A preliminary proxy statement with the SEC disclosing merger terms, shareholder vote details, and board recommendation for the TXN acquisition.',
    source: 'SEC',
    sourceUrl:
      'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001038074&type=PREM14A&dateb=&owner=include&count=10',
    offsetDays: 1,
    materialityScore: 70,
    severity: 'WARNING',
  },
  {
    dealSymbol: 'SLAB',
    type: 'AGENCY',
    subType: 'hsr_clearance',
    title: 'HSR Waiting Period Expires for TXN / SLAB Deal',
    description:
      'The Hart-Scott-Rodino premerger notification waiting period has expired without a Second Request from the DOJ or FTC, clearing a key regulatory milestone.',
    source: 'FTC',
    sourceUrl: 'https://www.ftc.gov/legal-library/browse/cases-proceedings?search_api_fulltext=silicon+laboratories',
    offsetDays: 5,
    materialityScore: 65,
    severity: 'INFO',
  },
  {
    dealSymbol: 'CTRA',
    type: 'FILING',
    subType: 's4_registration',
    title: 'Devon Energy Files S-4 Registration Statement for Coterra Merger',
    description:
      'Devon Energy filed an S-4 registration statement with the SEC for the stock-for-stock merger with Coterra Energy, including exchange ratio details and pro-forma financials.',
    source: 'SEC',
    sourceUrl: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001090012&type=S-4',
    offsetDays: 2,
    materialityScore: 75,
    severity: 'WARNING',
  },
  {
    dealSymbol: 'CTRA',
    type: 'AGENCY',
    subType: 'ftc_review',
    title: 'FTC Opens Review of Devon Energy / Coterra Energy Combination',
    description:
      'The Federal Trade Commission has opened an antitrust review of the proposed Devon-Coterra merger, focusing on competition in the Permian Basin and natural gas markets.',
    source: 'FTC',
    sourceUrl: 'https://www.ftc.gov/enforcement/premerger-notification-program',
    offsetDays: 8,
    materialityScore: 80,
    severity: 'CRITICAL',
  },
];

interface StarterClause {
  dealSymbol: string;
  type: (typeof schema.clauses.$inferInsert)['type'];
  title: string;
  summary: string;
  verbatimText: string;
  sourceLocation: string;
  confidenceScore: number;
}

const STARTER_CLAUSES: StarterClause[] = [
  {
    dealSymbol: 'X',
    type: 'TERMINATION_FEE',
    title: 'Reverse Termination Fee',
    summary: 'Nippon Steel pays $565 million if required approvals are not obtained by outside date.',
    verbatimText:
      'If all conditions other than specified regulatory approvals are satisfied and closing does not occur due to failure to obtain those approvals, Parent shall pay Company a reverse termination fee of $565,000,000 within two business days.',
    sourceLocation: 'Merger Agreement Section 8.03(c)',
    confidenceScore: 0.93,
  },
  {
    dealSymbol: 'X',
    type: 'CLOSING_CONDITIONS',
    title: 'Regulatory and Governmental Closing Conditions',
    summary: 'Closing requires CFIUS, HSR, and Japanese fair trade authority clearance.',
    verbatimText:
      'The obligations of each party to consummate the merger are conditioned upon receipt of CFIUS clearance, expiration or termination of the HSR waiting period, and required approvals from the Japan Fair Trade Commission.',
    sourceLocation: 'Merger Agreement Section 6.01(a)',
    confidenceScore: 0.91,
  },
  {
    dealSymbol: 'X',
    type: 'MAE',
    title: 'Material Adverse Effect Carveouts',
    summary: 'MAE excludes broad steel industry impacts, commodity shifts, and force majeure events.',
    verbatimText:
      'Material Adverse Effect shall not include effects arising from changes affecting the steel industry generally, fluctuations in commodity prices, or force majeure events, except to the extent disproportionately affecting the Company relative to peers.',
    sourceLocation: 'Merger Agreement Section 1.01 (Material Adverse Effect)',
    confidenceScore: 0.89,
  },
  {
    dealSymbol: 'JNPR',
    type: 'TERMINATION_FEE',
    title: 'Regulatory Reverse Termination Fee',
    summary: 'HPE owes $1.8 billion if merger fails due to unresolved antitrust conditions.',
    verbatimText:
      'In the event this Agreement is terminated due to failure to obtain required antitrust approvals by the Outside Date, Parent shall pay Company a reverse termination fee of $1,800,000,000.',
    sourceLocation: 'Merger Agreement Section 8.04(b)',
    confidenceScore: 0.94,
  },
  {
    dealSymbol: 'JNPR',
    type: 'NO_SHOP',
    title: 'No-Shop with Fiduciary Out',
    summary: 'Juniper cannot solicit alternatives, subject to fiduciary exception for superior proposals.',
    verbatimText:
      'Company shall not, directly or indirectly, solicit, initiate, or encourage Acquisition Proposals; provided that the Board may engage with an unsolicited bona fide proposal that could reasonably constitute a Superior Proposal in order to satisfy fiduciary duties.',
    sourceLocation: 'Merger Agreement Section 5.03',
    confidenceScore: 0.88,
  },
  {
    dealSymbol: 'DFS',
    type: 'REGULATORY_CONDITION',
    title: 'Federal Reserve and OCC Approval Condition',
    summary: 'Closing depends on Federal Reserve and OCC approvals before outside date.',
    verbatimText:
      "The parties' obligations to close are conditioned upon receipt of required approvals from the Board of Governors of the Federal Reserve System and the Office of the Comptroller of the Currency, and either party may terminate if such approvals are not obtained by the Outside Date.",
    sourceLocation: 'Merger Agreement Section 6.01(c)',
    confidenceScore: 0.92,
  },
  {
    dealSymbol: 'DFS',
    type: 'TERMINATION_FEE',
    title: 'Company Recommendation Change Fee',
    summary: 'Discover pays $1.4 billion if board changes recommendation and terminates for superior bid.',
    verbatimText:
      'Company shall pay Parent a termination fee of $1,400,000,000 if this Agreement is terminated following a Company Board Recommendation Change or entry into an Alternative Acquisition Agreement.',
    sourceLocation: 'Merger Agreement Section 8.03(a)',
    confidenceScore: 0.9,
  },
  {
    dealSymbol: 'HES',
    type: 'SPECIFIC_PERFORMANCE',
    title: 'Specific Performance Right',
    summary: 'Both parties can seek specific performance to enforce merger obligations.',
    verbatimText:
      'The parties acknowledge that irreparable damage would occur if any provision of this Agreement is not performed in accordance with its terms, and each party shall be entitled to specific performance and injunctive relief to enforce this Agreement.',
    sourceLocation: 'Merger Agreement Section 9.10',
    confidenceScore: 0.93,
  },
  {
    dealSymbol: 'HES',
    type: 'CLOSING_CONDITIONS',
    title: 'Arbitration-Linked Closing Condition',
    summary: 'Closing contingent on resolution of ExxonMobil arbitration over Guyana assets.',
    verbatimText:
      "As a condition to closing, no order or arbitral determination shall prohibit or materially impair transfer of Company's interest in the Stabroek Block, including claims asserted by ExxonMobil regarding rights of first refusal.",
    sourceLocation: 'Merger Agreement Section 6.02(d)',
    confidenceScore: 0.87,
  },
  {
    dealSymbol: 'HCP',
    type: 'TERMINATION_FEE',
    title: 'HashiCorp Termination Fee',
    summary: 'HashiCorp pays $305 million under specified termination scenarios.',
    verbatimText:
      'Company shall pay Parent a termination fee of $305,000,000 if this Agreement is terminated under circumstances involving a Company Adverse Recommendation Change or entry into a competing transaction.',
    sourceLocation: 'Merger Agreement Section 8.03(a)',
    confidenceScore: 0.91,
  },
  {
    dealSymbol: 'HCP',
    type: 'GO_SHOP',
    title: 'Go-Shop Period',
    summary: 'HashiCorp may solicit competing proposals during a 45-day go-shop window.',
    verbatimText:
      'For a period of 45 days following execution of this Agreement, Company and its representatives may initiate, solicit, and encourage Acquisition Proposals from third parties.',
    sourceLocation: 'Merger Agreement Section 5.02',
    confidenceScore: 0.89,
  },
  {
    dealSymbol: 'FIGM',
    type: 'TERMINATION_FEE',
    title: 'Adobe Regulatory Reverse Termination Fee',
    summary: 'Adobe pays $1 billion if deal is blocked by regulators.',
    verbatimText:
      'If this Agreement is terminated following a final non-appealable order by a governmental authority prohibiting the merger, Parent shall pay Company a reverse termination fee of $1,000,000,000.',
    sourceLocation: 'Merger Agreement Section 8.04(c)',
    confidenceScore: 0.95,
  },
  {
    dealSymbol: 'FIGM',
    type: 'MAE',
    title: 'Regulatory Prohibition MAE Trigger',
    summary: 'MAE definition captures prohibition outcomes from CMA or EU Commission.',
    verbatimText:
      'For purposes of termination rights, a final prohibition decision by the UK CMA or the European Commission preventing consummation of the transactions shall constitute a Material Adverse Effect on deal completion.',
    sourceLocation: 'Merger Agreement Section 1.01 and 8.01(f)',
    confidenceScore: 0.86,
  },
  {
    dealSymbol: 'ATVI',
    type: 'TERMINATION_FEE',
    title: 'Microsoft Reverse Termination Fee',
    summary: 'Microsoft pays $3 billion if regulatory conditions are not satisfied.',
    verbatimText:
      'If this Agreement is terminated due to failure to satisfy applicable antitrust and foreign investment approvals by the Outside Date, Parent shall pay Company a reverse termination fee of $3,000,000,000.',
    sourceLocation: 'Merger Agreement Section 8.03(d)',
    confidenceScore: 0.94,
  },
  {
    dealSymbol: 'ATVI',
    type: 'CLOSING_CONDITIONS',
    title: 'Regulatory Litigation and UK Approval Conditions',
    summary: 'Closing requires resolution of FTC challenge and UK CMA approval pathway.',
    verbatimText:
      'The obligation to close is conditioned on the absence of any pending injunction obtained by the FTC and receipt of all required UK competition authority approvals, including any remedy implementation orders.',
    sourceLocation: 'Merger Agreement Section 6.01(b)',
    confidenceScore: 0.9,
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
    acquirerCik: d.acquirerCik,
    targetCik: d.targetCik,
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

  const clauseInserts = STARTER_CLAUSES.flatMap((c) => {
    const deal = dealBySymbol[c.dealSymbol];
    if (!deal) return [];
    return [
      {
        firmId,
        dealId: deal.id,
        type: c.type,
        title: c.title,
        summary: c.summary,
        verbatimText: c.verbatimText,
        sourceLocation: c.sourceLocation,
        extractedAt: new Date(),
        confidenceScore: c.confidenceScore.toString(),
        analystVerified: false,
      },
    ];
  });

  if (clauseInserts.length > 0) {
    await adminDb.insert(schema.clauses).values(clauseInserts);
    console.log(`[seed] Inserted ${clauseInserts.length} starter clauses`);
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

  const liveDeals = insertedDeals.filter((d) => ['SLAB', 'CTRA'].includes(d.symbol));
  if (liveDeals.length > 0) {
    const [aiWatchlist] = await adminDb
      .insert(schema.watchlists)
      .values({
        firmId,
        name: 'AI Picks — Live Deals',
        description: 'Auto-generated watchlist of deals with active SEC filing activity. Updated by EDGAR pipeline.',
        createdBy: userId,
      })
      .returning();

    if (aiWatchlist) {
      await adminDb.insert(schema.watchlistDeals).values(
        liveDeals.map((d) => ({
          watchlistId: aiWatchlist.id,
          dealId: d.id,
          addedBy: userId,
        })),
      );
      console.log(`[seed] Created "AI Picks" watchlist with ${liveDeals.length} live deals`);
    }
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
