/**
 * Teste complete pentru workers E27-E32 (E3 AI Sales — Pricing/Discount).
 *
 * Pattern vitest: vi.hoisted() + vi.mock() pentru mock-uri mutabile per test.
 * Acoperire:
 *  E27: max discount calculat corect, discount > max → throw, fără requested → return max
 *  E28: apply success, MARGIN_VIOLATION, item not found, SHA-256 hash chain GENESIS + chain
 *  E29: ≤15% AUTO_APPROVE, 16-30% PENDING_MANAGER, 31-50% PENDING_DIRECTOR, >50% REJECTED, >92% throw
 *  E30: margin < 8% → throw MARGIN_VIOLATION, margin ≥ 8% → pass, no costPrice → no violation
 *  E31: volume rule found → apply, no rule → 0%, discount > 92% → throw, lineTotal corect
 *  E32: all active products, specific productIds, informativ only
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";

// ── vi.hoisted() — variabile accesibile în factory-urile vi.mock ───────────────

const {
  dbSelectMock,
  dbInsertMock,
  dbUpdateMock,
  dbExecuteMock,
  setSessionTenantIdMock,
  addMock,
  closeMock,
  createQueueMock,
} = vi.hoisted(() => {
  const addMock = vi.fn().mockResolvedValue({ id: "job-123" });
  const closeMock = vi.fn().mockResolvedValue(undefined);
  const createQueueMock = vi.fn(() => ({ add: addMock, close: closeMock }));

  return {
    dbSelectMock: vi.fn(),
    dbInsertMock: vi.fn(),
    dbUpdateMock: vi.fn(),
    dbExecuteMock: vi.fn(),
    setSessionTenantIdMock: vi.fn().mockResolvedValue(undefined),
    addMock,
    closeMock,
    createQueueMock,
  };
});

// ── vi.mock() — folosesc variabilele hoistate ──────────────────────────────────

vi.mock("@cerniq/db", () => ({
  db: {
    select: dbSelectMock,
    insert: dbInsertMock,
    update: dbUpdateMock,
    execute: dbExecuteMock,
  },
  setSessionTenantId: setSessionTenantIdMock,
  goldProducts: {
    id: "id",
    tenantId: "tenant_id",
    isActive: "is_active",
    sku: "sku",
    name: "name",
  },
  negotiationItems: {
    id: "id",
    tenantId: "tenant_id",
    productId: "product_id",
    quantity: "quantity",
    unitPrice: "unit_price",
    discountPct: "discount_pct",
    lineTotal: "line_total",
  },
  fiscalAuditTrail: {
    id: "id",
    tenantId: "tenant_id",
    entityType: "entity_type",
    entityId: "entity_id",
    action: "action",
    actorId: "actor_id",
    prevHash: "prev_hash",
    hash: "hash",
    data: "data",
    createdAt: "created_at",
  },
  priceRules: {
    id: "id",
    tenantId: "tenant_id",
    productId: "product_id",
    ruleType: "rule_type",
    minQuantity: "min_quantity",
    discountPct: "discount_pct",
    minMarginPct: "min_margin_pct",
  },
  goldProductCategories: {
    id: "id",
    tenantId: "tenant_id",
  },
  goldNegotiations: {
    id: "id",
    tenantId: "tenant_id",
  },
  eq: vi.fn((_a: unknown, _b: unknown) => ({ type: "eq" })),
  and: vi.fn((..._args: unknown[]) => ({ type: "and" })),
  or: vi.fn((..._args: unknown[]) => ({ type: "or" })),
  lte: vi.fn((_a: unknown, _b: unknown) => ({ type: "lte" })),
  gte: vi.fn((_a: unknown, _b: unknown) => ({ type: "gte" })),
  desc: vi.fn((_a: unknown) => ({ type: "desc" })),
  isNull: vi.fn((_a: unknown) => ({ type: "isNull" })),
  inArray: vi.fn((_a: unknown, _b: unknown) => ({ type: "inArray" })),
  sql: Object.assign(
    vi.fn((_strings: TemplateStringsArray, ..._values: unknown[]) => ({ type: "sql" })),
    { raw: vi.fn((s: string) => ({ type: "sql-raw", s })) },
  ),
}));

vi.mock("@cerniq/worker-shared", () => ({
  createQueue: createQueueMock,
  DEFAULT_JOB_OPTIONS: { attempts: 3, backoff: { type: "exponential", delay: 1000 } },
  QUEUES: {
    E3_PRICING_DISCOUNT_APPLY: "pricing:discount:apply",
    HITL_ESCALATION: "hitl:escalate",
  },
}));

// ── Helper builders ───────────────────────────────────────────────────────────

function makeSelectChain(rows: unknown[]) {
  const basePromise = Promise.resolve(rows);
  const chain = Object.assign(basePromise, {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn().mockResolvedValue(rows),
  });
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  return chain;
}

function makeInsertChain() {
  return { values: vi.fn().mockResolvedValue(undefined) };
}

function makeUpdateChain() {
  const setChain = { where: vi.fn().mockResolvedValue({ rowCount: 1 }) };
  return { set: vi.fn().mockReturnValue(setChain) };
}

function makeExecuteResult(getMaxDiscount: string | number) {
  return Promise.resolve({ rows: [{ get_max_discount: String(getMaxDiscount) }] });
}

// ── Imports workers ────────────────────────────────────────────────────────────

import { pricingDiscountCalculateProcessor } from "../workers/e27-pricing-discount-calculate.js";
import { pricingDiscountApplyProcessor } from "../workers/e28-pricing-discount-apply.js";
import { pricingDiscountApproveProcessor } from "../workers/e29-pricing-discount-approve.js";
import { pricingMarginCheckProcessor } from "../workers/e30-pricing-margin-check.js";
import { pricingVolumeCalculateProcessor } from "../workers/e31-pricing-volume-calculate.js";
import { pricingCompetitorCheckProcessor } from "../workers/e32-pricing-competitor-check.js";

// ── Reset ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  setSessionTenantIdMock.mockResolvedValue(undefined);
  addMock.mockResolvedValue({ id: "job-123" });
  closeMock.mockResolvedValue(undefined);
  createQueueMock.mockReturnValue({ add: addMock, close: closeMock });
});

// ── E27: pricing:discount:calculate ──────────────────────────────────────────

describe("E27 — pricingDiscountCalculateProcessor", () => {
  it("returnează maxAllowedDiscount fără requestedDiscount", async () => {
    dbExecuteMock.mockReturnValue(makeExecuteResult("25"));

    const job = {
      data: { tenantId: "tenant-1", productId: "prod-1" },
    } as unknown as Parameters<typeof pricingDiscountCalculateProcessor>[0];

    const result = await pricingDiscountCalculateProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.maxAllowedDiscount).toBe(25);
    expect(result.requestedDiscount).toBeUndefined();
    expect(result.approved).toBeUndefined();
    expect(setSessionTenantIdMock).toHaveBeenCalledWith("tenant-1");
  });

  it("requestedDiscount ≤ max → approved=true", async () => {
    dbExecuteMock.mockReturnValue(makeExecuteResult("30"));

    const job = {
      data: { tenantId: "tenant-1", productId: "prod-1", requestedDiscountPct: 20 },
    } as unknown as Parameters<typeof pricingDiscountCalculateProcessor>[0];

    const result = await pricingDiscountCalculateProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.maxAllowedDiscount).toBe(30);
    expect(result.requestedDiscount).toBe(20);
    expect(result.approved).toBe(true);
  });

  it("requestedDiscount exact egal cu max → approved=true (edge case)", async () => {
    dbExecuteMock.mockReturnValue(makeExecuteResult("15"));

    const job = {
      data: { tenantId: "tenant-1", productId: "prod-1", requestedDiscountPct: 15 },
    } as unknown as Parameters<typeof pricingDiscountCalculateProcessor>[0];

    const result = await pricingDiscountCalculateProcessor(job, {} as never);

    expect(result.approved).toBe(true);
    expect(result.requestedDiscount).toBe(15);
  });

  it("requestedDiscount > max → throw eroare explicită", async () => {
    dbExecuteMock.mockReturnValue(makeExecuteResult("20"));

    const job = {
      data: { tenantId: "tenant-1", productId: "prod-abc", requestedDiscountPct: 25 },
    } as unknown as Parameters<typeof pricingDiscountCalculateProcessor>[0];

    await expect(pricingDiscountCalculateProcessor(job, {} as never)).rejects.toThrow(
      /Discount 25% depășește maxim permis 20%.*prod-abc/,
    );
  });

  it("SQL function returnează 0 (nicio regulă) → maxAllowedDiscount=0", async () => {
    dbExecuteMock.mockReturnValue(makeExecuteResult("0"));

    const job = {
      data: { tenantId: "tenant-1", productId: "prod-new", requestedDiscountPct: 5 },
    } as unknown as Parameters<typeof pricingDiscountCalculateProcessor>[0];

    await expect(pricingDiscountCalculateProcessor(job, {} as never)).rejects.toThrow(
      /Discount 5%/,
    );
  });

  it("setSessionTenantId apelat cu tenantId corect", async () => {
    dbExecuteMock.mockReturnValue(makeExecuteResult("20"));

    const job = {
      data: { tenantId: "my-tenant-xyz", productId: "prod-1" },
    } as unknown as Parameters<typeof pricingDiscountCalculateProcessor>[0];

    await pricingDiscountCalculateProcessor(job, {} as never);

    expect(setSessionTenantIdMock).toHaveBeenCalledWith("my-tenant-xyz");
  });

  it("requestedDiscountPct=0 → approved=true (zero discount valid)", async () => {
    dbExecuteMock.mockReturnValue(makeExecuteResult("30"));

    const job = {
      data: { tenantId: "tenant-1", productId: "prod-1", requestedDiscountPct: 0 },
    } as unknown as Parameters<typeof pricingDiscountCalculateProcessor>[0];

    const result = await pricingDiscountCalculateProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.requestedDiscount).toBe(0);
    expect(result.approved).toBe(true);
  });
});

// ── E28: pricing:discount:apply ───────────────────────────────────────────────

describe("E28 — pricingDiscountApplyProcessor", () => {
  it("apply discount success — update item + audit trail + return hash", async () => {
    let selectCallCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // negotiation item
        return makeSelectChain([
          { id: "item-1", productId: "prod-1", quantity: 10, unitPrice: "100.00" },
        ]);
      }
      // fiscal audit trail — primul entry (no previous)
      return makeSelectChain([]);
    });
    dbExecuteMock.mockReturnValue(makeExecuteResult("50"));
    dbUpdateMock.mockReturnValue(makeUpdateChain());
    dbInsertMock.mockReturnValue(makeInsertChain());

    const job = {
      data: {
        tenantId: "tenant-1",
        negotiationItemId: "item-1",
        discountPct: 10,
        appliedBy: "system",
      },
    } as unknown as Parameters<typeof pricingDiscountApplyProcessor>[0];

    const result = await pricingDiscountApplyProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.negotiationItemId).toBe("item-1");
    expect(result.discountPct).toBe(10);
    expect(result.lineTotal).toBe(900); // 100 * 10 * (1 - 0.10) = 900
    expect(typeof result.hash).toBe("string");
    expect(result.hash).toHaveLength(64); // SHA-256 hex
    expect(dbUpdateMock).toHaveBeenCalled();
    expect(dbInsertMock).toHaveBeenCalled();
  });

  it("MARGIN_VIOLATION: discount > maxAllowed → throw MARGIN_VIOLATION", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "item-2", productId: "prod-2", quantity: 5, unitPrice: "200.00" }]),
    );
    dbExecuteMock.mockReturnValue(makeExecuteResult("15")); // max allowed = 15%

    const job = {
      data: {
        tenantId: "tenant-1",
        negotiationItemId: "item-2",
        discountPct: 20, // > 15% max
        appliedBy: "user-abc",
      },
    } as unknown as Parameters<typeof pricingDiscountApplyProcessor>[0];

    await expect(pricingDiscountApplyProcessor(job, {} as never)).rejects.toThrow(
      /MARGIN_VIOLATION/,
    );
  });

  it("item not found → throw eroare", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    const job = {
      data: {
        tenantId: "tenant-1",
        negotiationItemId: "no-item",
        discountPct: 5,
        appliedBy: "system",
      },
    } as unknown as Parameters<typeof pricingDiscountApplyProcessor>[0];

    await expect(pricingDiscountApplyProcessor(job, {} as never)).rejects.toThrow(
      /negotiation item no-item not found/,
    );
  });

  it("SHA-256 hash chain: prevHash=GENESIS când nu există entry anterior", async () => {
    let selectCallCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return makeSelectChain([
          { id: "item-hash", productId: "prod-h", quantity: 1, unitPrice: "50.00" },
        ]);
      }
      return makeSelectChain([]); // no previous audit entry
    });
    dbExecuteMock.mockReturnValue(makeExecuteResult("92"));
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const insertChain = makeInsertChain();
    dbInsertMock.mockReturnValue(insertChain);

    const job = {
      data: {
        tenantId: "t1",
        negotiationItemId: "item-hash",
        discountPct: 5,
        appliedBy: "system",
      },
    } as unknown as Parameters<typeof pricingDiscountApplyProcessor>[0];

    const result = await pricingDiscountApplyProcessor(job, {} as never);

    // Verifică că hash-ul este SHA256(GENESIS + JSON.stringify(data))
    const insertedValues = insertChain.values.mock.calls[0]?.[0] as {
      prevHash: string;
      hash: string;
      data: Record<string, unknown>;
    };
    expect(insertedValues.prevHash).toBe("GENESIS");
    expect(insertedValues.hash).toBe(result.hash);
    // Verificare independentă a hash-ului
    const expectedHash = createHash("sha256")
      .update("GENESIS" + JSON.stringify(insertedValues.data))
      .digest("hex");
    expect(result.hash).toBe(expectedHash);
  });

  it("SHA-256 hash chain: prevHash din ultimul entry când există anterior", async () => {
    const existingHash = "abc123existinghash".padEnd(64, "0");
    let selectCallCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return makeSelectChain([
          { id: "item-chain", productId: "prod-c", quantity: 2, unitPrice: "75.00" },
        ]);
      }
      return makeSelectChain([{ hash: existingHash }]); // previous audit entry
    });
    dbExecuteMock.mockReturnValue(makeExecuteResult("92"));
    dbUpdateMock.mockReturnValue(makeUpdateChain());
    const insertChain = makeInsertChain();
    dbInsertMock.mockReturnValue(insertChain);

    const job = {
      data: {
        tenantId: "t1",
        negotiationItemId: "item-chain",
        discountPct: 3,
        appliedBy: "11111111-1111-1111-1111-111111111111",
      },
    } as unknown as Parameters<typeof pricingDiscountApplyProcessor>[0];

    await pricingDiscountApplyProcessor(job, {} as never);

    const insertedValues = insertChain.values.mock.calls[0]?.[0] as {
      prevHash: string;
      actorId: string;
    };
    expect(insertedValues.prevHash).toBe(existingHash);
    expect(insertedValues.actorId).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("appliedBy='system' → actorId=null în audit trail", async () => {
    let selectCallCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return makeSelectChain([
          { id: "item-sys", productId: "prod-s", quantity: 1, unitPrice: "100.00" },
        ]);
      }
      return makeSelectChain([]);
    });
    dbExecuteMock.mockReturnValue(makeExecuteResult("92"));
    dbUpdateMock.mockReturnValue(makeUpdateChain());
    const insertChain = makeInsertChain();
    dbInsertMock.mockReturnValue(insertChain);

    const job = {
      data: {
        tenantId: "t1",
        negotiationItemId: "item-sys",
        discountPct: 0,
        appliedBy: "system",
      },
    } as unknown as Parameters<typeof pricingDiscountApplyProcessor>[0];

    await pricingDiscountApplyProcessor(job, {} as never);

    const insertedValues = insertChain.values.mock.calls[0]?.[0] as { actorId: string | null };
    expect(insertedValues.actorId).toBeNull();
  });

  it("approvalRef prezent → inclus în audit data", async () => {
    let selectCallCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return makeSelectChain([
          { id: "item-ref", productId: "prod-ref", quantity: 5, unitPrice: "200.00" },
        ]);
      }
      return makeSelectChain([]);
    });
    dbExecuteMock.mockReturnValue(makeExecuteResult("92"));
    dbUpdateMock.mockReturnValue(makeUpdateChain());
    const insertChain = makeInsertChain();
    dbInsertMock.mockReturnValue(insertChain);

    const job = {
      data: {
        tenantId: "t1",
        negotiationItemId: "item-ref",
        discountPct: 10,
        appliedBy: "manager-1",
        approvalRef: "APPROVAL-REF-XYZ",
      },
    } as unknown as Parameters<typeof pricingDiscountApplyProcessor>[0];

    await pricingDiscountApplyProcessor(job, {} as never);

    const insertedValues = insertChain.values.mock.calls[0]?.[0] as {
      data: { approvalRef: string | null };
    };
    expect(insertedValues.data.approvalRef).toBe("APPROVAL-REF-XYZ");
  });

  it("quantity=null în DB item → fallback la 1, lineTotal=unitPrice*(1-discount)", async () => {
    let selectCallCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return makeSelectChain([
          { id: "item-null-qty", productId: "prod-q", quantity: null, unitPrice: "150.00" },
        ]);
      }
      return makeSelectChain([]);
    });
    dbExecuteMock.mockReturnValue(makeExecuteResult("92"));
    dbUpdateMock.mockReturnValue(makeUpdateChain());
    dbInsertMock.mockReturnValue(makeInsertChain());

    const job = {
      data: {
        tenantId: "t1",
        negotiationItemId: "item-null-qty",
        discountPct: 10,
        appliedBy: "system",
      },
    } as unknown as Parameters<typeof pricingDiscountApplyProcessor>[0];

    const result = await pricingDiscountApplyProcessor(job, {} as never);

    // quantity fallback = 1 → lineTotal = 150 * 1 * 0.9 = 135
    expect(result.lineTotal).toBe(135);
  });

  it("discountPct=0 → lineTotal = unitPrice * quantity (fără reducere)", async () => {
    let selectCallCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return makeSelectChain([
          { id: "item-nodiscount", productId: "prod-nd", quantity: 3, unitPrice: "200.00" },
        ]);
      }
      return makeSelectChain([]);
    });
    dbExecuteMock.mockReturnValue(makeExecuteResult("92"));
    dbUpdateMock.mockReturnValue(makeUpdateChain());
    dbInsertMock.mockReturnValue(makeInsertChain());

    const job = {
      data: {
        tenantId: "t1",
        negotiationItemId: "item-nodiscount",
        discountPct: 0,
        appliedBy: "system",
      },
    } as unknown as Parameters<typeof pricingDiscountApplyProcessor>[0];

    const result = await pricingDiscountApplyProcessor(job, {} as never);

    // 200 * 3 * (1 - 0/100) = 600
    expect(result.lineTotal).toBe(600);
    expect(result.discountPct).toBe(0);
  });
});

// ── E29: pricing:discount:approve ─────────────────────────────────────────────

function makeE29Job(requestedDiscountPct: number) {
  return {
    data: {
      tenantId: "tenant-1",
      negotiationId: "neg-1",
      negotiationItemId: "item-1",
      productId: "prod-1",
      requestedDiscountPct,
      requestedBy: "user-1",
      quantity: 10,
      unitPrice: 100,
    },
  } as unknown as Parameters<typeof pricingDiscountApproveProcessor>[0];
}

describe("E29 — pricingDiscountApproveProcessor", () => {
  it("≤15% → AUTO_APPROVED, enqueue E28", async () => {
    dbExecuteMock.mockReturnValue(makeExecuteResult("92"));

    const result = await pricingDiscountApproveProcessor(makeE29Job(10), {} as never);

    expect(result.ok).toBe(true);
    expect(result.decision).toBe("AUTO_APPROVED");
    if (result.decision === "AUTO_APPROVED") {
      expect(result.discountPct).toBe(10);
    }
    expect(createQueueMock).toHaveBeenCalledWith("pricing:discount:apply");
    expect(addMock).toHaveBeenCalledTimes(1);
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it("exact 15% → AUTO_APPROVED (edge case)", async () => {
    dbExecuteMock.mockReturnValue(makeExecuteResult("92"));

    const result = await pricingDiscountApproveProcessor(makeE29Job(15), {} as never);
    expect(result.decision).toBe("AUTO_APPROVED");
  });

  it("16% - 30% → PENDING_MANAGER_APPROVAL, sla=4h", async () => {
    dbExecuteMock.mockReturnValue(makeExecuteResult("92"));

    const result = await pricingDiscountApproveProcessor(makeE29Job(25), {} as never);

    expect(result.ok).toBe(true);
    expect(result.decision).toBe("PENDING_MANAGER_APPROVAL");
    if (result.decision === "PENDING_MANAGER_APPROVAL") {
      expect(result.sla).toBe("4h");
    }
    expect(createQueueMock).toHaveBeenCalledWith("hitl:escalate");
    expect(addMock).toHaveBeenCalledWith(
      "hitl:escalate",
      expect.objectContaining({ level: "manager", sla: "4h" }),
      expect.any(Object),
    );
  });

  it("exact 30% → PENDING_MANAGER_APPROVAL (edge case)", async () => {
    dbExecuteMock.mockReturnValue(makeExecuteResult("92"));

    const result = await pricingDiscountApproveProcessor(makeE29Job(30), {} as never);
    expect(result.decision).toBe("PENDING_MANAGER_APPROVAL");
  });

  it("31% - 50% → PENDING_DIRECTOR_APPROVAL_CONSENSUS, sla=24h", async () => {
    dbExecuteMock.mockReturnValue(makeExecuteResult("92"));

    const result = await pricingDiscountApproveProcessor(makeE29Job(45), {} as never);

    expect(result.ok).toBe(true);
    expect(result.decision).toBe("PENDING_DIRECTOR_APPROVAL_CONSENSUS");
    if (result.decision === "PENDING_DIRECTOR_APPROVAL_CONSENSUS") {
      expect(result.sla).toBe("24h");
    }
    expect(addMock).toHaveBeenCalledWith(
      "hitl:escalate",
      expect.objectContaining({ level: "director", sla: "24h" }),
      expect.any(Object),
    );
  });

  it(">50% → REJECTED automat (fără enqueue)", async () => {
    dbExecuteMock.mockReturnValue(makeExecuteResult("92"));

    const result = await pricingDiscountApproveProcessor(makeE29Job(51), {} as never);

    expect(result.ok).toBe(true);
    expect(result.decision).toBe("REJECTED");
    if (result.decision === "REJECTED") {
      expect(result.reason).toMatch(/50%/);
    }
    expect(addMock).not.toHaveBeenCalled();
  });

  it(">92% → throw eroare (HARD LIMIT absolut)", async () => {
    dbExecuteMock.mockReturnValue(makeExecuteResult("92"));

    const job = makeE29Job(95);
    await expect(pricingDiscountApproveProcessor(job, {} as never)).rejects.toThrow(/92%/);
  });

  it("exact 50% → PENDING_DIRECTOR_APPROVAL_CONSENSUS (50 nu e > 50 → nu e REJECTED)", async () => {
    dbExecuteMock.mockReturnValue(makeExecuteResult("92"));

    const result = await pricingDiscountApproveProcessor(makeE29Job(50), {} as never);

    expect(result.ok).toBe(true);
    expect(result.decision).toBe("PENDING_DIRECTOR_APPROVAL_CONSENSUS");
    if (result.decision === "PENDING_DIRECTOR_APPROVAL_CONSENSUS") {
      expect(result.sla).toBe("24h");
    }
  });

  it("payload HITL manager conține toți câmpurile obligatorii", async () => {
    dbExecuteMock.mockReturnValue(makeExecuteResult("92"));

    await pricingDiscountApproveProcessor(makeE29Job(20), {} as never);

    expect(addMock).toHaveBeenCalledWith(
      "hitl:escalate",
      expect.objectContaining({
        discriminator: "discount-approval",
        level: "manager",
        sla: "4h",
        tenantId: "tenant-1",
        negotiationItemId: "item-1",
        requestedDiscountPct: 20,
        requestedBy: "user-1",
        negotiationId: "neg-1",
      }),
      expect.any(Object),
    );
  });
});

// ── E30: pricing:margin:check ─────────────────────────────────────────────────

function makeE30Job(proposedDiscountPct: number, unitPrice: number, costPrice?: number) {
  return {
    data: {
      tenantId: "tenant-1",
      productId: "prod-1",
      proposedDiscountPct,
      unitPrice,
      costPrice,
    },
  } as unknown as Parameters<typeof pricingMarginCheckProcessor>[0];
}

describe("E30 — pricingMarginCheckProcessor", () => {
  it("margin ≥ 8% → passed=true", async () => {
    // unitPrice=100, discount=10%, sellingPrice=90, costPrice=80 → margin=(90-80)/90=11.1%
    const result = await pricingMarginCheckProcessor(makeE30Job(10, 100, 80), {} as never);

    expect(result.ok).toBe(true);
    expect(result.passed).toBe(true);
    expect(result.minMarginPct).toBe(8);
    expect(result.marginPct).toBeCloseTo(11.11, 1);
  });

  it("margin < 8% → throw MARGIN_VIOLATION", async () => {
    // unitPrice=100, discount=5%, sellingPrice=95, costPrice=90 → margin=(95-90)/95=5.26% < 8%
    await expect(pricingMarginCheckProcessor(makeE30Job(5, 100, 90), {} as never)).rejects.toThrow(
      /MARGIN_VIOLATION/,
    );
  });

  it("margin exact 8% → passed=true (edge case)", async () => {
    // margin=8%: sellingPrice = costPrice / 0.92
    // unitPrice=100, discount=0% → sellingPrice=100, costPrice=92 → margin=(100-92)/100=8%
    const result = await pricingMarginCheckProcessor(makeE30Job(0, 100, 92), {} as never);
    expect(result.passed).toBe(true);
  });

  it("costPrice=undefined → marginPct=null → no violation (nu cunoaștem costul)", async () => {
    const result = await pricingMarginCheckProcessor(makeE30Job(95, 100), {} as never);

    expect(result.ok).toBe(true);
    expect(result.passed).toBe(true);
    expect(result.marginPct).toBeNull();
  });

  it("costPrice=0 → marginPct=null → no violation", async () => {
    const result = await pricingMarginCheckProcessor(makeE30Job(50, 100, 0), {} as never);

    expect(result.ok).toBe(true);
    expect(result.marginPct).toBeNull();
  });

  it("discount mare (discount=80%, costPrice=5, unitPrice=100) → margin violat", async () => {
    // sellingPrice=20, cost=5 → margin=(20-5)/20=75% > 8% → OK
    // Schimb: costPrice=18 → margin=(20-18)/20=10% → OK
    // Să facem: discount=90%, sellingPrice=10, costPrice=9.5 → margin=(10-9.5)/10=5% < 8% → throw
    await expect(pricingMarginCheckProcessor(makeE30Job(90, 100, 95), {} as never)).rejects.toThrow(
      /MARGIN_VIOLATION/,
    );
  });

  it("setSessionTenantId apelat cu tenantId corect", async () => {
    const result = await pricingMarginCheckProcessor(makeE30Job(10, 100, 80), {} as never);

    expect(result.ok).toBe(true);
    expect(setSessionTenantIdMock).toHaveBeenCalledWith("tenant-1");
  });

  it("productId și proposedDiscountPct returnate corect în result", async () => {
    const job = {
      data: {
        tenantId: "tenant-1",
        productId: "prod-specific-42",
        proposedDiscountPct: 12,
        unitPrice: 200,
        costPrice: 100,
      },
    } as unknown as Parameters<typeof pricingMarginCheckProcessor>[0];

    const result = await pricingMarginCheckProcessor(job, {} as never);

    expect(result.productId).toBe("prod-specific-42");
    expect(result.proposedDiscountPct).toBe(12);
    expect(result.minMarginPct).toBe(8);
  });
});

// ── E31: pricing:volume:calculate ─────────────────────────────────────────────

function makeE31Job(quantity: number, baseUnitPrice: number) {
  return {
    data: { tenantId: "tenant-1", productId: "prod-1", quantity, baseUnitPrice },
  } as unknown as Parameters<typeof pricingVolumeCalculateProcessor>[0];
}

describe("E31 — pricingVolumeCalculateProcessor", () => {
  it("volume rule găsită → aplică discountPct din regulă", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ discountPct: "15", minQuantity: 10, minMarginPct: "8" }]),
    );

    const result = await pricingVolumeCalculateProcessor(makeE31Job(20, 100), {} as never);

    expect(result.ok).toBe(true);
    expect(result.volumeDiscountPct).toBe(15);
    expect(result.pricePerUnit).toBe(85); // 100 * (1 - 0.15)
    expect(result.lineTotal).toBe(1700); // 85 * 20
  });

  it("nicio regulă de volum → 0% discount, preț intreg", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    const result = await pricingVolumeCalculateProcessor(makeE31Job(5, 50), {} as never);

    expect(result.ok).toBe(true);
    expect(result.volumeDiscountPct).toBe(0);
    expect(result.pricePerUnit).toBe(50);
    expect(result.lineTotal).toBe(250);
  });

  it("discount > 92% → throw MARGIN_VIOLATION", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ discountPct: "95", minQuantity: 1, minMarginPct: "8" }]),
    );

    await expect(pricingVolumeCalculateProcessor(makeE31Job(10, 100), {} as never)).rejects.toThrow(
      /MARGIN_VIOLATION/,
    );
  });

  it("lineTotal calculat corect cu 2 zecimale", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ discountPct: "10", minQuantity: 3, minMarginPct: "8" }]),
    );

    const result = await pricingVolumeCalculateProcessor(makeE31Job(3, 33.33), {} as never);

    expect(result.pricePerUnit).toBeCloseTo(29.997, 1);
    expect(result.lineTotal).toBeCloseTo(89.99, 1);
  });

  it("setSessionTenantId apelat cu tenantId corect", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    const job = {
      data: { tenantId: "my-tenant", productId: "prod-vol", quantity: 1, baseUnitPrice: 100 },
    } as unknown as Parameters<typeof pricingVolumeCalculateProcessor>[0];

    await pricingVolumeCalculateProcessor(job, {} as never);

    expect(setSessionTenantIdMock).toHaveBeenCalledWith("my-tenant");
  });

  it("discount exact 92% → NU aruncă (limita e strict >92%)", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ discountPct: "92", minQuantity: 1, minMarginPct: "8" }]),
    );

    const result = await pricingVolumeCalculateProcessor(makeE31Job(10, 100), {} as never);

    // 92% nu e > 92, deci nu se aruncă; trece cu volumeDiscountPct=92
    expect(result.ok).toBe(true);
    expect(result.volumeDiscountPct).toBe(92);
    expect(result.pricePerUnit).toBe(8); // 100 * (1 - 0.92) = 8
    expect(result.lineTotal).toBe(80); // 8 * 10
  });

  it("baseUnitPrice=0 → pricePerUnit=0, lineTotal=0", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ discountPct: "10", minQuantity: 1, minMarginPct: "8" }]),
    );

    const result = await pricingVolumeCalculateProcessor(makeE31Job(5, 0), {} as never);

    expect(result.ok).toBe(true);
    expect(result.pricePerUnit).toBe(0);
    expect(result.lineTotal).toBe(0);
  });
});

// ── E32: pricing:competitor:check ─────────────────────────────────────────────

describe("E32 — pricingCompetitorCheckProcessor", () => {
  it("fără productIds → fetch toate produsele active", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ id: "p1" }, { id: "p2" }, { id: "p3" }]));

    const job = {
      data: { tenantId: "tenant-1" },
    } as unknown as Parameters<typeof pricingCompetitorCheckProcessor>[0];

    const result = await pricingCompetitorCheckProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.productsChecked).toBe(3);
    expect(result.competitive).toBeNull();
    expect(result.note).toBe("competitor-check-pending");
  });

  it("cu productIds → filtrează produsele specifice", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ id: "p1" }, { id: "p2" }]));

    const job = {
      data: { tenantId: "tenant-1", productIds: ["p1", "p2"] },
    } as unknown as Parameters<typeof pricingCompetitorCheckProcessor>[0];

    const result = await pricingCompetitorCheckProcessor(job, {} as never);

    expect(result.productsChecked).toBe(2);
    expect(result.note).toBe("competitor-check-pending");
  });

  it("niciun produs activ → productsChecked=0, informativ", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    const job = {
      data: { tenantId: "tenant-empty" },
    } as unknown as Parameters<typeof pricingCompetitorCheckProcessor>[0];

    const result = await pricingCompetitorCheckProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.productsChecked).toBe(0);
    expect(result.competitive).toBeNull();
  });

  it("productIds=[] (array gol) → fetch toate produsele active", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ id: "p1" }]));

    const job = {
      data: { tenantId: "tenant-1", productIds: [] },
    } as unknown as Parameters<typeof pricingCompetitorCheckProcessor>[0];

    const result = await pricingCompetitorCheckProcessor(job, {} as never);

    expect(result.productsChecked).toBe(1);
  });

  it("NU face ajustări automate — returnează ÎNTOTDEAUNA competitive=null", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ id: "p-cheap" }]));

    const job = {
      data: { tenantId: "t1", productIds: ["p-cheap"] },
    } as unknown as Parameters<typeof pricingCompetitorCheckProcessor>[0];

    const result = await pricingCompetitorCheckProcessor(job, {} as never);

    expect(result.competitive).toBeNull();
    expect(result.note).toBe("competitor-check-pending");
  });
});
