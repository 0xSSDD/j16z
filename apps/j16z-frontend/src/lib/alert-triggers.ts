/**
 * Alert Triggers System
 * Determines when to send external alerts (Email, Slack) based on materiality scores
 */

import { MaterialityTier } from "./materiality-scoring";

export interface AlertConfig {
  highThreshold: number; // Default: 70
  mediumThreshold: number; // Default: 50
  emailEnabled: boolean;
  slackEnabled: boolean;
  webhookEnabled: boolean;
  webhookUrl?: string;
}

export interface AlertPayload {
  eventId: string;
  eventTitle: string;
  eventType: string;
  materialityScore: number;
  materialityTier: MaterialityTier;
  dealId: string;
  dealName?: string;
  currentSpread?: number;
  pClose?: number;
  daysToOutside?: number;
  timestamp: string;
  inboxLink: string;
}

export interface AlertChannels {
  email: boolean;
  slack: boolean;
  webhook: boolean;
}

/**
 * Get default alert configuration
 */
export function getDefaultAlertConfig(): AlertConfig {
  return {
    highThreshold: 70,
    mediumThreshold: 50,
    emailEnabled: true,
    slackEnabled: true,
    webhookEnabled: false,
  };
}

/**
 * Load alert configuration from localStorage
 */
export function loadAlertConfig(): AlertConfig {
  if (typeof window === "undefined") return getDefaultAlertConfig();

  try {
    const stored = localStorage.getItem("alert_config");
    return stored ? { ...getDefaultAlertConfig(), ...JSON.parse(stored) } : getDefaultAlertConfig();
  } catch (error) {
    console.error("Failed to load alert config:", error);
    return getDefaultAlertConfig();
  }
}

/**
 * Save alert configuration to localStorage
 */
export function saveAlertConfig(config: AlertConfig): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem("alert_config", JSON.stringify(config));
  } catch (error) {
    console.error("Failed to save alert config:", error);
  }
}

/**
 * Determine which alert channels should be triggered based on materiality score
 */
export function determineAlertChannels(
  materialityScore: number,
  config: AlertConfig = loadAlertConfig()
): AlertChannels {
  // HIGH tier (score > 70): Email + Slack
  if (materialityScore > config.highThreshold) {
    return {
      email: config.emailEnabled,
      slack: config.slackEnabled,
      webhook: config.webhookEnabled,
    };
  }

  // MEDIUM tier (score 50-70): Slack only
  if (materialityScore >= config.mediumThreshold) {
    return {
      email: false,
      slack: config.slackEnabled,
      webhook: config.webhookEnabled,
    };
  }

  // LOW tier (score < 50): No external alerts
  return {
    email: false,
    slack: false,
    webhook: false,
  };
}

/**
 * Format alert payload for external systems
 */
export function formatAlertPayload(payload: AlertPayload): {
  subject: string;
  body: string;
  slackMessage: string;
} {
  const { eventTitle, materialityTier, materialityScore, dealName, currentSpread, timestamp } = payload;

  const badge = materialityTier === MaterialityTier.HIGH ? "🔴" : materialityTier === MaterialityTier.MEDIUM ? "🟠" : "🟡";

  const subject = `${badge} ${materialityTier} Alert: ${eventTitle}`;

  const body = `
New ${materialityTier} materiality event detected:

Event: ${eventTitle}
Score: ${materialityScore}/100
Deal: ${dealName || payload.dealId}
${currentSpread ? `Current Spread: ${currentSpread}%` : ""}
Time: ${new Date(timestamp).toLocaleString()}

View in Inbox: ${payload.inboxLink}
  `.trim();

  const slackMessage = `
${badge} *${materialityTier} Alert*

*${eventTitle}*
Score: ${materialityScore}/100 | Deal: ${dealName || payload.dealId}
${currentSpread ? `Spread: ${currentSpread}%` : ""}

<${payload.inboxLink}|View in Inbox>
  `.trim();

  return { subject, body, slackMessage };
}

/**
 * Trigger alerts for a new event
 * In production, this would call actual email/Slack APIs
 */
export async function triggerAlerts(payload: AlertPayload): Promise<void> {
  const channels = determineAlertChannels(payload.materialityScore);
  const formatted = formatAlertPayload(payload);

  // Log alerts (in production, replace with actual API calls)
  if (channels.email) {
    console.log("[EMAIL ALERT]", formatted.subject);
    console.log(formatted.body);
    // TODO: Call email API
  }

  if (channels.slack) {
    console.log("[SLACK ALERT]", formatted.slackMessage);
    // TODO: Call Slack webhook
  }

  if (channels.webhook) {
    console.log("[WEBHOOK ALERT]", payload);
    // TODO: Call custom webhook
  }
}

/**
 * Get SLA for alert delivery based on materiality tier
 */
export function getAlertSLA(materialityScore: number): number {
  const config = loadAlertConfig();

  // HIGH: 60 seconds
  if (materialityScore > config.highThreshold) {
    return 60;
  }

  // MEDIUM: 5 minutes (300 seconds)
  if (materialityScore >= config.mediumThreshold) {
    return 300;
  }

  // LOW: No SLA (no external alerts)
  return 0;
}
