/**
 * Alert system types — shared across alert worker and delivery handlers.
 */

/** Data passed to the alert_evaluate BullMQ job */
export interface AlertEvaluateData {
  eventId: string;
  firmId: string;
  dealId: string | null;
  materialityScore: number;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
}

/** Payload passed to each delivery handler */
export interface DeliveryPayload {
  event: {
    id: string;
    title: string;
    description: string;
    severity: string;
    sourceUrl: string;
    type: string;
    subType: string;
  };
  deal: {
    id: string;
    name: string;
    symbol: string;
    currentSpread: string | null;
  } | null;
  alertRule: {
    id: string;
    name: string;
    channels: string[];
    webhookUrl: string | null;
    webhookSecret: string | null;
  };
}

/** Result from a delivery attempt */
export interface DeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
