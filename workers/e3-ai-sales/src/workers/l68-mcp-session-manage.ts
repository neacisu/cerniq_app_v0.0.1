/**
 * L68 — mcp:session:manage (concurrency:10, timeout:30s)
 *
 * Gestionează ciclul de viață al sesiunii MCP pentru o negociere.
 *
 * Acțiuni:
 *  create — generează mcp_session_id nou, stochează pe gold_negotiations
 *            cu mcp_session_expires_at = now() + 30min.
 *  extend — prelungește mcp_session_expires_at cu încă 30min.
 *  expire — curăță mcp_session_id și mcp_session_expires_at (sesiune încheiată).
 *
 * Câmpuri DB: gold_negotiations.mcp_session_id, gold_negotiations.mcp_session_expires_at
 * Plan L8409: "mcp_session_id, mcp_session_expires_at (30min TTL)".
 *
 * FAZA 7m — Plan L1908.
 */
import type { Processor } from "bullmq";
import { db, setSessionTenantId, goldNegotiations, eq, and } from "@cerniq/db";
import {
  generateMcpSessionId,
  getMcpSessionExpiry,
  MCP_SESSION_TTL_MS,
} from "../lib/mcp-server.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type McpSessionAction = "create" | "extend" | "expire";

export interface McpSessionManageJobData {
  tenantId: string;
  negotiationId: string;
  action: McpSessionAction;
}

export interface McpSessionManageResult {
  ok: boolean;
  negotiationId: string;
  action: McpSessionAction;
  mcpSessionId: string | null;
  expiresAt: string | null;
}

// ── Action handlers ───────────────────────────────────────────────────────────

async function handleCreate(
  tenantId: string,
  negotiationId: string,
): Promise<McpSessionManageResult> {
  const mcpSessionId = generateMcpSessionId();
  const expiresAt = getMcpSessionExpiry();

  await db
    .update(goldNegotiations)
    .set({ mcpSessionId, mcpSessionExpiresAt: expiresAt })
    .where(and(eq(goldNegotiations.id, negotiationId), eq(goldNegotiations.tenantId, tenantId)));

  console.info(
    `[L68:mcp:session:manage] create negotiationId=${negotiationId} ` +
      `sessionId=${mcpSessionId} expiresAt=${expiresAt.toISOString()}`,
  );

  return {
    ok: true,
    negotiationId,
    action: "create",
    mcpSessionId,
    expiresAt: expiresAt.toISOString(),
  };
}

async function handleExtend(
  tenantId: string,
  negotiationId: string,
): Promise<McpSessionManageResult> {
  // Citim sesiunea curentă pentru a putea loga sessionId
  const rows = await db
    .select({ mcpSessionId: goldNegotiations.mcpSessionId })
    .from(goldNegotiations)
    .where(and(eq(goldNegotiations.id, negotiationId), eq(goldNegotiations.tenantId, tenantId)))
    .limit(1);

  const currentSessionId = rows[0]?.mcpSessionId ?? null;
  if (!currentSessionId) {
    console.warn(
      `[L68:mcp:session:manage] extend fără sesiune activă negotiationId=${negotiationId}`,
    );
  }

  const newExpiresAt = new Date(Date.now() + MCP_SESSION_TTL_MS);

  await db
    .update(goldNegotiations)
    .set({ mcpSessionExpiresAt: newExpiresAt })
    .where(and(eq(goldNegotiations.id, negotiationId), eq(goldNegotiations.tenantId, tenantId)));

  console.info(
    `[L68:mcp:session:manage] extend negotiationId=${negotiationId} ` +
      `newExpiresAt=${newExpiresAt.toISOString()}`,
  );

  return {
    ok: true,
    negotiationId,
    action: "extend",
    mcpSessionId: currentSessionId,
    expiresAt: newExpiresAt.toISOString(),
  };
}

async function handleExpire(
  tenantId: string,
  negotiationId: string,
): Promise<McpSessionManageResult> {
  // Citim sesiunea pentru log înainte de ștergere
  const rows = await db
    .select({ mcpSessionId: goldNegotiations.mcpSessionId })
    .from(goldNegotiations)
    .where(and(eq(goldNegotiations.id, negotiationId), eq(goldNegotiations.tenantId, tenantId)))
    .limit(1);

  const expiredSessionId = rows[0]?.mcpSessionId ?? null;

  await db
    .update(goldNegotiations)
    .set({ mcpSessionId: null, mcpSessionExpiresAt: null })
    .where(and(eq(goldNegotiations.id, negotiationId), eq(goldNegotiations.tenantId, tenantId)));

  console.info(
    `[L68:mcp:session:manage] expire negotiationId=${negotiationId} ` +
      `sessionId=${expiredSessionId ?? "none"}`,
  );

  return {
    ok: true,
    negotiationId,
    action: "expire",
    mcpSessionId: null,
    expiresAt: null,
  };
}

// ── Processor ─────────────────────────────────────────────────────────────────

export const mcpSessionManageProcessor: Processor<
  McpSessionManageJobData,
  McpSessionManageResult
> = async (job) => {
  const { tenantId, negotiationId, action } = job.data;

  await setSessionTenantId(tenantId);

  if (action === "create") return handleCreate(tenantId, negotiationId);
  if (action === "extend") return handleExtend(tenantId, negotiationId);
  if (action === "expire") return handleExpire(tenantId, negotiationId);

  throw new Error(`L68: acțiune necunoscută: ${String(action)}. Valid: create|extend|expire`);
};
