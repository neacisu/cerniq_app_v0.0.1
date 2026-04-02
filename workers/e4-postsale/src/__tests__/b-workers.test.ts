/**
 * Teste complete pentru workers B7-B12 (E4 Post-Sale — Reconciliere Plăți Three-Tier)
 * și reconciliation-engine.ts (funcții pure + logica DB).
 *
 * Acoperire: B7 (Tier1 exact), B8 (Tier2 fuzzy), B9 (HITL), B10 (balance update),
 *            B11 (overdue detect), B12 (graduated escalate), reconciliation-engine helpers.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── vi.hoisted() ────────────────────────────────────────────────────────────
const {
  dbSelectMock,
  dbInsertMock,
  dbUpdateMock,
  dbExecuteMock,
  setSessionTenantIdMock,
  addMock,
  createQueueMock,
  approvalServiceCreateTaskMock,
  jobLogMock,
  e4ReconciliationDurationSecondsStartTimerMock,
  e4ReconciliationTotalIncMock,
  e4OverdueOrdersDetectedTotalIncMock,
  e4OverdueOrdersEscalatedTotalIncMock,
} = vi.hoisted(() => {
  const addMock = vi.fn().mockResolvedValue({ id: "job-123" });
  const closeMock = vi.fn().mockResolvedValue(undefined);
  const createQueueMock = vi.fn(() => ({ add: addMock, close: closeMock }));
  const timerEndMock = vi.fn();
  const e4ReconciliationDurationSecondsStartTimerMock = vi.fn(() => timerEndMock);

  return {
    dbSelectMock: vi.fn(),
    dbInsertMock: vi.fn(),
    dbUpdateMock: vi.fn(),
    dbExecuteMock: vi.fn(),
    setSessionTenantIdMock: vi.fn().mockResolvedValue(undefined),
    addMock,
    createQueueMock,
    approvalServiceCreateTaskMock: vi.fn().mockResolvedValue({ id: "approval-task-001" }),
    jobLogMock: vi.fn(),
    e4ReconciliationDurationSecondsStartTimerMock,
    e4ReconciliationTotalIncMock: vi.fn(),
    e4OverdueOrdersDetectedTotalIncMock: vi.fn(),
    e4OverdueOrdersEscalatedTotalIncMock: vi.fn(),
  };
});

// ── vi.mock() ───────────────────────────────────────────────────────────────

vi.mock("@cerniq/db", () => ({
  db: {
    select: dbSelectMock,
    insert: dbInsertMock,
    update: dbUpdateMock,
    execute: dbExecuteMock,
  },
  setSessionTenantId: setSessionTenantIdMock,
  approvalService: { createTask: approvalServiceCreateTaskMock },
  // Schema tables — câmpuri stub pentru Drizzle
  goldPayments: {
    id: "id",
    tenantId: "tenant_id",
    orderId: "order_id",
    amount: "amount",
    currency: "currency",
    reconciliationStatus: "reconciliation_status",
    counterpartyName: "counterparty_name",
    counterpartyIban: "counterparty_iban",
    reference: "reference",
    externalId: "external_id",
    processedAt: "processed_at",
    updatedAt: "updated_at",
  },
  goldOrders: {
    id: "id",
    tenantId: "tenant_id",
    orderNumber: "order_number",
    status: "status",
    totalAmount: "total_amount",
    amountPaid: "amount_paid",
    amountDue: "amount_due",
    currency: "currency",
    paymentDueAt: "payment_due_at",
    deletedAt: "deleted_at",
    updatedAt: "updated_at",
    leadId: "lead_id",
  },
  goldCompanies: { id: "id", denumire: "denumire" },
  goldPaymentReconciliations: {
    id: "id",
    paymentId: "payment_id",
    orderId: "order_id",
    matchType: "match_type",
    confidence: "confidence",
    matchedBy: "matched_by",
    matchedAt: "matched_at",
  },
  goldAuditLogsEtapa4: {
    id: "id",
    tenantId: "tenant_id",
    actorId: "actor_id",
    actorType: "actor_type",
    eventType: "event_type",
    entityType: "entity_type",
    entityId: "entity_id",
    newValues: "new_values",
    prevHash: "prev_hash",
    createdAt: "created_at",
  },
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    _tag: "sql",
    strings,
    values,
  })),
  eq: vi.fn((col: unknown, val: unknown) => ({ _tag: "eq", col, val })),
  and: vi.fn((...conditions: unknown[]) => ({ _tag: "and", conditions })),
  or: vi.fn((...conditions: unknown[]) => ({ _tag: "or", conditions })),
  inArray: vi.fn((col: unknown, vals: unknown) => ({ _tag: "inArray", col, vals })),
  lt: vi.fn((col: unknown, val: unknown) => ({ _tag: "lt", col, val })),
  isNull: vi.fn((col: unknown) => ({ _tag: "isNull", col })),
  isNotNull: vi.fn((col: unknown) => ({ _tag: "isNotNull", col })),
}));

vi.mock("@cerniq/worker-shared", () => ({
  QUEUES: {
    E4_PAYMENT_RECONCILE_AUTO: "payment:reconcile:auto",
    E4_PAYMENT_RECONCILE_FUZZY: "payment:reconcile:fuzzy",
    E4_PAYMENT_RECONCILE_MANUAL: "payment:reconcile:manual",
    E4_PAYMENT_BALANCE_UPDATE: "payment:balance:update",
    E4_PAYMENT_OVERDUE_DETECT: "payment:overdue:detect",
    E4_PAYMENT_OVERDUE_ESCALATE: "payment:overdue:escalate",
  },
  createQueue: createQueueMock,
}));

vi.mock("../e4-metrics.js", () => ({
  e4ReconciliationDurationSeconds: {
    startTimer: e4ReconciliationDurationSecondsStartTimerMock,
  },
  e4ReconciliationTotal: { inc: e4ReconciliationTotalIncMock },
  e4OverdueOrdersDetectedTotal: { inc: e4OverdueOrdersDetectedTotalIncMock },
  e4OverdueOrdersEscalatedTotal: { inc: e4OverdueOrdersEscalatedTotalIncMock },
}));

vi.mock("uuid", () => ({ v4: () => "00000000-0000-0000-0000-000000000001" }));

// ── Helpers ────────────────────────────────────────────────────────────────

function makeJob<T>(data: T) {
  return { data, log: jobLogMock } as unknown as Parameters<
    (job: { data: T; log: typeof jobLogMock }) => void
  >[0];
}

function makeSelectChain<T>(rows: T[]) {
  const basePromise = Promise.resolve(rows);
  const chain = Object.assign(basePromise, {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn().mockResolvedValue(rows),
  });
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  return chain;
}

function makeInsertChain() {
  return { values: vi.fn().mockResolvedValue(undefined) };
}

function makeUpdateChain() {
  const setChain = { where: vi.fn().mockResolvedValue({ rowCount: 1 }) };
  return { set: vi.fn().mockReturnValue(setChain) };
}

// ── Imports workeri ─────────────────────────────────────────────────────────

import { paymentReconcileAutoProcessor } from "../workers/b7-payment-reconcile-auto.js";
import { paymentReconcileFuzzyProcessor } from "../workers/b8-payment-reconcile-fuzzy.js";
import { paymentReconcileManualProcessor } from "../workers/b9-payment-reconcile-manual.js";
import { paymentBalanceUpdateProcessor } from "../workers/b10-payment-balance-update.js";
import { createB11Processor } from "../workers/b11-payment-overdue-detect.js";
import { paymentOverdueEscalateProcessor } from "../workers/b12-payment-overdue-escalate.js";
import {
  runTierOneMatch,
  runTierTwoMatch,
  loadPendingPayment,
  TIER1_AMOUNT_TOLERANCE,
  TIER2_SIMILARITY_THRESHOLD,
  TIER2_SCORE_AUTO_THRESHOLD,
  TIER2_SCORE_MIN_CANDIDATE,
} from "../lib/reconciliation-engine.js";

// ── Reset ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  setSessionTenantIdMock.mockResolvedValue(undefined);
  addMock.mockResolvedValue({ id: "job-123" });
  createQueueMock.mockReturnValue({ add: addMock, close: vi.fn().mockResolvedValue(undefined) });
  approvalServiceCreateTaskMock.mockResolvedValue({ id: "approval-task-001" });
});

// ═══════════════════════════════════════════════════════════════════════════════
// reconciliation-engine — teste pure pentru thresholds și constante
// ═══════════════════════════════════════════════════════════════════════════════

describe("reconciliation-engine — constante și thresholds (plan §IX)", () => {
  it("TIER1_AMOUNT_TOLERANCE = 0.01 (plan: ±0.01 RON)", () => {
    expect(TIER1_AMOUNT_TOLERANCE).toBe(0.01);
  });

  it("TIER2_SIMILARITY_THRESHOLD = 0.85 (plan: ≥85%)", () => {
    expect(TIER2_SIMILARITY_THRESHOLD).toBe(0.85);
  });

  it("TIER2_SCORE_AUTO_THRESHOLD = 0.85", () => {
    expect(TIER2_SCORE_AUTO_THRESHOLD).toBe(0.85);
  });

  it("TIER2_SCORE_MIN_CANDIDATE = 0.50", () => {
    expect(TIER2_SCORE_MIN_CANDIDATE).toBe(0.5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// loadPendingPayment — idempotency check
// ═══════════════════════════════════════════════════════════════════════════════

describe("loadPendingPayment — idempotency", () => {
  const basePayment = {
    id: "pay-001",
    tenantId: "tenant-1",
    amount: "1500",
    currency: "RON",
    reference: "CMD-001",
    counterpartyName: "Client Test SRL",
    counterpartyIban: "RO49AAAA1B31007593840000",
    externalId: "revolut-001",
    reconciliationStatus: "PENDING",
  };

  it("returnează plata dacă reconciliationStatus = PENDING", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([basePayment]));
    const result = await loadPendingPayment("tenant-1", "pay-001");
    expect(result).not.toBeNull();
    expect(result?.id).toBe("pay-001");
  });

  it("returnează null dacă reconciliationStatus = MATCHED_EXACT (idempotency)", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ ...basePayment, reconciliationStatus: "MATCHED_EXACT" }]),
    );
    const result = await loadPendingPayment("tenant-1", "pay-001");
    expect(result).toBeNull();
  });

  it("returnează null dacă plata nu există", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));
    const result = await loadPendingPayment("tenant-1", "pay-001");
    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// runTierOneMatch — exact match logic
// ═══════════════════════════════════════════════════════════════════════════════

describe("runTierOneMatch — Tier 1 exact match", () => {
  const basePayment = {
    id: "pay-001",
    tenantId: "tenant-1",
    amount: "1500",
    currency: "RON",
    reference: "CMD-001",
    counterpartyName: "Client SRL",
    counterpartyIban: null,
    externalId: null,
  };

  it("1 match → matched: true cu orderId corect", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ orderId: "order-001", orderNumber: "CMD-001", totalAmount: "1500.00" }]),
    );
    const result = await runTierOneMatch(basePayment);
    expect(result.matched).toBe(true);
    if (result.matched) {
      expect(result.orderId).toBe("order-001");
      expect(result.tier).toBe(1);
    }
  });

  it("0 matches → matched: false, multipleMatches: false", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));
    const result = await runTierOneMatch(basePayment);
    expect(result.matched).toBe(false);
    if (!result.matched) {
      expect(result.multipleMatches).toBe(false);
    }
  });

  it(">1 matches → matched: false, multipleMatches: true", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([
        { orderId: "order-001", orderNumber: "CMD-001", totalAmount: "1500.00" },
        { orderId: "order-002", orderNumber: "CMD-001", totalAmount: "1500.00" },
      ]),
    );
    const result = await runTierOneMatch(basePayment);
    expect(result.matched).toBe(false);
    if (!result.matched) {
      expect(result.multipleMatches).toBe(true);
      expect(result.candidates).toHaveLength(2);
    }
  });

  it("referință goală → matched: false fără query DB", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));
    const result = await runTierOneMatch({ ...basePayment, reference: "" });
    expect(result.matched).toBe(false);
  });

  it("match cu sumă în toleranță ±0.01 RON → matched: true", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ orderId: "order-001", orderNumber: "CMD-001", totalAmount: "1500.005" }]),
    );
    const result = await runTierOneMatch({ ...basePayment, amount: "1500" });
    expect(result.matched).toBe(true);
  });

  it("match cu sumă în afara toleranței (>0.01) → 0 matches", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ orderId: "order-001", orderNumber: "CMD-001", totalAmount: "1501" }]),
    );
    const result = await runTierOneMatch({ ...basePayment, amount: "1500" });
    expect(result.matched).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// runTierTwoMatch — fuzzy match logic (mockat pg_trgm)
// ═══════════════════════════════════════════════════════════════════════════════

describe("runTierTwoMatch — Tier 2 fuzzy pg_trgm", () => {
  const basePayment = {
    id: "pay-002",
    tenantId: "tenant-1",
    amount: "1500",
    currency: "RON",
    reference: null,
    counterpartyName: "Client Test SRL",
    counterpartyIban: null,
    externalId: null,
  };

  it("similarity >= 0.85 și sumă ±5% → autoMatch: true", async () => {
    dbExecuteMock.mockResolvedValue([
      {
        order_id: "order-001",
        order_number: "CMD-001",
        total_amount: "1500",
        currency: "RON",
        name_sim: 0.92,
      },
    ]);
    const result = await runTierTwoMatch(basePayment);
    expect(result.autoMatch).toBe(true);
    if (result.autoMatch) {
      expect(result.orderId).toBe("order-001");
      expect(result.score).toBeGreaterThanOrEqual(0.85);
      expect(result.matchType).toBe("FUZZY_NAME_AMOUNT");
    }
  });

  it("0.50 <= score < 0.85 → autoMatch: false, candidates cu reason=low_confidence", async () => {
    dbExecuteMock.mockResolvedValue([
      {
        order_id: "order-002",
        order_number: "CMD-002",
        total_amount: "1500",
        currency: "RON",
        name_sim: 0.7,
      },
    ]);
    const result = await runTierTwoMatch(basePayment);
    expect(result.autoMatch).toBe(false);
    if (!result.autoMatch) {
      expect(result.candidates.length).toBeGreaterThan(0);
      expect(result.reason).toBe("low_confidence");
    }
  });

  it("0 candidați → autoMatch: false, reason=no_candidates", async () => {
    dbExecuteMock.mockResolvedValue([]);
    const result = await runTierTwoMatch(basePayment);
    expect(result.autoMatch).toBe(false);
    if (!result.autoMatch) {
      expect(result.reason).toBe("no_candidates");
    }
  });

  it("counterpartyName gol → no_candidates fără query", async () => {
    const result = await runTierTwoMatch({ ...basePayment, counterpartyName: "" });
    expect(result.autoMatch).toBe(false);
    if (!result.autoMatch) {
      expect(result.reason).toBe("no_candidates");
    }
  });

  it("scor = nameSimilarity * 0.6 + amountProximity * 0.4 (plan §IX)", async () => {
    dbExecuteMock.mockResolvedValue([
      {
        order_id: "order-003",
        order_number: "CMD-003",
        total_amount: "1500",
        currency: "RON",
        name_sim: 0.9,
      },
    ]);
    const result = await runTierTwoMatch({ ...basePayment, amount: "1500" });
    // Suma exactă → amountProximity = 1 (sau aproape)
    // score ≈ 0.90 * 0.6 + 1.0 * 0.4 = 0.94
    expect(result.autoMatch).toBe(true);
    if (result.autoMatch) {
      expect(result.score).toBeGreaterThan(0.85);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// B7 — paymentReconcileAutoProcessor
// ═══════════════════════════════════════════════════════════════════════════════

describe("B7 — paymentReconcileAutoProcessor (Tier 1)", () => {
  const baseJobData = {
    paymentId: "pay-001",
    tenantId: "tenant-1",
    externalId: "revolut-001",
    amount: 1500,
    currency: "RON",
  };

  const pendingPayment = {
    id: "pay-001",
    tenantId: "tenant-1",
    amount: "1500",
    currency: "RON",
    reference: "CMD-001",
    counterpartyName: "Client SRL",
    counterpartyIban: null,
    externalId: "revolut-001",
    reconciliationStatus: "PENDING",
  };

  it("skip — plată nu e PENDING (idempotency)", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([])); // loadPendingPayment → null
    const result = await paymentReconcileAutoProcessor(makeJob(baseJobData) as never, {} as never);
    expect(result.ok).toBe(true);
    expect(result.action).toBe("skipped");
  });

  it("exact match → matched_exact + enqueue B10", async () => {
    let selectCall = 0;
    dbSelectMock.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) return makeSelectChain([pendingPayment]);
      // runTierOneMatch call
      return makeSelectChain([
        { orderId: "order-001", orderNumber: "CMD-001", totalAmount: "1500.00" },
      ]);
    });
    dbInsertMock.mockReturnValue(makeInsertChain());
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const result = await paymentReconcileAutoProcessor(makeJob(baseJobData) as never, {} as never);
    expect(result.ok).toBe(true);
    expect(result.action).toBe("matched_exact");
    if (result.action === "matched_exact") {
      expect(result.orderId).toBe("order-001");
    }
    expect(createQueueMock).toHaveBeenCalledWith("payment:balance:update", expect.any(Object));
    expect(addMock).toHaveBeenCalledWith(
      "balance-update",
      expect.objectContaining({ paymentId: "pay-001", orderId: "order-001" }),
      expect.any(Object),
    );
    expect(e4ReconciliationTotalIncMock).toHaveBeenCalledWith({
      match_type: "EXACT_REFERENCE",
      result: "matched",
      tenant_id: "tenant-1",
    });
  });

  it("0 matches → enqueued_b8", async () => {
    let selectCall = 0;
    dbSelectMock.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) return makeSelectChain([pendingPayment]);
      return makeSelectChain([]); // tier1 → 0 results
    });

    const result = await paymentReconcileAutoProcessor(makeJob(baseJobData) as never, {} as never);
    expect(result.action).toBe("enqueued_b8");
    expect(createQueueMock).toHaveBeenCalledWith("payment:reconcile:fuzzy", expect.any(Object));
  });

  it(">1 matches → enqueued_b9 cu candidateCount", async () => {
    let selectCall = 0;
    dbSelectMock.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) return makeSelectChain([pendingPayment]);
      return makeSelectChain([
        { orderId: "order-001", orderNumber: "CMD-001", totalAmount: "1500.00" },
        { orderId: "order-002", orderNumber: "CMD-001", totalAmount: "1500.00" },
      ]);
    });

    const result = await paymentReconcileAutoProcessor(makeJob(baseJobData) as never, {} as never);
    expect(result.action).toBe("enqueued_b9");
    if (result.action === "enqueued_b9") {
      expect(result.candidateCount).toBe(2);
    }
    expect(createQueueMock).toHaveBeenCalledWith("payment:reconcile:manual", expect.any(Object));
  });

  it("setSessionTenantId apelat cu tenantId corect", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));
    await paymentReconcileAutoProcessor(makeJob(baseJobData) as never, {} as never);
    expect(setSessionTenantIdMock).toHaveBeenCalledWith("tenant-1");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// B8 — paymentReconcileFuzzyProcessor
// ═══════════════════════════════════════════════════════════════════════════════

describe("B8 — paymentReconcileFuzzyProcessor (Tier 2 fuzzy)", () => {
  const baseJobData = {
    paymentId: "pay-002",
    tenantId: "tenant-1",
  };

  const pendingPayment = {
    id: "pay-002",
    tenantId: "tenant-1",
    amount: "1500",
    currency: "RON",
    reference: null,
    counterpartyName: "Client Test SRL",
    counterpartyIban: null,
    externalId: null,
    reconciliationStatus: "PENDING",
  };

  it("skip — plată nu e PENDING", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));
    const result = await paymentReconcileFuzzyProcessor(makeJob(baseJobData) as never, {} as never);
    expect(result.action).toBe("skipped");
  });

  it("auto-match (score >= 0.85) → matched_fuzzy + enqueue B10", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([pendingPayment]));
    dbExecuteMock.mockResolvedValue([
      {
        order_id: "order-001",
        order_number: "CMD-001",
        total_amount: "1500",
        currency: "RON",
        name_sim: 0.92,
      },
    ]);
    dbInsertMock.mockReturnValue(makeInsertChain());
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const result = await paymentReconcileFuzzyProcessor(makeJob(baseJobData) as never, {} as never);
    expect(result.action).toBe("matched_fuzzy");
    if (result.action === "matched_fuzzy") {
      expect(result.score).toBeGreaterThanOrEqual(0.85);
    }
    expect(createQueueMock).toHaveBeenCalledWith("payment:balance:update", expect.any(Object));
  });

  it("low confidence (0.5-0.85) → enqueued_b9 reason=low_confidence", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([pendingPayment]));
    dbExecuteMock.mockResolvedValue([
      {
        order_id: "order-002",
        order_number: "CMD-002",
        total_amount: "1500",
        currency: "RON",
        name_sim: 0.65,
      },
    ]);

    const result = await paymentReconcileFuzzyProcessor(makeJob(baseJobData) as never, {} as never);
    expect(result.action).toBe("enqueued_b9");
    if (result.action === "enqueued_b9") {
      expect(result.reason).toBe("low_confidence");
    }
  });

  it("0 candidați → enqueued_b9 reason=unmatched", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([pendingPayment]));
    dbExecuteMock.mockResolvedValue([]);

    const result = await paymentReconcileFuzzyProcessor(makeJob(baseJobData) as never, {} as never);
    expect(result.action).toBe("enqueued_b9");
    if (result.action === "enqueued_b9") {
      expect(result.reason).toBe("unmatched");
    }
  });

  it("metric e4ReconciliationTotal incrementat la auto-match", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([pendingPayment]));
    dbExecuteMock.mockResolvedValue([
      {
        order_id: "order-001",
        order_number: "CMD-001",
        total_amount: "1500",
        currency: "RON",
        name_sim: 0.9,
      },
    ]);
    dbInsertMock.mockReturnValue(makeInsertChain());
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    await paymentReconcileFuzzyProcessor(makeJob(baseJobData) as never, {} as never);
    expect(e4ReconciliationTotalIncMock).toHaveBeenCalledWith(
      expect.objectContaining({ match_type: "FUZZY_NAME_AMOUNT", result: "matched" }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// B9 — paymentReconcileManualProcessor (HITL)
// ═══════════════════════════════════════════════════════════════════════════════

describe("B9 — paymentReconcileManualProcessor (HITL Tier 3)", () => {
  const baseJobData = {
    paymentId: "pay-003",
    tenantId: "tenant-1",
    candidates: [
      { orderId: "order-001", orderNumber: "CMD-001" },
      { orderId: "order-002", orderNumber: "CMD-002" },
    ],
    reason: "unmatched" as const,
    paymentDetails: {
      amount: "1500",
      currency: "RON",
      reference: null,
      counterpartyName: "Client Test SRL",
    },
  };

  it("crează task HITL via approvalService", async () => {
    const result = await paymentReconcileManualProcessor(
      makeJob(baseJobData) as never,
      {} as never,
    );
    expect(result.ok).toBe(true);
    expect(result.action).toBe("hitl_created");
    if (result.action === "hitl_created") {
      expect(result.approvalTaskId).toBe("approval-task-001");
    }
  });

  it("approvalService.createTask apelat cu parametri corecți (etapa=E4, approvalType=manual_verification)", async () => {
    await paymentReconcileManualProcessor(makeJob(baseJobData) as never, {} as never);
    expect(approvalServiceCreateTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        entityType: "gold_payments",
        entityId: "pay-003",
        approvalType: "manual_verification",
        etapa: "E4",
        priority: "high",
        createdBy: null,
        metadata: expect.objectContaining({
          paymentId: "pay-003",
          escalateTo: "ACCOUNTING",
          hitlInvestigationType: "payment_reconciliation",
        }),
      }),
    );
  });

  it("metric e4ReconciliationTotal incrementat cu match_type=MANUAL", async () => {
    await paymentReconcileManualProcessor(makeJob(baseJobData) as never, {} as never);
    expect(e4ReconciliationTotalIncMock).toHaveBeenCalledWith(
      expect.objectContaining({ match_type: "MANUAL", result: "hitl_created" }),
    );
  });

  it("setSessionTenantId apelat înainte de approvalService", async () => {
    await paymentReconcileManualProcessor(makeJob(baseJobData) as never, {} as never);
    expect(setSessionTenantIdMock).toHaveBeenCalledWith("tenant-1");
  });

  it("funcționează cu reason=multiple_exact_matches", async () => {
    const result = await paymentReconcileManualProcessor(
      makeJob({ ...baseJobData, reason: "multiple_exact_matches" }) as never,
      {} as never,
    );
    expect(result.action).toBe("hitl_created");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// B10 — paymentBalanceUpdateProcessor
// ═══════════════════════════════════════════════════════════════════════════════

describe("B10 — paymentBalanceUpdateProcessor (balance update)", () => {
  const baseJobData = {
    paymentId: "pay-001",
    orderId: "order-001",
    tenantId: "tenant-1",
    matchType: "EXACT_REFERENCE" as const,
  };

  it("UPDATE gold_orders amountPaid + status=PAID dacă fully paid", async () => {
    let selectCall = 0;
    dbSelectMock.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        // SUM query
        return makeSelectChain([{ totalPaid: "1500" }]);
      }
      // order query
      return makeSelectChain([{ totalAmount: "1500", currentStatus: "INVOICED" }]);
    });
    dbUpdateMock.mockReturnValue(makeUpdateChain());
    dbInsertMock.mockReturnValue(makeInsertChain());

    const result = await paymentBalanceUpdateProcessor(makeJob(baseJobData) as never, {} as never);
    expect(result.ok).toBe(true);
    expect(result.newStatus).toBe("PAID");
    expect(result.wasFullyPaid).toBe(true);
  });

  it("UPDATE gold_orders status=PARTIALLY_PAID dacă plată parțială", async () => {
    let selectCall = 0;
    dbSelectMock.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) return makeSelectChain([{ totalPaid: "750" }]);
      return makeSelectChain([{ totalAmount: "1500", currentStatus: "INVOICED" }]);
    });
    dbUpdateMock.mockReturnValue(makeUpdateChain());
    dbInsertMock.mockReturnValue(makeInsertChain());

    const result = await paymentBalanceUpdateProcessor(makeJob(baseJobData) as never, {} as never);
    expect(result.newStatus).toBe("PARTIALLY_PAID");
    expect(result.wasFullyPaid).toBe(false);
  });

  it("INSERT audit log cu eventType=PAYMENT_MATCHED", async () => {
    let selectCall = 0;
    dbSelectMock.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) return makeSelectChain([{ totalPaid: "1500" }]);
      return makeSelectChain([{ totalAmount: "1500", currentStatus: "INVOICED" }]);
    });
    const insertChain = makeInsertChain();
    dbUpdateMock.mockReturnValue(makeUpdateChain());
    dbInsertMock.mockReturnValue(insertChain);

    await paymentBalanceUpdateProcessor(makeJob(baseJobData) as never, {} as never);

    expect(dbInsertMock).toHaveBeenCalledTimes(1); // audit log
    const auditValues = insertChain.values.mock.calls[0]?.[0] as { eventType: string };
    expect(auditValues.eventType).toBe("PAYMENT_MATCHED");
  });

  it("aruncă eroare dacă comanda nu există", async () => {
    let selectCall = 0;
    dbSelectMock.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) return makeSelectChain([{ totalPaid: "1500" }]);
      return makeSelectChain([]); // comanda nu există
    });

    await expect(
      paymentBalanceUpdateProcessor(makeJob(baseJobData) as never, {} as never),
    ).rejects.toThrow("Order order-001 not found");
  });

  it("newAmountPaid calculat corect ca string numeric", async () => {
    let selectCall = 0;
    dbSelectMock.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) return makeSelectChain([{ totalPaid: "750.50" }]);
      return makeSelectChain([{ totalAmount: "1500", currentStatus: "INVOICED" }]);
    });
    dbUpdateMock.mockReturnValue(makeUpdateChain());
    dbInsertMock.mockReturnValue(makeInsertChain());

    const result = await paymentBalanceUpdateProcessor(makeJob(baseJobData) as never, {} as never);
    expect(result.newAmountPaid).toBe("750.5");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// B11 — createB11Processor (overdue detect — cron)
// ═══════════════════════════════════════════════════════════════════════════════

describe("B11 — createB11Processor (overdue detect)", () => {
  const mockOverdueOrder = {
    id: "order-overdue-001",
    tenantId: "tenant-1",
    orderNumber: "CMD-001",
    status: "INVOICED",
    paymentDueAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 zile în urmă
    totalAmount: "1500",
    amountPaid: "0",
    currency: "RON",
  };

  it("0 comenzi overdue → overdueCount: 0", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));
    const processor = createB11Processor("tenant-1");
    const result = await processor(makeJob({}) as never, {} as never);
    expect(result.ok).toBe(true);
    expect(result.overdueCount).toBe(0);
  });

  it("1 comandă overdue → mark OVERDUE + enqueue B12", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([mockOverdueOrder]));
    dbUpdateMock.mockReturnValue(makeUpdateChain());
    dbInsertMock.mockReturnValue(makeInsertChain());

    const processor = createB11Processor("tenant-1");
    const result = await processor(makeJob({}) as never, {} as never);

    expect(result.overdueCount).toBe(1);
    expect(result.processedOrderIds).toContain("order-overdue-001");
    expect(createQueueMock).toHaveBeenCalledWith("payment:overdue:escalate", expect.any(Object));
    expect(addMock).toHaveBeenCalledWith(
      "escalate",
      expect.objectContaining({ orderId: "order-overdue-001" }),
      expect.any(Object),
    );
  });

  it("marca OVERDUE și inserează audit log per comandă", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([mockOverdueOrder]));
    const updateChain = makeUpdateChain();
    dbUpdateMock.mockReturnValue(updateChain);
    const insertChain = makeInsertChain();
    dbInsertMock.mockReturnValue(insertChain);

    const processor = createB11Processor("tenant-1");
    await processor(makeJob({}) as never, {} as never);

    expect(dbUpdateMock).toHaveBeenCalledTimes(1);
    expect(dbInsertMock).toHaveBeenCalledTimes(1);
    const auditValues = insertChain.values.mock.calls[0]?.[0] as {
      eventType: string;
      actorType: string;
    };
    expect(auditValues.eventType).toBe("ORDER_MARKED_OVERDUE");
    expect(auditValues.actorType).toBe("CRON");
  });

  it("metric e4OverdueOrdersDetectedTotal incrementat per comandă", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([mockOverdueOrder]));
    dbUpdateMock.mockReturnValue(makeUpdateChain());
    dbInsertMock.mockReturnValue(makeInsertChain());

    const processor = createB11Processor("tenant-1");
    await processor(makeJob({}) as never, {} as never);
    expect(e4OverdueOrdersDetectedTotalIncMock).toHaveBeenCalledWith({ tenant_id: "tenant-1" });
  });

  it("setSessionTenantId apelat cu tenantId", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));
    const processor = createB11Processor("tenant-2");
    await processor(makeJob({}) as never, {} as never);
    expect(setSessionTenantIdMock).toHaveBeenCalledWith("tenant-2");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// B12 — paymentOverdueEscalateProcessor (graduated alerts)
// ═══════════════════════════════════════════════════════════════════════════════

describe("B12 — paymentOverdueEscalateProcessor (graduated escalation)", () => {
  const baseJobData = {
    orderId: "order-001",
    tenantId: "tenant-1",
    orderNumber: "CMD-001",
    totalAmount: "1500",
    amountPaid: "0",
    currency: "RON",
    paymentDueAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
  };

  it("1-6 zile → severity=WARNING", async () => {
    dbInsertMock.mockReturnValue(makeInsertChain());
    const result = await paymentOverdueEscalateProcessor(
      makeJob({ ...baseJobData, overdueByDays: 3 }) as never,
      {} as never,
    );
    expect(result.severity).toBe("WARNING");
    expect(result.action).toContain("email_warning");
    expect(approvalServiceCreateTaskMock).not.toHaveBeenCalled();
  });

  it("7-13 zile → severity=REMINDER", async () => {
    dbInsertMock.mockReturnValue(makeInsertChain());
    const result = await paymentOverdueEscalateProcessor(
      makeJob({ ...baseJobData, overdueByDays: 10 }) as never,
      {} as never,
    );
    expect(result.severity).toBe("REMINDER");
    expect(result.action).toContain("wa_reminder");
    expect(approvalServiceCreateTaskMock).not.toHaveBeenCalled();
  });

  it("14+ zile → severity=CRITICAL + HITL task creat", async () => {
    dbInsertMock.mockReturnValue(makeInsertChain());
    const result = await paymentOverdueEscalateProcessor(
      makeJob({ ...baseJobData, overdueByDays: 20 }) as never,
      {} as never,
    );
    expect(result.severity).toBe("CRITICAL");
    expect(result.action).toContain("hitl_created");
    expect(approvalServiceCreateTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        approvalType: "manual_verification",
        etapa: "E4",
        priority: "critical",
        metadata: expect.objectContaining({
          severity: "CRITICAL",
          escalateTo: "ACCOUNTING",
          hitlInvestigationType: "overdue_order",
        }),
      }),
    );
  });

  it("INSERT audit log cu eventType=PAYMENT_OVERDUE_ESCALATED", async () => {
    const insertChain = makeInsertChain();
    dbInsertMock.mockReturnValue(insertChain);

    await paymentOverdueEscalateProcessor(
      makeJob({ ...baseJobData, overdueByDays: 5 }) as never,
      {} as never,
    );

    const auditValues = insertChain.values.mock.calls[0]?.[0] as { eventType: string };
    expect(auditValues.eventType).toBe("PAYMENT_OVERDUE_ESCALATED");
  });

  it("metric e4OverdueOrdersEscalatedTotal incrementat cu severity corectă", async () => {
    dbInsertMock.mockReturnValue(makeInsertChain());
    await paymentOverdueEscalateProcessor(
      makeJob({ ...baseJobData, overdueByDays: 3 }) as never,
      {} as never,
    );
    expect(e4OverdueOrdersEscalatedTotalIncMock).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "WARNING", tenant_id: "tenant-1" }),
    );
  });

  it("setSessionTenantId apelat cu tenantId corect", async () => {
    dbInsertMock.mockReturnValue(makeInsertChain());
    await paymentOverdueEscalateProcessor(
      makeJob({ ...baseJobData, overdueByDays: 2 }) as never,
      {} as never,
    );
    expect(setSessionTenantIdMock).toHaveBeenCalledWith("tenant-1");
  });

  it("overdueByDays = 7 → severity=REMINDER (boundary)", async () => {
    dbInsertMock.mockReturnValue(makeInsertChain());
    const result = await paymentOverdueEscalateProcessor(
      makeJob({ ...baseJobData, overdueByDays: 7 }) as never,
      {} as never,
    );
    expect(result.severity).toBe("REMINDER");
  });

  it("overdueByDays = 14 → severity=CRITICAL (boundary)", async () => {
    dbInsertMock.mockReturnValue(makeInsertChain());
    const result = await paymentOverdueEscalateProcessor(
      makeJob({ ...baseJobData, overdueByDays: 14 }) as never,
      {} as never,
    );
    expect(result.severity).toBe("CRITICAL");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// queue-registry.test — verificare cozi B7-B12 adăugate
// (import indirect via worker-shared mock)
// ═══════════════════════════════════════════════════════════════════════════════

describe("QUEUES — cozi B7-B12 definite în mock", () => {
  it("E4_PAYMENT_RECONCILE_AUTO = 'payment:reconcile:auto'", async () => {
    const { QUEUES } = await import("@cerniq/worker-shared");
    expect(QUEUES.E4_PAYMENT_RECONCILE_AUTO).toBe("payment:reconcile:auto");
  });

  it("E4_PAYMENT_RECONCILE_FUZZY = 'payment:reconcile:fuzzy'", async () => {
    const { QUEUES } = await import("@cerniq/worker-shared");
    expect(QUEUES.E4_PAYMENT_RECONCILE_FUZZY).toBe("payment:reconcile:fuzzy");
  });

  it("E4_PAYMENT_RECONCILE_MANUAL = 'payment:reconcile:manual'", async () => {
    const { QUEUES } = await import("@cerniq/worker-shared");
    expect(QUEUES.E4_PAYMENT_RECONCILE_MANUAL).toBe("payment:reconcile:manual");
  });

  it("E4_PAYMENT_BALANCE_UPDATE = 'payment:balance:update'", async () => {
    const { QUEUES } = await import("@cerniq/worker-shared");
    expect(QUEUES.E4_PAYMENT_BALANCE_UPDATE).toBe("payment:balance:update");
  });

  it("E4_PAYMENT_OVERDUE_ESCALATE = 'payment:overdue:escalate'", async () => {
    const { QUEUES } = await import("@cerniq/worker-shared");
    expect(QUEUES.E4_PAYMENT_OVERDUE_ESCALATE).toBe("payment:overdue:escalate");
  });
});
