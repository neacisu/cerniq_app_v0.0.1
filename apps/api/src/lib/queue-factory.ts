import { Queue, Worker } from "bullmq";
import type { QueueOptions, WorkerOptions, Processor } from "bullmq";

const QUEUE_PREFIX = "cerniq";

function getRedisConnectionOptions() {
  const url = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
  return {
    host: url.hostname,
    port: parseInt(url.port, 10) || 6379,
    password: url.password || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

export function createQueue<T = unknown>(
  name: string,
  opts?: Partial<QueueOptions>,
) {
  return new Queue<T>(name, {
    connection: getRedisConnectionOptions(),
    prefix: QUEUE_PREFIX,
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
    prefix: QUEUE_PREFIX,
    concurrency: 5,
    ...opts,
  });
}
