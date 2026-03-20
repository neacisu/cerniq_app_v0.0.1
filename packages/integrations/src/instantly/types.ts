/**
 * Instantly.ai API Types
 * Source: etapa2-workers-D-E-email.md sec. 1.3, 2-4
 */

// ===== addLead =====

export interface AddLeadRequest {
  campaign_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  /** Custom variables for personalization */
  variables?: Record<string, string>;
}

export interface AddLeadResponse {
  lead_id: string;
  status: "ADDED" | "ALREADY_EXISTS";
}

// ===== getCampaigns =====

export interface Campaign {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "DRAFT";
  daily_limit: number;
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
  bounce_rate: number;
  created_at: string;
}

export interface GetCampaignsResponse {
  campaigns: Campaign[];
  total: number;
}

// ===== Webhook events =====

export type InstantlyWebhookEvent =
  | "email_sent"
  | "email_opened"
  | "reply_received"
  | "email_bounced"
  | "lead_unsubscribed";

export interface InstantlyWebhookPayload {
  event: InstantlyWebhookEvent;
  campaign_id: string;
  lead_email: string;
  timestamp: string;
  message_id?: string;
  reply_text?: string;
  bounce_reason?: string;
}

// ===== System Event (ADR-0061) =====

export interface InstantlySystemEvent {
  eventId: string;
  source: "instantly";
  eventType: InstantlyWebhookEvent;
  timestamp: string;
  payload: Record<string, unknown>;
  rawEvent: unknown;
}
