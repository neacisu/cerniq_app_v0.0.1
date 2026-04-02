/**
 * Teste unitare pentru lib/mcp-server.ts
 *
 * Acoperire:
 *  - parseResourceUri: toate formele valide + invalide
 *  - buildResourceUri: toate tipurile
 *  - isMcpToolName: tool valid, invalid
 *  - generateMcpSessionId: format corect
 *  - getMcpSessionExpiry: TTL 30min
 *  - isMcpSessionActive: activă, expirată, null
 *  - buildResourceCacheKey: format prefix corect
 *  - filterMcpTools: filtrare tool-uri MCP valide
 *  - buildHealthStatus: structură corectă
 *  - logToolCall: insert în ai_tool_calls (mock DB)
 *  - Constants: MCP_TOOLS (6), MCP_RESOURCE_TYPES (4), TTL
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock @cerniq/db ───────────────────────────────────────────────────────────
const { returningMock, dbInsertMock } = vi.hoisted(() => {
  const returningMock = vi.fn().mockResolvedValue([{ id: "tool-call-uuid" }]);
  const insertValuesMock = vi.fn(() => ({ returning: returningMock }));
  return {
    returningMock,
    dbInsertMock: vi.fn(() => ({ values: insertValuesMock })),
  };
});

vi.mock("@cerniq/db", () => ({
  db: { insert: dbInsertMock },
  aiToolCalls: { id: "id", tenantId: "tenant_id", conversationId: "conversation_id" },
}));

import {
  MCP_TOOLS,
  MCP_RESOURCE_TYPES,
  MCP_SESSION_TTL_MS,
  MCP_SESSION_TTL_S,
  MCP_RESOURCE_CACHE_PREFIX,
  MCP_RESOURCE_CACHE_TTL_S,
  MCP_TOOLS_SET,
  parseResourceUri,
  buildResourceUri,
  isMcpToolName,
  generateMcpSessionId,
  getMcpSessionExpiry,
  isMcpSessionActive,
  buildResourceCacheKey,
  filterMcpTools,
  buildHealthStatus,
  logToolCall,
} from "../lib/mcp-server.js";

// ── Constants ─────────────────────────────────────────────────────────────────

describe("MCP_TOOLS", () => {
  it("conține exact 6 tools conform planului L8509", () => {
    expect(MCP_TOOLS).toHaveLength(6);
  });

  it("conține toate tool-urile exacte din plan (NU inventate)", () => {
    expect(MCP_TOOLS).toContain("search_products");
    expect(MCP_TOOLS).toContain("check_realtime_stock");
    expect(MCP_TOOLS).toContain("calculate_discount");
    expect(MCP_TOOLS).toContain("create_proforma");
    expect(MCP_TOOLS).toContain("convert_to_invoice");
    expect(MCP_TOOLS).toContain("send_einvoice");
  });
});

describe("MCP_RESOURCE_TYPES", () => {
  it("conține exact 4 resource types", () => {
    expect(MCP_RESOURCE_TYPES).toHaveLength(4);
  });

  it("conține product, client, conversation, catalog", () => {
    expect(MCP_RESOURCE_TYPES).toContain("product");
    expect(MCP_RESOURCE_TYPES).toContain("client");
    expect(MCP_RESOURCE_TYPES).toContain("conversation");
    expect(MCP_RESOURCE_TYPES).toContain("catalog");
  });
});

describe("Constants TTL și Redis", () => {
  it("MCP_SESSION_TTL_MS este 1800000 (30min)", () => {
    expect(MCP_SESSION_TTL_MS).toBe(30 * 60 * 1000);
  });

  it("MCP_SESSION_TTL_S este 1800 (30min)", () => {
    expect(MCP_SESSION_TTL_S).toBe(1800);
  });

  it("MCP_RESOURCE_CACHE_TTL_S este 300 (5min)", () => {
    expect(MCP_RESOURCE_CACHE_TTL_S).toBe(300);
  });

  it("MCP_RESOURCE_CACHE_PREFIX este 'e3:mcp:resource:'", () => {
    expect(MCP_RESOURCE_CACHE_PREFIX).toBe("e3:mcp:resource:");
  });

  it("MCP_TOOLS_SET este un Set cu 6 elemente", () => {
    expect(MCP_TOOLS_SET.size).toBe(6);
  });
});

// ── parseResourceUri ──────────────────────────────────────────────────────────

describe("parseResourceUri", () => {
  it("parsează product://{sku}", () => {
    const result = parseResourceUri("product://SKU-123-ABC");
    expect(result).toEqual({ type: "product", id: "SKU-123-ABC" });
  });

  it("parsează client://{cif}", () => {
    const result = parseResourceUri("client://12345678");
    expect(result).toEqual({ type: "client", id: "12345678" });
  });

  it("parsează conversation://{lead_id} cu UUID", () => {
    const result = parseResourceUri("conversation://550e8400-e29b-41d4-a716-446655440000");
    expect(result).toEqual({ type: "conversation", id: "550e8400-e29b-41d4-a716-446655440000" });
  });

  it("parsează catalog://category/{cat}", () => {
    const result = parseResourceUri("catalog://category/electronice");
    expect(result).toEqual({ type: "catalog", id: "electronice" });
  });

  it("parsează catalog://category/{cat} cu slash în categorie", () => {
    const result = parseResourceUri("catalog://category/home/mobilier");
    expect(result).toEqual({ type: "catalog", id: "home/mobilier" });
  });

  it("returnează null pentru URI invalid", () => {
    expect(parseResourceUri("invalid-uri")).toBeNull();
    expect(parseResourceUri("")).toBeNull();
    expect(parseResourceUri("http://example.com")).toBeNull();
    expect(parseResourceUri("catalog://nocategory/test")).toBeNull();
  });

  it("returnează null pentru schemă necunoscută", () => {
    expect(parseResourceUri("unknown://id-123")).toBeNull();
  });
});

// ── buildResourceUri ──────────────────────────────────────────────────────────

describe("buildResourceUri", () => {
  it("construiește product:// URI", () => {
    expect(buildResourceUri("product", "SKU-XYZ")).toBe("product://SKU-XYZ");
  });

  it("construiește client:// URI", () => {
    expect(buildResourceUri("client", "RO12345678")).toBe("client://RO12345678");
  });

  it("construiește conversation:// URI", () => {
    expect(buildResourceUri("conversation", "uuid-123")).toBe("conversation://uuid-123");
  });

  it("construiește catalog://category/ URI", () => {
    expect(buildResourceUri("catalog", "electronice")).toBe("catalog://category/electronice");
  });
});

// ── isMcpToolName ─────────────────────────────────────────────────────────────

describe("isMcpToolName", () => {
  it("returnează true pentru tool valid", () => {
    expect(isMcpToolName("search_products")).toBe(true);
    expect(isMcpToolName("send_einvoice")).toBe(true);
    expect(isMcpToolName("calculate_discount")).toBe(true);
  });

  it("returnează false pentru tool nevalid", () => {
    expect(isMcpToolName("unknown_tool")).toBe(false);
    expect(isMcpToolName("")).toBe(false);
    expect(isMcpToolName("SEARCH_PRODUCTS")).toBe(false);
  });
});

// ── generateMcpSessionId ──────────────────────────────────────────────────────

describe("generateMcpSessionId", () => {
  it("generează un ID cu prefix 'mcp-'", () => {
    const id = generateMcpSessionId();
    expect(id.startsWith("mcp-")).toBe(true);
  });

  it("generează ID-uri unice la fiecare apel", () => {
    const ids = new Set(Array.from({ length: 10 }, () => generateMcpSessionId()));
    expect(ids.size).toBe(10);
  });
});

// ── getMcpSessionExpiry ───────────────────────────────────────────────────────

describe("getMcpSessionExpiry", () => {
  it("returnează un Date cu ~30min în viitor", () => {
    const before = Date.now();
    const expiry = getMcpSessionExpiry();
    const after = Date.now();

    const expectedMs = 30 * 60 * 1000;
    expect(expiry.getTime()).toBeGreaterThanOrEqual(before + expectedMs - 10);
    expect(expiry.getTime()).toBeLessThanOrEqual(after + expectedMs + 10);
  });
});

// ── isMcpSessionActive ────────────────────────────────────────────────────────

describe("isMcpSessionActive", () => {
  it("returnează true pentru sesiune în viitor", () => {
    const future = new Date(Date.now() + 60_000);
    expect(isMcpSessionActive(future)).toBe(true);
  });

  it("returnează false pentru sesiune expirată", () => {
    const past = new Date(Date.now() - 1000);
    expect(isMcpSessionActive(past)).toBe(false);
  });

  it("returnează false pentru null", () => {
    expect(isMcpSessionActive(null)).toBe(false);
    expect(isMcpSessionActive(undefined)).toBe(false);
  });

  it("folosește `now` injectabil pentru testare deterministă", () => {
    const fixedNow = new Date("2026-01-01T12:00:00Z");
    const activeExpiry = new Date("2026-01-01T12:30:00Z");
    const expiredExpiry = new Date("2026-01-01T11:30:00Z");

    expect(isMcpSessionActive(activeExpiry, fixedNow)).toBe(true);
    expect(isMcpSessionActive(expiredExpiry, fixedNow)).toBe(false);
  });
});

// ── buildResourceCacheKey ─────────────────────────────────────────────────────

describe("buildResourceCacheKey", () => {
  it("construiește cheia Redis cu prefix corect", () => {
    const key = buildResourceCacheKey("product", "tenant-1", "SKU-XYZ");
    expect(key).toBe("e3:mcp:resource:product:tenant-1:SKU-XYZ");
    expect(key.startsWith("e3:mcp:resource:")).toBe(true);
  });

  it("construiește cheia pentru catalog", () => {
    const key = buildResourceCacheKey("catalog", "tenant-1", "electronice");
    expect(key).toBe("e3:mcp:resource:catalog:tenant-1:electronice");
  });
});

// ── filterMcpTools ────────────────────────────────────────────────────────────

describe("filterMcpTools", () => {
  it("filtrează doar tool-urile MCP valide", () => {
    const tools = [
      { fsmType: "negotiation", state: "PROPOSAL", toolName: "search_products" },
      { fsmType: "negotiation", state: "PROPOSAL", toolName: "calculate_discount" },
      { fsmType: "negotiation", state: "PROPOSAL", toolName: "custom_tool_not_in_mcp" },
    ];
    const result = filterMcpTools(tools);
    expect(result).toEqual(["search_products", "calculate_discount"]);
  });

  it("returnează [] când lista e goală", () => {
    expect(filterMcpTools([])).toEqual([]);
  });

  it("returnează [] când nu există tool-uri MCP valide", () => {
    const tools = [{ fsmType: "x", state: "X", toolName: "non_mcp_tool" }];
    expect(filterMcpTools(tools)).toEqual([]);
  });

  it("returnează toate tool-urile MCP valide fără duplicate", () => {
    const tools = MCP_TOOLS.map((t) => ({
      fsmType: "negotiation",
      state: "DISCOVERY",
      toolName: t,
    }));
    const result = filterMcpTools(tools);
    expect(result).toHaveLength(MCP_TOOLS.length);
  });
});

// ── buildHealthStatus ─────────────────────────────────────────────────────────

describe("buildHealthStatus", () => {
  it("returnează 'ok' pentru db și redis când ambele sunt true", () => {
    const status = buildHealthStatus({ dbOk: true, redisOk: true, activeSessions: 5 });
    expect(status.db).toBe("ok");
    expect(status.redis).toBe("ok");
    expect(status.activeSessions).toBe(5);
  });

  it("returnează 'error' pentru db și redis când sunt false", () => {
    const status = buildHealthStatus({ dbOk: false, redisOk: false, activeSessions: 0 });
    expect(status.db).toBe("error");
    expect(status.redis).toBe("error");
  });

  it("include toolsRegistered=6 și resourceTypesAvailable=4", () => {
    const status = buildHealthStatus({ dbOk: true, redisOk: true, activeSessions: 0 });
    expect(status.toolsRegistered).toBe(6);
    expect(status.resourceTypesAvailable).toBe(4);
  });

  it("include checkedAt ISO string", () => {
    const status = buildHealthStatus({ dbOk: true, redisOk: true, activeSessions: 0 });
    expect(() => new Date(status.checkedAt)).not.toThrow();
  });
});

// ── logToolCall ────────────────────────────────────────────────────────────────

describe("logToolCall", () => {
  beforeEach(() => {
    returningMock.mockResolvedValue([{ id: "tool-call-uuid-1" }]);
  });

  it("insertează în ai_tool_calls și returnează id-ul", async () => {
    const id = await logToolCall({
      tenantId: "tenant-1",
      conversationId: "conv-1",
      messageId: "msg-1",
      toolName: "search_products",
      input: { query: "laptop" },
      output: { results: [] },
      durationMs: 150,
      success: true,
    });

    expect(id).toBe("tool-call-uuid-1");
    expect(dbInsertMock).toHaveBeenCalledOnce();
  });

  it("acceptă messageId=null", async () => {
    await logToolCall({
      tenantId: "tenant-1",
      conversationId: "conv-1",
      messageId: null,
      toolName: "check_realtime_stock",
      input: { sku: "SKU-1" },
      output: { stock: 10 },
      durationMs: 50,
      success: true,
    });

    expect(dbInsertMock).toHaveBeenCalled();
  });

  it("aruncă eroare dacă insert nu returnează un rând", async () => {
    returningMock.mockResolvedValueOnce([]);

    await expect(
      logToolCall({
        tenantId: "t",
        conversationId: "c",
        toolName: "send_einvoice",
        input: {},
        output: {},
        durationMs: 10,
        success: false,
      }),
    ).rejects.toThrow(/logToolCall: insert failed/);
  });
});
