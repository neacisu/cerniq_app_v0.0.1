import type { Job, Queue } from "bullmq";
import { createQueue, isKnownQueueName, queueRegistry } from "@cerniq/worker-shared";

export type QueueSnapshot = {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  throughput: number;
  latency: number;
};

export type QueueControlAction = "pause" | "resume" | "retry-failed" | "drain";

async function computeThroughput(queue: Queue): Promise<number> {
  const metrics = await queue.getMetrics("completed", 0, 4);
  if (!Array.isArray(metrics.data) || metrics.data.length === 0) return 0;
  const samples = metrics.data.filter((value) => Number.isFinite(value));
  if (samples.length === 0) return 0;
  return Number((samples.reduce((sum, value) => sum + value, 0) / samples.length).toFixed(2));
}

function getJobLatency(job: Job): number | null {
  if (typeof job.processedOn !== "number" || typeof job.finishedOn !== "number") {
    return null;
  }
  return Math.max(0, job.finishedOn - job.processedOn);
}

async function computeLatency(queue: Queue): Promise<number> {
  const jobs = await queue.getJobs("completed", 0, 9, false);
  const samples = jobs
    .map(getJobLatency)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (samples.length === 0) return 0;
  return Math.round(samples.reduce((sum, value) => sum + value, 0) / samples.length);
}

export function queueMonitor(redisUrl?: string) {
  if (redisUrl) {
    process.env.REDIS_URL = redisUrl;
  }

  const queues = new Map<string, Queue>();

  for (const { name } of queueRegistry) {
    queues.set(name, createQueue(name));
  }

  const buildSnapshot = async (name: string, queue: Queue): Promise<QueueSnapshot> => {
    const [counts, paused, throughput, latency] = await Promise.all([
      queue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused"),
      queue.isPaused(),
      computeThroughput(queue),
      computeLatency(queue),
    ]);

    return {
      name,
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
      paused,
      throughput,
      latency,
    };
  };

  const requireQueue = (name: string): Queue => {
    if (!isKnownQueueName(name)) {
      throw new Error(`Queue ${name} not found`);
    }
    const queue = queues.get(name);
    if (!queue) {
      throw new Error(`Queue ${name} not initialized`);
    }
    return queue;
  };

  return {
    async getAllQueues() {
      return Promise.all(
        Array.from(queues.entries()).map(([name, queue]) => buildSnapshot(name, queue)),
      );
    },

    async getQueue(name: string) {
      const queue = requireQueue(name);
      return buildSnapshot(name, queue);
    },

    async controlQueue(name: string, action: QueueControlAction) {
      const queue = requireQueue(name);
      if (action === "pause") {
        await queue.pause();
      } else if (action === "resume") {
        await queue.resume();
      } else if (action === "retry-failed") {
        await queue.retryJobs({ state: "failed", count: 100 });
      } else if (action === "drain") {
        await queue.drain(true);
      }
      return buildSnapshot(name, queue);
    },
  };
}
