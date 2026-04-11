import { randomUUID } from "node:crypto";
import { trace } from "@opentelemetry/api";
import { Queue, Worker } from "bullmq";
import type { Job, Processor, QueueOptions, WorkerOptions } from "bullmq";
import { BullMQOtel } from "bullmq-otel";
import {
  CorrelationContext,
  createServiceLogger,
  enrichError,
  withSpan,
} from "@cerniq/observability";
import { resolveNodeKeyFromQueueName, resolveNodeKeyFromQueueNameAndEtapa } from "@cerniq/shared";
import { withCognitiveSpan } from "./cognitive-helpers.js";
import { getRegisteredCognitiveWorkerEtapa } from "./cognitive-worker-register.js";
import type { ImportExecutionContext } from "./import-execution.js";
import { getQueuePrefix, getRedisConnectionOptions } from "./redis.js";
import {
  jobDurationSeconds,
  jobsActiveGauge,
  jobsFailedTotal,
  jobsProcessedTotal,
  jobsRetriedTotal,
} from "./metrics.js";
import { parseWorkerAutoObservabilityEnv } from "./worker-auto-obs-env.js";
import { parseWorkerCognitiveInstrumentationEnv } from "./worker-cognitive-env.js";

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME ?? "cerniq-workers";
const otelEnabled = !!(
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
);
const bullmqOtel = otelEnabled ? new BullMQOtel(SERVICE_NAME) : undefined;

const workerAutoObservability = parseWorkerAutoObservabilityEnv(
  process.env.WORKER_AUTO_OBSERVABILITY,
);

const workerCognitiveInstrumentation = parseWorkerCognitiveInstrumentationEnv(
  process.env.WORKER_COGNITIVE_INSTRUMENTATION,
);

/** Valoare la încărcarea modulului (rollout worker). */
export const WORKER_AUTO_OBSERVABILITY_ACTIVE = workerAutoObservability;

/** Brain / Redis cognitive events — implicit activ; dezactivare: WORKER_COGNITIVE_INSTRUMENTATION=0 */
export const WORKER_COGNITIVE_INSTRUMENTATION_ACTIVE = workerCognitiveInstrumentation;

function toCanonicalQueueName(queueName: string): string {
  return queueName.includes("__") ? queueName.replaceAll("__", ":") : queueName;
}

function buildCognitiveContextFromJob<T>(
  job: Job<T>,
  queueName: string,
): Partial<ImportExecutionContext> | null {
  const data = job.data as Record<string, unknown> | null | undefined;
  if (!data || typeof data !== "object") return null;
  const tenantId = typeof data.tenantId === "string" ? data.tenantId.trim() : "";
  if (!tenantId) return null;

  const batchId =
    typeof data.batchId === "string" && data.batchId.trim() ? data.batchId.trim() : undefined;
  const sessionId = typeof data.sessionId === "string" ? data.sessionId : "";
  const correlationRaw = data.correlationId;
  const correlationId =
    typeof correlationRaw === "string" ? correlationRaw : correlationRaw === null ? null : null;
  const runtimeKey =
    (typeof data.negotiationId === "string" && data.negotiationId) ||
    (typeof data.leadId === "string" && data.leadId) ||
    (typeof data.runtimeJobKey === "string" && data.runtimeJobKey) ||
    `${queueName}:${String(job.id ?? "")}`;

  const etapa = getRegisteredCognitiveWorkerEtapa();
  const stageKey = etapa !== undefined ? `e${etapa}` : "worker";
  const workerName = process.env.OTEL_SERVICE_NAME?.trim() || "cerniq-workers";

  const ctx: Partial<ImportExecutionContext> = {
    tenantId,
    sessionId,
    runtimeJobKey: runtimeKey,
    workerName,
    stageKey,
    queueName,
    correlationId,
    traceId: typeof correlationRaw === "string" ? correlationRaw : undefined,
  };
  if (batchId) ctx.batchId = batchId;
  return ctx;
}

function wrapProcessorWithCognitiveInstrumentation<T>(
  queueName: string,
  processor: Processor<T>,
): Processor<T> {
  if (!workerCognitiveInstrumentation) return processor;
  return async (job: Job<T>, token?: string) => {
    const canonical = toCanonicalQueueName(queueName);
    const etapa = getRegisteredCognitiveWorkerEtapa();
    const nodeKey =
      etapa !== undefined
        ? (resolveNodeKeyFromQueueNameAndEtapa(canonical, etapa) ??
          resolveNodeKeyFromQueueName(queueName))
        : resolveNodeKeyFromQueueName(queueName);
    if (!nodeKey) return processor(job, token);
    const ctx = buildCognitiveContextFromJob(job, canonical);
    if (!ctx?.tenantId) return processor(job, token);
    return withCognitiveSpan(nodeKey, async (_span) => processor(job, token), ctx);
  };
}

type JobDataForCorrelation = {
  correlationId?: string;
  httpCorrelationId?: string;
  requestId?: string;
};

function correlationStoreFromJob<T>(job: Job<T>): {
  correlationId: string;
  requestId?: string;
} {
  const data = job.data as JobDataForCorrelation | null | undefined;
  const correlationId =
    (typeof data?.correlationId === "string" && data.correlationId.trim()) ||
    (typeof data?.httpCorrelationId === "string" && data.httpCorrelationId.trim()) ||
    randomUUID();
  const requestId =
    typeof data?.requestId === "string" && data.requestId.trim()
      ? data.requestId.trim()
      : undefined;
  return { correlationId, requestId };
}

function wrapProcessorWithAutoObservability<T>(
  queueName: string,
  processor: Processor<T>,
): Processor<T> {
  if (!workerAutoObservability) return processor;
  const jobLog = createServiceLogger(`worker-job:${queueName}`);
  return async (job: Job<T>, token?: string) => {
    const store = correlationStoreFromJob(job);
    return CorrelationContext.run(store, () =>
      withSpan(`bullmq:${queueName}`, async () => {
        const span = trace.getActiveSpan();
        if (span) {
          span.setAttribute("cerniq.worker_queue", queueName);
          if (job.id != null) span.setAttribute("cerniq.job_id", String(job.id));
          span.setAttribute("cerniq.correlation_id", store.correlationId);
          if (store.requestId) span.setAttribute("cerniq.request_id", store.requestId);
          const jd = job.data as { tenantId?: string } | null | undefined;
          if (typeof jd?.tenantId === "string" && jd.tenantId.trim()) {
            span.setAttribute("cerniq.tenant_id", jd.tenantId.trim());
          }
        }
        jobLog.info({ jobId: job.id, jobName: job.name }, "job start");
        try {
          return await processor(job, token);
        } catch (err) {
          const e = err instanceof Error ? err : new Error(String(err));
          jobLog.error(
            { jobId: job.id, jobName: job.name, ...enrichError(e, { scope: queueName }) },
            "job processor error",
          );
          throw err;
        }
      }),
    );
  };
}

const DEFAULT_WORKER_OPTIONS: Partial<WorkerOptions> = {
  concurrency: 5,
  maxStalledCount: 2,
  stalledInterval: 30000,
  lockDuration: 60000,
};

const BULLMQ_QUEUE_SEPARATOR = "__";

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 1000 },
  removeOnComplete: { count: 1000, age: 24 * 3600 },
  removeOnFail: { count: 5000, age: 7 * 24 * 3600 },
};

export function toBullMqQueueName(name: string): string {
  return name.replaceAll(":", BULLMQ_QUEUE_SEPARATOR);
}

export function createQueue<T = unknown>(
  name: string,
  options?: Partial<QueueOptions> & { db?: number },
) {
  const { db, ...queueOpts } = options ?? {};
  return new Queue<T>(toBullMqQueueName(name), {
    connection: getRedisConnectionOptions({ db }),
    prefix: getQueuePrefix(),
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
    ...(bullmqOtel ? { telemetry: bullmqOtel } : {}),
    ...queueOpts,
  });
}

/**
 * Creează un Worker BullMQ cu OTel + logging + (implicit) instrumentare cognitivă Brain.
 * Apel `registerCognitiveWorkerEtapa(n)` din bootstrap-ul binarului pentru rezolvare corectă
 * `queueName`→`nodeKey` când catalogul are coliziuni între etape. `withCognitiveSpan` imbricat
 * în procesor nu dublează evenimente (guard în `cognitive-helpers`).
 */
export function createWorker<T = unknown>(
  name: string,
  processor: Processor<T> | string | URL,
  options?: Partial<WorkerOptions> & { db?: number },
) {
  const { db, ...workerOpts } = options ?? {};
  const wrappedProcessor =
    typeof processor === "function"
      ? wrapProcessorWithAutoObservability(
          name,
          wrapProcessorWithCognitiveInstrumentation(name, processor),
        )
      : processor;
  const worker = new Worker<T>(toBullMqQueueName(name), wrappedProcessor, {
    connection: getRedisConnectionOptions({ db }),
    prefix: getQueuePrefix(),
    ...DEFAULT_WORKER_OPTIONS,
    ...(bullmqOtel ? { telemetry: bullmqOtel } : {}),
    ...workerOpts,
  });

  worker.on("active", () => jobsActiveGauge.inc({ queue: name }));
  worker.on("completed", () => {
    jobsProcessedTotal.inc({ queue: name });
    jobsActiveGauge.dec({ queue: name });
  });
  worker.on("failed", (job) => {
    jobsFailedTotal.inc({ queue: name });
    jobsActiveGauge.dec({ queue: name });
    const attempts = job?.opts?.attempts ?? 1;
    const attemptsMade = job?.attemptsMade ?? 0;
    if (attemptsMade < attempts) {
      jobsRetriedTotal.inc({ queue: name });
    }
  });

  return {
    worker,
    observeDuration(startMs: number) {
      jobDurationSeconds.observe({ queue: name }, (Date.now() - startMs) / 1000);
    },
  };
}
