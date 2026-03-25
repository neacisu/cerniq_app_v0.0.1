import {
  assertQueueRegistryComplete,
  beginImportRuntimeJob,
  completeImportRuntimeJob,
  closeRedisConnections,
  createHealthServer,
  createQueue,
  createRedisConnections,
  createWorker,
  failImportRuntimeJob,
  loadSecretsFromFile,
  dlqDepth,
  queueDepth,
  queueDepthByState,
  queueRegistry,
  watchSecretsFile,
} from "@cerniq/worker-shared";
import { closeDbConnection, db, inArray, refreshDbConnection, tenants } from "@cerniq/db";
import type { Job } from "bullmq";
import { csvParserProcessor } from "./workers/a1-csv-parser.js";
import { excelParserProcessor } from "./workers/a2-excel-parser.js";
import { webhookReceiverProcessor } from "./workers/a3-webhook-receiver.js";
import { apiPollerProcessor } from "./workers/a4-api-poller.js";
import { manualEntryProcessor } from "./workers/a5-manual-entry.js";
import { nameNormalizerProcessor } from "./workers/b1-name-normalizer.js";
import { emailNormalizerProcessor } from "./workers/b2-email-normalizer.js";
import { phoneNormalizerProcessor } from "./workers/b3-phone-normalizer.js";
import { addressNormalizerProcessor } from "./workers/b4-address-normalizer.js";
import { anafBronzeEnricherProcessor } from "./workers/b5-anaf-bronze-enricher.js";
import { cuiModulo11ValidatorProcessor } from "./workers/c1-cui-modulo11-validator.js";
import { cuiAnafValidatorProcessor } from "./workers/c2-cui-anaf-validator.js";
import { createAnafFullFetchProcessor } from "./workers/d0-anaf-full-fetch.js";
import { anafFiscalProcessor } from "./workers/d1-anaf-fiscal.js";
import { anafTvaProcessor } from "./workers/d2-anaf-tva.js";
import { anafEfacturaProcessor } from "./workers/d3-anaf-efactura.js";
import { anafDatoriiProcessor } from "./workers/d4-anaf-datorii.js";
import { anafCaenProcessor } from "./workers/d5-anaf-caen.js";
import { termeneBalanceProcessor } from "./workers/e1-termene-balance.js";
import { termeneRiskProcessor } from "./workers/e2-termene-risk.js";
import { termeneDosareProcessor } from "./workers/e3-termene-dosare.js";
import { termeneAssociatesProcessor } from "./workers/e4-termene-associates.js";
import { promotionBronzeSilverProcessor } from "./workers/promotion-bronze-silver.js";
import { onrcDataProcessor } from "./workers/f1-onrc-data.js";
import { onrcAdministratoriProcessor } from "./workers/f2-onrc-administratori.js";
import { onrcSediiProcessor } from "./workers/f3-onrc-sedii.js";
import { hunterEmailFinderProcessor } from "./workers/g1-hunter-email-finder.js";
import { hunterVerifierProcessor } from "./workers/g2-hunter-verifier.js";
import { zerobounceValidationProcessor } from "./workers/g2-zerobounce-validation.js";
import { emailEnricherProcessor } from "./workers/g3-email-enricher.js";
import { emailPatternProcessor } from "./workers/g4-email-pattern.js";
import { emailGeneratorProcessor } from "./workers/g5-email-generator.js";
import { phoneNormalizerSilverProcessor } from "./workers/h1-phone-normalizer.js";
import { hlrLookupProcessor } from "./workers/h2-hlr-lookup.js";
import { carrierDetectionProcessor } from "./workers/h3-carrier-detection.js";
import { dajScraperProcessor } from "./workers/i1-daj-scraper.js";
import { anifScraperProcessor } from "./workers/i2-anif-scraper.js";
import { websiteFinderProcessor } from "./workers/i3-website-finder.js";
import { contactPageScraperProcessor } from "./workers/i4-contact-page-scraper.js";
import { grokStructuringProcessor } from "./workers/j1-grok-structuring.js";
import { aiDataMergerProcessor } from "./workers/j2-ai-data-merger.js";
import { aiConfidenceScorerProcessor } from "./workers/j3-ai-confidence-scorer.js";
import { aiFallbackProcessor } from "./workers/j4-ai-fallback.js";
import { nominatimGeocodingProcessor } from "./workers/k1-nominatim-geocoding.js";
import { postgisZonesProcessor } from "./workers/k2-postgis-zones.js";
import { proximityCalculatorProcessor } from "./workers/k3-proximity-calculator.js";
import { apiaDataProcessor } from "./workers/l1-apia-data.js";
import { ouaiMembershipProcessor } from "./workers/l2-ouai-membership.js";
import { cooperativeMembershipProcessor } from "./workers/l3-cooperative-membership.js";
import { culturiClassifierProcessor } from "./workers/l4-culturi-classifier.js";
import { animaleClassifierProcessor } from "./workers/l5-animale-classifier.js";
import { dedupExactHashProcessor } from "./workers/m1-dedup-exact-hash.js";
import { dedupFuzzyMatchProcessor } from "./workers/m2-dedup-fuzzy-match.js";
import { scoreCompletenessProcessor } from "./workers/n1-score-completeness.js";
import { scoreAccuracyProcessor } from "./workers/n2-score-accuracy.js";
import { scoreFreshnessProcessor } from "./workers/n3-score-freshness.js";
import { dailyStatsProcessor } from "./workers/o1-daily-stats.js";
import { qualityRollupProcessor } from "./workers/o2-quality-rollup.js";
import { pipelineOrchestratorProcessor } from "./workers/p1-orchestrate.js";
import { promoteToGoldProcessor } from "./workers/p2-promote-to-gold.js";
import { pipelineMonitorProcessor } from "./workers/p3-pipeline-monitor.js";
import { pipelineErrorHandlerProcessor } from "./workers/p4-error-handler.js";
import { hitlEscalationProcessor } from "./workers/hitl-escalation.js";
import { hitlResumeAfterApprovalProcessor } from "./workers/hitl-resume-after-approval.js";
import { importFileCleanupProcessor } from "./workers/o3-import-file-cleanup.js";

const PORT = Number(process.env.PORT || "3000");
const SECRETS_PATH = process.env.SECRETS_PATH?.trim() || "/secrets/workers.env";
const PROMOTE_BRONZE_SILVER_WORKER_OPTIONS = {
  lockDuration: 15 * 60 * 1000,
  stalledInterval: 2 * 60 * 1000,
  maxStalledCount: 20,
} as const;
assertQueueRegistryComplete();
const queueNames = queueRegistry.map((q) => q.name);
const defaultTenantId = process.env.DEFAULT_TENANT_ID?.trim() ?? null;
if (!defaultTenantId) {
  console.warn(
    "[enrichment] DEFAULT_TENANT_ID not set — recurring cron jobs (monitor, daily-stats) will be skipped.",
  );
}

const stats = {
  processed: 0,
  failed: 0,
  lastJob: null as null | { name: string; id: string; timestamp: string },
};

let redisConnections = createRedisConnections();
let workers: Array<ReturnType<typeof createWorker>["worker"]> = [];

async function scheduleRecurringControlJobs() {
  // Fetch all active (and trial) tenants to schedule cron jobs for each
  let activeTenants: { id: string }[] = [];
  try {
    activeTenants = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(inArray(tenants.status, ["active", "trial"]));
  } catch {
    // Fallback to DEFAULT_TENANT_ID if DB query fails
    if (defaultTenantId) {
      activeTenants = [{ id: defaultTenantId }];
    }
  }

  // If DB returned nothing but we have a default, include it
  if (activeTenants.length === 0 && defaultTenantId) {
    activeTenants = [{ id: defaultTenantId }];
  }

  if (activeTenants.length === 0) {
    console.warn("[enrichment] No active tenants found — cron jobs will be skipped.");
    return;
  }

  const monitorQueue = createQueue("pipeline:monitor");
  const dailyStatsQueue = createQueue("aggregate:daily-stats");
  const cleanupQueue = createQueue("maintenance:import-file-cleanup");

  for (const tenant of activeTenants) {
    await monitorQueue.add(
      "hourly-monitor",
      {
        tenantId: tenant.id,
        correlationId: "cron-hourly-monitor",
      },
      {
        jobId: `cron:pipeline-monitor:hourly:${tenant.id}`,
        repeat: { pattern: "0 * * * *" },
        removeOnComplete: 50,
        removeOnFail: 200,
      },
    );
    await dailyStatsQueue.add(
      "daily-aggregation",
      {
        tenantId: tenant.id,
        correlationId: "cron-daily-stats",
      },
      {
        jobId: `cron:daily-stats:02:00:${tenant.id}`,
        repeat: { pattern: "0 2 * * *" },
        removeOnComplete: 50,
        removeOnFail: 200,
      },
    );
  }

  await monitorQueue.close();
  await dailyStatsQueue.close();

  // Cleanup old import files once daily at 03:00 (tenant-agnostic)
  await cleanupQueue.add(
    "cleanup-import-files",
    { correlationId: "cron-import-cleanup" },
    {
      jobId: "cron:import-file-cleanup:03:00",
      repeat: { pattern: "0 3 * * *" },
      removeOnComplete: 10,
      removeOnFail: 50,
    },
  );
  await cleanupQueue.close();
}

function classifyErrorType(error: unknown): string {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const errorCode = (error as { code?: string })?.code?.toUpperCase() ?? "";
  const statusCode =
    (error as { status?: number; statusCode?: number })?.status ??
    (error as { status?: number; statusCode?: number })?.statusCode ??
    0;

  if (statusCode === 429 || message.includes("too many requests")) {
    return "RATE_LIMITED";
  }
  if (statusCode === 402 || message.includes("quota exceeded") || message.includes("billing")) {
    return "QUOTA_EXCEEDED";
  }
  if (
    statusCode === 401 ||
    statusCode === 403 ||
    message.includes("unauthorized") ||
    message.includes("forbidden") ||
    message.includes("api key") ||
    message.includes("credentials")
  ) {
    return "AUTH_ERROR";
  }
  if (message.includes("circuit") && message.includes("open")) {
    return "CIRCUIT_OPEN";
  }

  const RETRYABLE_CODES = [
    "ECONNREFUSED",
    "ETIMEDOUT",
    "ENOTFOUND",
    "ECONNRESET",
    "EPIPE",
    "EAI_AGAIN",
  ];
  if (RETRYABLE_CODES.includes(errorCode)) {
    return "NETWORK_ERROR";
  }

  if (
    statusCode === 408 ||
    statusCode === 504 ||
    message.includes("timeout") ||
    message.includes("timed out")
  ) {
    return "API_TIMEOUT";
  }
  if (statusCode >= 500 && statusCode < 600) {
    return "NETWORK_ERROR";
  }
  if (
    message.includes("fetch failed") ||
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("etimedout") ||
    message.includes("econnreset") ||
    message.includes("network error")
  ) {
    return "NETWORK_ERROR";
  }
  if (statusCode === 404 || message.includes("not found")) return "DATA_NOT_FOUND";
  if (message.includes("validation") || message.includes("invalid") || message.includes("schema"))
    return "VALIDATION_ERROR";
  return "PERMANENT_FAILURE";
}

async function enqueuePipelineError(args: {
  queueName: string;
  job: Job | undefined | null;
  error: unknown;
}) {
  if (args.queueName === "pipeline:error-handler") return;
  const jobData = (args.job?.data ?? {}) as Record<string, unknown>;
  const tenantId = typeof jobData.tenantId === "string" ? jobData.tenantId : null;
  let companyId: string | null = null;
  if (typeof jobData.companyId === "string") {
    companyId = jobData.companyId;
  } else if (typeof jobData.bronzeContactId === "string") {
    companyId = jobData.bronzeContactId;
  }
  if (!tenantId || !companyId) {
    console.error(
      "[pipeline:error-handler] skipped enqueue because tenant/company context is missing",
      {
        sourceWorker: args.queueName,
        sourceJobId: String(args.job?.id ?? ""),
        tenantId,
        companyId,
        jobName: args.job?.name ?? null,
      },
    );
    return;
  }

  const queue = createQueue("pipeline:error-handler");
  await queue.add("handle-error", {
    tenantId,
    companyId,
    errorType: classifyErrorType(args.error),
    errorMessage: args.error instanceof Error ? args.error.message : String(args.error),
    sourceWorker: args.queueName,
    sourceJobId: String(args.job?.id ?? ""),
    sourcePayload: jobData,
    retryCount: Number(args.job?.attemptsMade ?? 0),
    maxRetries: Number(args.job?.opts?.attempts ?? 3),
    stackTrace: args.error instanceof Error ? args.error.stack : undefined,
    correlationId: typeof jobData.correlationId === "string" ? jobData.correlationId : undefined,
  });
  await queue.close();
}

const processors: Partial<Record<string, (job: Job) => Promise<unknown>>> = {
  "ingest:csv": csvParserProcessor as (job: Job) => Promise<unknown>,
  "ingest:excel": excelParserProcessor as (job: Job) => Promise<unknown>,
  "ingest:webhook": webhookReceiverProcessor as (job: Job) => Promise<unknown>,
  "ingest:api": apiPollerProcessor as (job: Job) => Promise<unknown>,
  "ingest:manual": manualEntryProcessor as (job: Job) => Promise<unknown>,
  "normalize:name": nameNormalizerProcessor as (job: Job) => Promise<unknown>,
  "normalize:email": emailNormalizerProcessor as (job: Job) => Promise<unknown>,
  "normalize:phone": phoneNormalizerProcessor as (job: Job) => Promise<unknown>,
  "normalize:address": addressNormalizerProcessor as (job: Job) => Promise<unknown>,
  "enrich:bronze:anaf": anafBronzeEnricherProcessor as (job: Job) => Promise<unknown>,
  "validate:cui:mod11": cuiModulo11ValidatorProcessor as (job: Job) => Promise<unknown>,
  "validate:cui:anaf": cuiAnafValidatorProcessor as (job: Job) => Promise<unknown>,
  "enrich:anaf:full": null as unknown as (job: Job) => Promise<unknown>,
  "enrich:anaf:fiscal-status": anafFiscalProcessor as (job: Job) => Promise<unknown>,
  "enrich:anaf:tva-status": anafTvaProcessor as (job: Job) => Promise<unknown>,
  "enrich:anaf:efactura": anafEfacturaProcessor as (job: Job) => Promise<unknown>,
  "enrich:anaf:datorii": anafDatoriiProcessor as (job: Job) => Promise<unknown>,
  "enrich:anaf:caen": anafCaenProcessor as (job: Job) => Promise<unknown>,
  "enrich:termene:balance": termeneBalanceProcessor as (job: Job) => Promise<unknown>,
  "enrich:termene:risk": termeneRiskProcessor as (job: Job) => Promise<unknown>,
  "enrich:termene:dosare": termeneDosareProcessor as (job: Job) => Promise<unknown>,
  "enrich:termene:actionari": termeneAssociatesProcessor as (job: Job) => Promise<unknown>,
  "enrich:onrc:data": onrcDataProcessor as (job: Job) => Promise<unknown>,
  "enrich:onrc:administratori": onrcAdministratoriProcessor as (job: Job) => Promise<unknown>,
  "enrich:onrc:sedii": onrcSediiProcessor as (job: Job) => Promise<unknown>,
  "discover:email:hunter": hunterEmailFinderProcessor as (job: Job) => Promise<unknown>,
  "discover:email:hunter-verify": hunterVerifierProcessor as (job: Job) => Promise<unknown>,
  "discover:email:zerobounce": zerobounceValidationProcessor as (job: Job) => Promise<unknown>,
  "enrich:email:enricher": emailEnricherProcessor as (job: Job) => Promise<unknown>,
  "discover:email:pattern": emailPatternProcessor as (job: Job) => Promise<unknown>,
  "discover:email:generate": emailGeneratorProcessor as (job: Job) => Promise<unknown>,
  "enrich:phone:normalize": phoneNormalizerSilverProcessor as (job: Job) => Promise<unknown>,
  "enrich:phone:hlr": hlrLookupProcessor as (job: Job) => Promise<unknown>,
  "enrich:phone:carrier": carrierDetectionProcessor as (job: Job) => Promise<unknown>,
  "scrape:legal:daj": dajScraperProcessor as (job: Job) => Promise<unknown>,
  "scrape:legal:anif": anifScraperProcessor as (job: Job) => Promise<unknown>,
  "scrape:website:finder": websiteFinderProcessor as (job: Job) => Promise<unknown>,
  "scrape:website:contact-page": contactPageScraperProcessor as (job: Job) => Promise<unknown>,
  "ai:structure:xai": grokStructuringProcessor as (job: Job) => Promise<unknown>,
  "ai:merge:xai": aiDataMergerProcessor as (job: Job) => Promise<unknown>,
  "ai:score:confidence": aiConfidenceScorerProcessor as (job: Job) => Promise<unknown>,
  "ai:fallback": aiFallbackProcessor as (job: Job) => Promise<unknown>,
  "geo:geocode:nominatim": nominatimGeocodingProcessor as (job: Job) => Promise<unknown>,
  "geo:zones:postgis": postgisZonesProcessor as (job: Job) => Promise<unknown>,
  "geo:proximity": proximityCalculatorProcessor as (job: Job) => Promise<unknown>,
  "agri:apia": apiaDataProcessor as (job: Job) => Promise<unknown>,
  "agri:ouai": ouaiMembershipProcessor as (job: Job) => Promise<unknown>,
  "agri:cooperative": cooperativeMembershipProcessor as (job: Job) => Promise<unknown>,
  "agri:culturi": culturiClassifierProcessor as (job: Job) => Promise<unknown>,
  "agri:animale": animaleClassifierProcessor as (job: Job) => Promise<unknown>,
  "dedup:exact": dedupExactHashProcessor as (job: Job) => Promise<unknown>,
  "dedup:fuzzy": dedupFuzzyMatchProcessor as (job: Job) => Promise<unknown>,
  "score:completeness": scoreCompletenessProcessor as (job: Job) => Promise<unknown>,
  "score:accuracy": scoreAccuracyProcessor as (job: Job) => Promise<unknown>,
  "score:freshness": scoreFreshnessProcessor as (job: Job) => Promise<unknown>,
  "aggregate:daily-stats": dailyStatsProcessor as (job: Job) => Promise<unknown>,
  "aggregate:quality-rollup": qualityRollupProcessor as (job: Job) => Promise<unknown>,
  "pipeline:orchestrate": pipelineOrchestratorProcessor as (job: Job) => Promise<unknown>,
  "pipeline:promote:gold": promoteToGoldProcessor as (job: Job) => Promise<unknown>,
  "pipeline:monitor": pipelineMonitorProcessor as (job: Job) => Promise<unknown>,
  "pipeline:error-handler": pipelineErrorHandlerProcessor as (job: Job) => Promise<unknown>,
  "pipeline:promote:bronze-silver": promotionBronzeSilverProcessor as (
    job: Job,
  ) => Promise<unknown>,
  "hitl:escalate": hitlEscalationProcessor as (job: Job) => Promise<unknown>,
  "hitl:resume": hitlResumeAfterApprovalProcessor as (job: Job) => Promise<unknown>,
  "maintenance:import-file-cleanup": importFileCleanupProcessor as (job: Job) => Promise<unknown>,
};

function getWorkerOptions(
  queueName: string,
  queueConfig?: { concurrency?: number; rateLimit?: { max: number; duration: number } },
) {
  const baseOptions = {
    concurrency: queueConfig?.concurrency ?? 2,
    limiter: queueConfig?.rateLimit,
  };

  if (queueName === "pipeline:promote:bronze-silver") {
    return {
      ...baseOptions,
      ...PROMOTE_BRONZE_SILVER_WORKER_OPTIONS,
    };
  }

  return baseOptions;
}

function buildWorkers() {
  workers = queueNames.map((queueName) => {
    const queueConfig = queueRegistry.find((q) => q.name === queueName);
    const { worker, observeDuration } = createWorker(
      queueName,
      async (job: Job) => {
        const startedAt = Date.now();
        try {
          const runtime = await beginImportRuntimeJob(queueName, job, queueName);
          if (runtime.paused) {
            stats.processed += 1;
            stats.lastJob = {
              name: job.name,
              id: String(job.id),
              timestamp: new Date().toISOString(),
            };
            return { ok: true, status: "paused" };
          }
          const processor = processors[queueName];
          if (processor) {
            const result = await processor(job);
            await completeImportRuntimeJob(job, result as Record<string, unknown> | undefined);
            stats.processed += 1;
            stats.lastJob = {
              name: job.name,
              id: String(job.id),
              timestamp: new Date().toISOString(),
            };
            return result;
          }
          stats.processed += 1;
          stats.lastJob = {
            name: job.name,
            id: String(job.id),
            timestamp: new Date().toISOString(),
          };
          return { ok: true };
        } catch (error) {
          await failImportRuntimeJob(job, error);
          stats.failed += 1;
          throw error;
        } finally {
          observeDuration(startedAt);
        }
      },
      getWorkerOptions(queueName, queueConfig),
    );

    worker.on("error", (err: Error) => {
      console.error(`[worker:${queueName}]`, err);
    });
    worker.on("failed", async (job, err) => {
      try {
        await enqueuePipelineError({
          queueName,
          job,
          error: err,
        });
      } catch (enqueueError) {
        console.error(`[worker:${queueName}] failed to enqueue pipeline error`, enqueueError);
      }
    });
    worker.on("stalled", (jobId: string) => {
      console.warn(
        `[worker:${queueName}] job stalled: ${jobId} — BullMQ will requeue automatically on the next stalledInterval cycle`,
      );
    });

    return worker;
  });
}

async function stopWorkers() {
  await Promise.all(workers.map((w) => w.close()));
  workers = [];
}

async function reloadSecretsAndConnections() {
  loadSecretsFromFile(true);
  await stopWorkers();
  await closeRedisConnections(redisConnections);
  await refreshDbConnection();
  redisConnections = createRedisConnections();
  processors["enrich:anaf:full"] = createAnafFullFetchProcessor(redisConnections.producer) as (
    job: Job,
  ) => Promise<unknown>;
  buildWorkers();
}

processors["enrich:anaf:full"] = createAnafFullFetchProcessor(redisConnections.producer) as (
  job: Job,
) => Promise<unknown>;
buildWorkers();
try {
  await scheduleRecurringControlJobs();
} catch (error) {
  console.error("[cron-scheduler] failed", error);
}

const monitorQueues = queueNames.map((name) => ({ name, queue: createQueue(name) }));
const DLQ_QUEUE_NAME = "dlq:outreach";
const dlqQueue = createQueue(DLQ_QUEUE_NAME);

const queueDepthInterval = setInterval(async () => {
  for (const { name, queue } of monitorQueues) {
    try {
      const counts = await queue.getJobCounts(
        "waiting",
        "active",
        "completed",
        "failed",
        "delayed",
        "paused",
      );
      queueDepth.set({ queue: name }, counts.waiting ?? 0);
      for (const state of [
        "waiting",
        "active",
        "completed",
        "failed",
        "delayed",
        "paused",
      ] as const) {
        queueDepthByState.set({ queue: name, state }, counts[state] ?? 0);
      }
    } catch {
      // silently skip unreachable queues
    }
  }
  try {
    const dlqCounts = await dlqQueue.getJobCounts("waiting", "failed", "delayed");
    dlqDepth.set(
      { queue: DLQ_QUEUE_NAME },
      (dlqCounts.waiting ?? 0) + (dlqCounts.failed ?? 0) + (dlqCounts.delayed ?? 0),
    );
  } catch {
    // DLQ may not exist yet
  }
}, 15_000);

const server = createHealthServer(PORT, () => ({
  service: "cerniq-worker-enrichment",
  status: "running",
  queues: queueNames,
  ...stats,
  timestamp: new Date().toISOString(),
}));

const stopWatchingSecrets = watchSecretsFile(SECRETS_PATH, async () => {
  await reloadSecretsAndConnections();
});

async function shutdown() {
  stopWatchingSecrets();
  clearInterval(queueDepthInterval);
  server.close();
  await Promise.all([...monitorQueues.map(({ queue }) => queue.close()), dlqQueue.close()]);
  await stopWorkers();
  await closeRedisConnections(redisConnections);
  await closeDbConnection();
  process.exit(0);
}

process.on("SIGHUP", async () => {
  try {
    await reloadSecretsAndConnections();
  } catch (error) {
    console.error("[SIGHUP] reload failed", error);
  }
});

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (error) => {
  console.error("[uncaughtException]", error);
});
