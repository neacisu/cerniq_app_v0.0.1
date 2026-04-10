import type { FastifyInstance } from "fastify";
import { healthCheckStatus, healthCheckLatency } from "../plugins/metrics.js";
import { envConfig } from "../config.js";

/** F8.34: evită setări inutile pe gauge la fiecare poll — doar la schimbare stare. */
let lastDatabaseHealthy: boolean | null = null;
let lastRedisHealthy: boolean | null = null;

let redisSingleton: import("ioredis").default | null = null;

async function getRedisClient(): Promise<import("ioredis").default> {
  if (redisSingleton) return redisSingleton;
  const Redis = (await import("ioredis")).default;
  redisSingleton = new Redis(envConfig.REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    lazyConnect: true,
  });
  return redisSingleton;
}

export async function resetHealthRedis() {
  if (!redisSingleton) return;
  try {
    await redisSingleton.quit();
  } catch {
    // Ignore disconnection errors and reset client reference.
  } finally {
    redisSingleton = null;
  }
}

async function checkDatabase(): Promise<{ status: string; latencyMs: number }> {
  const start = performance.now();
  try {
    const { db, sql } = await import("@cerniq/db");
    await db.execute(sql`SELECT 1`);
    const latencyMs = performance.now() - start;
    if (lastDatabaseHealthy !== true) {
      healthCheckStatus.set({ component: "database" }, 1);
      lastDatabaseHealthy = true;
    }
    healthCheckLatency.observe({ component: "database" }, latencyMs);
    return { status: "healthy", latencyMs: Math.round(latencyMs) };
  } catch {
    const latencyMs = performance.now() - start;
    if (lastDatabaseHealthy !== false) {
      healthCheckStatus.set({ component: "database" }, 0);
      lastDatabaseHealthy = false;
    }
    healthCheckLatency.observe({ component: "database" }, latencyMs);
    return { status: "unhealthy", latencyMs: Math.round(latencyMs) };
  }
}

async function checkRedis(): Promise<{ status: string; latencyMs: number }> {
  const start = performance.now();
  try {
    const redis = await getRedisClient();
    await redis.ping();
    const latencyMs = performance.now() - start;
    if (lastRedisHealthy !== true) {
      healthCheckStatus.set({ component: "redis" }, 1);
      lastRedisHealthy = true;
    }
    healthCheckLatency.observe({ component: "redis" }, latencyMs);
    return { status: "healthy", latencyMs: Math.round(latencyMs) };
  } catch {
    const latencyMs = performance.now() - start;
    if (lastRedisHealthy !== false) {
      healthCheckStatus.set({ component: "redis" }, 0);
      lastRedisHealthy = false;
    }
    healthCheckLatency.observe({ component: "redis" }, latencyMs);
    return { status: "unhealthy", latencyMs: Math.round(latencyMs) };
  }
}

export async function healthRoutes(app: FastifyInstance) {
  app.get("/live", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  app.get("/ready", async (_request, reply) => {
    const dbCheck = await checkDatabase();
    const redisCheck = await checkRedis();
    const allHealthy = dbCheck.status === "healthy" && redisCheck.status === "healthy";

    reply.status(allHealthy ? 200 : 503);
    return {
      status: allHealthy ? "ready" : "not_ready",
      checks: { database: dbCheck, redis: redisCheck },
      timestamp: new Date().toISOString(),
    };
  });

  app.get("/deps", async () => {
    const dbCheck = await checkDatabase();
    const redisCheck = await checkRedis();

    return {
      status: "ok",
      dependencies: { database: dbCheck, redis: redisCheck },
      timestamp: new Date().toISOString(),
    };
  });
}
