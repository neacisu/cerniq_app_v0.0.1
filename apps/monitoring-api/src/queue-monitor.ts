import { Queue } from "bullmq";

const QUEUE_PREFIX = "cerniq";
const KNOWN_QUEUES = [
  "enrichment",
  "outreach-wa",
  "outreach-email",
  "ai-negotiation",
  "invoice-sync",
];

function parseRedisUrl(url: string): {
  host: string;
  port: number;
  password?: string;
  db?: number;
} {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    password: parsed.password || undefined,
    db: parsed.pathname ? Number(parsed.pathname.slice(1)) || 0 : 0,
  };
}

export function queueMonitor(redisUrl: string) {
  const redisOpts = parseRedisUrl(redisUrl);
  const queues = new Map<string, Queue>();

  for (const name of KNOWN_QUEUES) {
    queues.set(
      name,
      new Queue(name, {
        connection: { ...redisOpts, maxRetriesPerRequest: null },
        prefix: QUEUE_PREFIX,
      }),
    );
  }

  return {
    async getAllQueues() {
      const results = [];
      for (const [name, queue] of queues) {
        const counts = await queue.getJobCounts();
        results.push({ name, ...counts });
      }
      return results;
    },

    async getQueue(name: string) {
      const queue = queues.get(name);
      if (!queue) return null;
      const counts = await queue.getJobCounts();
      return { name, ...counts };
    },

    async controlQueue(name: string, action: "pause" | "resume") {
      const queue = queues.get(name);
      if (!queue) throw new Error(`Queue ${name} not found`);
      if (action === "pause") await queue.pause();
      else await queue.resume();
    },
  };
}
