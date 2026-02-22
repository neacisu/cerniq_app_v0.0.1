import type { FastifyInstance } from "fastify";
import { healthCheckStatus, healthCheckLatency } from "../plugins/metrics.js";

async function checkDatabase(): Promise<{ status: string; latencyMs: number }> {
  const start = performance.now();
  try {
    const { db, sql } = await import("@cerniq/db");
    await db.execute(sql`SELECT 1`);
    const latencyMs = performance.now() - start;
    healthCheckStatus.set({ component: "database" }, 1);
    healthCheckLatency.observe({ component: "database" }, latencyMs);
    return { status: "healthy", latencyMs: Math.round(latencyMs) };
  } catch {
    const latencyMs = performance.now() - start;
    healthCheckStatus.set({ component: "database" }, 0);
    healthCheckLatency.observe({ component: "database" }, latencyMs);
    return { status: "unhealthy", latencyMs: Math.round(latencyMs) };
  }
}

async function checkRedis(): Promise<{ status: string; latencyMs: number }> {
  const start = performance.now();
  try {
    const Redis = (await import("ioredis")).default;
    const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
    });
    await redis.ping();
    await redis.quit();
    const latencyMs = performance.now() - start;
    healthCheckStatus.set({ component: "redis" }, 1);
    healthCheckLatency.observe({ component: "redis" }, latencyMs);
    return { status: "healthy", latencyMs: Math.round(latencyMs) };
  } catch {
    const latencyMs = performance.now() - start;
    healthCheckStatus.set({ component: "redis" }, 0);
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
    const allHealthy =
      dbCheck.status === "healthy" && redisCheck.status === "healthy";

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
