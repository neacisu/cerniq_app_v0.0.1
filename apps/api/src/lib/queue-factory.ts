import { Queue, Worker } from "bullmq";
import type { QueueOptions, WorkerOptions, Processor } from "bullmq";
import { getQueuePrefix, getRedisConnectionOptions } from "@cerniq/worker-shared";

export function createQueue<T = unknown>(name: string, opts?: Partial<QueueOptions>) {
  return new Queue<T>(name, {
    connection: getRedisConnectionOptions(),
    prefix: getQueuePrefix(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
    ...opts,
  });
}

export function createWorker<T = unknown>(
  name: string,
  processor: Processor<T>,
  opts?: Partial<WorkerOptions>,
) {
  return new Worker<T>(name, processor, {
    connection: getRedisConnectionOptions(),
    prefix: getQueuePrefix(),
    concurrency: 5,
    ...opts,
  });
}
