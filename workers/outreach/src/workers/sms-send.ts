/**
 * SMS send worker — `sms:send`
 * Pre-check: cotă zilnică (Redis), business hours + DNC (`sms_opt_outs`), segmente.
 * Post: `outreach.sms_messages` + `communication_log`, actualizare `lead_journey`.
 */
import type { Job, Worker } from "bullmq";
import type { Redis } from "ioredis";
import { UnrecoverableError } from "bullmq";
import { v4 as uuidv4 } from "uuid";
import { createServiceLogger } from "@cerniq/observability";
import { createSmsProviderFromEnv } from "@cerniq/integrations";
import { QUEUES, createWorker, outreachMessagesSentTotal } from "@cerniq/worker-shared";
import type { JobLogger } from "../lib/job-logger.js";
import { createOutreachJobLogger } from "../lib/outreach-job-logger.js";
import { logSmsJobFailureAndThrow } from "../lib/sms-job-failure-log.js";
import { phoneLast4 } from "../lib/phone-last4.js";
import { estimateSmsSegments } from "../utils/sms-encoding.js";
import {
  getBucharestDateIsoForSms,
  releaseSmsSegments,
  reserveSmsSegments,
} from "../utils/sms-quota.js";
import { isSmsSendAllowedByTenantSettings } from "../utils/sms-business-hours.js";

const svcLog = createServiceLogger("outreach-sms-send", { etapa: "e2" });

export interface SmsSendJobData {
  /** Dacă lipsește la enqueue, se generează UUID în worker (trasabilitate defensivă). */
  correlationId?: string;
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

function normalizeSmsProviderUsed(
  pu: string | undefined,
): "TWILIO" | "VONAGE" | "AWS_SNS" | "SMSADVERT" {
  if (pu === "TWILIO" || pu === "VONAGE" || pu === "AWS_SNS" || pu === "SMSADVERT") {
    return pu;
  }
  return "TWILIO";
}

async function handleSmsSendFailure(
  err: unknown,
  ctx: {
    quotaRelease: { dateIso: string; segments: number } | null;
    redis: Redis;
    tenantId: string;
    journeyId: string;
    leadId: string;
    jlog: JobLogger;
  },
): Promise<never> {
  const { quotaRelease, redis, tenantId, journeyId, leadId, jlog } = ctx;
  if (quotaRelease !== null) {
    await releaseSmsSegments(redis, tenantId, quotaRelease.dateIso, quotaRelease.segments);
  }
  if (err instanceof UnrecoverableError) {
    throw err;
  }
  if (
    err instanceof Error &&
    (err.message === "SMS_OUTSIDE_BUSINESS_HOURS" || err.message === "SMS_QUOTA_EXCEEDED")
  ) {
    throw err;
  }
  logSmsJobFailureAndThrow(
    svcLog.error.bind(svcLog),
    jlog,
    err,
    "sms_send_provider_or_db_failed",
    "sms_send",
    { tenantId, journeyId, leadId },
  );
}

async function runSmsSendJob(job: Job<SmsSendJobData>, redis: Redis): Promise<void> {
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

  const correlationId = job.data.correlationId?.trim() || uuidv4();

  const jlog = createOutreachJobLogger(job, {
    workerName: "outreach-sms-send",
    queueName: QUEUES.SMS_SEND,
    tenantId,
    entityType: "journey",
    entityId: journeyId,
    correlationId,
  });
  jlog.info("sms_send", "start", {
    leadId,
    isFollowup,
    destinationLast4: phoneLast4(toE164),
  });

  let quotaRelease: { dateIso: string; segments: number } | null = null;

  try {
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
      jlog.warn("sms_send", "rejected_business_hours", { journeyId });
      throw new Error("SMS_OUTSIDE_BUSINESS_HOURS");
    }

    const [blocked] = await db
      .select({ id: smsOptOuts.id })
      .from(smsOptOuts)
      .where(and(eq(smsOptOuts.tenantId, tenantId), eq(smsOptOuts.phoneNumber, toE164.trim())))
      .limit(1);

    if (blocked) {
      jlog.warn("sms_send", "rejected_opt_out", { journeyId });
      throw new UnrecoverableError("SMS_OPT_OUT");
    }

    const { segments } = estimateSmsSegments(body);
    const dateIso = getBucharestDateIsoForSms();
    const dailyLimit = await getSmsDailyLimit(tenantId);

    const reserved = await reserveSmsSegments(redis, tenantId, dateIso, segments, dailyLimit);
    if (!reserved.ok) {
      jlog.warn("sms_send", "rejected_quota", { segments, dailyLimit });
      throw new Error("SMS_QUOTA_EXCEEDED");
    }
    quotaRelease = { dateIso, segments };

    const smsId = uuidv4();
    const commId = uuidv4();

    const provider = createSmsProviderFromEnv();
    const sendResult = await provider.sendSms({
      toE164: toE164.trim(),
      from: fromE164OrMessagingSid.trim(),
      body,
    });

    const normalizedProvider = normalizeSmsProviderUsed(sendResult.providerUsed);

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
    jlog.done("sms_send", "sent", { smsId, segments, provider: normalizedProvider });
    quotaRelease = null;
  } catch (err) {
    await handleSmsSendFailure(err, {
      quotaRelease,
      redis,
      tenantId,
      journeyId,
      leadId,
      jlog,
    });
  }
}

export function createSmsSendWorker(redis: Redis): Worker {
  const { worker } = createWorker(
    QUEUES.SMS_SEND,
    (job: Job<SmsSendJobData>) => runSmsSendJob(job, redis),
    { concurrency: 25 },
  );
  return worker;
}
