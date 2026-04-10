import { randomUUID } from "node:crypto";
import { Queue, Worker } from "bullmq";
import type { Job, Processor, QueueOptions, WorkerOptions } from "bullmq";
import { BullMQOtel } from "bullmq-otel";
import {
  CorrelationContext,
  createServiceLogger,
  enrichError,
  withSpan,
} from "@cerniq/observability";
import { getQueuePrefix, getRedisConnectionOptions } from "./redis.js";
import {
  jobDurationSeconds,
  jobsActiveGauge,
  jobsFailedTotal,
  jobsProcessedTotal,
  jobsRetriedTotal,
} from "./metrics.js";
import { parseWorkerAutoObservabilityEnv } from "./worker-auto-obs-env.js";

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME ?? "cerniq-workers";
const otelEnabled = !!(
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
);
const bullmqOtel = otelEnabled ? new BullMQOtel(SERVICE_NAME) : undefined;

const workerAutoObservability = parseWorkerAutoObservabilityEnv(
  process.env.WORKER_AUTO_OBSERVABILITY,
);

/** Valoare la încărcarea modulului (rollout worker). */
export const WORKER_AUTO_OBSERVABILITY_ACTIVE = workerAutoObservability;

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

export function createWorker<T = unknown>(
  name: string,
  processor: Processor<T> | string | URL,
  options?: Partial<WorkerOptions> & { db?: number },
) {
  const { db, ...workerOpts } = options ?? {};
  const wrappedProcessor =
    typeof processor === "function"
      ? wrapProcessorWithAutoObservability(name, processor)
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
