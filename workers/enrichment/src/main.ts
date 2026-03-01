import { createHealthServer } from "@cerniq/worker-shared";
import { createRedisConnections, closeRedisConnections } from "@cerniq/worker-shared";
import { createWorker } from "@cerniq/worker-shared";
import { loadSecretsFromFile } from "@cerniq/worker-shared";
import { assertQueueRegistryComplete, queueRegistry } from "@cerniq/worker-shared";
import { getQueuePrefix, getRedisConnectionOptions } from "@cerniq/worker-shared";
import { Queue, type Job } from "bullmq";
import { csvParserProcessor } from "./workers/a1-csv-parser.js";
import { excelParserProcessor } from "./workers/a2-excel-parser.js";
import { webhookReceiverProcessor } from "./workers/a3-webhook-receiver.js";
import { apiPollerProcessor } from "./workers/a4-api-poller.js";
import { manualEntryProcessor } from "./workers/a5-manual-entry.js";
import { nameNormalizerProcessor } from "./workers/b1-name-normalizer.js";
import { emailNormalizerProcessor } from "./workers/b2-email-normalizer.js";
import { phoneNormalizerProcessor } from "./workers/b3-phone-normalizer.js";
import { addressNormalizerProcessor } from "./workers/b4-address-normalizer.js";
import { cuiModulo11ValidatorProcessor } from "./workers/c1-cui-modulo11-validator.js";
import { cuiAnafValidatorProcessor } from "./workers/c2-cui-anaf-validator.js";
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

const PORT = Number(process.env.PORT || "3000");
assertQueueRegistryComplete();
const extraQueueNames = [
  "pipeline:promote-bronze-silver",
  "pipeline:hitl-escalation",
  "pipeline:hitl-resume-after-approval",
];
const queueNames = Array.from(new Set([...queueRegistry.map((q) => q.name), ...extraQueueNames]));
const defaultTenantId = process.env.DEFAULT_TENANT_ID?.trim();
if (!defaultTenantId) {
  throw new Error("Missing required environment variable: DEFAULT_TENANT_ID");
}

const stats = {
  processed: 0,
  failed: 0,
  lastJob: null as null | { name: string; id: string; timestamp: string },
};

let redisConnections = createRedisConnections();
let workers: Array<ReturnType<typeof createWorker>["worker"]> = [];

async function scheduleRecurringControlJobs() {
  const connection = getRedisConnectionOptions();
  const prefix = getQueuePrefix();

  const monitorQueue = new Queue("pipeline:monitor", { connection, prefix });
  await monitorQueue.add(
    "hourly-monitor",
    {
      tenantId: defaultTenantId,
      correlationId: "cron-hourly-monitor",
    },
    {
      jobId: "cron:pipeline-monitor:hourly",
      repeat: { pattern: "0 * * * *" },
      removeOnComplete: 50,
      removeOnFail: 200,
    },
  );
  await monitorQueue.close();

  const dailyStatsQueue = new Queue("silver:aggregate:daily-stats", { connection, prefix });
  await dailyStatsQueue.add(
    "daily-aggregation",
    {
      tenantId: defaultTenantId,
      correlationId: "cron-daily-stats",
    },
    {
      jobId: "cron:daily-stats:02:00",
      repeat: { pattern: "0 2 * * *" },
      removeOnComplete: 50,
      removeOnFail: 200,
    },
  );
  await dailyStatsQueue.close();
}

function classifyErrorType(error: unknown): string {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes("timeout")) return "API_TIMEOUT";
  if (message.includes("rate") && message.includes("limit")) return "RATE_LIMITED";
  if (message.includes("not found")) return "DATA_NOT_FOUND";
  if (message.includes("validation") || message.includes("invalid")) return "VALIDATION_ERROR";
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
  const companyId =
    typeof jobData.companyId === "string"
      ? jobData.companyId
      : typeof jobData.bronzeContactId === "string"
        ? jobData.bronzeContactId
        : null;
  if (!tenantId || !companyId) return;

  const connection = getRedisConnectionOptions();
  const prefix = getQueuePrefix();
  const queue = new Queue("pipeline:error-handler", { connection, prefix });
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
  "bronze:ingest:csv-parser": csvParserProcessor as (job: Job) => Promise<unknown>,
  "bronze:ingest:excel-parser": excelParserProcessor as (job: Job) => Promise<unknown>,
  "bronze:ingest:webhook": webhookReceiverProcessor as (job: Job) => Promise<unknown>,
  "bronze:ingest:api": apiPollerProcessor as (job: Job) => Promise<unknown>,
  "bronze:ingest:manual": manualEntryProcessor as (job: Job) => Promise<unknown>,
  "bronze:normalize:name": nameNormalizerProcessor as (job: Job) => Promise<unknown>,
  "bronze:normalize:email": emailNormalizerProcessor as (job: Job) => Promise<unknown>,
  "bronze:normalize:phone": phoneNormalizerProcessor as (job: Job) => Promise<unknown>,
  "bronze:normalize:address": addressNormalizerProcessor as (job: Job) => Promise<unknown>,
  "silver:validate:cui-modulo11": cuiModulo11ValidatorProcessor as (job: Job) => Promise<unknown>,
  "silver:validate:cui-anaf": cuiAnafValidatorProcessor as (job: Job) => Promise<unknown>,
  "silver:enrich:anaf-fiscal-status": anafFiscalProcessor as (job: Job) => Promise<unknown>,
  "silver:enrich:anaf-tva-status": anafTvaProcessor as (job: Job) => Promise<unknown>,
  "silver:enrich:anaf-efactura": anafEfacturaProcessor as (job: Job) => Promise<unknown>,
  "silver:enrich:anaf-datorii": anafDatoriiProcessor as (job: Job) => Promise<unknown>,
  "silver:enrich:anaf-caen": anafCaenProcessor as (job: Job) => Promise<unknown>,
  "silver:enrich:termene-balance": termeneBalanceProcessor as (job: Job) => Promise<unknown>,
  "silver:enrich:termene-risk": termeneRiskProcessor as (job: Job) => Promise<unknown>,
  "silver:enrich:termene-dosare": termeneDosareProcessor as (job: Job) => Promise<unknown>,
  "silver:enrich:termene-actionari": termeneAssociatesProcessor as (job: Job) => Promise<unknown>,
  "silver:enrich:onrc-data": onrcDataProcessor as (job: Job) => Promise<unknown>,
  "silver:enrich:onrc-administratori": onrcAdministratoriProcessor as (
    job: Job,
  ) => Promise<unknown>,
  "silver:enrich:onrc-sedii": onrcSediiProcessor as (job: Job) => Promise<unknown>,
  "silver:enrich:hunter-email-finder": hunterEmailFinderProcessor as (job: Job) => Promise<unknown>,
  "silver:enrich:hunter-verifier": hunterVerifierProcessor as (job: Job) => Promise<unknown>,
  "silver:enrich:zerobounce-validation": zerobounceValidationProcessor as (
    job: Job,
  ) => Promise<unknown>,
  "silver:enrich:email-enricher": emailEnricherProcessor as (job: Job) => Promise<unknown>,
  "silver:enrich:email-pattern": emailPatternProcessor as (job: Job) => Promise<unknown>,
  "silver:enrich:email-generator": emailGeneratorProcessor as (job: Job) => Promise<unknown>,
  "silver:enrich:phone-normalizer": phoneNormalizerSilverProcessor as (
    job: Job,
  ) => Promise<unknown>,
  "silver:enrich:hlr-lookup": hlrLookupProcessor as (job: Job) => Promise<unknown>,
  "silver:enrich:carrier-detection": carrierDetectionProcessor as (job: Job) => Promise<unknown>,
  "silver:enrich:daj-scraper": dajScraperProcessor as (job: Job) => Promise<unknown>,
  "silver:enrich:anif-scraper": anifScraperProcessor as (job: Job) => Promise<unknown>,
  "silver:enrich:website-finder": websiteFinderProcessor as (job: Job) => Promise<unknown>,
  "silver:enrich:contact-page-scraper": contactPageScraperProcessor as (
    job: Job,
  ) => Promise<unknown>,
  "silver:enrich:grok-structuring": grokStructuringProcessor as (job: Job) => Promise<unknown>,
  "silver:enrich:ai-data-merger": aiDataMergerProcessor as (job: Job) => Promise<unknown>,
  "silver:enrich:ai-confidence-scorer": aiConfidenceScorerProcessor as (
    job: Job,
  ) => Promise<unknown>,
  "silver:enrich:ai-fallback": aiFallbackProcessor as (job: Job) => Promise<unknown>,
  "silver:enrich:nominatim-geocoding": nominatimGeocodingProcessor as (
    job: Job,
  ) => Promise<unknown>,
  "silver:enrich:postgis-zones": postgisZonesProcessor as (job: Job) => Promise<unknown>,
  "silver:enrich:proximity-calculator": proximityCalculatorProcessor as (
    job: Job,
  ) => Promise<unknown>,
  "silver:enrich:apia-data": apiaDataProcessor as (job: Job) => Promise<unknown>,
  "silver:enrich:ouai-membership": ouaiMembershipProcessor as (job: Job) => Promise<unknown>,
  "silver:enrich:cooperative-membership": cooperativeMembershipProcessor as (
    job: Job,
  ) => Promise<unknown>,
  "silver:enrich:culturi-classifier": culturiClassifierProcessor as (job: Job) => Promise<unknown>,
  "silver:enrich:animale-classifier": animaleClassifierProcessor as (job: Job) => Promise<unknown>,
  "silver:dedup:exact-hash": dedupExactHashProcessor as (job: Job) => Promise<unknown>,
  "silver:dedup:fuzzy-match": dedupFuzzyMatchProcessor as (job: Job) => Promise<unknown>,
  "silver:score:completeness": scoreCompletenessProcessor as (job: Job) => Promise<unknown>,
  "silver:score:accuracy": scoreAccuracyProcessor as (job: Job) => Promise<unknown>,
  "silver:score:freshness": scoreFreshnessProcessor as (job: Job) => Promise<unknown>,
  "silver:aggregate:daily-stats": dailyStatsProcessor as (job: Job) => Promise<unknown>,
  "silver:aggregate:quality-rollup": qualityRollupProcessor as (job: Job) => Promise<unknown>,
  "pipeline:orchestrate": pipelineOrchestratorProcessor as (job: Job) => Promise<unknown>,
  "pipeline:promote-to-gold": promoteToGoldProcessor as (job: Job) => Promise<unknown>,
  "pipeline:monitor": pipelineMonitorProcessor as (job: Job) => Promise<unknown>,
  "pipeline:error-handler": pipelineErrorHandlerProcessor as (job: Job) => Promise<unknown>,
  "pipeline:promote-bronze-silver": promotionBronzeSilverProcessor as (
    job: Job,
  ) => Promise<unknown>,
  "pipeline:hitl-escalation": hitlEscalationProcessor as (job: Job) => Promise<unknown>,
  "pipeline:hitl-resume-after-approval": hitlResumeAfterApprovalProcessor as (
    job: Job,
  ) => Promise<unknown>,
};

function buildWorkers() {
  workers = queueNames.map((queueName) => {
    const queueConfig = queueRegistry.find((q) => q.name === queueName);
    const { worker, observeDuration } = createWorker(
      queueName,
      async (job: Job) => {
        const startedAt = Date.now();
        try {
          const processor = processors[queueName];
          if (processor) {
            const result = await processor(job);
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
          stats.failed += 1;
          throw error;
        } finally {
          observeDuration(startedAt);
        }
      },
      {
        concurrency: queueConfig?.concurrency ?? 2,
        limiter: queueConfig?.rateLimit,
      },
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
  redisConnections = createRedisConnections();
  buildWorkers();
}

loadSecretsFromFile();
buildWorkers();
void scheduleRecurringControlJobs().catch((error) => {
  console.error("[cron-scheduler] failed", error);
});

const server = createHealthServer(PORT, () => ({
  service: "cerniq-worker-enrichment",
  status: "running",
  queues: queueNames,
  ...stats,
  timestamp: new Date().toISOString(),
}));

async function shutdown() {
  server.close();
  await stopWorkers();
  await closeRedisConnections(redisConnections);
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
