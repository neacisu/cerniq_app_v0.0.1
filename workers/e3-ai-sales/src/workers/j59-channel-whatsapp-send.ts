/**
 * J59 — channel:whatsapp:send (concurrency:10)
 *
 * Trimite mesajul de handover via WhatsApp Business API.
 *
 * Arhitectură:
 *   - Verifică quota zilnică per telefon (200 mesaje/zi — plan L8409)
 *   - Verifică blackout time (21:00-08:00 România) — safety net redundant față de J58
 *   - Validează numărul destinatarului (E.164)
 *   - Deleghează trimiterea actuală la QUEUES.E3_DOCUMENT_WHATSAPP_SEND (I53)
 *     (WA Business API real în FAZA 13 — plan §XIII L2598)
 *   - Logare audit: conversationId, phoneId, recipient, timestamp
 *
 * Quota 200/zi/telefon:
 *   - Contorizare prin DB count pe communication_logs (dacă există)
 *   - SAU forward direct la I53 care are propria logică de trimitere
 *
 * ANTI-HALUCINARE:
 *   - assignedPhoneId vine din goldNegotiations.assignedPhoneId (plan L8409)
 *   - E.164 validat strict — prefix + (rejecting mesaj dacă invalid)
 *   - NU trimite 21:00-08:00 RO (redundant blackout check)
 */
import type { Processor } from "bullmq";
import { setSessionTenantId } from "@cerniq/db";
import { createQueue, DEFAULT_JOB_OPTIONS, QUEUES } from "@cerniq/worker-shared";
import { isWaBlackoutTime } from "./j58-channel-route-decide.js";
import type { HandoverContext } from "./j57-handover-context-load.js";

const LOG = "[j59-channel-whatsapp-send]";

/** Regex E.164 strict: + urmat de 8-15 cifre. */
const E164_REGEX = /^\+[1-9]\d{7,14}$/;

// ── Queues ────────────────────────────────────────────────────────────────────

const documentWaQueue = createQueue(QUEUES.E3_DOCUMENT_WHATSAPP_SEND);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChannelWhatsappSendJobData {
  tenantId: string;
  negotiationId: string;
  /** Numărul destinatarului (client) în format E.164. */
  recipientPhone: string;
  /**
   * UUID-ul telefonului WA al tenantului utilizat pentru trimitere.
   * Provine din goldNegotiations.assignedPhoneId (plan L8409).
   * Null = niciun telefon sticky atribuit negocierii.
   */
  phoneId: string | null;
  /** Mesajul de handover compus în J58. */
  message: string;
  /** Context complet din J57 (pentru audit trail). */
  context: HandoverContext;
}

export interface ChannelWhatsappSendResult {
  ok: true;
  queued: boolean;
  reason?: string;
  jobId?: string;
}

// ── Processor ─────────────────────────────────────────────────────────────────

export const channelWhatsappSendProcessor: Processor<
  ChannelWhatsappSendJobData,
  ChannelWhatsappSendResult
> = async (job) => {
  const { tenantId, negotiationId, recipientPhone, phoneId, message, context } = job.data;

  await setSessionTenantId(tenantId);

  console.info(
    `${LOG} tenantId=${tenantId} negotiationId=${negotiationId} ` +
      `recipient=${recipientPhone.slice(0, 6)}*** phoneId=${phoneId ?? "none"}`,
  );

  // 1. Validare număr destinatar E.164
  if (!E164_REGEX.test(recipientPhone)) {
    console.warn(
      `${LOG} invalid E.164 recipient: ${recipientPhone.slice(0, 6)}*** negotiation=${negotiationId}`,
    );
    return { ok: true, queued: false, reason: "invalid_e164_recipient" };
  }

  // 2. Blackout check redundant (J58 ar fi trebuit să blocheze deja, dar safety net)
  if (isWaBlackoutTime()) {
    console.warn(
      `${LOG} WA blackout active (21:00-08:00 RO) — message blocked for negotiation=${negotiationId}`,
    );
    return { ok: true, queued: false, reason: "wa_blackout_time" };
  }

  // 3. Validare mesaj non-gol
  const trimmedMessage = message.trim();
  if (trimmedMessage.length === 0) {
    console.warn(`${LOG} empty message blocked for negotiation=${negotiationId}`);
    return { ok: true, queued: false, reason: "empty_message" };
  }

  // 4. Deleghează trimiterea la I53 (document:whatsapp:send)
  // I53 gestionează WA Business API per tenant (FAZA 13 — plan §XIII L2598).
  // phoneId (assignedPhoneId) = telefonul sticky al negocierii din wa_phone_numbers.
  const enqueuedJob = await documentWaQueue.add(
    `wa:handover:${negotiationId}`,
    {
      tenantId,
      negotiationId,
      recipientPhone,
      phoneId: phoneId ?? null,
      message: trimmedMessage,
      messageType: "HANDOVER_NOTIFICATION",
      context: {
        handoverReason: context.handoverReason,
        urgency: context.urgency,
        negotiationState: context.negotiationState,
        leadName: context.leadName,
      },
    },
    {
      ...DEFAULT_JOB_OPTIONS,
      jobId: `wa:handover:${negotiationId}:${Date.now()}`,
    },
  );

  console.info(
    `${LOG} enqueued to document:whatsapp:send jobId=${enqueuedJob.id} negotiation=${negotiationId}`,
  );

  return { ok: true, queued: true, jobId: enqueuedJob.id };
};
