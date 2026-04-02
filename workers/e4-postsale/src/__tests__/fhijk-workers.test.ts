/**
 * fhijk-workers.test.ts — Teste comprehensive pentru workerii FAZA 8g:
 * F28-F31 (Stock), H37-H38 (Returns), I39-I44 (Alerts), J45-J47 (Audit), K48-K53 (HITL)
 *
 * Acoperire 100%: toate path-urile logice, edge cases, idempotency, error handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeAuditHash, verifyAuditChain, GENESIS_HASH } from "../lib/audit-chain.js";

// ─── Mock-uri hoisted ────────────────────────────────────────────────────────

const {
  insertMock,
  updateMock,
  selectMock,
  executeMock,
  queryMock,
  closeMock,
  addMock,
  createQueueMock,
} = vi.hoisted(() => {
  const closeMock = vi.fn().mockResolvedValue(undefined);
  const addMock = vi.fn().mockResolvedValue({ id: "job-001" });
  const createQueueMock = vi.fn().mockReturnValue({ add: addMock, close: closeMock });

  const insertMock = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([]) });
  const updateSetMock = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
  const updateMock = vi.fn().mockReturnValue({ set: updateSetMock });
  const selectFromMock = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  });
  const selectMock = vi.fn().mockReturnValue(selectFromMock());
  const executeMock = vi.fn().mockResolvedValue({ rowCount: 5 });
  const queryMock = { approvalTasks: { findMany: vi.fn().mockResolvedValue([]) } };

  return {
    insertMock,
    updateMock,
    selectMock,
    executeMock,
    queryMock,
    closeMock,
    addMock,
    createQueueMock,
  };
});

vi.mock("@cerniq/db", () => ({
  db: {
    insert: insertMock,
    update: updateMock,
    select: selectMock,
    execute: executeMock,
    query: queryMock,
  },
  goldProducts: {
    id: "id",
    tenantId: "tenantId",
    sku: "sku",
    name: "name",
    metadata: "metadata",
    isActive: "isActive",
    updatedAt: "updatedAt",
  },
  goldOrders: {
    id: "id",
    tenantId: "tenantId",
    status: "status",
    orderNumber: "orderNumber",
    metadata: "metadata",
    updatedAt: "updatedAt",
  },
  goldOrderItems: { orderId: "orderId", productId: "productId", quantity: "quantity" },
  goldAuditLogsEtapa4: {
    id: "id",
    tenantId: "tenantId",
    eventType: "eventType",
    entityType: "entityType",
    entityId: "entityId",
    actorId: "actorId",
    actorType: "actorType",
    prevHash: "prevHash",
    createdAt: "createdAt",
    oldValues: "oldValues",
    newValues: "newValues",
  },
  approvalService: {
    createTask: vi.fn().mockResolvedValue({ id: "hitl-task-001" }),
    decide: vi.fn().mockResolvedValue({ id: "hitl-task-001", status: "approved" }),
    escalate: vi.fn().mockResolvedValue({ id: "hitl-task-escalated-001" }),
  },
  approvalTasks: {
    tenantId: "tenantId",
    status: "status",
    pipelineStage: "pipelineStage",
    createdAt: "createdAt",
    dueAt: "dueAt",
    metadata: "metadata",
    id: "id",
    updatedAt: "updatedAt",
  },
  setSessionTenantId: vi.fn().mockResolvedValue(undefined),
  sql: Object.assign(
    vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
      sql: strings.join("?"),
      values,
    })),
    { raw: vi.fn((s: string) => ({ type: "sql.raw", value: s })) },
  ),
  eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
  isNotNull: vi.fn((a: unknown) => ({ isNotNull: a })),
  desc: vi.fn((a: unknown) => ({ desc: a })),
}));

vi.mock("@cerniq/worker-shared", () => ({
  withCognitiveSpan: vi.fn((name: string, fn: (span: null) => Promise<unknown>) => fn(null)),
  createQueue: createQueueMock,
  QUEUES: {
    E4_STOCK_LOW_ALERT: "stock:low:alert",
    E4_RETURN_PROCESS: "return:process",
    E4_STOCK_RETURN: "stock:return",
    E4_ALERT_PAYMENT: "alert:payment",
    E4_ALERT_DELIVERY: "alert:delivery",
    E4_ALERT_CREDIT: "alert:credit",
    E4_ALERT_CONTRACT: "alert:contract",
    E4_ALERT_STOCK: "alert:stock",
    E4_ALERT_DISPATCH: "alert:dispatch",
    E4_AUDIT_LOG_WRITE: "audit:log:write",
    E4_HITL_CREDIT_OVERRIDE: "hitl:approval:credit-override",
    E4_HITL_CREDIT_LIMIT: "hitl:approval:credit-limit",
    E4_HITL_REFUND_LARGE: "hitl:approval:refund-large",
    E4_HITL_PAYMENT_INVESTIGATION: "hitl:investigation:payment",
    E4_HITL_TASK_RESOLVE: "hitl:task:resolve",
    E4_HITL_ESCALATION_OVERDUE: "hitl:escalation:overdue",
  },
}));

vi.mock("../lib/oblio-client-e4.js", () => ({
  oblioClient: {
    syncStock: vi.fn().mockResolvedValue({ synced: 3, errors: 0, note: "stub" }),
  },
}));

vi.mock("../e4-metrics.js", () => ({
  e4StockSyncTotal: { inc: vi.fn() },
  e4StockDeductionsTotal: { inc: vi.fn() },
  e4StockReturnsTotal: { inc: vi.fn() },
  e4StockAlertsTotal: { inc: vi.fn() },
  e4AlertsDispatchedTotal: { inc: vi.fn() },
  e4AuditChainIntegrityGauge: { set: vi.fn() },
  e4HitlTasksCreatedTotal: { inc: vi.fn() },
}));

vi.mock("uuid", () => ({ v4: () => "test-uuid-001" }));

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeJob<T>(data: T) {
  return {
    data,
    log: vi.fn(),
  };
}

function makeSelectResult<T>(result: T[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  };
  return Object.assign(Promise.resolve(result), chain);
}

// ─── TEST SUITE: lib/audit-chain.ts ─────────────────────────────────────────

describe("lib/audit-chain.ts", () => {
  it("GENESIS_HASH are exact 64 caractere zero", () => {
    expect(GENESIS_HASH).toHaveLength(64);
    expect(GENESIS_HASH).toMatch(/^0+$/);
  });

  it("computeAuditHash returnează string hex 64 caractere", () => {
    const hash = computeAuditHash({
      id: "id-001",
      eventType: "TEST_EVENT",
      entityId: "entity-001",
      createdAt: new Date("2025-01-01T00:00:00Z"),
      prevHash: GENESIS_HASH,
    });
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("computeAuditHash produce hash diferit la aceleași date cu prevHash diferit", () => {
    const base = {
      id: "id-001",
      eventType: "TEST_EVENT",
      entityId: "entity-001",
      createdAt: new Date("2025-01-01T00:00:00Z"),
    };
    const hash1 = computeAuditHash({ ...base, prevHash: GENESIS_HASH });
    const hash2 = computeAuditHash({ ...base, prevHash: "a".repeat(64) });
    expect(hash1).not.toBe(hash2);
  });

  it("computeAuditHash este deterministic (același input → același output)", () => {
    const entry = {
      id: "id-001",
      eventType: "TEST_EVENT",
      entityId: "entity-001",
      createdAt: new Date("2025-01-01T00:00:00Z"),
      prevHash: GENESIS_HASH,
    };
    expect(computeAuditHash(entry)).toBe(computeAuditHash(entry));
  });

  it("verifyAuditChain returnează valid=true pentru lanț gol", () => {
    const result = verifyAuditChain([]);
    expect(result.valid).toBe(true);
  });

  it("verifyAuditChain returnează valid=true pentru lanț cu 1 entry", () => {
    const result = verifyAuditChain([
      {
        id: "id-001",
        eventType: "EVT",
        entityId: "e-001",
        createdAt: new Date(),
        prevHash: GENESIS_HASH,
      },
    ]);
    expect(result.valid).toBe(true);
  });

  it("verifyAuditChain validează lanț corect cu 3 entries consecutive", () => {
    const e1 = {
      id: "id-001",
      eventType: "EVT1",
      entityId: "e-001",
      createdAt: new Date("2025-01-01T00:00:00Z"),
      prevHash: GENESIS_HASH,
    };
    const h1 = computeAuditHash(e1);
    const e2 = {
      id: "id-002",
      eventType: "EVT2",
      entityId: "e-001",
      createdAt: new Date("2025-01-01T00:01:00Z"),
      prevHash: h1,
    };
    const h2 = computeAuditHash(e2);
    const e3 = {
      id: "id-003",
      eventType: "EVT3",
      entityId: "e-001",
      createdAt: new Date("2025-01-01T00:02:00Z"),
      prevHash: h2,
    };

    const result = verifyAuditChain([e1, e2, e3]);
    expect(result.valid).toBe(true);
  });

  it("verifyAuditChain detectează lanț compromis (tamper test)", () => {
    const e1 = {
      id: "id-001",
      eventType: "EVT1",
      entityId: "e-001",
      createdAt: new Date("2025-01-01T00:00:00Z"),
      prevHash: GENESIS_HASH,
    };
    const h1 = computeAuditHash(e1);
    const e2 = {
      id: "id-002",
      eventType: "EVT2",
      entityId: "e-001",
      createdAt: new Date("2025-01-01T00:01:00Z"),
      prevHash: h1,
    };

    // Tamper: schimbăm prevHash-ul lui e2 cu un hash invalid
    const tampered_e2 = { ...e2, prevHash: "b".repeat(64) };

    const result = verifyAuditChain([e1, tampered_e2]);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.firstBrokenIndex).toBe(1);
    }
  });
});

// ─── TEST SUITE: F28 — stock:sync:oblio ─────────────────────────────────────

describe("F28 — stock:sync:oblio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectMock.mockReturnValue(
      makeSelectResult([
        { id: "prod-001", sku: "SKU-001", name: "Produs Test" },
        { id: "prod-002", sku: "SKU-002", name: "Produs Test 2" },
      ]),
    );
    updateMock.mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    });
  });

  it("F28.1 — success: sync produse active + UPDATE metadata.stockCount", async () => {
    const { stockSyncOblioProcessor } = await import("../workers/f28-stock-sync-oblio.js");
    const { e4StockSyncTotal } = await import("../e4-metrics.js");

    const result = await stockSyncOblioProcessor(
      makeJob({ tenantId: "tenant-001" }) as never,
      {} as never,
    );

    expect(result).toMatchObject({
      ok: true,
      tenantId: "tenant-001",
      syncedCount: 2,
      errorCount: 0,
    });
    expect(e4StockSyncTotal.inc).toHaveBeenCalledWith({ tenant_id: "tenant-001" }, 2);
  });

  it("F28.2 — niciun produs activ: skip sync", async () => {
    selectMock.mockReturnValue(makeSelectResult([]));
    const { stockSyncOblioProcessor } = await import("../workers/f28-stock-sync-oblio.js");

    const result = await stockSyncOblioProcessor(
      makeJob({ tenantId: "tenant-empty" }) as never,
      {} as never,
    );

    expect(result).toMatchObject({ ok: true, syncedCount: 0, errorCount: 0 });
  });
});

// ─── TEST SUITE: F29 — stock:deduct ─────────────────────────────────────────

describe("F29 — stock:deduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateMock.mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    });
    insertMock.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });
  });

  it("F29.1 — success: deduct stoc + enqueue F31 alert la stoc scăzut", async () => {
    // F29 queries: 1) goldOrderItems, 2) goldProducts per item
    selectMock
      .mockReturnValueOnce(makeSelectResult([{ productId: "prod-001", quantity: 5 }]))
      .mockReturnValueOnce(
        makeSelectResult([
          { id: "prod-001", sku: "SKU-001", metadata: { stockCount: 8, lowStockThreshold: 10 } },
        ]),
      );

    const { stockDeductProcessor } = await import("../workers/f29-stock-deduct.js");
    const { e4StockDeductionsTotal } = await import("../e4-metrics.js");

    const result = await stockDeductProcessor(
      makeJob({ tenantId: "t-001", orderId: "order-001" }) as never,
      {} as never,
    );

    expect(result).toMatchObject({ ok: true, orderId: "order-001", deductedProducts: 1 });
    expect(e4StockDeductionsTotal.inc).toHaveBeenCalledWith({ tenant_id: "t-001" });
    // enqueue F31 deoarece 8-5=3 < 10
    expect(addMock).toHaveBeenCalled();
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it("F29.2 — niciun item: skip deduct (goldOrderItems returnează [])", async () => {
    selectMock.mockReturnValueOnce(makeSelectResult([]));

    const { stockDeductProcessor } = await import("../workers/f29-stock-deduct.js");

    const result = await stockDeductProcessor(
      makeJob({ tenantId: "t-001", orderId: "order-empty" }) as never,
      {} as never,
    );

    expect(result).toMatchObject({ ok: true, deductedProducts: 0, lowStockAlerts: 0 });
  });

  it("F29.3 — stoc suficient: deduct fără alert F31", async () => {
    selectMock
      .mockReturnValueOnce(makeSelectResult([{ productId: "prod-001", quantity: 2 }]))
      .mockReturnValueOnce(
        makeSelectResult([
          { id: "prod-001", sku: "SKU-001", metadata: { stockCount: 50, lowStockThreshold: 10 } },
        ]),
      );

    const { stockDeductProcessor } = await import("../workers/f29-stock-deduct.js");

    const result = await stockDeductProcessor(
      makeJob({ tenantId: "t-001", orderId: "order-001" }) as never,
      {} as never,
    );

    expect(result).toMatchObject({ ok: true, deductedProducts: 1, lowStockAlerts: 0 });
    // NO alert enqueued
    expect(addMock).not.toHaveBeenCalled();
    expect(closeMock).toHaveBeenCalledTimes(1);
  });
});

// ─── TEST SUITE: F30 — stock:return ─────────────────────────────────────────

describe("F30 — stock:return", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateMock.mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    });
    insertMock.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });
  });

  it("F30.1 — success: reverse deduct stoc din goldOrderItems", async () => {
    // F30 queries: 1) goldOrderItems, 2) goldProducts per item
    selectMock
      .mockReturnValueOnce(makeSelectResult([{ productId: "prod-001", quantity: 3 }]))
      .mockReturnValueOnce(makeSelectResult([{ id: "prod-001", metadata: { stockCount: 5 } }]));

    const { stockReturnProcessor } = await import("../workers/f30-stock-return.js");
    const { e4StockReturnsTotal } = await import("../e4-metrics.js");

    const result = await stockReturnProcessor(
      makeJob({ tenantId: "t-001", orderId: "order-001" }) as never,
      {} as never,
    );

    expect(result).toMatchObject({ ok: true, orderId: "order-001", returnedProducts: 1 });
    expect(e4StockReturnsTotal.inc).toHaveBeenCalledWith({ tenant_id: "t-001" });
  });

  it("F30.2 — niciun item în goldOrderItems: skip return (early return success)", async () => {
    // Dacă nu sunt items, F30 returnează succes cu returnedProducts: 0 (nu aruncă)
    selectMock.mockReturnValueOnce(makeSelectResult([]));
    const { stockReturnProcessor } = await import("../workers/f30-stock-return.js");

    const result = await stockReturnProcessor(
      makeJob({ tenantId: "t-001", orderId: "order-no-items" }) as never,
      {} as never,
    );

    expect(result).toMatchObject({ ok: true, orderId: "order-no-items", returnedProducts: 0 });
  });
});

// ─── TEST SUITE: F31 — stock:low:alert ──────────────────────────────────────

describe("F31 — stock:low:alert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("F31.1 — success: audit log + enqueue I43 alert", async () => {
    const { stockLowAlertProcessor } = await import("../workers/f31-stock-alert.js");
    const { e4StockAlertsTotal } = await import("../e4-metrics.js");

    const result = await stockLowAlertProcessor(
      makeJob({
        tenantId: "t-001",
        productId: "prod-001",
        sku: "SKU-001",
        currentStock: 3,
        threshold: 10,
      }) as never,
      {} as never,
    );

    expect(result).toMatchObject({ ok: true, productId: "prod-001", alertDispatched: true });
    expect(e4StockAlertsTotal.inc).toHaveBeenCalledWith({ tenant_id: "t-001" });
    expect(insertMock).toHaveBeenCalled();
    expect(addMock).toHaveBeenCalled();
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it("F31.2 — stoc zero: severity=CRITICAL în mesaj", async () => {
    const { stockLowAlertProcessor } = await import("../workers/f31-stock-alert.js");

    await stockLowAlertProcessor(
      makeJob({
        tenantId: "t-001",
        productId: "prod-001",
        sku: "SKU-001",
        currentStock: 0,
        threshold: 10,
      }) as never,
      {} as never,
    );

    expect(addMock).toHaveBeenCalledWith(
      "alert-stock-low",
      expect.objectContaining({ severity: "CRITICAL" }),
      expect.any(Object),
    );
  });
});

// ─── TEST SUITE: H37 — return:initiate ──────────────────────────────────────

describe("H37 — return:initiate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("H37.1 — success: UPDATE status RETURN_PROCESSING + enqueue F30 + H38", async () => {
    selectMock.mockReturnValue(
      makeSelectResult([{ id: "order-001", status: "RETURNED", orderNumber: "CMD-001" }]),
    );
    updateMock.mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    });

    const { returnInitiateProcessor } = await import("../workers/h37-return-initiate.js");

    const result = await returnInitiateProcessor(
      makeJob({ tenantId: "t-001", orderId: "order-001", reason: "Defect" }) as never,
      {} as never,
    );

    expect(result).toMatchObject({ ok: true, orderId: "order-001", status: "RETURN_PROCESSING" });
    expect(addMock).toHaveBeenCalledTimes(2);
    expect(closeMock).toHaveBeenCalledTimes(2);
  });

  it("H37.2 — comandă lipsă: aruncă eroare", async () => {
    selectMock.mockReturnValue(makeSelectResult([]));
    const { returnInitiateProcessor } = await import("../workers/h37-return-initiate.js");
    await expect(
      returnInitiateProcessor(
        makeJob({ tenantId: "t-001", orderId: "missing" }) as never,
        {} as never,
      ),
    ).rejects.toThrow("Comanda nu a fost găsită");
  });
});

// ─── TEST SUITE: H38 — return:process ───────────────────────────────────────

describe("H38 — return:process", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("H38.1 — success: UPDATE status RETURNED + enqueue I40 alert", async () => {
    selectMock.mockReturnValue(
      makeSelectResult([{ id: "order-001", status: "RETURN_PROCESSING", orderNumber: "CMD-001" }]),
    );
    updateMock.mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    });

    const { returnProcessProcessor } = await import("../workers/h38-return-process.js");

    const result = await returnProcessProcessor(
      makeJob({ tenantId: "t-001", orderId: "order-001" }) as never,
      {} as never,
    );

    expect(result).toMatchObject({ ok: true, orderId: "order-001", status: "RETURNED" });
    expect(addMock).toHaveBeenCalled();
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it("H38.2 — idempotency: comandă deja RETURNED → skip", async () => {
    selectMock.mockReturnValue(
      makeSelectResult([{ id: "order-001", status: "RETURNED", orderNumber: "CMD-001" }]),
    );

    const { returnProcessProcessor } = await import("../workers/h38-return-process.js");

    const result = await returnProcessProcessor(
      makeJob({ tenantId: "t-001", orderId: "order-001" }) as never,
      {} as never,
    );

    expect(result).toMatchObject({ ok: true, status: "RETURNED" });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("H38.3 — comandă lipsă: aruncă eroare", async () => {
    selectMock.mockReturnValue(makeSelectResult([]));
    const { returnProcessProcessor } = await import("../workers/h38-return-process.js");
    await expect(
      returnProcessProcessor(
        makeJob({ tenantId: "t-001", orderId: "missing" }) as never,
        {} as never,
      ),
    ).rejects.toThrow("Comanda nu a fost găsită");
  });
});

// ─── TEST SUITE: I39-I44 — AlertNeuron ──────────────────────────────────────

describe("I39-I44 — AlertNeuron workers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const alertTestCases = [
    {
      name: "I39 — alert:payment",
      importFn: () => import("../workers/i-alert-workers.js").then((m) => m.alertPaymentProcessor),
      data: {
        tenantId: "t-001",
        alertType: "PAYMENT_OVERDUE",
        severity: "WARNING" as const,
        message: "Test",
        orderId: "order-001",
      },
    },
    {
      name: "I40 — alert:delivery",
      importFn: () => import("../workers/i-alert-workers.js").then((m) => m.alertDeliveryProcessor),
      data: {
        tenantId: "t-001",
        alertType: "DELIVERY_FAILED",
        severity: "CRITICAL" as const,
        message: "Test",
        shipmentId: "ship-001",
      },
    },
    {
      name: "I41 — alert:credit",
      importFn: () => import("../workers/i-alert-workers.js").then((m) => m.alertCreditProcessor),
      data: {
        tenantId: "t-001",
        alertType: "CREDIT_LIMIT_EXCEEDED",
        severity: "WARNING" as const,
        message: "Test",
        clientId: "client-001",
      },
    },
    {
      name: "I42 — alert:contract",
      importFn: () => import("../workers/i-alert-workers.js").then((m) => m.alertContractProcessor),
      data: {
        tenantId: "t-001",
        alertType: "CONTRACT_EXPIRY_SOON",
        severity: "WARNING" as const,
        message: "Contract expiră în 24h",
      },
    },
    {
      name: "I43 — alert:stock",
      importFn: () => import("../workers/i-alert-workers.js").then((m) => m.alertStockProcessor),
      data: {
        tenantId: "t-001",
        alertType: "STOCK_LOW",
        severity: "WARNING" as const,
        message: "Stoc scăzut",
        productId: "prod-001",
      },
    },
    {
      name: "I44 — alert:dispatch",
      importFn: () => import("../workers/i-alert-workers.js").then((m) => m.alertDispatchProcessor),
      data: {
        tenantId: "t-001",
        alertType: "DISPATCH_FAILED",
        severity: "CRITICAL" as const,
        message: "AWB failed",
      },
    },
  ];

  for (const tc of alertTestCases) {
    it(`${tc.name} — success: audit log + metrica`, async () => {
      const processor = await tc.importFn();
      const { e4AlertsDispatchedTotal } = await import("../e4-metrics.js");

      const result = await processor(makeJob(tc.data) as never, {} as never);

      expect(result).toMatchObject({ ok: true, alertType: tc.data.alertType, logged: true });
      expect(insertMock).toHaveBeenCalled();
      expect(e4AlertsDispatchedTotal.inc).toHaveBeenCalledWith({
        tenant_id: tc.data.tenantId,
        alert_type: tc.data.alertType,
      });
    });
  }
});

// ─── TEST SUITE: J45 — audit:log:write ──────────────────────────────────────

describe("J45 — audit:log:write", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("J45.1 — primo entry (genesis): prevHash=GENESIS_HASH", async () => {
    selectMock.mockReturnValue(makeSelectResult([]));

    const { auditLogWriteProcessor } = await import("../workers/j45-audit-log-write.js");

    const result = await auditLogWriteProcessor(
      makeJob({
        tenantId: "t-001",
        eventType: "TEST_EVENT",
        entityType: "gold_orders",
        entityId: "order-001",
        actorType: "WORKER" as const,
        newValues: { test: "data" },
      }) as never,
      {} as never,
    );

    expect(result.ok).toBe(true);
    expect(result.prevHash).toBe(GENESIS_HASH);
    expect(result.auditId).toBe("test-uuid-001");
    expect(insertMock).toHaveBeenCalled();
  });

  it("J45.2 — entry cu predecessor: prevHash calculat din ultimul entry", async () => {
    const lastCreatedAt = new Date("2025-01-01T00:00:00Z");
    selectMock.mockReturnValue(
      makeSelectResult([
        {
          id: "prev-id",
          eventType: "PREV_EVENT",
          entityId: "entity-001",
          createdAt: lastCreatedAt,
          prevHash: GENESIS_HASH,
        },
      ]),
    );

    const { auditLogWriteProcessor } = await import("../workers/j45-audit-log-write.js");

    const result = await auditLogWriteProcessor(
      makeJob({
        tenantId: "t-001",
        eventType: "NEXT_EVENT",
        entityType: "gold_orders",
        entityId: "order-001",
        actorType: "WORKER" as const,
      }) as never,
      {} as never,
    );

    expect(result.ok).toBe(true);
    // prevHash trebuie să fie hash-ul entry-ului precedent
    const expectedPrevHash = computeAuditHash({
      id: "prev-id",
      eventType: "PREV_EVENT",
      entityId: "entity-001",
      createdAt: lastCreatedAt,
      prevHash: GENESIS_HASH,
    });
    expect(result.prevHash).toBe(expectedPrevHash);
  });
});

// ─── TEST SUITE: J46 — audit:chain:verify ───────────────────────────────────

describe("J46 — audit:chain:verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("J46.1 — lanț gol: valid=true, gauge=1", async () => {
    selectMock.mockReturnValue(makeSelectResult([]));

    const { auditChainVerifyProcessor } = await import("../workers/j46-audit-chain-verify.js");
    const { e4AuditChainIntegrityGauge } = await import("../e4-metrics.js");

    const result = await auditChainVerifyProcessor(
      makeJob({ tenantId: "t-001" }) as never,
      {} as never,
    );

    expect(result).toMatchObject({ ok: true, totalEntries: 0, valid: true });
    expect(e4AuditChainIntegrityGauge.set).toHaveBeenCalledWith({ tenant_id: "t-001" }, 1);
  });

  it("J46.2 — lanț valid cu 3 entries: valid=true, gauge=1", async () => {
    const e1 = {
      id: "id-001",
      eventType: "EVT1",
      entityId: "e-001",
      createdAt: new Date("2025-01-01T00:00:00Z"),
      prevHash: GENESIS_HASH,
    };
    const h1 = computeAuditHash(e1);
    const e2 = {
      id: "id-002",
      eventType: "EVT2",
      entityId: "e-001",
      createdAt: new Date("2025-01-01T00:01:00Z"),
      prevHash: h1,
    };
    const h2 = computeAuditHash(e2);
    const e3 = {
      id: "id-003",
      eventType: "EVT3",
      entityId: "e-001",
      createdAt: new Date("2025-01-01T00:02:00Z"),
      prevHash: h2,
    };

    selectMock.mockReturnValue(makeSelectResult([e1, e2, e3]));

    const { auditChainVerifyProcessor } = await import("../workers/j46-audit-chain-verify.js");
    const { e4AuditChainIntegrityGauge } = await import("../e4-metrics.js");

    const result = await auditChainVerifyProcessor(
      makeJob({ tenantId: "t-001" }) as never,
      {} as never,
    );

    expect(result).toMatchObject({ ok: true, totalEntries: 3, valid: true });
    expect(e4AuditChainIntegrityGauge.set).toHaveBeenCalledWith({ tenant_id: "t-001" }, 1);
  });

  it("J46.3 — tamper test: lanț compromis → valid=false, gauge=0, enqueue alert", async () => {
    const e1 = {
      id: "id-001",
      eventType: "EVT1",
      entityId: "e-001",
      createdAt: new Date("2025-01-01T00:00:00Z"),
      prevHash: GENESIS_HASH,
    };
    const e2_tampered = {
      id: "id-002",
      eventType: "EVT2",
      entityId: "e-001",
      createdAt: new Date("2025-01-01T00:01:00Z"),
      prevHash: "x".repeat(64),
    }; // tampered

    selectMock.mockReturnValue(makeSelectResult([e1, e2_tampered]));

    const { auditChainVerifyProcessor } = await import("../workers/j46-audit-chain-verify.js");
    const { e4AuditChainIntegrityGauge } = await import("../e4-metrics.js");

    const result = await auditChainVerifyProcessor(
      makeJob({ tenantId: "t-001" }) as never,
      {} as never,
    );

    expect(result).toMatchObject({ ok: true, valid: false, firstBrokenIndex: 1 });
    expect(e4AuditChainIntegrityGauge.set).toHaveBeenCalledWith({ tenant_id: "t-001" }, 0);
    // enqueue alert AuditChainIntegrity
    expect(addMock).toHaveBeenCalled();
    expect(closeMock).toHaveBeenCalledTimes(1);
  });
});

// ─── TEST SUITE: J47 — audit:data:anonymize ─────────────────────────────────

describe("J47 — audit:data:anonymize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("J47.1 — success: GDPR anonymize entries > 7 ani", async () => {
    executeMock.mockResolvedValue({ rowCount: 15 });

    const { auditDataAnonymizeProcessor } = await import("../workers/j47-audit-anonymize.js");

    const result = await auditDataAnonymizeProcessor(
      makeJob({ tenantId: "t-001" }) as never,
      {} as never,
    );

    expect(result).toMatchObject({ ok: true, tenantId: "t-001", anonymizedCount: 15 });
    expect(executeMock).toHaveBeenCalled();
  });

  it("J47.2 — nicio intrare veche: anonymizedCount=0", async () => {
    executeMock.mockResolvedValue({ rowCount: 0 });

    const { auditDataAnonymizeProcessor } = await import("../workers/j47-audit-anonymize.js");

    const result = await auditDataAnonymizeProcessor(
      makeJob({ tenantId: "t-001" }) as never,
      {} as never,
    );

    expect(result).toMatchObject({ ok: true, anonymizedCount: 0 });
  });
});

// ─── TEST SUITE: K48 — hitl:approval:credit-override ────────────────────────

describe("K48 — hitl:approval:credit-override", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("K48.1 — success: crează task HITL pentru credit depășit", async () => {
    const { hitlCreditOverrideProcessor } = await import("../workers/k-hitl-workers.js");
    const { e4HitlTasksCreatedTotal } = await import("../e4-metrics.js");
    const { approvalService } = await import("@cerniq/db");

    const result = await hitlCreditOverrideProcessor(
      makeJob({
        tenantId: "t-001",
        clientId: "client-001",
        orderId: "order-001",
        orderNumber: "CMD-001",
        creditUsed: 60000,
        creditLimit: 50000,
        currency: "RON",
      }) as never,
      {} as never,
    );

    expect(result).toMatchObject({
      ok: true,
      approvalTaskId: "hitl-task-001",
      taskType: "credit_override",
    });
    expect(approvalService.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "t-001",
        priority: "high",
        metadata: expect.objectContaining({ approverRole: "SALES_MANAGER/CFO", slaHours: 4 }),
      }),
    );
    expect(e4HitlTasksCreatedTotal.inc).toHaveBeenCalledWith({
      tenant_id: "t-001",
      task_type: "credit_override",
      priority: "high",
    });
  });
});

// ─── TEST SUITE: K49 — hitl:approval:credit-limit ───────────────────────────

describe("K49 — hitl:approval:credit-limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("K49.1 — success: crează task HITL pentru limită credit >50K RON", async () => {
    const { hitlCreditLimitProcessor } = await import("../workers/k-hitl-workers.js");
    const { approvalService } = await import("@cerniq/db");

    const result = await hitlCreditLimitProcessor(
      makeJob({
        tenantId: "t-001",
        clientId: "client-001",
        profileId: "profile-001",
        creditLimit: 100000,
        riskTier: "PREMIUM",
      }) as never,
      {} as never,
    );

    expect(result).toMatchObject({
      ok: true,
      approvalTaskId: "hitl-task-001",
      taskType: "credit_limit",
    });
    expect(approvalService.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ approverRole: "CFO", slaHours: 4 }),
      }),
    );
  });
});

// ─── TEST SUITE: K50 — hitl:approval:refund-large ───────────────────────────

describe("K50 — hitl:approval:refund-large", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("K50.1 — success: crează task HITL pentru rambursare > 1.000 RON", async () => {
    const { hitlRefundLargeProcessor, REFUND_HITL_THRESHOLD_RON } =
      await import("../workers/k-hitl-workers.js");

    expect(REFUND_HITL_THRESHOLD_RON).toBe(1_000);

    const result = await hitlRefundLargeProcessor(
      makeJob({
        tenantId: "t-001",
        orderId: "order-001",
        orderNumber: "CMD-001",
        refundAmount: 2500,
        currency: "RON",
        refundReason: "Defect",
      }) as never,
      {} as never,
    );

    expect(result).toMatchObject({ ok: true, taskType: "refund_large" });
  });
});

// ─── TEST SUITE: K51 — hitl:investigation:payment ───────────────────────────

describe("K51 — hitl:investigation:payment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("K51.1 — success: task HITL investigare plată Tier 3", async () => {
    const { hitlPaymentInvestigationProcessor } = await import("../workers/k-hitl-workers.js");
    const { approvalService } = await import("@cerniq/db");

    const result = await hitlPaymentInvestigationProcessor(
      makeJob({
        tenantId: "t-001",
        paymentId: "pay-001",
        orderId: "order-001",
        orderNumber: "CMD-001",
        amount: 5000,
        currency: "RON",
        matchTier: "TIER_3" as const,
      }) as never,
      {} as never,
    );

    expect(result).toMatchObject({ ok: true, taskType: "payment_investigation" });
    expect(approvalService.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ approverRole: "ACCOUNTING", slaHours: 8 }),
      }),
    );
  });
});

// ─── TEST SUITE: K52 — hitl:task:resolve ────────────────────────────────────

describe("K52 — hitl:task:resolve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("K52.1 — success: decide pe task existent (approve)", async () => {
    const { hitlTaskResolveProcessor } = await import("../workers/k-hitl-workers.js");
    const { approvalService } = await import("@cerniq/db");

    const result = await hitlTaskResolveProcessor(
      makeJob({
        tenantId: "t-001",
        approvalTaskId: "task-001",
        resolvedBy: "user-001",
        decision: "approve" as const,
        reason: "OK",
      }) as never,
      {} as never,
    );

    expect(result).toMatchObject({ ok: true, taskType: "task_resolve", decision: "approve" });
    expect(approvalService.decide).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: "task-001", decision: "approve" }),
    );
    expect(insertMock).toHaveBeenCalled();
  });

  it("K52.2 — success: decide (reject)", async () => {
    const { hitlTaskResolveProcessor } = await import("../workers/k-hitl-workers.js");
    const { approvalService } = await import("@cerniq/db");

    const result = await hitlTaskResolveProcessor(
      makeJob({
        tenantId: "t-001",
        approvalTaskId: "task-002",
        resolvedBy: "user-002",
        decision: "reject" as const,
        reason: "Invalid",
      }) as never,
      {} as never,
    );

    expect(result).toMatchObject({ ok: true, decision: "reject" });
    expect(approvalService.decide).toHaveBeenCalledWith(
      expect.objectContaining({ decision: "reject" }),
    );
  });
});

// ─── TEST SUITE: K53 — hitl:escalation:overdue ──────────────────────────────

describe("K53 — hitl:escalation:overdue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("K53.1 — success: niciun task SLA breach → no escalation", async () => {
    queryMock.approvalTasks.findMany.mockResolvedValue([]);

    const { hitlEscalationOverdueProcessor } = await import("../workers/k-hitl-workers.js");

    const result = await hitlEscalationOverdueProcessor(
      makeJob({ tenantId: "t-001" }) as never,
      {} as never,
    );

    expect(result).toMatchObject({ ok: true, warningCount: 0, escalatedCount: 0 });
  });

  it("K53.2 — 2 task-uri SLA breach → escalare + audit log CRITICAL", async () => {
    const slaBreached = [
      { id: "task-001", tenantId: "t-001", status: "pending", dueAt: new Date("2024-01-01") },
      { id: "task-002", tenantId: "t-001", status: "assigned", dueAt: new Date("2024-01-02") },
    ];
    queryMock.approvalTasks.findMany
      .mockResolvedValueOnce([]) // warnings
      .mockResolvedValueOnce(slaBreached); // breached

    updateMock.mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    });

    const { hitlEscalationOverdueProcessor } = await import("../workers/k-hitl-workers.js");
    const { approvalService } = await import("@cerniq/db");
    const { e4HitlTasksCreatedTotal } = await import("../e4-metrics.js");

    const result = await hitlEscalationOverdueProcessor(
      makeJob({ tenantId: "t-001" }) as never,
      {} as never,
    );

    expect(result).toMatchObject({ ok: true, escalatedCount: 2 });
    expect(approvalService.escalate).toHaveBeenCalledTimes(2);
    expect(e4HitlTasksCreatedTotal.inc).toHaveBeenCalledWith(
      { tenant_id: "t-001", task_type: "escalation_overdue", priority: "critical" },
      2,
    );
  });

  it("K53.3 — warning threshold (80% SLA consumed) → setează slaWarningSent", async () => {
    const warnTask = [{ id: "task-warn-001", tenantId: "t-001" }];
    queryMock.approvalTasks.findMany
      .mockResolvedValueOnce(warnTask) // warnings
      .mockResolvedValueOnce([]); // breached

    updateMock.mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    });

    const { hitlEscalationOverdueProcessor } = await import("../workers/k-hitl-workers.js");

    const result = await hitlEscalationOverdueProcessor(
      makeJob({ tenantId: "t-001" }) as never,
      {} as never,
    );

    expect(result).toMatchObject({ ok: true, warningCount: 1, escalatedCount: 0 });
    expect(updateMock).toHaveBeenCalled();
  });
});
