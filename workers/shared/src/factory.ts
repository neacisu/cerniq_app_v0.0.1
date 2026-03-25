import { Queue, Worker } from "bullmq";
import type { ConnectionOptions, Processor, QueueOptions, WorkerOptions } from "bullmq";
import { getQueuePrefix, getRedisConnectionOptions } from "./redis.js";
import {
  jobDurationSeconds,
  jobsActiveGauge,
  jobsFailedTotal,
  jobsProcessedTotal,
  jobsRetriedTotal,
} from "./metrics.js";

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

export interface CreateQueueOptions extends Partial<QueueOptions> {
  connection?: ConnectionOptions;
}

export function createQueue<T = unknown>(name: string, options?: CreateQueueOptions) {
  const { connection: externalConn, ...rest } = options ?? {};
  return new Queue<T>(toBullMqQueueName(name), {
    connection: externalConn ?? getRedisConnectionOptions(),
    prefix: getQueuePrefix(),
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
    ...rest,
  });
}

export interface CreateWorkerOptions extends Partial<WorkerOptions> {
  /** External Redis connection (e.g. shared ioredis instance for E2 workers on DB 2). */
  connection?: ConnectionOptions;
}

export function createWorker<T = unknown>(
  name: string,
  processor: Processor<T>,
  options?: CreateWorkerOptions,
) {
  const { connection: externalConn, ...rest } = options ?? {};
  const worker = new Worker<T>(toBullMqQueueName(name), processor, {
    connection: externalConn ?? getRedisConnectionOptions(),
    prefix: getQueuePrefix(),
    ...DEFAULT_WORKER_OPTIONS,
    ...rest,
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
