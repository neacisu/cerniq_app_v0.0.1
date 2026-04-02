/**
 * Teste complete pentru workers D19-D26 (E3 AI Sales — Negotiation FSM).
 *
 * Pattern vitest: vi.hoisted() + vi.mock() pentru mock-uri mutabile per test.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── vi.hoisted() — variabile accesibile în factory-urile vi.mock ───────────────

const {
  dbSelectMock,
  dbInsertMock,
  dbUpdateMock,
  dbDeleteMock,
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
    dbDeleteMock: vi.fn(),
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
    delete: dbDeleteMock,
    execute: dbExecuteMock,
  },
  setSessionTenantId: setSessionTenantIdMock,
  goldNegotiations: {
    id: "id",
    tenantId: "tenant_id",
    currentState: "current_state",
    totalValue: "total_value",
    updatedAt: "updated_at",
    createdAt: "created_at",
    leadId: "lead_id",
    assignedUserId: "assigned_user_id",
  },
  negotiationStateHistory: {
    id: "id",
    tenantId: "tenant_id",
    negotiationId: "negotiation_id",
    fromState: "from_state",
    toState: "to_state",
    changedBy: "changed_by",
    reason: "reason",
  },
  negotiationItems: {
    id: "id",
    tenantId: "tenant_id",
    negotiationId: "negotiation_id",
    productId: "product_id",
    quantity: "quantity",
    unitPrice: "unit_price",
    discountPct: "discount_pct",
    lineTotal: "line_total",
  },
  goldProducts: {
    id: "id",
    tenantId: "tenant_id",
    name: "name",
    sku: "sku",
  },
  stockInventory: {
    id: "id",
    tenantId: "tenant_id",
    productId: "product_id",
    reservedQuantity: "reserved_quantity",
  },
  stockReservations: {
    id: "id",
    tenantId: "tenant_id",
    inventoryId: "inventory_id",
    negotiationId: "negotiation_id",
    quantity: "quantity",
    reservationState: "reservation_state",
    expiresAt: "expires_at",
  },
  fsmValidTransitions: {
    id: "id",
    fsmType: "fsm_type",
    fromState: "from_state",
    toState: "to_state",
  },
  aiConversations: {
    id: "id",
    tenantId: "tenant_id",
  },
  priceRules: {
    id: "id",
    tenantId: "tenant_id",
    productId: "product_id",
    ruleType: "rule_type",
    minMarginPct: "min_margin_pct",
  },
  eq: vi.fn((_a: unknown, _b: unknown) => ({ type: "eq" })),
  and: vi.fn((..._args: unknown[]) => ({ type: "and" })),
  or: vi.fn((..._args: unknown[]) => ({ type: "or" })),
  lt: vi.fn((_a: unknown, _b: unknown) => ({ type: "lt" })),
  gt: vi.fn((_a: unknown, _b: unknown) => ({ type: "gt" })),
  inArray: vi.fn((_a: unknown, _b: unknown) => ({ type: "inArray" })),
  isNull: vi.fn((_a: unknown) => ({ type: "isNull" })),
  desc: vi.fn((_a: unknown) => ({ type: "desc" })),
  sql: Object.assign(
    vi.fn((_strings: TemplateStringsArray, ..._values: unknown[]) => ({ type: "sql" })),
    { raw: vi.fn((s: string) => ({ type: "sql-raw", s })) },
  ),
}));

vi.mock("@cerniq/worker-shared", () => ({
  createQueue: createQueueMock,
  DEFAULT_JOB_OPTIONS: { attempts: 3, backoff: { type: "exponential", delay: 1000 } },
  QUEUES: {},
}));

// ── Helper builders ───────────────────────────────────────────────────────────

function makeSelectChain(rows: unknown[]) {
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

function makeInsertChain(returningRows?: unknown[]) {
  const returning = vi.fn().mockResolvedValue(returningRows ?? [{ id: "history-uuid-1" }]);
  return { values: vi.fn().mockReturnValue({ returning }) };
}

function makeUpdateChain() {
  const setChain = { where: vi.fn().mockResolvedValue({ rowCount: 1 }) };
  return { set: vi.fn().mockReturnValue(setChain) };
}

function makeDeleteChain() {
  return { where: vi.fn().mockResolvedValue({ rowCount: 1 }) };
}

// ── Imports workers ────────────────────────────────────────────────────────────

import {
  negotiationStateTransitionProcessor,
  InvalidFSMTransitionError,
} from "../workers/d19-negotiation-state-transition.js";
import { negotiationHistoryLogProcessor } from "../workers/d20-negotiation-history-log.js";
import { negotiationItemsUpdateProcessor } from "../workers/d21-negotiation-items-update.js";
import { negotiationReminderSendProcessor } from "../workers/d22-negotiation-reminder-send.js";
import { negotiationExpireCheckProcessor } from "../workers/d23-negotiation-expire-check.js";
import { negotiationCloseExecuteProcessor } from "../workers/d24-negotiation-close-execute.js";
import { negotiationReopenRequestProcessor } from "../workers/d25-negotiation-reopen-request.js";
import { negotiationAbandonProcessProcessor } from "../workers/d26-negotiation-abandon-process.js";

// ── Reset ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  setSessionTenantIdMock.mockResolvedValue(undefined);
  addMock.mockResolvedValue({ id: "job-123" });
  closeMock.mockResolvedValue(undefined);
  createQueueMock.mockReturnValue({ add: addMock, close: closeMock });
});

// ── D19: negotiation:state:transition ─────────────────────────────────────────

describe("D19 — negotiationStateTransitionProcessor", () => {
  it("tranziție validă DISCOVERY → PROPOSAL: returnează ok + enqueue history", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ currentState: "DISCOVERY" }]));
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "neg-1",
        toState: "PROPOSAL",
        changedBy: "user-1",
        reason: "Client interested",
      },
    } as unknown as Parameters<typeof negotiationStateTransitionProcessor>[0];

    const result = await negotiationStateTransitionProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.fromState).toBe("DISCOVERY");
    expect(result.toState).toBe("PROPOSAL");
    expect(result.negotiationId).toBe("neg-1");
    expect(setSessionTenantIdMock).toHaveBeenCalledWith("t1");
    expect(dbUpdateMock).toHaveBeenCalled();
    expect(addMock).toHaveBeenCalledWith(
      "negotiation:history:log",
      expect.objectContaining({ fromState: "DISCOVERY", toState: "PROPOSAL" }),
    );
  });

  it("DB aruncă 'FSM: tranzitie invalida' → InvalidFSMTransitionError", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ currentState: "PAID" }]));
    const updateSetMock = {
      where: vi
        .fn()
        .mockRejectedValue(new Error("ERROR: FSM: tranzitie invalida (SQLSTATE P0001)")),
    };
    dbUpdateMock.mockReturnValue({ set: vi.fn().mockReturnValue(updateSetMock) });

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "neg-2",
        toState: "DISCOVERY",
      },
    } as unknown as Parameters<typeof negotiationStateTransitionProcessor>[0];

    await expect(negotiationStateTransitionProcessor(job, {} as never)).rejects.toThrow(
      InvalidFSMTransitionError,
    );
    await expect(negotiationStateTransitionProcessor(job, {} as never)).rejects.toThrow(
      "Invalid FSM transition: PAID → DISCOVERY",
    );
  });

  it("negociere negăsită → aruncă eroare", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    const job = {
      data: { tenantId: "t1", negotiationId: "no-such", toState: "PROPOSAL" },
    } as unknown as Parameters<typeof negotiationStateTransitionProcessor>[0];

    await expect(negotiationStateTransitionProcessor(job, {} as never)).rejects.toThrow(
      "Negotiation not found",
    );
  });

  it("tranziție spre PROPOSAL → enqueue items:update pentru rezervare stoc", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ currentState: "DISCOVERY" }]));
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const job = {
      data: { tenantId: "t1", negotiationId: "neg-3", toState: "PROPOSAL" },
    } as unknown as Parameters<typeof negotiationStateTransitionProcessor>[0];

    await negotiationStateTransitionProcessor(job, {} as never);

    const allQueueNames = addMock.mock.calls.map((c) => c[0] as string);
    expect(allQueueNames).toContain("negotiation:history:log");
    expect(allQueueNames).toContain("negotiation:items:update");
  });

  it("tranziție spre DEAD → NU enqueue items:update", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ currentState: "NEGOTIATION" }]));
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const job = {
      data: { tenantId: "t1", negotiationId: "neg-4", toState: "DEAD" },
    } as unknown as Parameters<typeof negotiationStateTransitionProcessor>[0];

    await negotiationStateTransitionProcessor(job, {} as never);

    const allQueueNames = addMock.mock.calls.map((c) => c[0] as string);
    expect(allQueueNames).toContain("negotiation:history:log");
    expect(allQueueNames).not.toContain("negotiation:items:update");
  });

  it("eroare DB non-FSM → propagată ca atare", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ currentState: "DISCOVERY" }]));
    const updateSetMock = {
      where: vi.fn().mockRejectedValue(new Error("connection timeout")),
    };
    dbUpdateMock.mockReturnValue({ set: vi.fn().mockReturnValue(updateSetMock) });

    const job = {
      data: { tenantId: "t1", negotiationId: "neg-5", toState: "PROPOSAL" },
    } as unknown as Parameters<typeof negotiationStateTransitionProcessor>[0];

    await expect(negotiationStateTransitionProcessor(job, {} as never)).rejects.toThrow(
      "connection timeout",
    );
  });

  it("tranziție spre NEGOTIATION → enqueue items:update (STATES_NEEDING_RESERVATION)", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ currentState: "PROPOSAL" }]));
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const job = {
      data: { tenantId: "t1", negotiationId: "neg-n", toState: "NEGOTIATION" },
    } as unknown as Parameters<typeof negotiationStateTransitionProcessor>[0];

    await negotiationStateTransitionProcessor(job, {} as never);

    const allQueueNames = addMock.mock.calls.map((c) => c[0] as string);
    expect(allQueueNames).toContain("negotiation:items:update");
  });

  it("tranziție spre CLOSING → enqueue items:update (STATES_NEEDING_RESERVATION)", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ currentState: "NEGOTIATION" }]));
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const job = {
      data: { tenantId: "t1", negotiationId: "neg-c", toState: "CLOSING" },
    } as unknown as Parameters<typeof negotiationStateTransitionProcessor>[0];

    await negotiationStateTransitionProcessor(job, {} as never);

    const allQueueNames = addMock.mock.calls.map((c) => c[0] as string);
    expect(allQueueNames).toContain("negotiation:items:update");
  });

  it("tranziție spre INVOICED → NU enqueue items:update (nu e în STATES_NEEDING_RESERVATION)", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ currentState: "PROFORMA_SENT" }]));
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const job = {
      data: { tenantId: "t1", negotiationId: "neg-inv", toState: "INVOICED" },
    } as unknown as Parameters<typeof negotiationStateTransitionProcessor>[0];

    await negotiationStateTransitionProcessor(job, {} as never);

    const allQueueNames = addMock.mock.calls.map((c) => c[0] as string);
    expect(allQueueNames).not.toContain("negotiation:items:update");
    expect(allQueueNames).toContain("negotiation:history:log");
  });

  it("changedBy și reason propagate corect în payload history:log", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ currentState: "DISCOVERY" }]));
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "neg-payload",
        toState: "PROPOSAL",
        changedBy: "manager-xyz",
        reason: "Contract semnat",
      },
    } as unknown as Parameters<typeof negotiationStateTransitionProcessor>[0];

    await negotiationStateTransitionProcessor(job, {} as never);

    expect(addMock).toHaveBeenCalledWith(
      "negotiation:history:log",
      expect.objectContaining({
        changedBy: "manager-xyz",
        reason: "Contract semnat",
      }),
    );
  });
});

// ── D20: negotiation:history:log ──────────────────────────────────────────────

describe("D20 — negotiationHistoryLogProcessor", () => {
  it("inserează înregistrare history și returnează historyId", async () => {
    dbInsertMock.mockReturnValue(makeInsertChain([{ id: "hist-uuid-abc" }]));

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "neg-1",
        fromState: "DISCOVERY",
        toState: "PROPOSAL",
        changedBy: "user-1",
        reason: "Client interested",
      },
    } as unknown as Parameters<typeof negotiationHistoryLogProcessor>[0];

    const result = await negotiationHistoryLogProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.historyId).toBe("hist-uuid-abc");
    expect(dbInsertMock).toHaveBeenCalledTimes(1);
    expect(setSessionTenantIdMock).toHaveBeenCalledWith("t1");
  });

  it("fromState null (stare inițială) → inserează fără erori", async () => {
    dbInsertMock.mockReturnValue(makeInsertChain([{ id: "hist-uuid-xyz" }]));

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "neg-2",
        fromState: null,
        toState: "DISCOVERY",
      },
    } as unknown as Parameters<typeof negotiationHistoryLogProcessor>[0];

    const result = await negotiationHistoryLogProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.historyId).toBe("hist-uuid-xyz");
  });

  it("returnează 'unknown' dacă DB nu returnează id", async () => {
    const returnMock = vi.fn().mockResolvedValue([]);
    dbInsertMock.mockReturnValue({ values: vi.fn().mockReturnValue({ returning: returnMock }) });

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "neg-3",
        fromState: "PROPOSAL",
        toState: "NEGOTIATION",
      },
    } as unknown as Parameters<typeof negotiationHistoryLogProcessor>[0];

    const result = await negotiationHistoryLogProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.historyId).toBe("unknown");
  });

  it("nu face update sau delete — append-only", async () => {
    dbInsertMock.mockReturnValue(makeInsertChain([{ id: "hist-1" }]));

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "neg-4",
        fromState: "CLOSING",
        toState: "PROFORMA_SENT",
      },
    } as unknown as Parameters<typeof negotiationHistoryLogProcessor>[0];

    await negotiationHistoryLogProcessor(job, {} as never);

    expect(dbUpdateMock).not.toHaveBeenCalled();
    expect(dbDeleteMock).not.toHaveBeenCalled();
    expect(dbInsertMock).toHaveBeenCalledTimes(1);
  });
});

// ── D21: negotiation:items:update ─────────────────────────────────────────────

describe("D21 — negotiationItemsUpdateProcessor", () => {
  it("upsert items — inserează și calculează lineTotal corect", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ id: "neg-1", currentState: "NEGOTIATION" }]));
    dbInsertMock.mockReturnValue(makeInsertChain());

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "neg-1",
        action: "upsert",
        items: [
          { productId: "prod-1", quantity: 10, unitPrice: 100, discountPct: 10 },
          { productId: "prod-2", quantity: 5, unitPrice: 200, discountPct: 0 },
        ],
      },
    } as unknown as Parameters<typeof negotiationItemsUpdateProcessor>[0];

    const result = await negotiationItemsUpdateProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.itemsUpdated).toBe(2);
    expect(dbInsertMock).toHaveBeenCalledTimes(2);
    const insertCalls = dbInsertMock.mock.calls;
    expect(insertCalls.length).toBe(2);
  });

  it("delete items — șterge itemsIds specificate", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ id: "neg-1", currentState: "PROPOSAL" }]));
    dbDeleteMock.mockReturnValue(makeDeleteChain());

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "neg-1",
        action: "delete",
        itemIdsToDelete: ["item-1", "item-2"],
      },
    } as unknown as Parameters<typeof negotiationItemsUpdateProcessor>[0];

    const result = await negotiationItemsUpdateProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.itemsUpdated).toBe(2);
    expect(dbDeleteMock).toHaveBeenCalledTimes(1);
  });

  it("negociere în stare DEAD → aruncă eroare", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ id: "neg-dead", currentState: "DEAD" }]));

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "neg-dead",
        action: "upsert",
        items: [{ productId: "prod-1", quantity: 1, unitPrice: 100, discountPct: 0 }],
      },
    } as unknown as Parameters<typeof negotiationItemsUpdateProcessor>[0];

    await expect(negotiationItemsUpdateProcessor(job, {} as never)).rejects.toThrow(
      "terminal state",
    );
  });

  it("negociere negăsită → aruncă eroare", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "no-such",
        action: "upsert",
        items: [],
      },
    } as unknown as Parameters<typeof negotiationItemsUpdateProcessor>[0];

    await expect(negotiationItemsUpdateProcessor(job, {} as never)).rejects.toThrow(
      "Negotiation not found",
    );
  });

  it("lineTotal calculat corect: 100 * 10 * (1 - 10/100) = 900.00", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ id: "neg-1", currentState: "NEGOTIATION" }]));
    const valuesSpy = vi
      .fn()
      .mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: "item-uuid" }]) });
    dbInsertMock.mockReturnValue({ values: valuesSpy });

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "neg-1",
        action: "upsert",
        items: [{ productId: "prod-1", quantity: 10, unitPrice: 100, discountPct: 10 }],
      },
    } as unknown as Parameters<typeof negotiationItemsUpdateProcessor>[0];

    await negotiationItemsUpdateProcessor(job, {} as never);

    expect(valuesSpy).toHaveBeenCalledWith(expect.objectContaining({ lineTotal: "900.00" }));
  });

  it("negociere în stare PAID → aruncă eroare (terminal state)", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ id: "neg-paid", currentState: "PAID" }]));

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "neg-paid",
        action: "upsert",
        items: [{ productId: "prod-1", quantity: 1, unitPrice: 100, discountPct: 0 }],
      },
    } as unknown as Parameters<typeof negotiationItemsUpdateProcessor>[0];

    await expect(negotiationItemsUpdateProcessor(job, {} as never)).rejects.toThrow(
      "terminal state",
    );
  });

  it("upsert cu items=[] → itemsUpdated=0, fără INSERT în DB", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ id: "neg-1", currentState: "NEGOTIATION" }]));

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "neg-1",
        action: "upsert",
        items: [],
      },
    } as unknown as Parameters<typeof negotiationItemsUpdateProcessor>[0];

    const result = await negotiationItemsUpdateProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.itemsUpdated).toBe(0);
    expect(dbInsertMock).not.toHaveBeenCalled();
  });

  it("lineTotal 0% discount: 200 * 5 * (1 - 0/100) = 1000.00", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ id: "neg-1", currentState: "DISCOVERY" }]));
    const valuesSpy = vi
      .fn()
      .mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: "item-uuid-2" }]) });
    dbInsertMock.mockReturnValue({ values: valuesSpy });

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "neg-1",
        action: "upsert",
        items: [{ productId: "prod-zero", quantity: 5, unitPrice: 200, discountPct: 0 }],
      },
    } as unknown as Parameters<typeof negotiationItemsUpdateProcessor>[0];

    await negotiationItemsUpdateProcessor(job, {} as never);

    expect(valuesSpy).toHaveBeenCalledWith(expect.objectContaining({ lineTotal: "1000.00" }));
  });

  it("delete cu itemIdsToDelete=[] → itemsUpdated=0, fără DELETE în DB", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ id: "neg-1", currentState: "PROPOSAL" }]));

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "neg-1",
        action: "delete",
        itemIdsToDelete: [],
      },
    } as unknown as Parameters<typeof negotiationItemsUpdateProcessor>[0];

    const result = await negotiationItemsUpdateProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.itemsUpdated).toBe(0);
    expect(dbDeleteMock).not.toHaveBeenCalled();
  });
});

// ── D22: negotiation:reminder:send ────────────────────────────────────────────

describe("D22 — negotiationReminderSendProcessor", () => {
  it("găsește negocieri stale și enqueue reminders", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([
        {
          id: "neg-1",
          tenantId: "t1",
          currentState: "PROPOSAL",
          updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
        {
          id: "neg-2",
          tenantId: "t1",
          currentState: "NEGOTIATION",
          updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      ]),
    );

    const job = {
      data: { tenantId: "t1" },
    } as unknown as Parameters<typeof negotiationReminderSendProcessor>[0];

    const result = await negotiationReminderSendProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.remindersQueued).toBe(2);
    expect(addMock).toHaveBeenCalledTimes(2);
    const queueNames = addMock.mock.calls.map((c) => c[0] as string);
    expect(queueNames.every((n) => n === "ai:sentiment:analyze")).toBe(true);
  });

  it("nicio negociere stale → remindersQueued=0", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    const job = {
      data: {},
    } as unknown as Parameters<typeof negotiationReminderSendProcessor>[0];

    const result = await negotiationReminderSendProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.remindersQueued).toBe(0);
    expect(addMock).not.toHaveBeenCalled();
  });

  it("payload reminder conține negotiationId și state", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([
        {
          id: "neg-abc",
          tenantId: "t1",
          currentState: "DISCOVERY",
          updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
      ]),
    );

    const job = {
      data: { tenantId: "t1" },
    } as unknown as Parameters<typeof negotiationReminderSendProcessor>[0];

    await negotiationReminderSendProcessor(job, {} as never);

    expect(addMock).toHaveBeenCalledWith(
      "ai:sentiment:analyze",
      expect.objectContaining({ negotiationId: "neg-abc", state: "DISCOVERY" }),
    );
  });

  it("sentimentQueue.close() apelat după enqueue reminders", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([
        {
          id: "neg-1",
          tenantId: "t1",
          currentState: "DISCOVERY",
          updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      ]),
    );

    const job = {
      data: { tenantId: "t1" },
    } as unknown as Parameters<typeof negotiationReminderSendProcessor>[0];

    await negotiationReminderSendProcessor(job, {} as never);

    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it("payload include staleDays calculat corect din updatedAt", async () => {
    const updatedAt = new Date(Date.now() - (3 * 24 * 60 * 60 * 1000 + 60 * 1000)); // 3 zile + 1 min
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "neg-stale", tenantId: "t1", currentState: "PROPOSAL", updatedAt }]),
    );

    const job = {
      data: { tenantId: "t1" },
    } as unknown as Parameters<typeof negotiationReminderSendProcessor>[0];

    await negotiationReminderSendProcessor(job, {} as never);

    expect(addMock).toHaveBeenCalledWith(
      "ai:sentiment:analyze",
      expect.objectContaining({ staleDays: 3 }),
    );
  });

  it("fără tenantId → setSessionTenantId NU e apelat", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    const job = {
      data: {},
    } as unknown as Parameters<typeof negotiationReminderSendProcessor>[0];

    await negotiationReminderSendProcessor(job, {} as never);

    expect(setSessionTenantIdMock).not.toHaveBeenCalled();
  });
});

// ── D23: negotiation:expire:check ─────────────────────────────────────────────

describe("D23 — negotiationExpireCheckProcessor", () => {
  it("negocieri expirate → enqueue D26 abandon pentru fiecare", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([
        { id: "neg-1", tenantId: "t1", currentState: "PROPOSAL" },
        { id: "neg-2", tenantId: "t1", currentState: "NEGOTIATION" },
        { id: "neg-3", tenantId: "t2", currentState: "CLOSING" },
      ]),
    );

    const job = {
      data: {},
    } as unknown as Parameters<typeof negotiationExpireCheckProcessor>[0];

    const result = await negotiationExpireCheckProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.expiredCount).toBe(3);
    expect(addMock).toHaveBeenCalledTimes(3);
    for (const call of addMock.mock.calls) {
      expect(call[0]).toBe("negotiation:abandon:process");
      expect(call[1]).toMatchObject({ triggeredBy: "expire" });
    }
  });

  it("nicio negociere expirată → expiredCount=0", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    const job = {
      data: {},
    } as unknown as Parameters<typeof negotiationExpireCheckProcessor>[0];

    const result = await negotiationExpireCheckProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.expiredCount).toBe(0);
    expect(addMock).not.toHaveBeenCalled();
  });

  it("fiecare abandon are reason conținând starea originală", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "neg-1", tenantId: "t1", currentState: "PROFORMA_SENT" }]),
    );

    const job = {
      data: {},
    } as unknown as Parameters<typeof negotiationExpireCheckProcessor>[0];

    await negotiationExpireCheckProcessor(job, {} as never);

    expect(addMock).toHaveBeenCalledWith(
      "negotiation:abandon:process",
      expect.objectContaining({
        negotiationId: "neg-1",
        reason: expect.stringContaining("PROFORMA_SENT"),
      }),
    );
  });

  it("cu tenantId specificat → setSessionTenantId apelat", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    const job = {
      data: { tenantId: "tenant-xyz" },
    } as unknown as Parameters<typeof negotiationExpireCheckProcessor>[0];

    await negotiationExpireCheckProcessor(job, {} as never);

    expect(setSessionTenantIdMock).toHaveBeenCalledWith("tenant-xyz");
  });

  it("abandonQueue.close() apelat după enqueue abandon jobs", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "neg-1", tenantId: "t1", currentState: "PROPOSAL" }]),
    );

    const job = {
      data: {},
    } as unknown as Parameters<typeof negotiationExpireCheckProcessor>[0];

    await negotiationExpireCheckProcessor(job, {} as never);

    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it("tenantId din negociere propagat în fiecare abandon payload", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "neg-1", tenantId: "tenant-specific-42", currentState: "CLOSING" }]),
    );

    const job = {
      data: {},
    } as unknown as Parameters<typeof negotiationExpireCheckProcessor>[0];

    await negotiationExpireCheckProcessor(job, {} as never);

    expect(addMock).toHaveBeenCalledWith(
      "negotiation:abandon:process",
      expect.objectContaining({ tenantId: "tenant-specific-42" }),
    );
  });
});

// ── D24: negotiation:close:execute ────────────────────────────────────────────

describe("D24 — negotiationCloseExecuteProcessor", () => {
  it("action=to-proforma → enqueue state:transition cu toState=PROFORMA_SENT", async () => {
    let selectCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCount++;
      if (selectCount === 1) {
        return makeSelectChain([{ id: "neg-1", currentState: "CLOSING", totalValue: "5000" }]);
      }
      if (selectCount === 2) {
        return makeSelectChain([]);
      }
      return makeSelectChain([]);
    });

    const job = {
      data: { tenantId: "t1", negotiationId: "neg-1", action: "to-proforma" },
    } as unknown as Parameters<typeof negotiationCloseExecuteProcessor>[0];

    const result = await negotiationCloseExecuteProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.action).toBe("to-proforma");
    expect(result.queued).toBe(true);
    expect(addMock).toHaveBeenCalledWith(
      "negotiation:state:transition",
      expect.objectContaining({ toState: "PROFORMA_SENT" }),
    );
  });

  it("action=to-invoice → enqueue state:transition cu toState=INVOICED", async () => {
    let selectCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCount++;
      if (selectCount === 1) {
        return makeSelectChain([
          { id: "neg-2", currentState: "PROFORMA_SENT", totalValue: "8000" },
        ]);
      }
      return makeSelectChain([]);
    });

    const job = {
      data: { tenantId: "t1", negotiationId: "neg-2", action: "to-invoice" },
    } as unknown as Parameters<typeof negotiationCloseExecuteProcessor>[0];

    const result = await negotiationCloseExecuteProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.action).toBe("to-invoice");
    expect(addMock).toHaveBeenCalledWith(
      "negotiation:state:transition",
      expect.objectContaining({ toState: "INVOICED" }),
    );
  });

  it("negociere negăsită → aruncă eroare", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    const job = {
      data: { tenantId: "t1", negotiationId: "no-such", action: "to-proforma" },
    } as unknown as Parameters<typeof negotiationCloseExecuteProcessor>[0];

    await expect(negotiationCloseExecuteProcessor(job, {} as never)).rejects.toThrow(
      "Negotiation not found",
    );
  });

  it("setSessionTenantId apelat cu tenantId corect", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "neg-3", currentState: "CLOSING", totalValue: "1000" }]),
    );

    const job = {
      data: { tenantId: "tenant-abc", negotiationId: "neg-3", action: "to-proforma" },
    } as unknown as Parameters<typeof negotiationCloseExecuteProcessor>[0];

    await negotiationCloseExecuteProcessor(job, {} as never);

    expect(setSessionTenantIdMock).toHaveBeenCalledWith("tenant-abc");
  });

  it("items cu productIds → 3 select-uri (negotiation + items + products cu inArray)", async () => {
    let selectCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCount++;
      if (selectCount === 1) {
        return makeSelectChain([{ id: "neg-4", currentState: "CLOSING", totalValue: "15000" }]);
      }
      if (selectCount === 2) {
        return makeSelectChain([
          {
            id: "item-1",
            productId: "prod-A",
            quantity: 10,
            unitPrice: "1000",
            lineTotal: "10000",
          },
          { id: "item-2", productId: "prod-B", quantity: 5, unitPrice: "1000", lineTotal: "5000" },
        ]);
      }
      return makeSelectChain([
        { id: "prod-A", name: "Produs Alpha", sku: "SKU-A01" },
        { id: "prod-B", name: "Produs Beta", sku: "SKU-B02" },
      ]);
    });

    const job = {
      data: { tenantId: "t1", negotiationId: "neg-4", action: "to-proforma" },
    } as unknown as Parameters<typeof negotiationCloseExecuteProcessor>[0];

    const result = await negotiationCloseExecuteProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(selectCount).toBe(3);
    expect(addMock).toHaveBeenCalledWith(
      "negotiation:state:transition",
      expect.objectContaining({ toState: "PROFORMA_SENT" }),
    );
  });

  it("items fără productIds → products query omisă (2 selects)", async () => {
    let selectCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCount++;
      if (selectCount === 1) {
        return makeSelectChain([{ id: "neg-5", currentState: "PROFORMA_SENT", totalValue: "500" }]);
      }
      return makeSelectChain([]); // items = [] → productIds = [] → products skipped
    });

    const job = {
      data: { tenantId: "t1", negotiationId: "neg-5", action: "to-invoice" },
    } as unknown as Parameters<typeof negotiationCloseExecuteProcessor>[0];

    const result = await negotiationCloseExecuteProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(selectCount).toBe(2);
    expect(dbSelectMock).toHaveBeenCalledTimes(2);
  });

  it("items cu product IDs duplicate → deduplicare corectă, o singură products query", async () => {
    let selectCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCount++;
      if (selectCount === 1) {
        return makeSelectChain([{ id: "neg-6", currentState: "CLOSING", totalValue: "3000" }]);
      }
      if (selectCount === 2) {
        return makeSelectChain([
          { id: "item-1", productId: "prod-dup", quantity: 5, unitPrice: "200", lineTotal: "1000" },
          {
            id: "item-2",
            productId: "prod-dup",
            quantity: 10,
            unitPrice: "200",
            lineTotal: "2000",
          },
        ]);
      }
      return makeSelectChain([{ id: "prod-dup", name: "Produs Duplicat", sku: "DUP-001" }]);
    });

    const job = {
      data: { tenantId: "t1", negotiationId: "neg-6", action: "to-proforma" },
    } as unknown as Parameters<typeof negotiationCloseExecuteProcessor>[0];

    const result = await negotiationCloseExecuteProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(selectCount).toBe(3);
    expect(dbSelectMock).toHaveBeenCalledTimes(3);
    expect(addMock).toHaveBeenCalledWith(
      "negotiation:state:transition",
      expect.objectContaining({ toState: "PROFORMA_SENT" }),
    );
  });

  it("to-invoice cu produse → enqueue INVOICED + 3 selects", async () => {
    let selectCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCount++;
      if (selectCount === 1) {
        return makeSelectChain([
          { id: "neg-7", currentState: "PROFORMA_SENT", totalValue: "25000" },
        ]);
      }
      if (selectCount === 2) {
        return makeSelectChain([
          {
            id: "item-1",
            productId: "prod-X",
            quantity: 25,
            unitPrice: "1000",
            lineTotal: "25000",
          },
        ]);
      }
      return makeSelectChain([{ id: "prod-X", name: "Produs X", sku: "X-100" }]);
    });

    const job = {
      data: { tenantId: "t1", negotiationId: "neg-7", action: "to-invoice" },
    } as unknown as Parameters<typeof negotiationCloseExecuteProcessor>[0];

    const result = await negotiationCloseExecuteProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.action).toBe("to-invoice");
    expect(selectCount).toBe(3);
    expect(addMock).toHaveBeenCalledWith(
      "negotiation:state:transition",
      expect.objectContaining({ toState: "INVOICED" }),
    );
  });

  it("transitionQueue.close() apelat după fiecare acțiune", async () => {
    let selectCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCount++;
      if (selectCount === 1) {
        return makeSelectChain([{ id: "neg-8", currentState: "CLOSING", totalValue: "100" }]);
      }
      return makeSelectChain([]);
    });

    const job = {
      data: { tenantId: "t1", negotiationId: "neg-8", action: "to-proforma" },
    } as unknown as Parameters<typeof negotiationCloseExecuteProcessor>[0];

    await negotiationCloseExecuteProcessor(job, {} as never);

    expect(closeMock).toHaveBeenCalledTimes(1);
  });
});

// ── D25: negotiation:reopen:request ───────────────────────────────────────────

describe("D25 — negotiationReopenRequestProcessor", () => {
  it("negociere DEAD < 90 zile → HITL escalation enqueued", async () => {
    const createdAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 zile în urmă
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "neg-1", currentState: "DEAD", createdAt }]),
    );

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "neg-1",
        requestedBy: "user-manager",
        reason: "Client a revenit",
      },
    } as unknown as Parameters<typeof negotiationReopenRequestProcessor>[0];

    const result = await negotiationReopenRequestProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.escalated).toBe(true);
    expect(result.message).toBe("HITL approval required");
    expect(addMock).toHaveBeenCalledWith(
      "hitl:escalate",
      expect.objectContaining({
        discriminator: "negotiation-reopen",
        negotiationId: "neg-1",
        requestedBy: "user-manager",
      }),
    );
  });

  it("negociere nu e DEAD → aruncă eroare", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "neg-2", currentState: "PROPOSAL", createdAt: new Date() }]),
    );

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "neg-2",
        requestedBy: "user-1",
        reason: "test",
      },
    } as unknown as Parameters<typeof negotiationReopenRequestProcessor>[0];

    await expect(negotiationReopenRequestProcessor(job, {} as never)).rejects.toThrow(
      "expected DEAD",
    );
  });

  it("negociere DEAD > 90 zile → aruncă eroare (expirat)", async () => {
    const createdAt = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 zile
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "neg-3", currentState: "DEAD", createdAt }]),
    );

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "neg-3",
        requestedBy: "user-1",
        reason: "late reopen",
      },
    } as unknown as Parameters<typeof negotiationReopenRequestProcessor>[0];

    await expect(negotiationReopenRequestProcessor(job, {} as never)).rejects.toThrow(
      "max 90 days",
    );
  });

  it("negociere negăsită → aruncă eroare", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "no-such",
        requestedBy: "user-1",
        reason: "test",
      },
    } as unknown as Parameters<typeof negotiationReopenRequestProcessor>[0];

    await expect(negotiationReopenRequestProcessor(job, {} as never)).rejects.toThrow(
      "Negotiation not found",
    );
  });

  it("hitlQueue.close() apelat după escaladare", async () => {
    const createdAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "neg-close", currentState: "DEAD", createdAt }]),
    );

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "neg-close",
        requestedBy: "user-1",
        reason: "test-close",
      },
    } as unknown as Parameters<typeof negotiationReopenRequestProcessor>[0];

    await negotiationReopenRequestProcessor(job, {} as never);

    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it("payload HITL conține reason transmis din job.data", async () => {
    const createdAt = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "neg-reason", currentState: "DEAD", createdAt }]),
    );

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "neg-reason",
        requestedBy: "user-1",
        reason: "Client premium a revenit cu ofertă nouă",
      },
    } as unknown as Parameters<typeof negotiationReopenRequestProcessor>[0];

    await negotiationReopenRequestProcessor(job, {} as never);

    expect(addMock).toHaveBeenCalledWith(
      "hitl:escalate",
      expect.objectContaining({
        reason: "Client premium a revenit cu ofertă nouă",
        negotiationId: "neg-reason",
      }),
    );
  });

  it("DEAD 89.5 zile → HITL (sub limita de 90 zile — ageDays < 90)", async () => {
    const createdAt = new Date(Date.now() - Math.floor(89.5 * 24 * 60 * 60 * 1000));
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "neg-boundary", currentState: "DEAD", createdAt }]),
    );

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "neg-boundary",
        requestedBy: "manager-boundary",
        reason: "Boundary test sub 90 zile",
      },
    } as unknown as Parameters<typeof negotiationReopenRequestProcessor>[0];

    const result = await negotiationReopenRequestProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.escalated).toBe(true);
    expect(addMock).toHaveBeenCalledWith(
      "hitl:escalate",
      expect.objectContaining({ negotiationId: "neg-boundary" }),
    );
  });
});

// ── D26: negotiation:abandon:process ──────────────────────────────────────────

describe("D26 — negotiationAbandonProcessProcessor", () => {
  it("abandonare completă: release stock + enqueue state:transition + history:log", async () => {
    let selectCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCount++;
      if (selectCount === 1) {
        return makeSelectChain([{ id: "neg-1", currentState: "NEGOTIATION" }]);
      }
      return makeSelectChain([
        { id: "res-1", inventoryId: "inv-1", quantity: 5 },
        { id: "res-2", inventoryId: "inv-2", quantity: 3 },
      ]);
    });
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "neg-1",
        reason: "Client a abandonat",
        triggeredBy: "user",
      },
    } as unknown as Parameters<typeof negotiationAbandonProcessProcessor>[0];

    const result = await negotiationAbandonProcessProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.stockReleased).toBe(true);
    expect(result.negotiationId).toBe("neg-1");
    expect(dbUpdateMock).toHaveBeenCalled();

    const allQueueNames = addMock.mock.calls.map((c) => c[0] as string);
    expect(allQueueNames).toContain("negotiation:state:transition");
    expect(allQueueNames).toContain("negotiation:history:log");
  });

  it("negociere deja DEAD → skip, fără stock release", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ id: "neg-dead", currentState: "DEAD" }]));

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "neg-dead",
        triggeredBy: "system",
      },
    } as unknown as Parameters<typeof negotiationAbandonProcessProcessor>[0];

    const result = await negotiationAbandonProcessProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.stockReleased).toBe(false);
    expect(dbUpdateMock).not.toHaveBeenCalled();
    expect(addMock).not.toHaveBeenCalled();
  });

  it("negociere PAID → skip", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ id: "neg-paid", currentState: "PAID" }]));

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "neg-paid",
        triggeredBy: "expire",
      },
    } as unknown as Parameters<typeof negotiationAbandonProcessProcessor>[0];

    const result = await negotiationAbandonProcessProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(true);
  });

  it("state transition enqueued cu toState=DEAD", async () => {
    let selectCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCount++;
      if (selectCount === 1) {
        return makeSelectChain([{ id: "neg-2", currentState: "CLOSING" }]);
      }
      return makeSelectChain([]);
    });
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "neg-2",
        reason: "Expire TTL",
        triggeredBy: "expire",
      },
    } as unknown as Parameters<typeof negotiationAbandonProcessProcessor>[0];

    await negotiationAbandonProcessProcessor(job, {} as never);

    expect(addMock).toHaveBeenCalledWith(
      "negotiation:state:transition",
      expect.objectContaining({ toState: "DEAD", negotiationId: "neg-2" }),
    );
  });

  it("fără rezervări active → stockReleased=true dar fără UPDATE stoc", async () => {
    let selectCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCount++;
      if (selectCount === 1) {
        return makeSelectChain([{ id: "neg-3", currentState: "DISCOVERY" }]);
      }
      return makeSelectChain([]);
    });

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "neg-3",
        triggeredBy: "user",
      },
    } as unknown as Parameters<typeof negotiationAbandonProcessProcessor>[0];

    const result = await negotiationAbandonProcessProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.stockReleased).toBe(true);
    expect(dbUpdateMock).not.toHaveBeenCalled();
  });

  it("negociere negăsită → aruncă eroare", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "no-such",
        triggeredBy: "system",
      },
    } as unknown as Parameters<typeof negotiationAbandonProcessProcessor>[0];

    await expect(negotiationAbandonProcessProcessor(job, {} as never)).rejects.toThrow(
      "Negotiation not found",
    );
  });

  it("transitionQueue.close() și historyQueue.close() apelate ambele", async () => {
    let selectCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCount++;
      if (selectCount === 1) {
        return makeSelectChain([{ id: "neg-close", currentState: "PROPOSAL" }]);
      }
      return makeSelectChain([]); // no active reservations
    });

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "neg-close",
        triggeredBy: "user",
      },
    } as unknown as Parameters<typeof negotiationAbandonProcessProcessor>[0];

    await negotiationAbandonProcessProcessor(job, {} as never);

    // transitionQueue.close() + historyQueue.close() = 2 close calls
    expect(closeMock).toHaveBeenCalledTimes(2);
  });

  it("2 rezervări active → 4 UPDATE-uri: 2× RELEASED + 2× stockInventory decrementare", async () => {
    let selectCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCount++;
      if (selectCount === 1) {
        return makeSelectChain([{ id: "neg-2res", currentState: "NEGOTIATION" }]);
      }
      return makeSelectChain([
        { id: "res-A", inventoryId: "inv-A", quantity: 3 },
        { id: "res-B", inventoryId: "inv-B", quantity: 7 },
      ]);
    });
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "neg-2res",
        triggeredBy: "expire",
      },
    } as unknown as Parameters<typeof negotiationAbandonProcessProcessor>[0];

    const result = await negotiationAbandonProcessProcessor(job, {} as never);

    // 2 rezervări × (1 UPDATE stockReservations RELEASED + 1 UPDATE stockInventory) = 4 total
    expect(dbUpdateMock).toHaveBeenCalledTimes(4);
    expect(result.stockReleased).toBe(true);
  });

  it("reason propagat corect în payload negotiation:state:transition", async () => {
    let selectCount = 0;
    dbSelectMock.mockImplementation(() => {
      selectCount++;
      if (selectCount === 1) {
        return makeSelectChain([{ id: "neg-reason", currentState: "DISCOVERY" }]);
      }
      return makeSelectChain([]);
    });

    const job = {
      data: {
        tenantId: "t1",
        negotiationId: "neg-reason",
        reason: "Contract picat definitiv",
        triggeredBy: "user",
      },
    } as unknown as Parameters<typeof negotiationAbandonProcessProcessor>[0];

    await negotiationAbandonProcessProcessor(job, {} as never);

    expect(addMock).toHaveBeenCalledWith(
      "negotiation:state:transition",
      expect.objectContaining({ reason: "Contract picat definitiv" }),
    );
  });
});
