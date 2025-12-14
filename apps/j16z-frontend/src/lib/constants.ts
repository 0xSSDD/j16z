import type { DataSource, IntelligenceItem } from "./types";
import { ItemType, Priority } from "./types";

export const MOCK_ITEMS: IntelligenceItem[] = [
  {
    id: "1",
    type: ItemType.LITIGATION,
    title: "Motion to Dismiss - FTC v. Microsoft",
    source: "CourtListener",
    timestamp: "2023-10-12T09:42:12Z",
    priority: Priority.CRITICAL,
    ticker: "MSFT",
    content:
      "UNITED STATES DISTRICT COURT\nNORTHERN DISTRICT OF CALIFORNIA\n\nFEDERAL TRADE COMMISSION, Plaintiff,\n v.\nMICROSOFT CORP. and ACTIVISION BLIZZARD, INC., Defendants.\n\nCASE NO. 3:23-cv-02880-JSC\n\nDEFENDANT MICROSOFT CORP.'S MOTION TO DISMISS\n\nDefendant Microsoft Corp. (\"Microsoft\") respectfully moves to dismiss the complaint filed by the Federal Trade Commission (\"FTC\") pursuant to Federal Rule of Civil Procedure 12(b)(6). The FTC's attempt to block Microsoft's acquisition of Activision Blizzard, Inc. fails to state a claim upon which relief can be granted because it relies on a speculative theory of harm that contradicts the vertical merger guidelines and ignores the fiercely competitive nature of the gaming industry.\n\nMicrosoft argues that the FTC has failed to allege a plausible relevant market and has not demonstrated a likelihood of substantial competitive harm. Furthermore, Microsoft has entered into binding 10-year commitments to keep Call of Duty available on competitor platforms, negating the central premise of the FTC's foreclosure theory.",
    tags: ["Antitrust", "Merger", "Acquisition"],
    metadata: {
      caseNumber: "3:23-cv-02880-JSC",
      court: "N.D. Cal.",
    },
  },
  {
    id: "2",
    type: ItemType.SEC_FILING,
    title: "8-K: Entry into Material Definitive Agreement",
    source: "SEC EDGAR",
    timestamp: "2023-10-12T08:30:00Z",
    priority: Priority.HIGH,
    ticker: "ADBE",
    content:
      "Item 1.01 Entry into a Material Definitive Agreement.\n\nOn October 12, 2023, Adobe Inc. (\"Adobe\") entered into an Agreement and Plan of Merger (the \"Merger Agreement\") with Figma, Inc. (\"Figma\"). Pursuant to the Merger Agreement, Adobe will acquire Figma for approximately $20 billion in cash and stock.\n\nThe Merger Agreement contains customary representations, warranties, and covenants. The transaction is subject to regulatory approvals and customary closing conditions. In the event the merger is terminated under certain circumstances involving antitrust hurdles, Adobe may be required to pay a reverse termination fee of $1 billion.",
    tags: ["M&A", "Software", "Reg-FD"],
    metadata: {
      filingType: "8-K",
    },
  },
  {
    id: "3",
    type: ItemType.NEWS,
    title: "Qualcomm Rumored to Explore Takeover of Intel",
    source: "Wall Street Journal",
    timestamp: "2023-10-12T10:15:00Z",
    priority: Priority.MEDIUM,
    ticker: "INTC",
    content:
      "Qualcomm Inc. has approached Intel Corp. about a potential takeover of the struggling chip maker, according to people familiar with the matter. A deal, if it happens, would be one of the largest technology mergers in history.\n\nThe talks come as Intel faces mounting losses in its foundry business and a declining share price. A combination with Qualcomm, the dominant supplier of mobile phone chips, could reshape the semiconductor landscape, though it would likely face intense regulatory scrutiny globally.",
    tags: ["Rumor", "Semiconductor", "Hostile"],
    metadata: {},
  },
  {
    id: "4",
    type: ItemType.PREDICTION,
    title: "Kroger / Albertsons Merger Approval Odds",
    source: "Polymarket",
    timestamp: "2023-10-12T11:00:00Z",
    priority: Priority.HIGH,
    ticker: "KR",
    content:
      "Market: Will the Kroger-Albertsons merger be completed by June 30, 2024?\n\nCurrent Probability: 32%\nVolume: $4.2M\n\nAnalysis: The market sentiment has trended downward following recent comments from the FTC Chair regarding consolidation in the grocery sector. Traders are pricing in a significant risk of litigation to block the deal.",
    tags: ["Arbitrage", "Antitrust"],
    metadata: {
      probability: 0.32,
    },
  },
];

export const DATA_SOURCES: DataSource[] = [
  {
    id: "1",
    name: "SEC EDGAR",
    status: "active",
    type: "api",
    itemsToday: 145,
    lastUpdate: "2 min ago",
  },
  {
    id: "2",
    name: "CourtListener",
    status: "active",
    type: "api",
    itemsToday: 32,
    lastUpdate: "5 min ago",
  },
  {
    id: "3",
    name: "Reuters Wire",
    status: "active",
    type: "rss",
    itemsToday: 89,
    lastUpdate: "1 min ago",
  },
  {
    id: "4",
    name: "Polymarket",
    status: "pending",
    type: "websocket",
    itemsToday: 12,
    lastUpdate: "15 min ago",
  },
  {
    id: "5",
    name: "Internal Watchlist",
    status: "error",
    type: "api",
    itemsToday: 0,
    lastUpdate: "4 hours ago",
  },
];
