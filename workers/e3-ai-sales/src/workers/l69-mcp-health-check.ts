/**
 * L69 — mcp:health:check (CRON: "* * * * *", concurrency:1)
 *
 * Health check periodic pentru infrastructura MCP:
 *  - Conectivitate DB (SELECT count sesiuni active)
 *  - Conectivitate Redis (PING)
 *  - Număr sesiuni MCP active (mcp_session_expires_at > now())
 *  - Metrica Prometheus: cerniq_mcp_session_active (Gauge, label: tenant aggregat)
 *
 * Rulează la fiecare minut (CRON: "* * * * *").
 * Nu necesită date de input — procesare sistem-wide.
 *
 * Plan L8692: cerniq_mcp_session_active Gauge cu label tenant_id.
 * FAZA 7m — Plan L1909.
 */
import type { Processor } from "bullmq";
import Redis from "ioredis";
import { db, goldNegotiations, sql } from "@cerniq/db";
import { getRedisConnectionOptions } from "@cerniq/worker-shared";
import { MCP_TOOLS, MCP_RESOURCE_TYPES, buildHealthStatus } from "../lib/mcp-server.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type McpHealthCheckJobData = Record<string, never>;

export interface McpHealthCheckResult {
  ok: boolean;
  db: "ok" | "error";
  redis: "ok" | "error";
  activeSessions: number;
  toolsRegistered: number;
  resourceTypesAvailable: number;
  checkedAt: string;
  errors?: string[];
}

// ── Redis — lazy singleton ────────────────────────────────────────────────────

let _redis: Redis | null = null;

function getRedis(): Redis {
  _redis ??= new Redis(getRedisConnectionOptions());
  return _redis;
}

// ── Health checks ─────────────────────────────────────────────────────────────

async function checkDb(): Promise<{ ok: boolean; activeSessions: number }> {
  const rows = await db
    .select({ count: sql<string>`count(*)` })
    .from(goldNegotiations)
    .where(sql`${goldNegotiations.mcpSessionExpiresAt} > now()`)
    .limit(1);

  const activeSessions = Number(rows[0]?.count ?? 0);
  return { ok: true, activeSessions };
}

async function checkRedis(redis: Redis): Promise<boolean> {
  const pong = await redis.ping();
  return pong === "PONG";
}

// ── Prometheus metric log ─────────────────────────────────────────────────────

/**
 * Emite metrica cerniq_mcp_session_active ca log structurat (pentru colectare OTel/Prometheus).
 * Format: METRIC cerniq_mcp_session_active {value} {labels_json}
 */
function emitActiveSessionsMetric(count: number): void {
  console.info(
    `METRIC cerniq_mcp_session_active ${count} ${JSON.stringify({ aggregated: "true" })}`,
  );
}

// ── Processor ─────────────────────────────────────────────────────────────────

export const mcpHealthCheckProcessor: Processor<
  McpHealthCheckJobData,
  McpHealthCheckResult
> = async (_job) => {
  const errors: string[] = [];

  let dbOk = false;
  let activeSessions = 0;
  let redisOk = false;

  // ── DB check ────────────────────────────────────────────────────────────────
  try {
    const dbResult = await checkDb();
    dbOk = dbResult.ok;
    activeSessions = dbResult.activeSessions;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`db: ${msg}`);
    console.error(`[L69:mcp:health:check] DB error: ${msg}`);
  }

  // ── Redis check ─────────────────────────────────────────────────────────────
  try {
    redisOk = await checkRedis(getRedis());
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`redis: ${msg}`);
    console.error(`[L69:mcp:health:check] Redis error: ${msg}`);
  }

  // ── Emit metrica ─────────────────────────────────────────────────────────────
  emitActiveSessionsMetric(activeSessions);

  const status = buildHealthStatus({ dbOk, redisOk, activeSessions });

  console.info(
    `[L69:mcp:health:check] db=${status.db} redis=${status.redis} ` +
      `activeSessions=${activeSessions} tools=${MCP_TOOLS.length} ` +
      `resourceTypes=${MCP_RESOURCE_TYPES.length}`,
  );

  return {
    ok: dbOk && redisOk,
    ...status,
    ...(errors.length > 0 ? { errors } : {}),
  };
};
