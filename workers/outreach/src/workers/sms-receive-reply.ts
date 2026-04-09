/**
 * Mesaje SMS primite — `sms:receive:reply`
 * Sentiment AI, opt-out STOP, escalare HITL la sentiment negativ sau cuvinte cheie.
 */
import type { Job, Worker } from "bullmq";
import { v4 as uuidv4 } from "uuid";
import { QUEUES, createWorker, createQueue } from "@cerniq/worker-shared";

function resolveSmsProviderColumn(): "TWILIO" | "VONAGE" | "AWS_SNS" | "SMSADVERT" {
  const override = (process.env.SMS_INBOUND_PROVIDER ?? "").trim().toUpperCase();
  if (
    override === "TWILIO" ||
    override === "VONAGE" ||
    override === "AWS_SNS" ||
    override === "SMSADVERT"
  ) {
    return override;
  }
  if (process.env.SMSADVERT_API_TOKEN?.trim()) {
    return "SMSADVERT";
  }
  return "TWILIO";
}

export interface SmsReceiveReplyJobData {
  tenantId: string;
  leadId: string;
  journeyId: string;
  fromE164: string;
  /** Număr destinație (tenant); opțional pentru rutare webhook. */
  toE164?: string;
  body: string;
  providerMessageId?: string;
  receivedAt: string;
}

const STOP_PATTERN = /^\s*(STOP|OPTOUT|UNSUBSCRIBE)\s*$/i;

export function createSmsReceiveReplyWorker(): Worker {
  const sentimentQueue = createQueue(QUEUES.AI_SENTIMENT_ANALYZE);

  const { worker } = createWorker(
    QUEUES.SMS_RECEIVE_REPLY,
    async (job: Job<SmsReceiveReplyJobData>) => {
      const { tenantId, leadId, journeyId, fromE164, body, providerMessageId, receivedAt } =
        job.data;

      const { db, setSessionTenantId, smsMessages, smsOptOuts, communicationLog } =
        await import("@cerniq/db");

      await setSessionTenantId(tenantId);

      const inboundId = uuidv4();
      const commId = uuidv4();

      const providerCol = resolveSmsProviderColumn();

      if (STOP_PATTERN.test(body.trim())) {
        await db
          .insert(smsOptOuts)
          .values({
            tenantId,
            phoneNumber: fromE164.trim(),
            source: "REPLY_STOP",
            notes: "Opt-out via SMS keyword",
          })
          .onConflictDoNothing();

        await db.insert(smsMessages).values({
          id: inboundId,
          tenantId,
          leadId,
          journeyId,
          phoneNumber: fromE164.trim(),
          provider: providerCol,
          providerMessageId: providerMessageId ?? null,
          direction: "INBOUND",
          content: body,
          status: "OPTED_OUT",
          segments: 1,
        });

        await db.insert(communicationLog).values({
          id: commId,
          tenantId,
          leadJourneyId: journeyId,
          channel: "SMS",
          direction: "INBOUND",
          status: "BLOCKED",
          statusUpdatedAt: new Date(),
          externalMessageId: providerMessageId,
          content: body,
          phoneNumber: fromE164.trim(),
          repliedAt: new Date(receivedAt),
          errorMessage: "SMS opt-out (STOP)",
          quotaCost: 0,
        });
        return;
      }

      await db.insert(smsMessages).values({
        id: inboundId,
        tenantId,
        leadId,
        journeyId,
        phoneNumber: fromE164.trim(),
        provider: providerCol,
        providerMessageId: providerMessageId ?? null,
        direction: "INBOUND",
        content: body,
        status: "DELIVERED",
        segments: 1,
      });

      await db.insert(communicationLog).values({
        id: commId,
        tenantId,
        leadJourneyId: journeyId,
        channel: "SMS",
        direction: "INBOUND",
        status: "REPLIED",
        statusUpdatedAt: new Date(),
        externalMessageId: providerMessageId,
        content: body,
        phoneNumber: fromE164.trim(),
        repliedAt: new Date(receivedAt),
        quotaCost: 0,
      });

      await sentimentQueue.add(
        "analyze",
        { tenantId, leadId, journeyId, content: body, channel: "SMS" },
        { priority: 2, removeOnComplete: 100 },
      );
    },
    { concurrency: 30 },
  );
  return worker;
}
