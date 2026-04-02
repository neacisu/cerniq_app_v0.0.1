/**
 * lib/mcp-server.ts — Registrul central MCP (Model Context Protocol) pentru E3 AI Sales.
 *
 * Definește:
 *   - MCP Resources: product://{sku}, client://{cif}, conversation://{lead_id},
 *                    catalog://category/{cat}
 *   - MCP Tools: search_products, check_realtime_stock, calculate_discount,
 *                create_proforma, convert_to_invoice, send_einvoice
 *   - Session constants: TTL 30min, Redis prefix-uri
 *   - Tool call logging în ai_tool_calls (audit complet)
 *   - Resource URI parser
 *
 * Folosit de: L66 mcp:resource:load, L67 mcp:tool:register,
 *             L68 mcp:session:manage, L69 mcp:health:check, L70 mcp:metrics:collect,
 *             C14 ai:agent:orchestrate (allowedTools).
 *
 * ANTI-HALUCINARE: Resources + Tools EXACT din plan L1813-1817 / L8509-8517.
 * ZERO inventii extra.
 * FAZA 7m — Plan L1906-1910.
 */
import { randomUUID } from "node:crypto";
import { db, aiToolCalls } from "@cerniq/db";

// ── MCP Resources ─────────────────────────────────────────────────────────────

/**
 * Tipuri resource URI MCP (exact din plan L8509-8512).
 * URI scheme: <type>://<id>
 */
export const MCP_RESOURCE_TYPES = ["product", "client", "conversation", "catalog"] as const;
export type McpResourceType = (typeof MCP_RESOURCE_TYPES)[number];

export interface ParsedResourceUri {
  type: McpResourceType;
  /** SKU pentru product, CIF pentru client, lead_id pentru conversation, categorie pentru catalog */
  id: string;
}

/**
 * Parsează un resource URI MCP.
 * Formate valide:
 *   product://{sku}
 *   client://{cif}
 *   conversation://{lead_id}
 *   catalog://category/{cat}
 */
export function parseResourceUri(uri: string): ParsedResourceUri | null {
  // catalog://category/{cat}
  const catalogMatch = /^catalog:\/\/category\/(.+)$/.exec(uri);
  if (catalogMatch?.[1]) return { type: "catalog", id: catalogMatch[1] };

  // product://{sku}, client://{cif}, conversation://{lead_id}
  const genericMatch = /^(product|client|conversation):\/\/(.+)$/.exec(uri);
  if (!genericMatch?.[1] || !genericMatch[2]) return null;

  const type = genericMatch[1] as McpResourceType;
  return { type, id: genericMatch[2] };
}

/**
 * Construiește un resource URI MCP din tip + id.
 */
export function buildResourceUri(type: McpResourceType, id: string): string {
  if (type === "catalog") return `catalog://category/${id}`;
  return `${type}://${id}`;
}

// ── MCP Tools ─────────────────────────────────────────────────────────────────

/**
 * Lista completă de MCP tools (exact din plan L8509 / plan L1813-1817).
 * ZERO inventii — exact 6 tools.
 */
export const MCP_TOOLS = [
  "search_products",
  "check_realtime_stock",
  "calculate_discount",
  "create_proforma",
  "convert_to_invoice",
  "send_einvoice",
] as const;

export type McpToolName = (typeof MCP_TOOLS)[number];

/** Set pentru lookup O(1). */
export const MCP_TOOLS_SET: ReadonlySet<string> = new Set(MCP_TOOLS);

/**
 * Verifică dacă un string este un MCP tool name valid.
 */
export function isMcpToolName(name: string): name is McpToolName {
  return MCP_TOOLS_SET.has(name);
}

// ── MCP Session constants ─────────────────────────────────────────────────────

/** TTL sesiune MCP: 30 minute (plan L1725 + L8409). */
export const MCP_SESSION_TTL_MS = 30 * 60 * 1000; // 1_800_000 ms
export const MCP_SESSION_TTL_S = 30 * 60; // 1800 s

/**
 * Generează un ID unic pentru o sesiune MCP.
 * Format: "mcp-{uuid}" pentru a fi ușor de identificat în logs.
 */
export function generateMcpSessionId(): string {
  return `mcp-${randomUUID()}`;
}

/**
 * Calculează timestamp expirare sesiune MCP (now + 30min).
 */
export function getMcpSessionExpiry(): Date {
  return new Date(Date.now() + MCP_SESSION_TTL_MS);
}

/**
 * Verifică dacă o sesiune MCP este încă activă.
 * @param expiresAt — timestamp expirare din DB
 * @param now — opțional, injectabil pentru testare
 */
export function isMcpSessionActive(expiresAt: Date | null | undefined, now = new Date()): boolean {
  if (!expiresAt) return false;
  return expiresAt > now;
}

// ── Redis cache constants ─────────────────────────────────────────────────────

/** Prefix Redis pentru cache-ul resource MCP. Key: {PREFIX}{type}:{tenantId}:{id} */
export const MCP_RESOURCE_CACHE_PREFIX = "e3:mcp:resource:";

/** TTL cache resource MCP: 5 minute (plan L66 mcp:resource:load). */
export const MCP_RESOURCE_CACHE_TTL_S = 300; // 5 min

/**
 * Construiește cheia Redis pentru caching resource MCP.
 */
export function buildResourceCacheKey(type: McpResourceType, tenantId: string, id: string): string {
  return `${MCP_RESOURCE_CACHE_PREFIX}${type}:${tenantId}:${id}`;
}

// ── Tool call logging ─────────────────────────────────────────────────────────

export interface LogToolCallParams {
  tenantId: string;
  conversationId: string;
  messageId?: string | null;
  toolName: string;
  input: unknown;
  output: unknown;
  durationMs: number;
  success: boolean;
}

/**
 * Loghează un tool call în `ai_tool_calls` pentru audit complet.
 * Folosit de C14 ai:agent:orchestrate după executarea fiecărui tool.
 * FAZA 7m — Plan L8415 (ai_tool_calls audit complet).
 */
export async function logToolCall(params: LogToolCallParams): Promise<string> {
  const [inserted] = await db
    .insert(aiToolCalls)
    .values({
      tenantId: params.tenantId,
      conversationId: params.conversationId,
      messageId: params.messageId ?? null,
      toolName: params.toolName,
      input: params.input as Record<string, unknown>,
      output: params.output as Record<string, unknown>,
      durationMs: params.durationMs,
      success: params.success,
    })
    .returning({ id: aiToolCalls.id });

  if (!inserted) throw new Error(`logToolCall: insert failed for tool=${params.toolName}`);
  return inserted.id;
}

// ── FSM state → tools mapping (cache) ────────────────────────────────────────

/**
 * Tip pentru o înregistrare din fsm_state_allowed_tools.
 */
export interface FsmAllowedTool {
  fsmType: string;
  state: string;
  toolName: string;
}

/**
 * Filtrează tool-urile MCP valide dintr-o listă de înregistrări FSM.
 * Returnează doar tool-urile care sunt în MCP_TOOLS_SET.
 */
export function filterMcpTools(tools: FsmAllowedTool[]): McpToolName[] {
  return tools.map((t) => t.toolName).filter((name): name is McpToolName => isMcpToolName(name));
}

// ── Health check helpers ──────────────────────────────────────────────────────

export interface McpHealthStatus {
  db: "ok" | "error";
  redis: "ok" | "error";
  activeSessions: number;
  toolsRegistered: number;
  resourceTypesAvailable: number;
  checkedAt: string;
}

/**
 * Construiește un status de health MCP cu valorile date.
 */
export function buildHealthStatus(params: {
  dbOk: boolean;
  redisOk: boolean;
  activeSessions: number;
}): McpHealthStatus {
  return {
    db: params.dbOk ? "ok" : "error",
    redis: params.redisOk ? "ok" : "error",
    activeSessions: params.activeSessions,
    toolsRegistered: MCP_TOOLS.length,
    resourceTypesAvailable: MCP_RESOURCE_TYPES.length,
    checkedAt: new Date().toISOString(),
  };
}
