import { Queue, Worker } from "bullmq";
import type { Processor, QueueOptions, WorkerOptions } from "bullmq";
import { BullMQOtel } from "bullmq-otel";
import { getQueuePrefix, getRedisConnectionOptions } from "./redis.js";
import {
  jobDurationSeconds,
  jobsActiveGauge,
  jobsFailedTotal,
  jobsProcessedTotal,
  jobsRetriedTotal,
} from "./metrics.js";

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME ?? "cerniq-workers";
const otelEnabled = !!(
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
);
const bullmqOtel = otelEnabled ? new BullMQOtel(SERVICE_NAME) : undefined;

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
  const worker = new Worker<T>(toBullMqQueueName(name), processor, {
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
