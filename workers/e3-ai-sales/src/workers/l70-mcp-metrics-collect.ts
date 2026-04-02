/**
 * L70 — mcp:metrics:collect (CRON: "EVERY5MIN * * * *", concurrency:1)
 *
 * Colectează metrici despre tool calls MCP din `ai_tool_calls`:
 *  - tool_calls_total per tool_name + status (success/failure)
 *  - Emite ca log structurat pentru colectare Prometheus/OTel
 *
 * Metrica: cerniq_mcp_tool_calls_total Counter cu labels (tool_name, status)
 * Plan L8691: cerniq_mcp_tool_calls_total Counter — tool_name, status.
 *
 * Fereastra de agregare: ultimele 5 minute (aliniată cu frecvența CRON).
 * FAZA 7m — Plan L1910.
 */
import type { Processor } from "bullmq";
import { db, aiToolCalls, sql } from "@cerniq/db";
import { isMcpToolName } from "../lib/mcp-server.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type McpMetricsCollectJobData = Record<string, never>;

export interface ToolCallStat {
  toolName: string;
  status: "success" | "failure";
  count: number;
}

export interface McpMetricsCollectResult {
  ok: boolean;
  windowMinutes: number;
  stats: ToolCallStat[];
  totalCalls: number;
  mcpToolsOnly: number;
  collectedAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Fereastră de colectare: 5 minute (aliniată cu CRON EVERY5MIN). */
const WINDOW_MINUTES = 5;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Emite metrica cerniq_mcp_tool_calls_total ca log structurat.
 * Format: METRIC cerniq_mcp_tool_calls_total {count} {labels_json}
 */
function emitToolCallsMetric(toolName: string, status: "success" | "failure", count: number): void {
  console.info(
    `METRIC cerniq_mcp_tool_calls_total ${count} ` +
      `${JSON.stringify({ tool_name: toolName, status })}`,
  );
}

// ── Processor ─────────────────────────────────────────────────────────────────

export const mcpMetricsCollectProcessor: Processor<
  McpMetricsCollectJobData,
  McpMetricsCollectResult
> = async (_job) => {
  const collectedAt = new Date().toISOString();

  // ── Agregare din ai_tool_calls: ultimele WINDOW_MINUTES minute ──────────────
  const rows = await db
    .select({
      toolName: aiToolCalls.toolName,
      success: aiToolCalls.success,
      count: sql<string>`count(*)`,
    })
    .from(aiToolCalls)
    .where(
      sql`${aiToolCalls.createdAt} > now() - interval '${sql.raw(String(WINDOW_MINUTES))} minutes'`,
    )
    .groupBy(aiToolCalls.toolName, aiToolCalls.success)
    .limit(1000);

  // ── Construim statistici ────────────────────────────────────────────────────
  const stats: ToolCallStat[] = [];
  let totalCalls = 0;
  let mcpToolsOnly = 0;

  for (const row of rows) {
    const toolName = row.toolName ?? "unknown";
    const status: "success" | "failure" = row.success ? "success" : "failure";
    const count = Number(row.count);

    stats.push({ toolName, status, count });
    totalCalls += count;

    if (isMcpToolName(toolName)) {
      mcpToolsOnly += count;
      emitToolCallsMetric(toolName, status, count);
    }
  }

  console.info(
    `[L70:mcp:metrics:collect] window=${WINDOW_MINUTES}min ` +
      `totalCalls=${totalCalls} mcpTools=${mcpToolsOnly} uniqueTools=${stats.length}`,
  );

  return {
    ok: true,
    windowMinutes: WINDOW_MINUTES,
    stats,
    totalCalls,
    mcpToolsOnly,
    collectedAt,
  };
};
