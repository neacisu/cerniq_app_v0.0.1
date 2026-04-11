/**
 * Bootstrap worker Etapa 5 — E5 Nurturing Lifecycle FSM 7 stări
 * Pattern copiat din workers/outreach/src/index.ts (Anti-halucin. E)
 * REDIS_DB_E5=5 conform Plan §XIV L2763
 */
import Redis from "ioredis";
import type { Worker } from "bullmq";
import { createServiceLogger, enrichError } from "@cerniq/observability";
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

registerCognitiveWorkerEtapa(5);
import { createLifecycleOrderCompletedWorker } from "./workers/a1-lifecycle-order-completed.js";
import { createLifecycleStateEvaluateWorker } from "./workers/a2-lifecycle-state-evaluate.js";
import { createOnboardingSequenceStartWorker } from "./workers/a3-onboarding-sequence-start.js";
import { createOnboardingStepExecuteWorker } from "./workers/a4-onboarding-step-execute.js";
import { createOnboardingCompleteCheckWorker } from "./workers/a5-onboarding-complete-check.js";
import { createStateTransitionExecuteWorker } from "./workers/a6-state-transition-execute.js";
import { createStateMetricsUpdateWorker } from "./workers/a7-state-metrics-update.js";
import { createStateAdvocatePromoteWorker } from "./workers/a8-state-advocate-promote.js";
import { createChurnSignalDetectWorker } from "./workers/b9-churn-signal-detect.js";
import { createChurnScoreCalculateWorker } from "./workers/b10-churn-score-calculate.js";
import { createChurnRiskEscalateWorker } from "./workers/b11-churn-risk-escalate.js";
import { createSentimentAnalyzeWorker } from "./workers/b12-sentiment-analyze.js";
import { createSentimentAggregateWorker } from "./workers/b13-sentiment-aggregate.js";
import { createDecayBehaviorDetectWorker } from "./workers/b14-decay-behavior-detect.js";
import { createGeoProximityCalculateWorker } from "./workers/c15-geo-proximity-calculate.js";
import { createGeoNeighborIdentifyWorker } from "./workers/c16-geo-neighbor-identify.js";
import { createGeoTerritoryCalculateWorker } from "./workers/c17-geo-territory-calculate.js";
import { createGeoCoverageAnalyzeWorker } from "./workers/c18-geo-coverage-analyze.js";
import { createGeoCatchmentBuildWorker } from "./workers/c19-geo-catchment-build.js";

const svcLog = createServiceLogger("worker-e5-nurturing");

const PORT = Number(process.env.PORT || "3000");
const SECRETS_PATH = process.env.SECRETS_PATH?.trim() || "/secrets/workers.env";

const E5_REDIS_DB = Number(process.env.REDIS_DB_E5 || process.env.REDIS_DB || "5");

function getE5Redis(): Redis {
  return new Redis({
    ...getRedisConnectionOptions({ db: E5_REDIS_DB }),
    enableOfflineQueue: false,
  });
}

async function bootstrap(): Promise<void> {
  loadSecretsFromFile(false, SECRETS_PATH);
  assertQueueRegistryComplete();

  const redis = getE5Redis();
  await redis.connect();

  const workers: Worker[] = [];
  const push = (w: Worker) => {
    workers.push(w);
  };

  // ── A1-A8 Lifecycle FSM E5 Nurturing ────────────────────────────────────────
  push(createLifecycleOrderCompletedWorker());
  push(createLifecycleStateEvaluateWorker());
  push(createOnboardingSequenceStartWorker());
  push(createOnboardingStepExecuteWorker());
  push(createOnboardingCompleteCheckWorker());
  push(createStateTransitionExecuteWorker());
  push(createStateMetricsUpdateWorker());
  push(createStateAdvocatePromoteWorker());

  // ── B9-B14 Churn Detection AI E5 FAZA 9c ────────────────────────────────────
  push(createChurnSignalDetectWorker());
  push(createChurnScoreCalculateWorker());
  push(createChurnRiskEscalateWorker());
  push(createSentimentAnalyzeWorker());
  push(createSentimentAggregateWorker());
  push(createDecayBehaviorDetectWorker());

  // ── C15-C19 PostGIS Proximity E5 FAZA 9d ────────────────────────────────────
  push(createGeoProximityCalculateWorker());
  push(createGeoNeighborIdentifyWorker());
  push(createGeoTerritoryCalculateWorker());
  push(createGeoCoverageAnalyzeWorker());
  push(createGeoCatchmentBuildWorker());

  // ── lifecycle:state:evaluate — cron periodic evaluare (la 6 ore) ────────────
  const stateEvaluateQueue = createQueue(QUEUES.E5_LIFECYCLE_STATE_EVALUATE, { db: E5_REDIS_DB });
  // NOTE: evaluarea periodică e enqueue-ită prin job repeating din pipeline orchestrator
  // Această coada acceptă și job-uri one-shot din A1/A2

  const e5QueueNames = queueRegistry
    .map((q) => q.name)
    .filter(
      (n) =>
        n.startsWith("lifecycle:") ||
        n.startsWith("onboarding:") ||
        n.startsWith("state:") ||
        n.startsWith("churn:") ||
        n.startsWith("sentiment:") ||
        n.startsWith("decay:") ||
        n.startsWith("geo:"),
    );

  const stopQueueMonitor = startQueueDepthMonitor({
    queueNames: e5QueueNames,
    dlqNames: [],
  });

  const healthServer = createHealthServer(PORT, () => ({
    ok: true,
    service: "worker-e5-nurturing",
    workerInstances: workers.length,
    registryQueues: queueRegistry.length,
  }));

  const shutdown = async () => {
    svcLog.info("shutdown starting");
    await stopQueueMonitor();
    await Promise.allSettled(workers.map((w) => w.close()));
    await stateEvaluateQueue.close();
    healthServer.close();
    await redis.quit();
    process.exit(0);
  };

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

  process.on("SIGTERM", () => {
    void shutdown();
  });
  process.on("SIGINT", () => {
    void shutdown();
  });

  svcLog.info(
    { workers: workers.length, port: PORT, redisDb: E5_REDIS_DB },
    "worker-e5-nurturing started",
  );
}

try {
  await bootstrap();
} catch (err) {
  const e = err instanceof Error ? err : new Error(String(err));
  svcLog.error({ err: e, ...enrichError(e, { scope: "bootstrap" }) }, "worker-e5-nurturing fatal");
  process.exit(1);
}
