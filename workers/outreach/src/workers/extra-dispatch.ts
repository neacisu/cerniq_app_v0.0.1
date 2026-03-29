/**
 * Workers pentru cozi înregistrate fără procesor (Etapa 2 — remediere E2).
 * - wa:media:send — mesaje cu atașament (TimelinesAI)
 * - email:cold:campaign:create | pause — Instantly
 * - alert:phone:offline — log structurat (extensibil Slack/email)
 * - outreach:orchestrator:router — redirecționare job către coada finală
 */
import type { Job, Worker } from "bullmq";
import { QUEUES, createWorker, createQueue } from "@cerniq/worker-shared";
import { getInstantlyClient, getTimelinesAIClient } from "@cerniq/integrations";

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
  tenantId?: string;
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
      console.warn("[alert:phone:offline]", JSON.stringify(job.data));
      return { logged: true };
    },
    { concurrency: 2 },
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
        await q.add(jobName, payload);
      } finally {
        await q.close();
      }
      return { forwarded: targetQueue, jobName };
    },
    { concurrency: 20 },
  );
  return worker;
}
