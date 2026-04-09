/**
 * SMS send worker — `sms:send`
 * Pre-check: cotă zilnică (Redis), business hours + DNC (`sms_opt_outs`), segmente.
 * Post: `outreach.sms_messages` + `communication_log`, actualizare `lead_journey`.
 */
import type { Job, Worker } from "bullmq";
import type { Redis } from "ioredis";
import { UnrecoverableError } from "bullmq";
import { v4 as uuidv4 } from "uuid";
import { createSmsProviderFromEnv } from "@cerniq/integrations";
import { QUEUES, createWorker, outreachMessagesSentTotal } from "@cerniq/worker-shared";
import { estimateSmsSegments } from "../utils/sms-encoding.js";
import {
  getBucharestDateIsoForSms,
  releaseSmsSegments,
  reserveSmsSegments,
} from "../utils/sms-quota.js";
import { isSmsSendAllowedByTenantSettings } from "../utils/sms-business-hours.js";

export interface SmsSendJobData {
  correlationId: string;
  tenantId: string;
  /** `gold.gold_companies.id` — identic cu `lead_journey.lead_id`. */
  leadId: string;
  journeyId: string;
  toE164: string;
  /** Număr sau Messaging Service SID Twilio — din OpenBao / env. */
  fromE164OrMessagingSid: string;
  body: string;
  currentState: string;
  isFollowup: boolean;
  sequenceId?: string;
  sequenceStep?: number;
}

async function getSmsDailyLimit(tenantId: string): Promise<number> {
  const env = Number(process.env.SMS_DAILY_LIMIT_PER_TENANT ?? "");
  if (Number.isFinite(env) && env > 0) {
    return env;
  }
  const { db, setSessionTenantId } = await import("@cerniq/db");
  const { outreachSettings } = await import("@cerniq/db");
  const { eq } = await import("@cerniq/db");
  await setSessionTenantId(tenantId);
  const [row] = await db
    .select({ dailyQuotaLimit: outreachSettings.dailyQuotaLimit })
    .from(outreachSettings)
    .where(eq(outreachSettings.tenantId, tenantId))
    .limit(1);
  return row?.dailyQuotaLimit ?? 200;
}

export function createSmsSendWorker(redis: Redis): Worker {
  const { worker } = createWorker(
    QUEUES.SMS_SEND,
    async (job: Job<SmsSendJobData>) => {
      const {
        tenantId,
        leadId,
        journeyId,
        toE164,
        fromE164OrMessagingSid,
        body,
        currentState,
        isFollowup,
        sequenceId,
        sequenceStep,
      } = job.data;

      const { db, setSessionTenantId } = await import("@cerniq/db");
      const { smsMessages, smsOptOuts, outreachSettings, communicationLog, leadJourney } =
        await import("@cerniq/db");
      const { eq, and } = await import("@cerniq/db");

      await setSessionTenantId(tenantId);

      const [settingsRow] = await db
        .select()
        .from(outreachSettings)
        .where(eq(outreachSettings.tenantId, tenantId))
        .limit(1);

      const settings: {
        businessHoursStart: number;
        businessHoursEnd: number;
        workDays: number[];
        timezone: string;
      } = settingsRow
        ? {
            businessHoursStart: settingsRow.businessHoursStart,
            businessHoursEnd: settingsRow.businessHoursEnd,
            workDays: Array.isArray(settingsRow.workDays)
              ? (settingsRow.workDays as number[])
              : [1, 2, 3, 4, 5],
            timezone: settingsRow.timezone,
          }
        : {
            businessHoursStart: 9,
            businessHoursEnd: 18,
            workDays: [1, 2, 3, 4, 5],
            timezone: "Europe/Bucharest",
          };

      if (!isSmsSendAllowedByTenantSettings(settings)) {
        throw new Error("SMS_OUTSIDE_BUSINESS_HOURS");
      }

      const [blocked] = await db
        .select({ id: smsOptOuts.id })
        .from(smsOptOuts)
        .where(and(eq(smsOptOuts.tenantId, tenantId), eq(smsOptOuts.phoneNumber, toE164.trim())))
        .limit(1);

      if (blocked) {
        throw new UnrecoverableError("SMS_OPT_OUT");
      }

      const { segments } = estimateSmsSegments(body);
      const dateIso = getBucharestDateIsoForSms();
      const dailyLimit = await getSmsDailyLimit(tenantId);

      const reserved = await reserveSmsSegments(redis, tenantId, dateIso, segments, dailyLimit);
      if (!reserved.ok) {
        throw new Error("SMS_QUOTA_EXCEEDED");
      }

      const smsId = uuidv4();
      const commId = uuidv4();

      try {
        const provider = createSmsProviderFromEnv();
        const sendResult = await provider.sendSms({
          toE164: toE164.trim(),
          from: fromE164OrMessagingSid.trim(),
          body,
        });

        const pu = sendResult.providerUsed;
        const normalizedProvider =
          pu === "TWILIO" || pu === "VONAGE" || pu === "AWS_SNS" || pu === "SMSADVERT"
            ? pu
            : "TWILIO";

        await db.insert(smsMessages).values({
          id: smsId,
          tenantId,
          leadId,
          journeyId,
          phoneNumber: toE164.trim(),
          provider: normalizedProvider,
          providerMessageId: sendResult.messageId || null,
          direction: "OUTBOUND",
          content: body,
          status: "SENT",
          costUsd: "0",
          segments,
          sentAt: new Date(),
        });

        await db.insert(communicationLog).values({
          id: commId,
          tenantId,
          leadJourneyId: journeyId,
          channel: "SMS",
          direction: "OUTBOUND",
          status: "SENT",
          statusUpdatedAt: new Date(),
          externalMessageId: sendResult.messageId,
          content: body,
          phoneNumber: toE164.trim(),
          sentAt: new Date(),
          sequenceId,
          sequenceStep,
          quotaCost: isFollowup ? 0 : 1,
          rawResponse: sendResult.raw as Record<string, unknown> | undefined,
        });

        if (!isFollowup && currentState === "COLD") {
          const [journeyRow] = await db
            .select({ currentState: leadJourney.currentState })
            .from(leadJourney)
            .where(eq(leadJourney.id, journeyId))
            .limit(1);
          const previousState = journeyRow?.currentState ?? "COLD";
          await db
            .update(leadJourney)
            .set({
              currentState: "CONTACTED_PHONE",
              previousState,
              stateChangedAt: new Date(),
              lastChannelUsed: "SMS",
              lastContactAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(leadJourney.id, journeyId));
        }

        outreachMessagesSentTotal.inc({ channel: "SMS", tenant_id: tenantId });
      } catch (err) {
        await releaseSmsSegments(redis, tenantId, dateIso, segments);
        throw err;
      }
    },
    { concurrency: 25 },
  );
  return worker;
}
