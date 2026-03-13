import { Queue, Worker } from "bullmq";
import type { Processor, QueueOptions, WorkerOptions } from "bullmq";
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

export function toBullMqQueueName(name: string): string {
  return name.replaceAll(":", BULLMQ_QUEUE_SEPARATOR);
}

export function createQueue<T = unknown>(name: string, options?: Partial<QueueOptions>) {
  return new Queue<T>(toBullMqQueueName(name), {
    connection: getRedisConnectionOptions(),
    prefix: getQueuePrefix(),
    ...options,
  });
}

export function createWorker<T = unknown>(
  name: string,
  processor: Processor<T>,
  options?: Partial<WorkerOptions>,
) {
  const worker = new Worker<T>(toBullMqQueueName(name), processor, {
    connection: getRedisConnectionOptions(),
    prefix: getQueuePrefix(),
    ...DEFAULT_WORKER_OPTIONS,
    ...options,
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
