/**
 * I53 — document:whatsapp:send (concurrency:5)
 *
 * STUB — WhatsApp Business API media upload necesită token special per tenant.
 * Implementare reală în FAZA 13.
 * Quota WA: 200/zi/telefon (plan L1624).
 *
 * ANTI-HALUCINARE: NU face apel HTTP real — STUB documentat explicit.
 * Tipul cognitiv: MotorNeuron
 *
 * FAZA 13 va implementa:
 * - WA Business API token per tenant
 * - Media upload: POST https://graph.facebook.com/v18.0/{phone-number-id}/media
 * - Message send: POST https://graph.facebook.com/v18.0/{phone-number-id}/messages
 */
import type { Processor } from "bullmq";
import { setSessionTenantId } from "@cerniq/db";

const LOG = "[i53-document-whatsapp-send]";

// E.164: starts with +, min 8 cifre total (+ + minim 7 cifre)
const E164_REGEX = /^\+\d{7,15}$/;

export interface DocumentWhatsappSendJobData {
  tenantId: string;
  phoneNumber: string;
  message: string;
  pdfBase64?: string;
  fileName?: string;
  oblioDocumentId?: string;
}

export interface DocumentWhatsappSendResult {
  ok: true;
  phoneNumber: string;
  queued: boolean;
  oblioDocumentId?: string;
  note: string;
}

export const documentWhatsappSendProcessor: Processor<
  DocumentWhatsappSendJobData,
  DocumentWhatsappSendResult
> = async (job) => {
  const { tenantId, phoneNumber, message, pdfBase64, oblioDocumentId } = job.data;

  await setSessionTenantId(tenantId);

  // 1. Validare E.164
  if (!E164_REGEX.test(phoneNumber)) {
    throw new Error(
      `i53: phoneNumber invalid "${phoneNumber}" — format E.164 necesar (ex: +40721000000)`,
    );
  }

  // 2. Log STUB pentru PDF document
  if (pdfBase64) {
    console.info(
      `${LOG} [STUB] PDF document send via WA — oblioDocumentId=${oblioDocumentId ?? "n/a"} ` +
        `phoneNumber=${phoneNumber} — implementare reală în FAZA 13`,
    );
  }

  // 3. Log intent
  console.info(
    `${LOG} [STUB] tenantId=${tenantId} phoneNumber=${phoneNumber} ` +
      `message="${message.slice(0, 50)}..." oblioDocumentId=${oblioDocumentId ?? "n/a"} ` +
      `— WA Business API token per tenant necesar (FAZA 13)`,
  );

  return {
    ok: true,
    phoneNumber,
    queued: true,
    oblioDocumentId,
    note: "wa-send-stub-phase-13",
  };
};
