/**
 * Bootstrap worker Etapa 2 — încarcă toate cozile BullMQ din queue-registry.
 */
import Redis from "ioredis";
import type { Worker } from "bullmq";
import {
  createServiceLogger,
  enrichError,
  flushAuditBuffer,
  flushJobLogBuffer,
  initTelemetry,
  shutdownTelemetry,
} from "@cerniq/observability";
import { ensureJobDataCorrelationId } from "./lib/ensure-job-data-correlation.js";
import {
  assertQueueRegistryComplete,
  createHealthServer,
  createQueue,
  getRedisConnectionOptions,
  loadSecretsFromFile,
  QUEUES,
  queueRegistry,
  registerCognitiveWorkerEtapa,
  startQueueDepthMonitor,
} from "@cerniq/worker-shared";

registerCognitiveWorkerEtapa(2);
import { QUOTA_CHECK_LUA } from "./utils/quota-lua.js";
import {
  createQuotaCheckWorker,
  createQuotaIncrementWorker,
  createQuotaDailyResetWorker,
} from "./workers/quota-guardian.js";
import {
  createDispatchWorker,
  createPhoneAllocatorWorker,
  createChannelSelectorWorker,
} from "./workers/orchestration.js";
import {
  createAllWaWorkers,
  createWaDeliveryStatusWorker,
  createWaLegacyReplyDeliveryStatusWorker,
  createWaReadReceiptWorker,
  createWaLegacyChatHistoryReadReceiptWorker,
} from "./workers/whatsapp.js";
import {
  createWebhookNormalizerWorker,
  createTimelinesAIEventProcessorWorker,
  createInstantlyEventProcessorWorker,
  createResendEventProcessorWorker,
  createMergedPipelineHealthWorker,
  createMergedPipelineMetricsWorker,
} from "./workers/webhooks.js";
import {
  createSequenceSchedulerWorker,
  createSequenceStopWorker,
  createSequenceAdvanceWorker,
  createEnrollmentManagerWorker,
  createMergedEmailColdAnalyticsWorker,
} from "./workers/sequences.js";
import {
  createRetryOrchestratorWorker,
  createBusinessHoursSchedulerWorker,
} from "./workers/resilience.js";
import {
  createPhoneHealthMonitorWorker,
  createPhoneStatusSyncWorker,
  createPhoneQuarantineWorker,
} from "./workers/phone-monitoring.js";
import { createMergedMonitorQuotaWorker, createAlertWorker } from "./workers/monitoring.js";
import {
  createReviewQueueManagerWorker,
  createSlaEnforcerWorker,
  createHumanTakeoverWorker,
  createResolutionHandlerWorker,
  createHitlAuditLoggerWorker,
  createReviewAssignmentWorker,
  createEscalationWorker,
} from "./workers/hitl.js";
import {
  createEmailColdSenderWorker,
  createEmailColdTrackingWorker,
  createBounceRateMonitorWorker,
  createEmailWarmSenderWorker,
  createEmailWarmReplyWorker,
  createEmailWarmTrackingWorker,
} from "./workers/email.js";
import {
  createSentimentAnalyzerWorker,
  createResponseGeneratorWorker,
} from "./workers/ai-sentiment.js";
import { createStateTransitionWorker, createStateValidateWorker } from "./workers/lead-fsm.js";
import { createLeadAssignUserWorker } from "./workers/lead-assign-user.js";
import {
  createSpintaxProcessWorker,
  createPersonalizeWorker,
  createValidateWorker,
} from "./workers/templates.js";
import {
  createWaMediaSendWorker,
  createEmailColdCampaignCreateWorker,
  createEmailColdCampaignPauseWorker,
  createAlertPhoneOfflineWorker,
  createAlertPhoneBannedWorker,
  createOutreachOrchestratorRouterWorker,
} from "./workers/extra-dispatch.js";
import { createSmsSendWorker } from "./workers/sms-send.js";
import { createSmsDeliveryStatusWorker } from "./workers/sms-delivery-status.js";
import { createSmsReceiveReplyWorker } from "./workers/sms-receive-reply.js";
import { createSmsTemplateRenderWorker } from "./workers/sms-template-render.js";
import { createSmsQuotaCheckWorker } from "./workers/sms-quota-check.js";

const PORT = Number(process.env.PORT || "3000");
const SECRETS_PATH = process.env.SECRETS_PATH?.trim() || "/secrets/workers.env";
const svcLog = createServiceLogger("outreach-index", { etapa: "e2" });

const OUTREACH_REDIS_DB = Number(process.env.REDIS_DB || "2");

function getOutreachRedis(): Redis {
  return new Redis({
    ...getRedisConnectionOptions({ db: OUTREACH_REDIS_DB }),
    enableOfflineQueue: false,
  });
}

async function bootstrap(): Promise<void> {
  loadSecretsFromFile(false, SECRETS_PATH);
  initTelemetry({ serviceName: "cerniq-worker-outreach" });
  assertQueueRegistryComplete();

  const redis = getOutreachRedis();
  await redis.connect();

  const luaSha = (await redis.call("SCRIPT", "LOAD", QUOTA_CHECK_LUA)) as string;

  const workers: Worker[] = [];

  const push = (w: Worker) => {
    workers.push(w);
  };

  push(createQuotaCheckWorker(redis, luaSha));
  push(await createQuotaIncrementWorker(redis));
  push(createQuotaDailyResetWorker(redis));

  push(createDispatchWorker());
  push(createPhoneAllocatorWorker(redis));
  push(createChannelSelectorWorker());

  for (const w of createAllWaWorkers(redis, luaSha)) {
    push(w);
  }
  push(createWaDeliveryStatusWorker());
  /** Drain `q:wa:reply` (deprecated) — același procesator ca `wa:delivery:status`. */
  push(createWaLegacyReplyDeliveryStatusWorker());
  push(createWaReadReceiptWorker());
  /** Job-uri încă pe `wa:chat:history:fetch` — același procesator ca read receipt. */
  push(createWaLegacyChatHistoryReadReceiptWorker());

  push(createWebhookNormalizerWorker());
  push(createTimelinesAIEventProcessorWorker());
  push(createInstantlyEventProcessorWorker());
  push(createResendEventProcessorWorker());
  push(createMergedPipelineHealthWorker(redis));
  push(createMergedPipelineMetricsWorker(redis));

  push(createSequenceSchedulerWorker());
  push(createSequenceStopWorker());
  push(createSequenceAdvanceWorker());
  push(createEnrollmentManagerWorker());
  push(createMergedEmailColdAnalyticsWorker());

  push(createRetryOrchestratorWorker());
  push(createBusinessHoursSchedulerWorker());

  push(createPhoneHealthMonitorWorker());
  push(createPhoneStatusSyncWorker());
  push(createAlertPhoneBannedWorker());
  push(createPhoneQuarantineWorker());
  push(createMergedMonitorQuotaWorker(redis));
  push(createAlertWorker(redis));

  push(createReviewQueueManagerWorker());
  push(createSlaEnforcerWorker());
  push(createHumanTakeoverWorker());
  push(createResolutionHandlerWorker());
  push(createHitlAuditLoggerWorker());
  push(createReviewAssignmentWorker());
  push(createEscalationWorker());

  push(createEmailColdSenderWorker());
  push(createEmailColdTrackingWorker());
  push(createBounceRateMonitorWorker());
  push(createEmailWarmSenderWorker());
  push(createEmailWarmReplyWorker());
  push(createEmailWarmTrackingWorker());

  push(createSmsSendWorker(redis));
  push(createSmsDeliveryStatusWorker());
  push(createSmsReceiveReplyWorker());
  push(createSmsTemplateRenderWorker());
  push(createSmsQuotaCheckWorker(redis));

  push(createSentimentAnalyzerWorker(redis));
  push(createResponseGeneratorWorker(redis));

  push(createStateTransitionWorker());
  push(createStateValidateWorker());
  push(createLeadAssignUserWorker());

  push(createSpintaxProcessWorker());
  push(createPersonalizeWorker());
  push(createValidateWorker());

  push(createWaMediaSendWorker());
  push(createEmailColdCampaignCreateWorker());
  push(createEmailColdCampaignPauseWorker());
  push(createAlertPhoneOfflineWorker());
  push(createOutreachOrchestratorRouterWorker());

  // quota:guardian:reset — daily cron at 00:00 Europe/Bucharest
  const quotaResetQueue = createQueue(QUEUES.QUOTA_GUARDIAN_RESET);
  await quotaResetQueue.add("reset", ensureJobDataCorrelationId({ source: "cron_quota_reset" }), {
    repeat: { pattern: "0 0 * * *", tz: "Europe/Bucharest" },
  });

  const outreachQueueNames = queueRegistry
    .map((q) => q.name)
    .filter(
      (n) =>
        !n.startsWith("ingest:") &&
        !n.startsWith("normalize:") &&
        !n.startsWith("enrich:") &&
        !n.startsWith("validate:") &&
        !n.startsWith("discover:") &&
        !n.startsWith("scrape:") &&
        !n.startsWith("geo:") &&
        !n.startsWith("agri:") &&
        !n.startsWith("dedup:") &&
        !n.startsWith("score:") &&
        !n.startsWith("aggregate:") &&
        !n.startsWith("maintenance:"),
    );
  const stopQueueMonitor = startQueueDepthMonitor({
    queueNames: outreachQueueNames,
    dlqNames: [QUEUES.OUTREACH_DLQ],
  });

  const healthServer = createHealthServer(PORT, () => ({
    ok: true,
    service: "worker-outreach",
    workerInstances: workers.length,
    registryQueues: queueRegistry.length,
  }));

  const shutdown = async () => {
    svcLog.info("worker-outreach shutdown starting");
    await stopQueueMonitor();
    await Promise.allSettled(workers.map((w) => w.close()));
    await quotaResetQueue.close();
    healthServer.close();
    try {
      await flushJobLogBuffer();
      await flushAuditBuffer();
      await shutdownTelemetry();
    } catch (err) {
      svcLog.error({ err }, "outreach observability flush/shutdown failed");
    }
    await redis.quit();
    process.exit(0);
  };

  process.on("SIGTERM", () => {
    void shutdown();
  });
  process.on("SIGINT", () => {
    void shutdown();
  });

  process.on("unhandledRejection", (reason) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    svcLog.error(
      { reason, ...enrichError(err, { scope: "unhandledRejection" }) },
      "unhandledRejection",
    );
  });
  process.on("uncaughtException", (error) => {
    svcLog.error(
      { err: error, ...enrichError(error, { scope: "uncaughtException" }) },
      "uncaughtException",
    );
  });

  svcLog.info(
    {
      workers: workers.length,
      port: PORT,
      queues: queueRegistry.length,
    },
    "worker-outreach started",
  );
}

try {
  await bootstrap();
} catch (err) {
  svcLog.error({ err }, "worker-outreach fatal");
  process.exit(1);
}
