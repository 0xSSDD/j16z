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
export type Materiality = 'HIGH' | 'MEDIUM' | 'LOW';
export type SourceType = 'SEC_EDGAR' | 'COURT_LISTENER' | 'FTC_GOV' | 'DOJ_GOV' | 'RSS';

export interface Event {
  id: string;
  dealId: string;
  timestamp: string;
  type: EventType;
  subtype: string;
  materiality: Materiality;
  title: string;
  summary: string;
  content?: string;
  sourceUrl: string;
  sourceType: SourceType;
}

export type ClauseType = 'TERMINATION_FEE' | 'REVERSE_TERMINATION_FEE' | 'MAE' | 'REGULATORY_EFFORTS' | 'LITIGATION_CONDITION' | 'FINANCING_CONDITION';

export interface Clause {
  id: string;
  dealId: string;
  type: ClauseType;
  value: string;
  sourceFilingType: string;
  sourceSection: string;
  sourceUrl: string;
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
