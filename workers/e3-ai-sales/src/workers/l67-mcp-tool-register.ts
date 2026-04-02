/**
 * L67 — mcp:tool:register (concurrency:5, timeout:30s)
 *
 * Înregistrează tool-urile MCP permise pentru o negociere în funcție de starea FSM curentă.
 * Validare via `fsm_state_allowed_tools` (e3.ts L518-530, plan L494-506).
 *
 * Logică:
 *  1. Citește `fsm_state_allowed_tools` pentru fsmType='negotiation' și state=currentState.
 *  2. Filtrează doar tool-urile MCP valide (MCP_TOOLS_SET).
 *  3. Stochează lista în Redis (cheie per negociere, TTL 30min sesiune MCP).
 *  4. Returnează lista de tool-uri permise.
 *
 * ANTI-HALUCINARE: tool-uri validate EXCLUSIV din fsm_state_allowed_tools DB.
 * NU se inventează tool-uri; dacă tabela e goală, returnează [] (fără fallback).
 *
 * FAZA 7m — Plan L1907.
 */
import type { Processor } from "bullmq";
import Redis from "ioredis";
import { db, setSessionTenantId, fsmStateAllowedTools, eq, and } from "@cerniq/db";
import { getRedisConnectionOptions } from "@cerniq/worker-shared";
import { filterMcpTools, MCP_SESSION_TTL_S, type McpToolName } from "../lib/mcp-server.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface McpToolRegisterJobData {
  tenantId: string;
  negotiationId: string;
  /** Starea FSM curentă a negocierii, e.g. "DISCOVERY", "PROPOSAL". */
  currentState: string;
  /** ID sesiune MCP activă (din L68). Null = înregistrare fără sesiune. */
  mcpSessionId?: string | null;
}

export interface McpToolRegisterResult {
  ok: boolean;
  negotiationId: string;
  currentState: string;
  allowedTools: McpToolName[];
  toolCount: number;
}

// ── Redis constants ───────────────────────────────────────────────────────────

const TOOLS_CACHE_PREFIX = "e3:mcp:tools:";

/** Cheie Redis: e3:mcp:tools:{negotiationId} */
function buildToolsCacheKey(negotiationId: string): string {
  return `${TOOLS_CACHE_PREFIX}${negotiationId}`;
}

// ── Redis — lazy singleton ────────────────────────────────────────────────────

let _redis: Redis | null = null;

function getRedis(): Redis {
  _redis ??= new Redis(getRedisConnectionOptions());
  return _redis;
}

// ── Processor ─────────────────────────────────────────────────────────────────

export const mcpToolRegisterProcessor: Processor<
  McpToolRegisterJobData,
  McpToolRegisterResult
> = async (job) => {
  const { tenantId, negotiationId, currentState, mcpSessionId } = job.data;

  await setSessionTenantId(tenantId);

  // ── Citire din fsm_state_allowed_tools ─────────────────────────────────────
  const rows = await db
    .select({
      fsmType: fsmStateAllowedTools.fsmType,
      state: fsmStateAllowedTools.state,
      toolName: fsmStateAllowedTools.toolName,
    })
    .from(fsmStateAllowedTools)
    .where(
      and(
        eq(fsmStateAllowedTools.fsmType, "negotiation"),
        eq(fsmStateAllowedTools.state, currentState),
      ),
    )
    .limit(100);

  // ── Filtrare tool-uri MCP valide ────────────────────────────────────────────
  const allowedTools = filterMcpTools(rows);

  console.info(
    `[L67:mcp:tool:register] negotiationId=${negotiationId} state=${currentState} ` +
      `tools=[${allowedTools.join(", ")}]`,
  );

  // ── Stocare în Redis (TTL egal cu TTL sesiune MCP) ──────────────────────────
  const redis = getRedis();
  const cacheKey = buildToolsCacheKey(negotiationId);

  await redis.set(
    cacheKey,
    JSON.stringify({ allowedTools, currentState, mcpSessionId: mcpSessionId ?? null }),
    "EX",
    MCP_SESSION_TTL_S,
  );

  return {
    ok: true,
    negotiationId,
    currentState,
    allowedTools,
    toolCount: allowedTools.length,
  };
};
