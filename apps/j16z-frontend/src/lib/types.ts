export enum ItemType {
  SEC_FILING = "SEC_FILING",
  NEWS = "NEWS",
  LITIGATION = "LITIGATION",
  PREDICTION = "PREDICTION",
}

export enum Priority {
  CRITICAL = "CRITICAL",
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
}

export interface IntelligenceItem {
  id: string;
  type: ItemType;
  title: string;
  source: string;
  timestamp: string;
  priority: Priority;
  ticker?: string;
  summary?: string;
  content: string;
  tags: string[];
  metadata?: {
    filingType?: string;
    caseNumber?: string;
    court?: string;
    probability?: number;
  };
}

export interface DataSource {
  id: string;
  name: string;
  status: "active" | "pending" | "error";
  type: "api" | "rss" | "websocket";
  itemsToday: number;
  lastUpdate: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: number;
  isThinking?: boolean;
}

// M&A Deal Types (API-Grounded)

export type DealStatus = 'ANNOUNCED' | 'REGULATORY_REVIEW' | 'LITIGATION' | 'APPROVED' | 'TERMINATED' | 'CLOSED';
export type ConsiderationType = 'CASH' | 'STOCK' | 'MIXED';
export type RegulatoryFlag = 'FTC_SECOND_REQUEST' | 'DOJ_INVESTIGATION' | 'EU_REVIEW' | 'UK_CMA_REVIEW';

export interface Deal {
  id: string;
  symbol: string;
  acquirerSymbol: string;
  companyName: string;
  acquirerName: string;
  announcementDate: string;
  acquisitionDate: string;
  outsideDate: string;
  reportedEquityTakeoverValue: number;
  considerationType: ConsiderationType;
  p_close_base: number;
  spread_entry_threshold: number;
  currentSpread: number;
  ev: number;
  status: DealStatus;
  regulatoryFlags: RegulatoryFlag[];
  litigationCount: number;
}

export type EventType = 'FILING' | 'COURT' | 'AGENCY' | 'SPREAD_MOVE' | 'NEWS';
export type Severity = 'CRITICAL' | 'WARNING' | 'INFO';
export type SourceType = 'SEC_EDGAR' | 'COURT_LISTENER' | 'FTC_GOV' | 'DOJ_GOV' | 'RSS';

export interface Event {
  id: string;
  dealId: string;
  timestamp: string;
  type: EventType;
  subtype: string;
  severity: Severity;
  title: string;
  summary: string;
  content?: string;
  sourceUrl: string;
  sourceType: SourceType;
  // DB-stored materiality score from Python extraction pipeline (EXTRACT-07)
  // 0 = not set (pre-extraction events); falls back to client-side calculation
  materialityScore?: number;
}

export type ClauseType =
  | 'TERMINATION_FEE'
  | 'REVERSE_TERMINATION_FEE'
  | 'MAE'
  | 'REGULATORY_EFFORTS'
  | 'LITIGATION_CONDITION'
  | 'FINANCING_CONDITION'
  | 'GO_SHOP'
  | 'TICKING_FEE'
  | 'HELL_OR_HIGH_WATER'
  | 'SPECIFIC_PERFORMANCE'
  | 'NO_SHOP'
  | 'MATCHING_RIGHTS'
  | 'OTHER';

export interface Clause {
  id: string;
  dealId: string;
  // New extraction fields (populated by Python LangExtract pipeline)
  filingId?: string;
  type: ClauseType;
  title?: string;
  summary?: string;
  verbatimText?: string;
  sourceLocation?: string; // "start_pos:end_pos" format
  extractedAt?: string;
  confidenceScore?: number | null;
  analystVerified?: boolean;
  // Legacy fields for backward compatibility with mock data
  value?: string;
  sourceFilingType?: string;
  sourceSection?: string;
  sourceUrl?: string;
}

export interface MarketSnapshot {
  dealId: string;
  timestamp: string;
  targetPrice: number;
  acquirerPrice: number;
  offerPrice: number;
  spread: number;
  volume: number;
}

export interface NewsItem {
  id: string;
  dealId: string;
  timestamp: string;
  source: string;
  title: string;
  summary: string;
  url: string;
  tags: string[];
}

// Filing types for EDGAR ingestion
export type FilingType =
  | '8-K'
  | '8-K/A'
  | 'S-4'
  | 'S-4/A'
  | 'DEFM14A'
  | 'SC 13D'
  | 'SC 13D/A'
  | 'SC 13G'
  | 'SC 13G/A'
  | 'SC TO-T'
  | 'SC TO-T/A'
  | 'SC TO-I'
  | 'SC TO-I/A'
  | 'PREM14A'
  | 'SC 14D9'
  | 'SC 14D9/A';
export type FilingStatus = 'active' | 'pending_review' | 'dismissed';

export interface Filing {
  id: string;
  dealId: string | null;
  accessionNumber: string;
  filingType: FilingType;
  filerName: string | null;
  filerCik: string;
  filedDate: string;
  rawUrl: string;
  rawContent: string | null; // null = content pending (download in progress)
  extracted: boolean;
  status: FilingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DealWithFilings extends Deal {
  filingCount?: number;
}
