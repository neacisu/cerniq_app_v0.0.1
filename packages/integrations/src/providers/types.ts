/**
 * Contracte ADR-0031 — abstractizare furnizori (WA / email / SMS).
 * Implementările concrete trăiesc în același folder; workerii depind de interfețe, nu de SDK-uri.
 */
import type { AddLeadRequest, AddLeadResponse } from "../instantly/types.js";

/** Identificatori furnizor SMS persistenți în `outreach.sms_messages.provider`. */
export type SmsProviderId = "TWILIO" | "VONAGE" | "AWS_SNS" | "SMSADVERT";

/** Răspuns comun trimitere mesaj (normalizat pentru metrici / audit). */
export type ProviderSendResult = {
  messageId: string;
  raw?: unknown;
  /** Cine a livrat efectiv (ex. după fallback Twilio). */
  providerUsed?: SmsProviderId;
};

export type ProviderDeliveryStatus = "PENDING" | "SENT" | "DELIVERED" | "FAILED" | "UNKNOWN";

/** WhatsApp — model aliniat la TimelinesAI `sendMessage`, nu la „to/body” generic. */
export type WaWhatsAppSendInput = {
  accountPhone: string;
  recipientE164: string;
  body: string;
  mediaUrl?: string;
  correlationId?: string;
};

export type WaWhatsAppSendResult = {
  message_id: string;
  chat_id: string;
  status: "SENT" | "QUEUED" | "FAILED";
};

export interface WaProvider {
  sendWhatsApp(input: WaWhatsAppSendInput): Promise<WaWhatsAppSendResult>;
}

/**
 * Email tranzacțional (ex. Resend) — subiect + HTML.
 * Canalul rece Instantly nu folosește `send`; folosește `InstantlyColdEmailPort.addLead`.
 */
export interface TransactionalEmailProvider {
  sendTransactional(input: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    tags?: { name: string; value: string }[];
  }): Promise<ProviderSendResult>;
}

/** Instantly: trimiterea e gestionată de platformă — noi doar încărcăm lead-ul în campanie. */
export interface InstantlyColdEmailPort {
  addLead(req: AddLeadRequest): Promise<AddLeadResponse>;
}

export type SmsSendInput = {
  toE164: string;
  body: string;
  /** Identificator „From” în Twilio (număr sau Messaging Service SID). */
  from: string;
};

export interface SmsProvider {
  sendSms(input: SmsSendInput): Promise<ProviderSendResult>;
  getDeliveryStatus?(messageId: string): Promise<ProviderDeliveryStatus>;
}
