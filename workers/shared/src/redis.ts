import IORedis from "ioredis";
import { createServiceLogger } from "@cerniq/observability";

const redisConnLog = createServiceLogger("worker-shared-redis");

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

function parseSentinelHosts(): { host: string; port: number }[] {
  const raw = process.env.REDIS_SENTINEL_HOSTS?.trim();
  if (!raw) return [];
  return raw.split(",").map((part) => {
    const chunk = part.trim();
    const colon = chunk.lastIndexOf(":");
    if (colon <= 0) return { host: chunk, port: 26379 };
    const host = chunk.slice(0, colon);
    const port = Number(chunk.slice(colon + 1)) || 26379;
    return { host, port };
  });
}

function redisPasswordFromEnvOrUrl(url: URL | null): string | undefined {
  const fromEnv = process.env.REDIS_PASSWORD?.trim();
  if (fromEnv) return fromEnv;
  const p = url?.password;
  if (p) {
    try {
      return decodeURIComponent(p);
    } catch {
      return p;
    }
  }
  return undefined;
}

function redisUsernameFromEnvOrUrl(url: URL | null): string | undefined {
  const fromEnv = process.env.REDIS_USERNAME?.trim();
  if (fromEnv) return fromEnv;
  const u = url?.username;
  if (u) {
    try {
      return decodeURIComponent(u);
    } catch {
      return u;
    }
  }
  return undefined;
}

/**
 * Prefix canonic pentru cheile BullMQ în Redis.
 * Folosiți exclusiv `BULLMQ_PREFIX` (ex. `cerniq` sau `cerniq:`); `REDIS_PREFIX` rămâne pentru alte
 * namespac-uri (ex. rate-limit în API), nu pentru cozi BullMQ.
 */
export function getQueuePrefix(): string {
  const raw = process.env.BULLMQ_PREFIX?.trim();
  if (!raw) {
    throw new Error(
      "Missing required environment variable: BULLMQ_PREFIX (BullMQ key namespace, e.g. cerniq). REDIS_PREFIX is not used for BullMQ.",
    );
  }
  return raw.replaceAll(/:+$/g, "");
}

export function getRedisConnectionOptions(opts?: { db?: number }) {
  const sentinels = parseSentinelHosts();
  const dbFromEnv = process.env.REDIS_DB ? Number(process.env.REDIS_DB) : undefined;

  if (sentinels.length > 0) {
    let url: URL | null = null;
    try {
      const rawUrl = process.env.REDIS_URL?.trim();
      if (rawUrl) url = new URL(rawUrl);
    } catch {
      url = null;
    }
    const name = process.env.REDIS_SENTINEL_NAME?.trim() || "cerniq-master";
    const pathname = url?.pathname;
    const dbFromUrl =
      pathname != null && pathname !== "" && pathname !== "/" ? Number(pathname.slice(1)) || 0 : 0;
    return {
      sentinels,
      name,
      username: redisUsernameFromEnvOrUrl(url) || undefined,
      password: redisPasswordFromEnvOrUrl(url),
      db: opts?.db ?? dbFromEnv ?? dbFromUrl,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
  }

  const url = getRedisUrl();
  const dbFromUrl = url.pathname && url.pathname !== "/" ? Number(url.pathname.slice(1)) || 0 : 0;
  return {
    host: url.hostname,
    port: Number(url.port || "6379"),
    username: redisUsernameFromEnvOrUrl(url) || undefined,
    password: redisPasswordFromEnvOrUrl(url),
    db: opts?.db ?? dbFromEnv ?? dbFromUrl,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

function attachRedisLifecycle(client: IORedis, role: "worker" | "producer"): void {
  client.on("connect", () => {
    redisConnLog.debug({ role }, "redis connect");
  });
  client.on("ready", () => {
    redisConnLog.debug({ role }, "redis ready");
  });
  client.on("error", (err: Error) => {
    redisConnLog.warn({ role, err }, "redis error");
  });
  client.on("close", () => {
    redisConnLog.debug({ role }, "redis close");
  });
  client.on("reconnecting", (delay: number) => {
    redisConnLog.debug({ role, delayMs: delay }, "redis reconnecting");
  });
}

export function createRedisConnections(): RedisConnections {
  const options = getRedisConnectionOptions();
  const worker = new IORedis(options);
  const producer = new IORedis(options);
  attachRedisLifecycle(worker, "worker");
  attachRedisLifecycle(producer, "producer");
  return { worker, producer };
}

export async function closeRedisConnections(connections: RedisConnections): Promise<void> {
  await Promise.all([connections.worker.quit(), connections.producer.quit()]);
}
