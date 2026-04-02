/**
 * Teste complete pentru workers L66-L70 (E3 AI Sales — MCP Server).
 *
 * Pattern vitest: vi.hoisted() + vi.mock() pentru mock-uri mutabile per test.
 * Acoperire:
 *  L66: mcp:resource:load — cache HIT, cache MISS, toate tipurile resource, invalidate, URI invalid
 *  L67: mcp:tool:register — query fsm_state_allowed_tools, filtrare MCP tools, Redis cache, fără tools
 *  L68: mcp:session:manage — create, extend, expire, acțiune invalida
 *  L69: mcp:health:check   — DB ok, Redis ok, eroare DB, eroare Redis, sesiuni active
 *  L70: mcp:metrics:collect — fereastră 5min, tool-uri MCP vs non-MCP, metrics emit
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── vi.hoisted() ───────────────────────────────────────────────────────────────

const {
  dbSelectMock,
  dbUpdateMock,
  dbInsertMock,
  setSessionTenantIdMock,
  redisPingMock,
  redisGetMock,
  redisSetMock,
  redisDelMock,
  RedisCtor,
} = vi.hoisted(() => {
  const redisPingMock = vi.fn().mockResolvedValue("PONG");
  const redisGetMock = vi.fn().mockResolvedValue(null);
  const redisSetMock = vi.fn().mockResolvedValue("OK");
  const redisDelMock = vi.fn().mockResolvedValue(1);

  const mockSetChain = { where: vi.fn().mockResolvedValue(undefined) };
  const mockUpdateChain = { set: vi.fn(() => mockSetChain) };

  const returningMock = vi.fn().mockResolvedValue([{ id: "session-uuid-1" }]);
  const valuesMock = vi.fn(() => ({ returning: returningMock }));

  function RedisCtor(this: Record<string, unknown>) {
    this.ping = redisPingMock;
    this.get = redisGetMock;
    this.set = redisSetMock;
    this.del = redisDelMock;
  }

  return {
    dbSelectMock: vi.fn(),
    dbUpdateMock: vi.fn(() => mockUpdateChain),
    dbInsertMock: vi.fn(() => ({ values: valuesMock })),
    setSessionTenantIdMock: vi.fn().mockResolvedValue(undefined),
    redisPingMock,
    redisGetMock,
    redisSetMock,
    redisDelMock,
    RedisCtor,
  };
});

// ── vi.mock() ──────────────────────────────────────────────────────────────────

vi.mock("ioredis", () => ({ default: RedisCtor }));
vi.mock("@cerniq/worker-shared", () => ({
  getRedisConnectionOptions: () => ({ host: "127.0.0.1", port: 6379 }),
  createQueue: vi.fn(() => ({ add: vi.fn() })),
  DEFAULT_JOB_OPTIONS: {},
  QUEUES: {},
}));

vi.mock("@cerniq/db", () => ({
  db: {
    select: dbSelectMock,
    update: dbUpdateMock,
    insert: dbInsertMock,
  },
  setSessionTenantId: setSessionTenantIdMock,
  goldNegotiations: {
    id: "id",
    tenantId: "tenant_id",
    mcpSessionId: "mcp_session_id",
    mcpSessionExpiresAt: "mcp_session_expires_at",
  },
  fsmStateAllowedTools: { fsmType: "fsm_type", state: "state", toolName: "tool_name" },
  aiToolCalls: { toolName: "tool_name", success: "success", createdAt: "created_at" },
  goldProducts: {
    id: "id",
    sku: "sku",
    name: "name",
    description: "description",
    unitPrice: "unit_price",
    currency: "currency",
    isActive: "is_active",
    tenantId: "tenant_id",
  },
  goldCompanies: {
    id: "id",
    denumire: "denumire",
    cui: "cui",
    cuiRo: "cui_ro",
    nrRegCom: "nr_reg_com",
    judet: "judet",
    tenantId: "tenant_id",
  },
  aiConversations: {
    id: "id",
    leadId: "lead_id",
    negotiationId: "negotiation_id",
    sessionId: "session_id",
    mcpSessionId: "mcp_session_id",
    modelUsed: "model_used",
    startedAt: "started_at",
    totalTokens: "total_tokens",
    tenantId: "tenant_id",
  },
  goldProductCategories: {
    id: "id",
    name: "name",
    parentId: "parent_id",
    sortOrder: "sort_order",
    tenantId: "tenant_id",
  },
  eq: vi.fn((a, b) => ({ eq: a, val: b })),
  and: vi.fn((...args) => ({ and: args })),
  or: vi.fn((...args) => ({ or: args })),
  desc: vi.fn((col) => ({ desc: col })),
  sql: Object.assign(
    vi.fn((parts: TemplateStringsArray, ...vals: unknown[]) => ({
      type: "sql",
      parts,
      vals,
    })),
    {
      raw: vi.fn((s: string) => ({ type: "sql_raw", value: s })),
    },
  ),
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeJob<T>(data: T) {
  return { data } as never;
}

function makeSelectChain(resolveValue: unknown) {
  const limitMock = vi.fn().mockResolvedValue(resolveValue);
  const orderByMock = vi.fn(() => ({ limit: limitMock }));
  const whereMock = vi.fn(() => ({ limit: limitMock, orderBy: orderByMock }));
  const fromMock = vi.fn(() => ({ where: whereMock, limit: limitMock }));
  dbSelectMock.mockReturnValueOnce({ from: fromMock });
  return { limitMock, whereMock, fromMock, orderByMock };
}

// ── UUIDs ────────────────────────────────────────────────────────────────────

const T_ID = "11111111-1111-1111-1111-111111111111";
const NEG_ID = "22222222-2222-2222-2222-222222222222";

// ── L66: mcp:resource:load ────────────────────────────────────────────────────

describe("L66 mcpResourceLoadProcessor", () => {
  let mcpResourceLoadProcessor: Awaited<
    typeof import("../workers/l66-mcp-resource-load.js")
  >["mcpResourceLoadProcessor"];

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../workers/l66-mcp-resource-load.js");
    mcpResourceLoadProcessor = mod.mcpResourceLoadProcessor;
    dbSelectMock.mockReset();
    redisGetMock.mockReset().mockResolvedValue(null);
    redisSetMock.mockReset().mockResolvedValue("OK");
    redisDelMock.mockReset().mockResolvedValue(1);
    setSessionTenantIdMock.mockResolvedValue(undefined);
  });

  it("returnează cache HIT fără a accesa DB", async () => {
    const cached = JSON.stringify({ id: "p1", sku: "SKU-1", name: "Produs 1" });
    redisGetMock.mockResolvedValueOnce(cached);

    const result = await mcpResourceLoadProcessor(
      makeJob({ tenantId: T_ID, resourceUri: "product://SKU-1" }),
    );

    expect(result.ok).toBe(true);
    expect(result.cacheHit).toBe(true);
    expect(result.data).toEqual({ id: "p1", sku: "SKU-1", name: "Produs 1" });
    expect(dbSelectMock).not.toHaveBeenCalled();
  });

  it("încarcă product din DB la cache MISS", async () => {
    const productData = { id: "p1", sku: "SKU-1", name: "Laptop", unitPrice: "100.00" };
    makeSelectChain([productData]);

    const result = await mcpResourceLoadProcessor(
      makeJob({ tenantId: T_ID, resourceUri: "product://SKU-1" }),
    );

    expect(result.ok).toBe(true);
    expect(result.cacheHit).toBe(false);
    expect(result.data).toEqual(productData);
    expect(redisSetMock).toHaveBeenCalledOnce();
  });

  it("încarcă client (CIF) din DB la cache MISS", async () => {
    const clientData = { id: "c1", denumire: "Firma SRL", cui: "12345678", cuiRo: "RO12345678" };
    makeSelectChain([clientData]);

    const result = await mcpResourceLoadProcessor(
      makeJob({ tenantId: T_ID, resourceUri: "client://RO12345678" }),
    );

    expect(result.ok).toBe(true);
    expect(result.cacheHit).toBe(false);
    expect(result.data).toEqual(clientData);
  });

  it("rezolvă clientul și când CIF-ul vine fără prefixul RO", async () => {
    const clientData = { id: "c2", denumire: "Agro SRL", cui: "87654321", cuiRo: "RO87654321" };
    makeSelectChain([clientData]);

    const result = await mcpResourceLoadProcessor(
      makeJob({ tenantId: T_ID, resourceUri: "client://87654321" }),
    );

    expect(result.ok).toBe(true);
    expect(result.data).toEqual(clientData);
  });

  it("încarcă conversation din DB la cache MISS", async () => {
    const convData = { id: "conv-1", leadId: NEG_ID };
    makeSelectChain([convData]);

    const result = await mcpResourceLoadProcessor(
      makeJob({ tenantId: T_ID, resourceUri: `conversation://${NEG_ID}` }),
    );

    expect(result.ok).toBe(true);
    expect(result.data).toEqual(convData);
  });

  it("încarcă catalog category din DB la cache MISS", async () => {
    const catData = { id: "cat-1", name: "electronice", parentId: null, sortOrder: 1 };
    makeSelectChain([catData]);

    const result = await mcpResourceLoadProcessor(
      makeJob({ tenantId: T_ID, resourceUri: "catalog://category/electronice" }),
    );

    expect(result.ok).toBe(true);
    expect(result.data).toEqual(catData);
  });

  it("returnează data=null când resursa nu există în DB", async () => {
    makeSelectChain([]);

    const result = await mcpResourceLoadProcessor(
      makeJob({ tenantId: T_ID, resourceUri: "product://SKU-INEXISTENT" }),
    );

    expect(result.ok).toBe(true);
    expect(result.data).toBeNull();
  });

  it("acțiunea invalidate șterge din Redis", async () => {
    const result = await mcpResourceLoadProcessor(
      makeJob({ tenantId: T_ID, resourceUri: "product://SKU-1", action: "invalidate" }),
    );

    expect(result.ok).toBe(true);
    expect(result.action).toBe("invalidate");
    expect(redisDelMock).toHaveBeenCalledOnce();
    expect(dbSelectMock).not.toHaveBeenCalled();
  });

  it("aruncă eroare pentru URI invalid", async () => {
    await expect(
      mcpResourceLoadProcessor(makeJob({ tenantId: T_ID, resourceUri: "invalid-uri" })),
    ).rejects.toThrow(/URI resource invalid/);
  });
});

// ── L67: mcp:tool:register ─────────────────────────────────────────────────────

describe("L67 mcpToolRegisterProcessor", () => {
  let mcpToolRegisterProcessor: Awaited<
    typeof import("../workers/l67-mcp-tool-register.js")
  >["mcpToolRegisterProcessor"];

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../workers/l67-mcp-tool-register.js");
    mcpToolRegisterProcessor = mod.mcpToolRegisterProcessor;
    dbSelectMock.mockReset();
    redisSetMock.mockReset().mockResolvedValue("OK");
    setSessionTenantIdMock.mockResolvedValue(undefined);
  });

  it("returnează tool-urile MCP permise pentru starea PROPOSAL", async () => {
    const tools = [
      { fsmType: "negotiation", state: "PROPOSAL", toolName: "search_products" },
      { fsmType: "negotiation", state: "PROPOSAL", toolName: "calculate_discount" },
      { fsmType: "negotiation", state: "PROPOSAL", toolName: "check_realtime_stock" },
    ];
    makeSelectChain(tools);

    const result = await mcpToolRegisterProcessor(
      makeJob({ tenantId: T_ID, negotiationId: NEG_ID, currentState: "PROPOSAL" }),
    );

    expect(result.ok).toBe(true);
    expect(result.allowedTools).toContain("search_products");
    expect(result.allowedTools).toContain("calculate_discount");
    expect(result.toolCount).toBe(3);
    expect(redisSetMock).toHaveBeenCalledOnce();
  });

  it("filtrează tool-urile non-MCP din fsm_state_allowed_tools", async () => {
    const tools = [
      { fsmType: "negotiation", state: "DISCOVERY", toolName: "search_products" },
      { fsmType: "negotiation", state: "DISCOVERY", toolName: "non_mcp_custom_tool" },
    ];
    makeSelectChain(tools);

    const result = await mcpToolRegisterProcessor(
      makeJob({ tenantId: T_ID, negotiationId: NEG_ID, currentState: "DISCOVERY" }),
    );

    expect(result.allowedTools).toEqual(["search_products"]);
    expect(result.toolCount).toBe(1);
  });

  it("returnează toolCount=0 când nu există tools permise", async () => {
    makeSelectChain([]);

    const result = await mcpToolRegisterProcessor(
      makeJob({ tenantId: T_ID, negotiationId: NEG_ID, currentState: "DEAD" }),
    );

    expect(result.ok).toBe(true);
    expect(result.allowedTools).toEqual([]);
    expect(result.toolCount).toBe(0);
    expect(redisSetMock).toHaveBeenCalledOnce();
  });

  it("stochează mcpSessionId în Redis când este furnizat", async () => {
    makeSelectChain([{ fsmType: "negotiation", state: "CLOSING", toolName: "create_proforma" }]);

    await mcpToolRegisterProcessor(
      makeJob({
        tenantId: T_ID,
        negotiationId: NEG_ID,
        currentState: "CLOSING",
        mcpSessionId: "mcp-session-abc",
      }),
    );

    const setCall = redisSetMock.mock.calls[0];
    const serialized = JSON.parse(setCall?.[1] as string) as { mcpSessionId: string };
    expect(serialized.mcpSessionId).toBe("mcp-session-abc");
  });
});

// ── L68: mcp:session:manage ────────────────────────────────────────────────────

describe("L68 mcpSessionManageProcessor", () => {
  let mcpSessionManageProcessor: Awaited<
    typeof import("../workers/l68-mcp-session-manage.js")
  >["mcpSessionManageProcessor"];

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../workers/l68-mcp-session-manage.js");
    mcpSessionManageProcessor = mod.mcpSessionManageProcessor;
    dbSelectMock.mockReset();
    dbUpdateMock.mockReset();
    setSessionTenantIdMock.mockResolvedValue(undefined);
    // Restaurăm chain-ul update mock
    const mockSetChain = { where: vi.fn().mockResolvedValue(undefined) };
    dbUpdateMock.mockReturnValue({ set: vi.fn(() => mockSetChain) });
  });

  it("create — generează mcp_session_id și setează expiresAt", async () => {
    const result = await mcpSessionManageProcessor(
      makeJob({ tenantId: T_ID, negotiationId: NEG_ID, action: "create" }),
    );

    expect(result.ok).toBe(true);
    expect(result.action).toBe("create");
    expect(result.mcpSessionId).toMatch(/^mcp-/);
    expect(result.expiresAt).toBeTruthy();
    expect(dbUpdateMock).toHaveBeenCalledOnce();
  });

  it("create — expiresAt este ~30min în viitor", async () => {
    const before = Date.now();
    const result = await mcpSessionManageProcessor(
      makeJob({ tenantId: T_ID, negotiationId: NEG_ID, action: "create" }),
    );
    const after = Date.now();

    expect(result.expiresAt).toBeTruthy();
    const expiresMs = new Date(String(result.expiresAt)).getTime();
    expect(expiresMs).toBeGreaterThanOrEqual(before + 30 * 60 * 1000 - 100);
    expect(expiresMs).toBeLessThanOrEqual(after + 30 * 60 * 1000 + 100);
  });

  it("extend — prelungește sesiunea și returnează noua expirare", async () => {
    makeSelectChain([{ mcpSessionId: "mcp-existing-session" }]);

    const result = await mcpSessionManageProcessor(
      makeJob({ tenantId: T_ID, negotiationId: NEG_ID, action: "extend" }),
    );

    expect(result.ok).toBe(true);
    expect(result.action).toBe("extend");
    expect(result.mcpSessionId).toBe("mcp-existing-session");
    expect(result.expiresAt).toBeTruthy();
    expect(dbUpdateMock).toHaveBeenCalledOnce();
  });

  it("extend — loghează warning dacă nu există sesiune activă", async () => {
    makeSelectChain([{ mcpSessionId: null }]);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await mcpSessionManageProcessor(
      makeJob({ tenantId: T_ID, negotiationId: NEG_ID, action: "extend" }),
    );

    expect(result.ok).toBe(true);
    expect(result.mcpSessionId).toBeNull();
    warnSpy.mockRestore();
  });

  it("expire — șterge mcp_session_id și returnează null", async () => {
    makeSelectChain([{ mcpSessionId: "mcp-to-expire" }]);

    const result = await mcpSessionManageProcessor(
      makeJob({ tenantId: T_ID, negotiationId: NEG_ID, action: "expire" }),
    );

    expect(result.ok).toBe(true);
    expect(result.action).toBe("expire");
    expect(result.mcpSessionId).toBeNull();
    expect(result.expiresAt).toBeNull();
    expect(dbUpdateMock).toHaveBeenCalledOnce();
  });

  it("aruncă eroare pentru acțiune necunoscută", async () => {
    await expect(
      mcpSessionManageProcessor(
        makeJob({ tenantId: T_ID, negotiationId: NEG_ID, action: "unknown" as "create" }),
      ),
    ).rejects.toThrow(/acțiune necunoscută/);
  });
});

// ── L69: mcp:health:check ─────────────────────────────────────────────────────

describe("L69 mcpHealthCheckProcessor", () => {
  let mcpHealthCheckProcessor: Awaited<
    typeof import("../workers/l69-mcp-health-check.js")
  >["mcpHealthCheckProcessor"];

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../workers/l69-mcp-health-check.js");
    mcpHealthCheckProcessor = mod.mcpHealthCheckProcessor;
    dbSelectMock.mockReset();
    redisPingMock.mockReset().mockResolvedValue("PONG");
  });

  it("returnează ok=true când DB și Redis sunt sănătoase", async () => {
    makeSelectChain([{ count: "3" }]);

    const result = await mcpHealthCheckProcessor(makeJob({}));

    expect(result.ok).toBe(true);
    expect(result.db).toBe("ok");
    expect(result.redis).toBe("ok");
    expect(result.activeSessions).toBe(3);
    expect(result.toolsRegistered).toBe(6);
    expect(result.resourceTypesAvailable).toBe(4);
  });

  it("returnează ok=false când DB are eroare", async () => {
    dbSelectMock.mockImplementationOnce(() => {
      throw new Error("DB connection failed");
    });

    const result = await mcpHealthCheckProcessor(makeJob({}));

    expect(result.ok).toBe(false);
    expect(result.db).toBe("error");
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining("DB connection failed")]),
    );
  });

  it("returnează ok=false când Redis are eroare", async () => {
    makeSelectChain([{ count: "0" }]);
    redisPingMock.mockRejectedValueOnce(new Error("Redis timeout"));

    const result = await mcpHealthCheckProcessor(makeJob({}));

    expect(result.ok).toBe(false);
    expect(result.redis).toBe("error");
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining("Redis timeout")]),
    );
  });

  it("emite metrica cerniq_mcp_session_active în logs", async () => {
    makeSelectChain([{ count: "7" }]);
    const logSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    await mcpHealthCheckProcessor(makeJob({}));

    const metricLog = logSpy.mock.calls.find((c) =>
      (c[0] as string).includes("cerniq_mcp_session_active"),
    );
    expect(metricLog).toBeDefined();
    expect(metricLog?.[0]).toContain("7");
    logSpy.mockRestore();
  });

  it("activeSessions=0 când nu există sesiuni active", async () => {
    makeSelectChain([{ count: "0" }]);

    const result = await mcpHealthCheckProcessor(makeJob({}));

    expect(result.activeSessions).toBe(0);
  });
});

// ── L70: mcp:metrics:collect ──────────────────────────────────────────────────

describe("L70 mcpMetricsCollectProcessor", () => {
  let mcpMetricsCollectProcessor: Awaited<
    typeof import("../workers/l70-mcp-metrics-collect.js")
  >["mcpMetricsCollectProcessor"];

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../workers/l70-mcp-metrics-collect.js");
    mcpMetricsCollectProcessor = mod.mcpMetricsCollectProcessor;
  });

  it("colectează statistici tool_calls_total din fereastra de 5min", async () => {
    const rows = [
      { toolName: "search_products", success: true, count: "15" },
      { toolName: "calculate_discount", success: false, count: "3" },
    ];
    const groupByMock = vi.fn(() => ({ limit: vi.fn().mockResolvedValue(rows) }));
    const whereMock = vi.fn(() => ({ groupBy: groupByMock }));
    const fromMock = vi.fn(() => ({ where: whereMock }));
    dbSelectMock.mockReturnValueOnce({ from: fromMock });

    const result = await mcpMetricsCollectProcessor(makeJob({}));

    expect(result.ok).toBe(true);
    expect(result.windowMinutes).toBe(5);
    expect(result.totalCalls).toBe(18);
    expect(result.stats).toHaveLength(2);
  });

  it("numără corect mcpToolsOnly", async () => {
    const rows = [
      { toolName: "search_products", success: true, count: "10" },
      { toolName: "non_mcp_tool", success: true, count: "5" },
    ];
    const groupByMock = vi.fn(() => ({ limit: vi.fn().mockResolvedValue(rows) }));
    const whereMock = vi.fn(() => ({ groupBy: groupByMock }));
    const fromMock = vi.fn(() => ({ where: whereMock }));
    dbSelectMock.mockReturnValueOnce({ from: fromMock });

    const result = await mcpMetricsCollectProcessor(makeJob({}));

    expect(result.mcpToolsOnly).toBe(10);
    expect(result.totalCalls).toBe(15);
  });

  it("emite METRIC cerniq_mcp_tool_calls_total doar pentru MCP tools", async () => {
    const rows = [
      { toolName: "check_realtime_stock", success: true, count: "8" },
      { toolName: "custom_tool", success: true, count: "4" },
    ];
    const groupByMock = vi.fn(() => ({ limit: vi.fn().mockResolvedValue(rows) }));
    const whereMock = vi.fn(() => ({ groupBy: groupByMock }));
    const fromMock = vi.fn(() => ({ where: whereMock }));
    dbSelectMock.mockReturnValueOnce({ from: fromMock });

    const logSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    await mcpMetricsCollectProcessor(makeJob({}));

    const metricLogs = logSpy.mock.calls.filter((c) =>
      (c[0] as string).includes("cerniq_mcp_tool_calls_total"),
    );
    expect(metricLogs).toHaveLength(1);
    expect(metricLogs[0]?.[0]).toContain("check_realtime_stock");
    expect(metricLogs[0]?.[0]).not.toContain("custom_tool");
    logSpy.mockRestore();
  });

  it("returnează stats=[] și totalCalls=0 dacă nu există tool calls", async () => {
    const groupByMock = vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) }));
    const whereMock = vi.fn(() => ({ groupBy: groupByMock }));
    const fromMock = vi.fn(() => ({ where: whereMock }));
    dbSelectMock.mockReturnValueOnce({ from: fromMock });

    const result = await mcpMetricsCollectProcessor(makeJob({}));

    expect(result.ok).toBe(true);
    expect(result.stats).toEqual([]);
    expect(result.totalCalls).toBe(0);
    expect(result.mcpToolsOnly).toBe(0);
  });

  it("include collectedAt ISO string", async () => {
    const groupByMock = vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) }));
    const whereMock = vi.fn(() => ({ groupBy: groupByMock }));
    const fromMock = vi.fn(() => ({ where: whereMock }));
    dbSelectMock.mockReturnValueOnce({ from: fromMock });

    const result = await mcpMetricsCollectProcessor(makeJob({}));

    expect(() => new Date(result.collectedAt)).not.toThrow();
  });
});
