/**
 * WhatsApp Workers — Sprint 2 PR5
 * Source: etapa2-workers-C-whatsapp.md
 *
 * Workers:
 * - WA Sender Factory (creates 40 workers with concurrency=1, ADR-0060)
 * - WA Jitter (30s + rand(0,120s), ADR-0057)
 * - WA Delivery Status (SENT/DELIVERED/READ/FAILED)
 * - WA Read Receipt (update engagement_score)
 */
import type { Job, Worker } from "bullmq";
import type { Redis } from "ioredis";
import { v4 as uuidv4 } from "uuid";
import {
  QUEUES,
  WA_PHONE_COUNT,
  createWorker,
  createQueue,
  getWaPhoneQueueName,
  getWaPhoneFollowupQueueName,
  waSent,
  outreachMessagesSentTotal,
} from "@cerniq/worker-shared";

/** Numele cozii Redis pentru drain istoric (aceeași valoare ca `LEGACY_WA_REPLY_QUEUE` din `@cerniq/worker-shared`). */
const WA_REPLY_LEGACY_QUEUE_NAME = "q:wa:reply" as const;
import { quotaGuardianCheck } from "./quota-guardian.js";

// =============================================================================
// Jitter constants — EXACT from ADR-0057
// Formula: 30000 + Math.floor(Math.random() * 120000)
// =============================================================================

const JITTER_BASE_MS = 30_000;
const JITTER_RANDOM_MS = 120_000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function applyJitter(): number {
  return JITTER_BASE_MS + Math.floor(Math.random() * JITTER_RANDOM_MS);
}

// =============================================================================
// Types
// =============================================================================

export interface WaSendInitialJobData {
  correlationId: string;
  tenantId: string;
  leadId: string;
  journeyId: string;
  phoneId: string;
  phoneNumber: string; // WA account phone (from wa_phone_numbers)
  recipientPhone: string; // E.164 lead phone
  templateId?: string;
  bodyTemplate: string; // Raw spintax body
  personalization: {
    companyName: string;
    contactName?: string;
    customFields?: Record<string, string>;
  };
  sequenceId: string;
  sequenceEnrollmentId: string;
  sequenceStep: number;
  isFollowup: boolean;
}

export interface WaSendResult {
  success: boolean;
  messageId: string;
  chatId: string;
  deliveryStatus: "SENT" | "QUEUED" | "FAILED";
  quotaCost: 1 | 0;
  jitterAppliedMs: number;
  error?: { code: string; message: string; retryable: boolean };
}

export interface WaDeliveryStatusJobData {
  tenantId: string;
  externalMessageId: string;
  chatId: string;
  /** Valori din webhook TimelinesAI / mapare internă — inclus BLOCKED (utilizator/platformă). */
  status: "SENT" | "DELIVERED" | "READ" | "FAILED" | "BLOCKED";
  timestamp: string;
  failureReason?: string;
}

export interface WaReadReceiptJobData {
  tenantId: string;
  externalMessageId: string;
  chatId: string;
  readAt: string;
  leadId: string;
  journeyId: string;
}

// =============================================================================
// WA Sender Worker Factory
// Creates one worker per phone queue (20 initial + 20 followup = 40 workers)
// ADR-0060: concurrency MUST be 1 per queue (Head-of-Line Blocking Prevention)
// =============================================================================

export function createWaWorker(
  phoneIndex: number,
  isFollowup: boolean,
  redis: Redis,
  luaSha: string,
): Worker {
  const queueName = isFollowup
    ? getWaPhoneFollowupQueueName(phoneIndex)
    : getWaPhoneQueueName(phoneIndex);

  const { worker } = createWorker(
    queueName,
    async (job: Job<WaSendInitialJobData>): Promise<WaSendResult> => {
      const {
        correlationId,
        tenantId,
        leadId,
        journeyId,
        phoneId,
        phoneNumber,
        recipientPhone,
        bodyTemplate,
        personalization,
        sequenceId,
        sequenceStep,
        isFollowup: jobIsFollowup,
      } = job.data;

      const quotaResult = await quotaGuardianCheck(redis, luaSha, phoneId, {
        tenantId,
        leadId,
        isNewContact: !jobIsFollowup,
        correlationId,
      });
      if (!quotaResult.allowed) {
        if (quotaResult.reason === "QUOTA_EXCEEDED") {
          console.warn(`quota exceeded for phone ${phoneId}, message skipped`);
        }
        return {
          success: false,
          messageId: "",
          chatId: "",
          deliveryStatus: "FAILED",
          quotaCost: 0,
          jitterAppliedMs: 0,
          error: {
            code: quotaResult.reason,
            message: `WA send blocked: ${quotaResult.reason}`,
            retryable: false,
          },
        };
      }

      const { db, setSessionTenantId } = await import("@cerniq/db");
      await setSessionTenantId(tenantId);
      const { communicationLog } = await import("@cerniq/db");
      const { leadJourney } = await import("@cerniq/db");
      const { waPhoneNumbers } = await import("@cerniq/db");
      const { processSpintax } = await import("../utils/spintax.js");
      const { eq, and } = await import("@cerniq/db");

      // 1. Verify phone is still ACTIVE BEFORE jitter — evită 30–150s inutile pentru linii OFFLINE/BANNED
      const phones = await db
        .select()
        .from(waPhoneNumbers)
        .where(and(eq(waPhoneNumbers.id, phoneId), eq(waPhoneNumbers.tenantId, tenantId)))
        .limit(1);

      if (phones.length === 0 || phones[0].status !== "ACTIVE" || !phones[0].isEnabled) {
        return {
          success: false,
          messageId: "",
          chatId: "",
          deliveryStatus: "FAILED",
          quotaCost: 0,
          jitterAppliedMs: 0,
          error: {
            code: "PHONE_INACTIVE",
            message: `Phone ${phoneId} is not active, missing, or disabled`,
            retryable: false,
          },
        };
      }

      // 2. Apply jitter BEFORE sending — ADR-0057
      const jitterMs = applyJitter();
      await sleep(jitterMs);

      // 3. Process spintax with personalization variables
      const spintaxVariables: Record<string, string> = {
        companyName: personalization.companyName,
        ...(personalization.contactName !== undefined && personalization.contactName !== ""
          ? { contactName: personalization.contactName }
          : {}),
        ...personalization.customFields,
      };
      const processedContent = processSpintax(bodyTemplate, spintaxVariables);

      // 4. Send via ADR-0031 WA provider (TimelinesAI)
      const { createWaProvider } = await import("@cerniq/integrations");
      const waProvider = createWaProvider("timelinesai");

      const sendResult = await waProvider.sendWhatsApp({
        accountPhone: phoneNumber,
        recipientE164: recipientPhone,
        body: processedContent,
        correlationId,
      });

      // 5. Log to outreach.communication_log (schema: status + status_updated_at, not legacy messageStatus/updatedAt)
      const commLogId = uuidv4();
      await db.insert(communicationLog).values({
        id: commLogId,
        tenantId,
        leadJourneyId: journeyId,
        channel: "WHATSAPP",
        direction: "OUTBOUND",
        status: "SENT",
        statusUpdatedAt: new Date(),
        externalMessageId: sendResult.message_id,
        threadId: sendResult.chat_id,
        phoneId,
        phoneNumber: recipientPhone,
        content: processedContent,
        sentAt: new Date(),
        sequenceId,
        sequenceStep,
        quotaCost: jobIsFollowup ? 0 : 1,
        rawResponse: sendResult as unknown as Record<string, unknown>,
      });

      // 6. Update lead journey state: previousState = actual DB current_state (ADR-0062)
      if (!jobIsFollowup) {
        const [journeyRow] = await db
          .select({ currentState: leadJourney.currentState })
          .from(leadJourney)
          .where(and(eq(leadJourney.id, journeyId), eq(leadJourney.tenantId, tenantId)))
          .limit(1);

        if (journeyRow) {
          const previousState = journeyRow.currentState;

          await db
            .update(leadJourney)
            .set({
              currentState: "CONTACTED_WA",
              previousState,
              stateChangedAt: new Date(),
              lastChannelUsed: "WHATSAPP",
              lastContactAt: new Date(),
              updatedAt: new Date(),
            })
            .where(and(eq(leadJourney.id, journeyId), eq(leadJourney.tenantId, tenantId)));
        } else {
          console.error(
            `[wa:send] Journey ${journeyId} not found for tenant ${tenantId}; skip state update (message already sent)`,
          );
        }
      }

      outreachMessagesSentTotal.inc({ channel: "WHATSAPP", tenant_id: tenantId });
      waSent.inc({ phone_id: phoneId });

      return {
        success: true,
        messageId: sendResult.message_id,
        chatId: sendResult.chat_id,
        deliveryStatus: sendResult.status,
        quotaCost: jobIsFollowup ? 0 : 1,
        jitterAppliedMs: jitterMs,
      };
    },
    {
      concurrency: 1, // CRITICAL: ADR-0060 mandates concurrency=1 per phone queue
      lockDuration: 60_000,
    },
  );
  return worker;
}

/**
 * Creates all 40 WA phone workers (20 initial + 20 followup).
 * ADR-0060: Each queue has concurrency=1.
 */
export function createAllWaWorkers(redis: Redis, luaSha: string): Worker[] {
  const workers: Worker[] = [];
  for (let i = 1; i <= WA_PHONE_COUNT; i++) {
    workers.push(createWaWorker(i, false, redis, luaSha), createWaWorker(i, true, redis, luaSha));
  }
  return workers;
}

// =============================================================================
// Worker: WA Delivery Status
// Processes SENT/DELIVERED/READ/FAILED from TimelinesAI webhooks
// =============================================================================

export async function processWaDeliveryStatusJob(job: Job<WaDeliveryStatusJobData>): Promise<void> {
  const { tenantId, externalMessageId, status, timestamp, failureReason } = job.data;

  const validStatuses = ["SENT", "DELIVERED", "READ", "FAILED", "BLOCKED"] as const;
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid message status: ${status}`);
  }

  const { db, setSessionTenantId } = await import("@cerniq/db");
  await setSessionTenantId(tenantId);
  const { communicationLog } = await import("@cerniq/db");
  const { eq, and } = await import("@cerniq/db");

  await db
    .update(communicationLog)
    .set({
      status,
      statusUpdatedAt: new Date(),
      ...(status === "SENT" ? { sentAt: new Date(timestamp) } : {}),
      ...(status === "DELIVERED" ? { deliveredAt: new Date(timestamp) } : {}),
      ...(status === "READ" ? { readAt: new Date(timestamp) } : {}),
      ...(status === "FAILED"
        ? { errorMessage: failureReason ?? "Delivery reported as FAILED" }
        : {}),
      ...(status === "BLOCKED"
        ? {
            errorMessage: failureReason ?? "Delivery reported as BLOCKED (user or platform)",
          }
        : {}),
    })
    .where(
      and(
        eq(communicationLog.externalMessageId, externalMessageId),
        eq(communicationLog.tenantId, tenantId),
      ),
    );

  if (status === "FAILED") {
    const retryQueue = createQueue(QUEUES.WA_MESSAGE_RETRY);
    await retryQueue.add(
      "evaluate",
      { tenantId, externalMessageId, failureReason },
      { removeOnComplete: 100 },
    );
  }
}

export function createWaDeliveryStatusWorker(): Worker {
  const { worker } = createWorker(QUEUES.WA_DELIVERY_STATUS, processWaDeliveryStatusJob, {
    concurrency: 100,
  });
  return worker;
}

/** Consumator pentru coada istorică `q:wa:reply` până la drain complet în Redis. */
export function createWaLegacyReplyDeliveryStatusWorker(): Worker {
  const { worker } = createWorker(WA_REPLY_LEGACY_QUEUE_NAME, processWaDeliveryStatusJob, {
    concurrency: 100,
  });
  return worker;
}

// =============================================================================
// Worker: WA Read Receipt
// Tracks read events, updates engagement score (NO re-send trigger)
// =============================================================================

async function processWaReadReceiptJob(job: Job<WaReadReceiptJobData>): Promise<void> {
  const { tenantId, externalMessageId, readAt, journeyId } = job.data;

  const { db, setSessionTenantId } = await import("@cerniq/db");
  await setSessionTenantId(tenantId);
  const { communicationLog, leadJourney } = await import("@cerniq/db");
  const { eq, and, sql } = await import("@cerniq/db");

  await db
    .update(communicationLog)
    .set({
      status: "READ",
      readAt: new Date(readAt),
      statusUpdatedAt: new Date(),
    })
    .where(
      and(
        eq(communicationLog.externalMessageId, externalMessageId),
        eq(communicationLog.tenantId, tenantId),
      ),
    );

  const [j] = await db
    .select({
      replyCount: leadJourney.replyCount,
      sentimentScore: leadJourney.sentimentScore,
    })
    .from(leadJourney)
    .where(eq(leadJourney.id, journeyId))
    .limit(1);

  const outbound = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(communicationLog)
    .where(
      and(
        eq(communicationLog.leadJourneyId, journeyId),
        eq(communicationLog.direction, "OUTBOUND"),
      ),
    );
  const inbound = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(communicationLog)
    .where(
      and(eq(communicationLog.leadJourneyId, journeyId), eq(communicationLog.direction, "INBOUND")),
    );

  const sent = outbound[0]?.c ?? 0;
  const received = inbound[0]?.c ?? 0;
  const sentiment = j?.sentimentScore ?? 0;
  const vResponseRate = sent > 0 ? (received / sent) * 40 : 0;
  const vSentiment = ((sentiment + 100) / 200) * 30;
  const engagementScore = Math.min(100, Math.max(0, Math.round(vResponseRate + vSentiment)));

  await db
    .update(leadJourney)
    .set({
      engagementScore,
      updatedAt: new Date(),
    })
    .where(eq(leadJourney.id, journeyId));
}

export function createWaReadReceiptWorker(): Worker {
  const { worker } = createWorker(QUEUES.WA_READ_RECEIPT, processWaReadReceiptJob, {
    concurrency: 100,
  });
  return worker;
}

/** Compatibilitate: job-uri încă pe `wa:chat:history:fetch` (același procesator ca read receipt). */
export function createWaLegacyChatHistoryReadReceiptWorker(): Worker {
  const { worker } = createWorker(QUEUES.WA_CHAT_HISTORY_FETCH, processWaReadReceiptJob, {
    concurrency: 100,
  });
  return worker;
}
