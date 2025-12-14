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
