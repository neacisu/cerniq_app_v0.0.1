import IORedis from "ioredis";

export type RedisConnections = {
  worker: IORedis;
  producer: IORedis;
};

function getRequiredEnv(name: "REDIS_URL"): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getRedisUrl(): URL {
  return new URL(getRequiredEnv("REDIS_URL"));
}

export function getQueuePrefix(): string {
  const prefix = process.env.BULLMQ_PREFIX?.trim() || process.env.REDIS_PREFIX?.trim();
  if (!prefix) {
    throw new Error("Missing required environment variable: BULLMQ_PREFIX or REDIS_PREFIX");
  }
  return prefix;
}

export function getRedisConnectionOptions(opts?: { db?: number }) {
  const url = getRedisUrl();
  const dbFromUrl = url.pathname && url.pathname !== "/" ? Number(url.pathname.slice(1)) || 0 : 0;
  const dbFromEnv = process.env.REDIS_DB ? Number(process.env.REDIS_DB) : undefined;
  return {
    host: url.hostname,
    port: Number(url.port || "6379"),
    username: url.username || undefined,
    password: url.password || undefined,
    db: opts?.db ?? dbFromEnv ?? dbFromUrl,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

export function createRedisConnections(): RedisConnections {
  const options = getRedisConnectionOptions();
  return {
    worker: new IORedis(options),
    producer: new IORedis(options),
  };
}

export async function closeRedisConnections(connections: RedisConnections): Promise<void> {
  await Promise.all([connections.worker.quit(), connections.producer.quit()]);
}
