/**
 * Bootstrap worker Etapa 2 — încarcă toate cozile BullMQ din queue-registry.
 */
import Redis from "ioredis";
import type { Worker } from "bullmq";
import {
  assertQueueRegistryComplete,
  createHealthServer,
  createQueue,
  getRedisConnectionOptions,
  loadSecretsFromFile,
  QUEUES,
  queueRegistry,
  startQueueDepthMonitor,
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

const OUTREACH_REDIS_DB = Number(process.env.REDIS_DB || "2");

function getOutreachRedis(): Redis {
  return new Redis({
    ...getRedisConnectionOptions({ db: OUTREACH_REDIS_DB }),
    enableOfflineQueue: false,
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

  push(createDispatchWorker());
  push(createPhoneAllocatorWorker(redis));
  push(createChannelSelectorWorker());

  for (const w of createAllWaWorkers(redis, luaSha)) {
    push(w);
  }
  push(createWaDeliveryStatusWorker());
  push(createWaReadReceiptWorker());

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

  push(createSentimentAnalyzerWorker(redis));
  push(createResponseGeneratorWorker(redis));

  push(createStateTransitionWorker());
  push(createStateValidateWorker());

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
  await quotaResetQueue.add(
    "reset",
    {},
    {
      repeat: { pattern: "0 0 * * *", tz: "Europe/Bucharest" },
    },
  );

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
    console.info("[worker-outreach] shutdown...");
    await stopQueueMonitor();
    await Promise.allSettled(workers.map((w) => w.close()));
    await quotaResetQueue.close();
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
