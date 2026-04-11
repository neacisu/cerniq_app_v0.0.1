import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks — trebuie definite ÎNAINTE de vi.mock()
// ---------------------------------------------------------------------------

const {
  publishMock,
  quitMock,
  setMock,
  RedisCtor,
  dbInsertReturningMock,
  dbInsertValuesMock,
  dbInsertMock,
  dbSelectMock,
  otelMockSpan,
  otelStartActiveSpan,
} = vi.hoisted(() => {
  const publishMock = vi.fn().mockResolvedValue(1);
  const quitMock = vi.fn().mockResolvedValue("OK");
  const setMock = vi.fn().mockResolvedValue("OK");

  const RedisCtor = vi.fn(function (this: {
    publish: typeof publishMock;
    quit: typeof quitMock;
    set: typeof setMock;
  }) {
    this.publish = publishMock;
    this.quit = quitMock;
    this.set = setMock;
  });

  const dbInsertReturningMock = vi.fn().mockResolvedValue([{ id: 1 }]);
  const dbInsertValuesMock = vi.fn().mockReturnValue({ returning: dbInsertReturningMock });
  const dbInsertMock = vi.fn().mockReturnValue({ values: dbInsertValuesMock });
  const dbSelectMock = vi.fn();

  const otelMockSpan = {
    setAttribute: vi.fn(),
    recordException: vi.fn(),
    end: vi.fn(),
    spanContext: () => ({ spanId: "abc123", traceId: "def456" }),
  };

  const otelStartActiveSpan = vi.fn(
    async (_name: string, fn: (s: typeof otelMockSpan) => unknown) => fn(otelMockSpan),
  );

  return {
    publishMock,
    quitMock,
    setMock,
    RedisCtor,
    dbInsertReturningMock,
    dbInsertValuesMock,
    dbInsertMock,
    dbSelectMock,
    otelMockSpan,
    otelStartActiveSpan,
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("ioredis", () => ({ default: RedisCtor }));

vi.mock("@cerniq/db", () => ({
  cognitiveEvents: { _tableName: "cognitive_events" },
  cognitiveNodeConfigs: { _tableName: "cognitive_node_configs" },
  dataMutations: { _tableName: "data_mutations" },
  importCognitiveEdges: { _tableName: "import_cognitive_edges" },
  db: { insert: dbInsertMock, select: dbSelectMock },
  eq: vi.fn((_col: unknown, val: unknown) => ({ type: "eq", val })),
  and: vi.fn((...conds: unknown[]) => ({ type: "and", conds })),
  or: vi.fn((...conds: unknown[]) => ({ type: "or", conds })),
}));

vi.mock("@cerniq/shared", () => ({
  getNodeByKey: vi.fn(() => undefined),
}));

vi.mock("./redis.js", () => ({
  getRedisConnectionOptions: () => ({ host: "127.0.0.1", port: 6379 }),
}));

vi.mock("@opentelemetry/api", () => ({
  trace: {
    getTracer: vi.fn(() => ({
      startActiveSpan: otelStartActiveSpan,
    })),
    getActiveSpan: vi.fn(() => otelMockSpan),
  },
}));

// ---------------------------------------------------------------------------
// Importuri sub test (după mock-uri)
// ---------------------------------------------------------------------------

import {
  CERNIQ_COGNITIVE_SPAN_NODE_KEY,
  closeCognitiveRedis,
  emitCognitiveEvent,
  recordDataMutation,
  withCognitiveSpan,
  resolveNodeConfig,
  propagatePause,
  redactPII,
  DATA_MUTATION_PII_ALLOWLIST,
} from "./cognitive-helpers.js";
import type { Span } from "@opentelemetry/api";
import { getNodeByKey } from "@cerniq/shared";

// ---------------------------------------------------------------------------
// Helper: creează un chain Drizzle select mockuit
// ---------------------------------------------------------------------------

function makeSelectChain(rows: unknown[]) {
  const p = Promise.resolve(rows);
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    then: p.then.bind(p),
    catch: p.catch.bind(p),
    finally: p.finally.bind(p),
  };
  return chain;
}

// ---------------------------------------------------------------------------
// Suite 1 — Testul ORIGINAL (trebuie să treacă neschimbat)
// ---------------------------------------------------------------------------

describe("cognitive-helpers (Redis publisher)", () => {
  beforeEach(async () => {
    await closeCognitiveRedis();
    publishMock.mockClear();
    quitMock.mockClear();
    RedisCtor.mockClear();
    dbInsertMock.mockClear();
    dbInsertValuesMock.mockClear();
    dbInsertReturningMock.mockClear();
  });

  it("reutilizează același client IORedis până la closeCognitiveRedis (lazy singleton)", async () => {
    const tenant = "550e8400-e29b-41d4-a716-446655440001";
    await emitCognitiveEvent("node:a", { eventType: "EVT1" }, { tenantId: tenant });
    await emitCognitiveEvent("node:b", { eventType: "EVT2" }, { tenantId: tenant });
    expect(RedisCtor).toHaveBeenCalledTimes(1);
    expect(publishMock).toHaveBeenCalledTimes(2);

    await closeCognitiveRedis();
    expect(quitMock).toHaveBeenCalledTimes(1);

    await emitCognitiveEvent("node:c", { eventType: "EVT3" }, { tenantId: tenant });
    expect(RedisCtor).toHaveBeenCalledTimes(2);
    expect(publishMock).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — redactPII (funcție pură, fără mock-uri)
// ---------------------------------------------------------------------------

describe("redactPII", () => {
  it("returnează null pentru input null/undefined", () => {
    expect(redactPII(null)).toBeNull();
    expect(redactPII(undefined)).toBeNull();
  });

  it("păstrează câmpurile din allowlist, redactează restul", () => {
    const input = {
      id: "uuid-1",
      cui: "12345678",
      email: "john@example.com",
      phone: "+40700123456",
      name: "John Doe",
      status: "active",
    };
    const result = redactPII(input);
    expect(result).not.toBeNull();
    expect(result?.id).toBe("uuid-1");
    expect(result?.cui).toBe("12345678");
    expect(result?.status).toBe("active");
    expect(result?.email).toBe("[REDACTED]");
    expect(result?.phone).toBe("[REDACTED]");
    expect(result?.name).toBe("[REDACTED]");
  });

  it("acceptă allowlist custom", () => {
    const input = { foo: "keep", bar: "redact" };
    const result = redactPII(input, ["foo"]);
    expect(result?.foo).toBe("keep");
    expect(result?.bar).toBe("[REDACTED]");
  });

  it("DATA_MUTATION_PII_ALLOWLIST conține câmpurile de bază", () => {
    expect(DATA_MUTATION_PII_ALLOWLIST).toContain("id");
    expect(DATA_MUTATION_PII_ALLOWLIST).toContain("cui");
    expect(DATA_MUTATION_PII_ALLOWLIST).toContain("tenantId");
    expect(DATA_MUTATION_PII_ALLOWLIST).toContain("status");
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — emitCognitiveEvent cu ctx
// ---------------------------------------------------------------------------

describe("emitCognitiveEvent cu ctx", () => {
  beforeEach(async () => {
    await closeCognitiveRedis();
    publishMock.mockClear();
    dbInsertMock.mockClear();
    dbInsertValuesMock.mockClear();
    dbInsertReturningMock.mockClear();
    RedisCtor.mockClear();
  });

  it("fără ctx: nu face INSERT DB și nu publică pe Redis", async () => {
    await emitCognitiveEvent("e1:test", { eventType: "TEST" });
    expect(dbInsertMock).not.toHaveBeenCalled();
    expect(publishMock).not.toHaveBeenCalled();
  });

  it("cu ctx.tenantId: face INSERT în cognitiveEvents", async () => {
    await emitCognitiveEvent(
      "e1:test",
      { eventType: "TEST", data: { foo: "bar" } },
      {
        tenantId: "550e8400-e29b-41d4-a716-446655440000",
        batchId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        traceId: "trace-123",
      },
    );
    expect(dbInsertMock).toHaveBeenCalledTimes(1);
    expect(dbInsertValuesMock).toHaveBeenCalledTimes(1);
    const insertArgs = dbInsertValuesMock.mock.calls[0][0] as Record<string, unknown>;
    expect(insertArgs.tenantId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(insertArgs.nodeKey).toBe("e1:test");
    expect(insertArgs.eventType).toBe("TEST");
    expect(insertArgs.traceId).toBe("trace-123");
  });

  it("cu ctx.batchId: publică pe canal 'cognitive:events:{batchId}'", async () => {
    await emitCognitiveEvent(
      "e1:test",
      { eventType: "TEST" },
      {
        tenantId: "550e8400-e29b-41d4-a716-446655440000",
        batchId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      },
    );
    const [[channel]] = publishMock.mock.calls;
    expect(channel).toBe("cognitive:events:6ba7b810-9dad-11d1-80b4-00c04fd430c8");
  });

  it("fără ctx.batchId dar cu ctx.tenantId: publică pe canal generic", async () => {
    await emitCognitiveEvent(
      "e1:test",
      { eventType: "TEST" },
      { tenantId: "550e8400-e29b-41d4-a716-446655440000" },
    );
    const [[channel]] = publishMock.mock.calls;
    expect(channel).toBe("cognitive:events");
  });

  it("mesajul publicat are structura wire (tenantId, data.traceId)", async () => {
    await emitCognitiveEvent(
      "e1:node",
      { eventType: "MY_EVENT", data: { x: 1 } },
      { tenantId: "550e8400-e29b-41d4-a716-446655440000", traceId: "tr-1" },
    );
    const [[, messageStr]] = publishMock.mock.calls;
    const message = JSON.parse(messageStr as string) as Record<string, unknown>;
    expect(message.tenantId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(message.nodeKey).toBe("e1:node");
    expect(message.eventType).toBe("MY_EVENT");
    expect((message.data as Record<string, unknown>).x).toBe(1);
    expect((message.data as Record<string, unknown>).traceId).toBe("tr-1");
    expect(typeof message.timestamp).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — recordDataMutation cu ctx + redactPII
// ---------------------------------------------------------------------------

describe("recordDataMutation", () => {
  beforeEach(() => {
    dbInsertMock.mockClear();
    dbInsertValuesMock.mockClear();
  });

  it("face INSERT cu câmpurile de bază", async () => {
    await recordDataMutation({
      tenantId: "tenant-1",
      batchId: "batch-1",
      nodeKey: "e1:enrich:anaf",
      entityType: "company",
      entityId: "entity-uuid",
      mutationIntent: "ENRICH",
    });
    expect(dbInsertValuesMock).toHaveBeenCalledTimes(1);
    const args = dbInsertValuesMock.mock.calls[0][0] as Record<string, unknown>;
    expect(args.tenantId).toBe("tenant-1");
    expect(args.mutationIntent).toBe("ENRICH");
    expect(args.traceId).toBeNull();
    expect(args.causationId).toBeNull();
    expect(args.actorId).toBeNull();
    expect(args.changedFields).toBeNull();
  });

  it("redactează PII din beforeData și afterData", async () => {
    await recordDataMutation({
      tenantId: "t1",
      batchId: "b1",
      nodeKey: "e1:test",
      entityType: "company",
      entityId: "e1",
      mutationIntent: "UPDATE",
      beforeData: { cui: "123", email: "pii@example.com", status: "active" },
      afterData: { cui: "123", phone: "+40700", status: "inactive" },
    });
    const args = dbInsertValuesMock.mock.calls[0][0] as Record<string, unknown>;
    expect((args.beforeData as Record<string, unknown>).cui).toBe("123");
    expect((args.beforeData as Record<string, unknown>).email).toBe("[REDACTED]");
    expect((args.afterData as Record<string, unknown>).phone).toBe("[REDACTED]");
    expect((args.afterData as Record<string, unknown>).status).toBe("inactive");
  });

  it("cu ctx: inserează traceId, causationId, actorId", async () => {
    await recordDataMutation(
      {
        tenantId: "t1",
        batchId: "b1",
        nodeKey: "e1:test",
        entityType: "company",
        entityId: "e1",
        mutationIntent: "CREATE",
        changedFields: ["fiscal_status", "caen"],
      },
      { traceId: "trace-abc", causationKey: "cause-xyz", actorId: "user-1" },
    );
    const args = dbInsertValuesMock.mock.calls[0][0] as Record<string, unknown>;
    expect(args.traceId).toBe("trace-abc");
    expect(args.causationId).toBe("cause-xyz");
    expect(args.actorId).toBe("user-1");
    expect(args.changedFields).toEqual(["fiscal_status", "caen"]);
  });

  it("beforeData null → stochează null în DB", async () => {
    await recordDataMutation({
      tenantId: "t1",
      batchId: "b1",
      nodeKey: "e1:test",
      entityType: "company",
      entityId: "e1",
      mutationIntent: "CREATE",
      beforeData: null,
    });
    const args = dbInsertValuesMock.mock.calls[0][0] as Record<string, unknown>;
    expect(args.beforeData).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — withCognitiveSpan cu ctx + auto-emit
// ---------------------------------------------------------------------------

describe("withCognitiveSpan", () => {
  beforeEach(async () => {
    await closeCognitiveRedis();
    publishMock.mockClear();
    dbInsertMock.mockClear();
    dbInsertValuesMock.mockClear();
    RedisCtor.mockClear();
    delete (otelMockSpan as Record<string, unknown>)[CERNIQ_COGNITIVE_SPAN_NODE_KEY];
  });

  it("fără ctx: execută fn, returnează rezultatul, fără auto-emit", async () => {
    const result = await withCognitiveSpan("e1:test", async () => 42);
    expect(result).toBe(42);
    // Fără ctx → publishMock NU ar trebui apelat (node_started/completed omise)
    // Dar emitCognitiveEvent intern e fire-and-forget, deci așteptăm asincron
    await new Promise((r) => setTimeout(r, 10));
    expect(dbInsertMock).not.toHaveBeenCalled();
  });

  it("cu ctx: emite node_started și node_completed", async () => {
    await withCognitiveSpan("e1:test", async () => "done", {
      tenantId: "550e8400-e29b-41d4-a716-446655440000",
      batchId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    });
    // Așteptăm propagarea promisiunilor fire-and-forget
    await new Promise((r) => setTimeout(r, 20));
    // Ambele INSERT-uri (node_started + node_completed)
    expect(dbInsertValuesMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    const eventTypes = dbInsertValuesMock.mock.calls.map(
      (call) => (call[0] as Record<string, unknown>).eventType,
    );
    expect(eventTypes).toContain("node_started");
    expect(eventTypes).toContain("node_completed");
  });

  it("cu ctx: emite node_failed și re-aruncă eroarea", async () => {
    await expect(
      withCognitiveSpan(
        "e1:test",
        async () => {
          throw new Error("test failure");
        },
        {
          tenantId: "550e8400-e29b-41d4-a716-446655440000",
          batchId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        },
      ),
    ).rejects.toThrow("test failure");
    await new Promise((r) => setTimeout(r, 20));
    const eventTypes = dbInsertValuesMock.mock.calls.map(
      (call) => (call[0] as Record<string, unknown>).eventType,
    );
    expect(eventTypes).toContain("node_started");
    expect(eventTypes).toContain("node_failed");
  });

  it("emitCognitiveEvent eșuat nu blochează execuția principală", async () => {
    dbInsertReturningMock.mockRejectedValueOnce(new Error("DB down"));
    const result = await withCognitiveSpan("e1:test", async () => "ok", {
      tenantId: "550e8400-e29b-41d4-a716-446655440000",
      batchId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    });
    expect(result).toBe("ok");
  });

  it("setAttribute apelat cu cognitive.nodeKey pe span", async () => {
    const { trace } = await import("@opentelemetry/api");
    // Spanul mock vine din mock-ul getActiveSpan (același obiect mockSpan)
    const mockSpan = trace.getActiveSpan();
    expect(mockSpan).toBeDefined();
    if (!mockSpan) return;
    (mockSpan.setAttribute as ReturnType<typeof vi.fn>).mockClear();

    await withCognitiveSpan("e1:test", async () => undefined);
    expect(mockSpan.setAttribute).toHaveBeenCalledWith("cognitive.nodeKey", "e1:test");
  });

  it("când spanul activ poartă deja același nodeKey, nu deschide un span nou (anti-dublare factory + procesor)", async () => {
    (otelMockSpan as Record<string, unknown>)[CERNIQ_COGNITIVE_SPAN_NODE_KEY] = "e1:dedupe";
    otelStartActiveSpan.mockClear();

    const { trace } = await import("@opentelemetry/api");
    expect(trace.getActiveSpan()).toBe(otelMockSpan);
    expect(
      (trace.getActiveSpan() as unknown as Record<string, unknown>)[CERNIQ_COGNITIVE_SPAN_NODE_KEY],
    ).toBe("e1:dedupe");

    const inner = vi.fn(async (s: Span) => {
      expect(s).toBe(otelMockSpan);
      return 7;
    });
    const out = await withCognitiveSpan("e1:dedupe", inner);
    expect(out).toBe(7);
    expect(inner).toHaveBeenCalledTimes(1);
    expect(otelStartActiveSpan).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Suite 6 — resolveNodeConfig cu batchId override + catalog fallback
// ---------------------------------------------------------------------------

describe("resolveNodeConfig", () => {
  beforeEach(() => {
    dbSelectMock.mockClear();
    vi.mocked(getNodeByKey).mockReturnValue(undefined);
  });

  it("returnează row din DB fără modificări când nu există batchId override", async () => {
    const fakeRow = {
      id: 1,
      tenantId: "tenant-1",
      nodeKey: "e1:test",
      concurrency: 3,
      rateLimitMax: null,
      rateLimitDuration: null,
      paused: false,
      configOverrides: {},
      applyStatus: "immediate" as const,
      appliedAt: null,
      appliedByWorkerInstance: null,
      updatedAt: new Date(),
    };
    dbSelectMock.mockReturnValue(makeSelectChain([fakeRow]));
    const result = await resolveNodeConfig("e1:test", "tenant-1");
    expect(result).toEqual(fakeRow);
  });

  it("aplică batchId override din configOverrides.batchOverrides", async () => {
    const fakeRow = {
      id: 1,
      tenantId: "tenant-1",
      nodeKey: "e1:test",
      concurrency: 1,
      rateLimitMax: null,
      rateLimitDuration: null,
      paused: false,
      configOverrides: {
        batchOverrides: {
          "batch-xyz": { concurrency: 8 },
        },
      },
      applyStatus: "immediate" as const,
      appliedAt: null,
      appliedByWorkerInstance: null,
      updatedAt: new Date(),
    };
    dbSelectMock.mockReturnValue(makeSelectChain([fakeRow]));
    const result = await resolveNodeConfig("e1:test", "tenant-1", "batch-xyz");
    expect(result?.concurrency).toBe(8);
  });

  it("ignoră batchId override dacă batchId nu există în configOverrides", async () => {
    const fakeRow = {
      id: 1,
      tenantId: "tenant-1",
      nodeKey: "e1:test",
      concurrency: 2,
      rateLimitMax: null,
      rateLimitDuration: null,
      paused: false,
      configOverrides: { batchOverrides: {} },
      applyStatus: "immediate" as const,
      appliedAt: null,
      appliedByWorkerInstance: null,
      updatedAt: new Date(),
    };
    dbSelectMock.mockReturnValue(makeSelectChain([fakeRow]));
    const result = await resolveNodeConfig("e1:test", "tenant-1", "batch-nonexistent");
    expect(result?.concurrency).toBe(2);
  });

  it("returnează null când nu există row DB și nici catalog entry", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));
    vi.mocked(getNodeByKey).mockReturnValue(undefined);
    const result = await resolveNodeConfig("e1:nonexistent", "tenant-1");
    expect(result).toBeNull();
  });

  it("fallback la catalog defaults când nu există row în DB", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));
    vi.mocked(getNodeByKey).mockReturnValue({
      nodeKey: "e1:test",
      queueName: "test:queue",
      cognitiveFunction: "Test Function",
      biologicalAnalogy: "Test",
      neuronType: "ToolNeuron" as never,
      swimlane: "enrichment-fiscal",
      etapa: 1,
      criticality: "MEDIUM",
      pulsing: false,
      supervisorApplyConfig: { concurrency: 4 },
      rateLimits: { requestsPerMinute: 120 },
    });
    const result = await resolveNodeConfig("e1:test", "tenant-1");
    expect(result).not.toBeNull();
    expect(result?.id).toBe(0);
    expect(result?.concurrency).toBe(4);
    expect(result?.rateLimitMax).toBe(120);
    expect(result?.rateLimitDuration).toBe(60_000);
    expect(result?.paused).toBe(false);
    expect(result?.applyStatus).toBe("immediate");
  });

  it("fallback la catalog: concurrency=1 dacă supervisorApplyConfig lipsește", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));
    vi.mocked(getNodeByKey).mockReturnValue({
      nodeKey: "e1:test",
      queueName: "test:queue",
      cognitiveFunction: "f",
      biologicalAnalogy: "b",
      neuronType: "ToolNeuron" as never,
      swimlane: "enrichment-fiscal",
      etapa: 1,
      criticality: "LOW",
      pulsing: false,
    });
    const result = await resolveNodeConfig("e1:test");
    expect(result?.concurrency).toBe(1);
    expect(result?.rateLimitMax).toBeNull();
    expect(result?.rateLimitDuration).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Suite 7 — propagatePause cu BFS edge traversal
// ---------------------------------------------------------------------------

describe("propagatePause", () => {
  beforeEach(async () => {
    await closeCognitiveRedis();
    publishMock.mockClear();
    setMock.mockClear();
    dbSelectMock.mockClear();
    dbInsertMock.mockClear();
    dbInsertValuesMock.mockClear();
    dbInsertReturningMock.mockClear();
    RedisCtor.mockClear();
  });

  it("fără tenantId: SET Redis fără pub/sub", async () => {
    await propagatePause("e1:test");
    expect(setMock).toHaveBeenCalledWith("cognitive:pause:e1:test", "1");
    expect(publishMock).not.toHaveBeenCalled();
  });

  it("fără rootBatchId dar cu tenantId: SET + emit PAUSE_PROPAGATED", async () => {
    await propagatePause("e1:test", undefined, "550e8400-e29b-41d4-a716-446655440000");
    expect(setMock).toHaveBeenCalledWith("cognitive:pause:e1:test", "1");
    expect(publishMock).toHaveBeenCalledTimes(1);
    const [[, msg]] = publishMock.mock.calls;
    const parsed = JSON.parse(msg as string) as Record<string, unknown>;
    expect(parsed.eventType).toBe("PAUSE_PROPAGATED");
  });

  it("cu rootBatchId și tenantId: SET Redis + INSERT DB pentru nodul rădăcină", async () => {
    // Niciun edge downstream
    dbSelectMock.mockReturnValue(makeSelectChain([]));
    await propagatePause(
      "e1:root",
      "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "550e8400-e29b-41d4-a716-446655440000",
    );
    expect(setMock).toHaveBeenCalledWith("cognitive:pause:e1:root", "1");
    // INSERT în cognitiveEvents (tenantId prezent în emitCognitiveEvent)
    expect(dbInsertValuesMock).toHaveBeenCalledTimes(1);
  });

  it("BFS: pauzează și nodurile downstream via 'triggers' edges", async () => {
    // Prima iterație (e1:root) → returnează 1 edge: e1:child
    // A doua iterație (e1:child) → returnează 0 edges
    dbSelectMock
      .mockReturnValueOnce(makeSelectChain([{ targetNodeKey: "e1:child" }]))
      .mockReturnValueOnce(makeSelectChain([]));

    await propagatePause(
      "e1:root",
      "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "550e8400-e29b-41d4-a716-446655440000",
    );

    // SET apelat pentru ambele noduri
    expect(setMock).toHaveBeenCalledWith("cognitive:pause:e1:root", "1");
    expect(setMock).toHaveBeenCalledWith("cognitive:pause:e1:child", "1");

    // INSERT în DB pentru ambele noduri (tenantId prezent)
    expect(dbInsertValuesMock).toHaveBeenCalledTimes(2);
  });

  it("BFS: evită ciclurile (nu vizitează același nod de două ori)", async () => {
    // e1:a → e1:b → e1:a (ciclu)
    dbSelectMock
      .mockReturnValueOnce(makeSelectChain([{ targetNodeKey: "e1:b" }]))
      .mockReturnValueOnce(makeSelectChain([{ targetNodeKey: "e1:a" }]))
      .mockReturnValueOnce(makeSelectChain([]));

    await propagatePause(
      "e1:a",
      "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "550e8400-e29b-41d4-a716-446655440000",
    );

    // e1:a vizitat o dată, e1:b vizitat o dată
    expect(setMock).toHaveBeenCalledTimes(2);
  });

  it("canalul Redis include batchId în mesajul emis", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));
    await propagatePause(
      "e1:test",
      "6ba7b810-9dad-11d1-80b4-00c04fd430c9",
      "550e8400-e29b-41d4-a716-446655440000",
    );
    const [[channel]] = publishMock.mock.calls;
    expect(channel).toBe("cognitive:events:6ba7b810-9dad-11d1-80b4-00c04fd430c9");
  });
});
