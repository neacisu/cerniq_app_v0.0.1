import { createQueue } from "./factory.js";
import { dlqDepth, queueDepth, queueDepthByState } from "./metrics.js";

const BULLMQ_DEPTH_STATES = [
  "waiting",
  "active",
  "completed",
  "failed",
  "delayed",
  "paused",
] as const;

export interface QueueDepthMonitorOptions {
  queueNames: string[];
  dlqNames?: string[];
  intervalMs?: number;
  logger?: { warn: (obj: object, msg: string) => void };
}

export function startQueueDepthMonitor(options: QueueDepthMonitorOptions): () => Promise<void> {
  const {
    queueNames,
    dlqNames = [],
    intervalMs = 15_000,
    logger = { warn: (obj, msg) => console.warn(msg, obj) },
  } = options;

  const monitorQueues = queueNames.map((name) => ({
    name,
    queue: createQueue(name),
  }));
  const dlqQueues = dlqNames.map((name) => ({
    name,
    queue: createQueue(name),
  }));

  const interval = setInterval(async () => {
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
        for (const state of BULLMQ_DEPTH_STATES) {
          queueDepthByState.set({ queue: name, state }, counts[state] ?? 0);
        }
      } catch (err) {
        logger.warn({ queue: name, error: (err as Error).message }, "Queue depth poll failed");
      }
    }

    for (const { name, queue } of dlqQueues) {
      try {
        const counts = await queue.getJobCounts("waiting");
        dlqDepth.set({ queue: name }, counts.waiting ?? 0);
      } catch (err) {
        logger.warn({ queue: name, error: (err as Error).message }, "DLQ depth poll failed");
      }
    }
  }, intervalMs);

  return async () => {
    clearInterval(interval);
    await Promise.allSettled([
      ...monitorQueues.map(({ queue }) => queue.close()),
      ...dlqQueues.map(({ queue }) => queue.close()),
    ]);
  };
}
