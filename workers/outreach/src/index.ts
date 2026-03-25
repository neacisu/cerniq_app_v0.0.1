/**
 * Bootstrap worker Etapa 2 — încarcă toate cozile BullMQ din queue-registry.
 */
import Redis from "ioredis";
import type { Worker } from "bullmq";
import {
  assertQueueRegistryComplete,
  createHealthServer,
  createQueue,
  loadSecretsFromFile,
  QUEUES,
  queueRegistry,
} from "@cerniq/worker-shared";
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
  createWaReadReceiptWorker,
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
  createOutreachOrchestratorRouterWorker,
} from "./workers/extra-dispatch.js";

const PORT = Number(process.env.PORT || "3000");
const SECRETS_PATH = process.env.SECRETS_PATH?.trim() || "/secrets/workers.env";

function getOutreachRedis(): Redis {
  const url = process.env.REDIS_URL?.trim();
  if (!url) throw new Error("REDIS_URL is required");
  return new Redis(url, {
    db: 2,
    enableOfflineQueue: false,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

async function bootstrap(): Promise<void> {
  loadSecretsFromFile(false, SECRETS_PATH);
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

  const quotaResetQueue = createQueue(QUEUES.QUOTA_GUARDIAN_RESET, {
    connection: redis,
  });
  await quotaResetQueue.add(
    "daily-reset",
    {},
    {
      repeat: { pattern: "0 0 * * *", tz: "Europe/Bucharest" },
      jobId: "cron:quota-guardian:reset",
    },
  );

  push(createDispatchWorker(redis));
  push(createPhoneAllocatorWorker(redis));
  push(createChannelSelectorWorker(redis));

  for (const w of createAllWaWorkers(redis)) {
    push(w);
  }
  push(createWaDeliveryStatusWorker(redis));
  push(createWaReadReceiptWorker(redis));

  push(createWebhookNormalizerWorker(redis));
  push(createTimelinesAIEventProcessorWorker(redis));
  push(createInstantlyEventProcessorWorker(redis));
  push(createResendEventProcessorWorker(redis));
  push(createMergedPipelineHealthWorker(redis));
  push(createMergedPipelineMetricsWorker(redis));

  push(createSequenceSchedulerWorker(redis));
  push(createSequenceStopWorker(redis));
  push(createSequenceAdvanceWorker(redis));
  push(createEnrollmentManagerWorker(redis));
  push(createMergedEmailColdAnalyticsWorker(redis));

  push(createRetryOrchestratorWorker(redis));
  push(createBusinessHoursSchedulerWorker(redis));

  push(createPhoneHealthMonitorWorker(redis));
  push(createPhoneStatusSyncWorker(redis));
  push(createPhoneQuarantineWorker(redis));
  push(createMergedMonitorQuotaWorker(redis));
  push(createAlertWorker(redis));

  push(createReviewQueueManagerWorker(redis));
  push(createSlaEnforcerWorker(redis));
  push(createHumanTakeoverWorker(redis));
  push(createResolutionHandlerWorker(redis));
  push(createHitlAuditLoggerWorker(redis));
  push(createReviewAssignmentWorker(redis));
  push(createEscalationWorker(redis));

  push(createEmailColdSenderWorker(redis));
  push(createEmailColdTrackingWorker(redis));
  push(createBounceRateMonitorWorker(redis));
  push(createEmailWarmSenderWorker(redis));
  push(createEmailWarmReplyWorker(redis));
  push(createEmailWarmTrackingWorker(redis));

  push(createSentimentAnalyzerWorker(redis));
  push(createResponseGeneratorWorker(redis));

  push(createStateTransitionWorker(redis));
  push(createStateValidateWorker(redis));

  push(createSpintaxProcessWorker(redis));
  push(createPersonalizeWorker(redis));
  push(createValidateWorker(redis));

  push(createWaMediaSendWorker(redis));
  push(createEmailColdCampaignCreateWorker(redis));
  push(createEmailColdCampaignPauseWorker(redis));
  push(createAlertPhoneOfflineWorker(redis));
  push(createOutreachOrchestratorRouterWorker(redis));

  const healthServer = createHealthServer(PORT, () => ({
    ok: true,
    service: "worker-outreach",
    workerInstances: workers.length,
    registryQueues: queueRegistry.length,
  }));

  const shutdown = async () => {
    console.info("[worker-outreach] shutdown...");
    await Promise.allSettled(workers.map((w) => w.close()));
    healthServer.close();
    await redis.quit();
    process.exit(0);
  };

  process.on("SIGTERM", () => {
    void shutdown();
  });
  process.on("SIGINT", () => {
    void shutdown();
  });

  console.info(
    `[worker-outreach] started: ${workers.length} workers, health :${PORT}, queues=${queueRegistry.length}`,
  );
}

try {
  await bootstrap();
} catch (err) {
  console.error("[worker-outreach] fatal", err);
  process.exit(1);
}
