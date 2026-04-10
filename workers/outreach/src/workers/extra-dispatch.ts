/**
 * Workers pentru cozi înregistrate fără procesor (Etapa 2 — remediere E2).
 * - wa:media:send — mesaje cu atașament (TimelinesAI)
 * - email:cold:campaign:create | pause — Instantly
 * - alert:phone:offline — log structurat (extensibil Slack/email)
 * - outreach:orchestrator:router — redirecționare job către coada finală
 */
import type { Job, Worker } from "bullmq";
import { v4 as uuidv4 } from "uuid";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import { ensureJobDataCorrelationId } from "../lib/ensure-job-data-correlation.js";
import { QUEUES, createWorker, createQueue, dispatchNotification } from "@cerniq/worker-shared";
import { getInstantlyClient, getTimelinesAIClient } from "@cerniq/integrations";
import {
  isPhoneBannedAlertPayload,
  isPhoneQuarantineLegacyOnBannedQueue,
  type PhoneQuarantineTriggerJobData,
} from "./phone-monitoring.js";

const svcLog = createServiceLogger("outreach-extra-dispatch", { etapa: "e2" });

export function createWaMediaSendWorker(): Worker {
  const { worker } = createWorker(
    QUEUES.WA_MEDIA_SEND,
    async (
      job: Job<{
        phone: string;
        recipient: string;
        message: string;
        mediaUrl?: string;
        mediaType?: string;
        caption?: string;
        correlationId?: string;
      }>,
    ) => {
      const client = getTimelinesAIClient();
      return client.sendMessage(job.data);
    },
    { concurrency: 5 },
  );
  return worker;
}

export function createEmailColdCampaignCreateWorker(): Worker {
  const { worker } = createWorker(
    QUEUES.EMAIL_COLD_CAMPAIGN_CREATE,
    async (job: Job<{ name: string; daily_sending_limit?: number }>) => {
      const client = getInstantlyClient();
      return client.createCampaign(job.data);
    },
    { concurrency: 2 },
  );
  return worker;
}

export function createEmailColdCampaignPauseWorker(): Worker {
  const { worker } = createWorker(
    QUEUES.EMAIL_COLD_CAMPAIGN_PAUSE,
    async (job: Job<{ campaignId: string }>) => {
      const client = getInstantlyClient();
      await client.pauseCampaign(job.data.campaignId);
      return { paused: job.data.campaignId };
    },
    { concurrency: 5 },
  );
  return worker;
}

export type AlertPhoneOfflineJobData = {
  correlationId?: string;
  tenantId: string;
  phoneId: string;
  phoneNumber?: string;
  offlineSince?: string;
  status: string;
  message?: string;
};

export function createAlertPhoneOfflineWorker(): Worker {
  const { worker } = createWorker(
    QUEUES.ALERT_PHONE_OFFLINE,
    async (job: Job<AlertPhoneOfflineJobData>) => {
      svcLog.warn({ ...job.data }, "Phone offline alert received");
      const { tenantId, phoneId, phoneNumber, offlineSince, status, message } = job.data;

      const { db, setSessionTenantId } = await import("@cerniq/db");
      await setSessionTenantId(tenantId);
      const { webhookEventArchive } = await import("@cerniq/db");

      const eventId = `ops-phone-offline-${phoneId}-${uuidv4()}`;
      await db
        .insert(webhookEventArchive)
        .values({
          tenantId,
          eventId,
          source: "OPS_MONITORING",
          eventType: "PHONE_OFFLINE",
          eventTimestamp: new Date(),
          payload: {
            phoneId,
            phoneNumber,
            offlineSince,
            status,
            message,
          },
        })
        .onConflictDoNothing({
          target: [webhookEventArchive.tenantId, webhookEventArchive.eventId],
        });

      try {
        await dispatchNotification({
          tenantId,
          type: "ALERT",
          title: "Telefon offline",
          body: message ?? `Linie indisponibilă (telefon ${phoneNumber ?? phoneId}).`,
          data: {
            phoneId,
            phoneNumber,
            offlineSince,
            status,
          },
          channels: ["IN_APP", "EMAIL", "WEBHOOK"],
        });
      } catch (err) {
        svcLog.error(
          {
            err,
            ...enrichError(err, { tenantId, phoneId, correlationId: job.data.correlationId }),
          },
          "Phone offline notification dispatch failed",
        );
      }
      return { logged: true };
    },
    { concurrency: 2 },
  );
  return worker;
}

/**
 * Consumator pentru `alert:phone:banned` — doar notificare/audit structurat.
 * Acțiunea de quarantine rulează pe coada separată `phone:quarantine:trigger`.
 */
export function createAlertPhoneBannedWorker(): Worker {
  const { worker } = createWorker(
    QUEUES.ALERT_PHONE_BANNED,
    async (job: Job<unknown>) => {
      const data = job.data;
      if (isPhoneQuarantineLegacyOnBannedQueue(data)) {
        svcLog.warn(
          { data },
          "Legacy quarantine payload received on alert:phone:banned; forwarding to PHONE_QUARANTINE",
        );
        const q = createQueue(QUEUES.PHONE_QUARANTINE);
        try {
          const d = data as PhoneQuarantineTriggerJobData & { score?: number; threshold?: number };
          const payload: PhoneQuarantineTriggerJobData = {
            tenantId: d.tenantId,
            phoneId: d.phoneId,
            reason: "LOW_REPUTATION",
            currentReputationScore: d.currentReputationScore ?? d.score,
            reputationThreshold: d.reputationThreshold ?? d.threshold,
          };
          await q.add(
            "quarantine",
            ensureJobDataCorrelationId({
              ...payload,
              correlationId: (data as { correlationId?: string }).correlationId,
            }),
            { priority: 1 },
          );
        } finally {
          await q.close();
        }
        return { forwarded: true, target: QUEUES.PHONE_QUARANTINE };
      }
      if (!isPhoneBannedAlertPayload(data)) {
        const err = new Error(
          "Invalid alert:phone:banned payload (expected PhoneBannedAlertJobData)",
        );
        svcLog.error({ err, ...enrichError(err, {}) }, "Invalid alert:phone:banned payload");
        throw err;
      }
      svcLog.warn({ data }, "Phone banned alert received");
      return { logged: true };
    },
    { concurrency: 5 },
  );
  return worker;
}

export function createOutreachOrchestratorRouterWorker(): Worker {
  const { worker } = createWorker(
    QUEUES.OUTREACH_ORCHESTRATOR_ROUTER,
    async (
      job: Job<{
        targetQueue: string;
        jobName?: string;
        payload: Record<string, unknown>;
      }>,
    ) => {
      const { targetQueue, jobName = "dispatch", payload } = job.data;
      const q = createQueue(targetQueue);
      try {
        await q.add(
          jobName,
          ensureJobDataCorrelationId({
            ...payload,
            correlationId:
              typeof payload.correlationId === "string"
                ? payload.correlationId
                : job.data.payload.correlationId,
          }),
        );
      } finally {
        await q.close();
      }
      return { forwarded: targetQueue, jobName };
    },
    { concurrency: 20 },
  );
  return worker;
}
