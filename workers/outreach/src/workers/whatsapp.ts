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
import { Worker, Job, Queue } from "bullmq";
import { v4 as uuidv4 } from "uuid";
import { Redis } from "ioredis";
import { QUEUES, WA_PHONE_COUNT } from "@cerniq/worker-shared";
import { asBullmqConnection } from "../utils/bullmq-connection.js";

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
  /** EXACT values from TimelinesAI webhook — SENT, DELIVERED, READ, FAILED */
  status: "SENT" | "DELIVERED" | "READ" | "FAILED";
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

export function createWaWorker(redis: Redis, phoneIndex: number, isFollowup: boolean): Worker {
  const queueName = isFollowup
    ? `q:wa:phone-${String(phoneIndex).padStart(2, "0")}:followup`
    : `q:wa:phone-${String(phoneIndex).padStart(2, "0")}`;

  return new Worker(
    queueName,
    async (job: Job<WaSendInitialJobData>): Promise<WaSendResult> => {
      const {
        tenantId,
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

      // 1. Apply jitter BEFORE sending — ADR-0057
      const jitterMs = applyJitter();
      await sleep(jitterMs);

      const { db } = await import("@cerniq/db");
      const { communicationLog } = await import("@cerniq/db");
      const { leadJourney } = await import("@cerniq/db");
      const { waPhoneNumbers } = await import("@cerniq/db");
      const { processSpintax } = await import("../utils/spintax.js");
      const { eq } = await import("@cerniq/db");

      // 2. Verify phone is still ACTIVE before send
      const phones = await db
        .select()
        .from(waPhoneNumbers)
        .where(eq(waPhoneNumbers.id, phoneId))
        .limit(1);

      if (phones.length === 0 || phones[0].status !== "ACTIVE" || !phones[0].isEnabled) {
        throw new Error(`Phone ${phoneId} is not active or disabled`);
      }

      // 3. Process spintax with personalization variables
      const spintaxVariables: Record<string, string> = {
        companyName: personalization.companyName,
        ...(personalization.contactName !== undefined && personalization.contactName !== ""
          ? { contactName: personalization.contactName }
          : {}),
        ...personalization.customFields,
      };
      const processedContent = processSpintax(bodyTemplate, spintaxVariables);

      // 4. Send via TimelinesAI client
      const { getTimelinesAIClient } = await import("@cerniq/integrations");
      const timelinesClient = getTimelinesAIClient();

      const sendResult = await timelinesClient.sendMessage({
        phone: phoneNumber,
        recipient: recipientPhone,
        message: processedContent,
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

      // 6. Update lead journey state (COLD -> CONTACTED_WA)
      if (!jobIsFollowup) {
        await db
          .update(leadJourney)
          .set({
            currentState: "CONTACTED_WA",
            previousState: "COLD",
            stateChangedAt: new Date(),
            lastChannelUsed: "WHATSAPP",
            lastContactAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(leadJourney.id, journeyId));
      }

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
      connection: asBullmqConnection(redis),
      concurrency: 1, // CRITICAL: ADR-0060 mandates concurrency=1 per phone queue
      lockDuration: 60_000,
    },
  );
}

/**
 * Creates all 40 WA phone workers (20 initial + 20 followup).
 * ADR-0060: Each queue has concurrency=1.
 */
export function createAllWaWorkers(redis: Redis): Worker[] {
  const workers: Worker[] = [];
  for (let i = 1; i <= WA_PHONE_COUNT; i++) {
    workers.push(createWaWorker(redis, i, false), createWaWorker(redis, i, true));
  }
  return workers;
}

// =============================================================================
// Worker: WA Delivery Status
// Processes SENT/DELIVERED/READ/FAILED from TimelinesAI webhooks
// =============================================================================

export function createWaDeliveryStatusWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  return new Worker(
    QUEUES.WA_REPLY, // delivery status from TimelinesAI webhook ingest
    async (job: Job<WaDeliveryStatusJobData>): Promise<void> => {
      const { tenantId, externalMessageId, status, timestamp, failureReason } = job.data;

      // Status values MUST be exactly: SENT, DELIVERED, READ, FAILED
      const validStatuses = ["SENT", "DELIVERED", "READ", "FAILED"] as const;
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid message status: ${status}`);
      }

      const { db } = await import("@cerniq/db");
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
        })
        .where(
          and(
            eq(communicationLog.externalMessageId, externalMessageId),
            eq(communicationLog.tenantId, tenantId),
          ),
        );

      // FAILED: queue for retry evaluation
      if (status === "FAILED") {
        const retryQueue = new Queue(QUEUES.WA_MESSAGE_RETRY, { connection });
        await retryQueue.add(
          "evaluate",
          { tenantId, externalMessageId, failureReason },
          { removeOnComplete: 100 },
        );
      }
    },
    { connection, concurrency: 100 },
  );
}

// =============================================================================
// Worker: WA Read Receipt
// Tracks read events, updates engagement score (NO re-send trigger)
// =============================================================================

export function createWaReadReceiptWorker(redis: Redis): Worker {
  const connection = asBullmqConnection(redis);
  return new Worker(
    QUEUES.WA_CHAT_HISTORY_FETCH, // read receipts processed after chat history fetch
    async (job: Job<WaReadReceiptJobData>): Promise<void> => {
      const { tenantId, externalMessageId, readAt, journeyId } = job.data;

      const { db } = await import("@cerniq/db");
      const { communicationLog } = await import("@cerniq/db");
      const { eq, and, sql } = await import("@cerniq/db");

      // Update message to READ with read_at timestamp
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

      // Update engagement score on lead journey
      // Uses calculate_engagement_score SQL function from migration 0210
      await db.execute(
        sql`UPDATE outreach.lead_journey
            SET engagement_score = calculate_engagement_score(id),
                updated_at = NOW()
            WHERE id = ${journeyId}`,
      );
    },
    { connection, concurrency: 100 },
  );
}
