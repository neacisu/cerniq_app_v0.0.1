/**
 * Resend API Types
 * Source: etapa2-workers-D-E-email.md sec. 6-8
 */

// ===== sendEmail =====

export interface ResendEmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Tags for tracking: [{name: "lead_id", value: "..."}, {name: "tenant_id", value: "..."}] */
  tags?: Array<{ name: string; value: string }>;
  replyToMessageId?: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
}

export interface ResendEmailResponse {
  id: string;
}

// ===== Allowed stages (ADR-0059 channel segregation) =====
export const WARM_ALLOWED_STAGES = ["WARM_REPLY", "NEGOTIATION"] as const;
export type WarmAllowedStage = (typeof WARM_ALLOWED_STAGES)[number];

// ===== Webhook events =====

export type ResendWebhookEvent =
  | "email.sent"
  | "email.delivered"
  | "email.bounced"
  | "email.opened"
  | "email.clicked";

export interface ResendWebhookPayload {
  type: ResendWebhookEvent;
  data: {
    email_id: string;
    from?: string;
    to?: string[];
    created_at?: string;
    tags?: Record<string, string>;
    [key: string]: unknown;
  };
}

export interface ResendSystemEvent {
  eventId: string;
  source: "resend";
  eventType: ResendWebhookEvent;
  timestamp: string;
  payload: Record<string, unknown>;
  rawEvent: unknown;
}
