/**
 * Teste complete pentru workers G39-G45 (E3 AI Sales — Oblio Invoicing Integration).
 *
 * Pattern vitest: vi.hoisted() + vi.mock() pentru mock-uri mutabile per test.
 * Acoperire:
 *  G39: proforma create CLOSING→PROFORMA_SENT, state mismatch, no items, fiscal audit trail
 *  G40: proforma update PROFORMA+ACTIVE→update totals, not PROFORMA throw, CANCELLED throw
 *  G41: invoice create PROFORMA→INVOICE, proforma not found, enqueue INVOICED, fiscal audit trail
 *  G42: fără approvalRef→HITL+pending, cu approvalRef→cancel+CREDIT_NOTE, invoice not ACTIVE throw
 *  G43: validare client CUI, negociere negăsită, company negăsită, setSessionTenantId
 *  G44: STUB fără inventar, cu inventar (sku filter), syncedCount corect
 *  G45: oblioId necunoscut→processed=false, deja terminal→skip, payment_received→PAID, fiscal audit
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";

// ── vi.hoisted() ───────────────────────────────────────────────────────────────

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
  const addMock = vi.fn().mockResolvedValue({ id: "hitl-job-1" });
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

// ── vi.mock() ──────────────────────────────────────────────────────────────────

vi.mock("@cerniq/db", () => ({
  db: {
    select: dbSelectMock,
    insert: dbInsertMock,
    update: dbUpdateMock,
    execute: dbExecuteMock,
  },
  setSessionTenantId: setSessionTenantIdMock,
  goldNegotiations: {
    id: "id",
    tenantId: "tenant_id",
    leadId: "lead_id",
    currentState: "current_state",
    totalValue: "total_value",
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
  oblioDocuments: {
    id: "id",
    tenantId: "tenant_id",
    documentType: "document_type",
    series: "series",
    number: "number",
    oblioId: "oblio_id",
    status: "status",
    subtotal: "subtotal",
    vat: "vat",
    total: "total",
    issuedAt: "issued_at",
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
  goldCompanies: {
    id: "id",
    tenantId: "tenant_id",
    cui: "cui",
    denumire: "denumire",
    platitorTva: "platitor_tva",
  },
  stockInventory: {
    id: "id",
    tenantId: "tenant_id",
    sku: "sku",
    totalQuantity: "total_quantity",
    reservedQuantity: "reserved_quantity",
  },
  eq: vi.fn((_a: unknown, _b: unknown) => ({ type: "eq" })),
  and: vi.fn((..._args: unknown[]) => ({ type: "and" })),
  desc: vi.fn((_a: unknown) => ({ type: "desc" })),
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
    E3_NEGOTIATION_STATE_TRANSITION: "negotiation:state:transition",
    HITL_ESCALATION: "hitl:escalate",
    E3_OBLIO_INVOICE_CANCEL: "oblio:invoice:cancel",
    E3_OBLIO_PROFORMA_CREATE: "oblio:proforma:create",
    E3_OBLIO_INVOICE_CREATE: "oblio:invoice:create",
  },
}));

// Mochează oblioClient pentru a testa workerii independent
vi.mock("../lib/oblio-client.js", () => ({
  oblioClient: {
    createProforma: vi.fn().mockResolvedValue({
      oblioId: "stub-pf-t1",
      series: "P",
      number: 1001,
      total: 119,
      subtotal: 100,
      vat: 19,
    }),
    updateProforma: vi.fn().mockResolvedValue({ oblioId: "stub-pf-t1", updated: true }),
    convertProformaToInvoice: vi.fn().mockResolvedValue({
      invoiceOblioId: "stub-inv-t1",
      series: "F",
      number: 2001,
    }),
    cancelInvoice: vi.fn().mockResolvedValue({
      creditNoteOblioId: "stub-cn-t1",
      cancelled: true,
    }),
    validateClient: vi.fn().mockResolvedValue({
      oblioClientId: "stub-client-1234567",
      clientName: "SC TEST SRL",
      isNew: false,
    }),
    syncStock: vi.fn().mockResolvedValue({ synced: 3, errors: 0, note: "oblio-stock-sync-stub" }),
    processWebhookEvent: vi.fn().mockResolvedValue({
      acknowledged: true,
      oblioId: "stub-inv-001",
      eventType: "payment_received",
    }),
  },
}));

// ── Helper builders ───────────────────────────────────────────────────────────

function makeSelectChain(rows: unknown[]) {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    then: (
      resolve?: ((value: unknown[]) => unknown) | null,
      reject?: ((reason: unknown) => unknown) | null,
    ) => Promise.resolve(rows).then(resolve ?? undefined, reject ?? undefined),
    catch: (onRejected?: ((reason: unknown) => unknown) | null) =>
      Promise.resolve(rows).catch(onRejected ?? undefined),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  return chain;
}

function makeInsertChain(returning?: unknown[]) {
  const returningChain = {
    returning: vi.fn().mockResolvedValue(returning ?? [{ id: "doc-id-1" }]),
  };
  return {
    values: vi.fn().mockReturnValue(returningChain),
    returning: vi.fn().mockResolvedValue(returning ?? [{ id: "doc-id-1" }]),
  };
}

function makeUpdateChain() {
  const setChain = { where: vi.fn().mockResolvedValue({ rowCount: 1 }) };
  return { set: vi.fn().mockReturnValue(setChain) };
}

// ── Imports workers + client ───────────────────────────────────────────────────

import { oblioProformaCreateProcessor } from "../workers/g39-oblio-proforma-create.js";
import { oblioProformaUpdateProcessor } from "../workers/g40-oblio-proforma-update.js";
import { oblioInvoiceCreateProcessor } from "../workers/g41-oblio-invoice-create.js";
import { oblioInvoiceCancelProcessor } from "../workers/g42-oblio-invoice-cancel.js";
import { oblioClientValidateProcessor } from "../workers/g43-oblio-client-validate.js";
import { oblioStockSyncProcessor } from "../workers/g44-oblio-stock-sync.js";
import { oblioWebhookProcessProcessor } from "../workers/g45-oblio-webhook-process.js";
import { oblioClient } from "../lib/oblio-client.js";

// ── Reset ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  setSessionTenantIdMock.mockResolvedValue(undefined);
  addMock.mockResolvedValue({ id: "hitl-job-1" });
  closeMock.mockResolvedValue(undefined);
  createQueueMock.mockReturnValue({ add: addMock, close: closeMock });

  // Reset oblioClient mocks cu valori default
  vi.mocked(oblioClient.createProforma).mockResolvedValue({
    oblioId: "stub-pf-t1",
    series: "P",
    number: 1001,
    total: 119,
    subtotal: 100,
    vat: 19,
  });
  vi.mocked(oblioClient.updateProforma).mockResolvedValue({ oblioId: "stub-pf-t1", updated: true });
  vi.mocked(oblioClient.convertProformaToInvoice).mockResolvedValue({
    invoiceOblioId: "stub-inv-t1",
    series: "F",
    number: 2001,
  });
  vi.mocked(oblioClient.cancelInvoice).mockResolvedValue({
    creditNoteOblioId: "stub-cn-t1",
    cancelled: true,
  });
  vi.mocked(oblioClient.validateClient).mockResolvedValue({
    oblioClientId: "stub-client-1234567",
    clientName: "SC TEST SRL",
    isNew: false,
  });
  vi.mocked(oblioClient.syncStock).mockResolvedValue({
    synced: 3,
    errors: 0,
    note: "oblio-stock-sync-stub",
  });
});

// ── Job factory helpers ────────────────────────────────────────────────────────

function makeG39Job(data: { tenantId: string; negotiationId: string; actorId: string }) {
  return { data } as unknown as Parameters<typeof oblioProformaCreateProcessor>[0];
}

function makeG40Job(data: {
  tenantId: string;
  oblioDocumentId: string;
  actorId: string;
  newSubtotal: number;
}) {
  return { data } as unknown as Parameters<typeof oblioProformaUpdateProcessor>[0];
}

function makeG41Job(data: {
  tenantId: string;
  oblioDocumentId: string;
  negotiationId: string;
  actorId: string;
}) {
  return { data } as unknown as Parameters<typeof oblioInvoiceCreateProcessor>[0];
}

function makeG42Job(data: {
  tenantId: string;
  oblioDocumentId: string;
  reason: string;
  actorId: string;
  approvalRef?: string;
}) {
  return { data } as unknown as Parameters<typeof oblioInvoiceCancelProcessor>[0];
}

function makeG43Job(data: { tenantId: string; negotiationId: string }) {
  return { data } as unknown as Parameters<typeof oblioClientValidateProcessor>[0];
}

function makeG44Job(data: { tenantId: string }) {
  return { data } as unknown as Parameters<typeof oblioStockSyncProcessor>[0];
}

function makeG45Job(data: {
  tenantId: string;
  oblioId: string;
  eventType: string;
  payload?: Record<string, unknown>;
}) {
  return { data } as unknown as Parameters<typeof oblioWebhookProcessProcessor>[0];
}

// =============================================================================
// G39 — oblio:proforma:create
// =============================================================================

describe("G39 — oblioProformaCreateProcessor", () => {
  it("proformă reușită: CLOSING → INSERT PROFORMA + enqueue state:transition + audit", async () => {
    // Negociere în CLOSING
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([
          {
            id: "neg-1",
            currentState: "CLOSING",
            leadId: "lead-1",
            totalValue: "100",
          },
        ]),
      )
      // Items
      .mockReturnValueOnce(
        makeSelectChain([
          {
            id: "item-1",
            productId: "prod-1",
            quantity: 2,
            unitPrice: "50",
            discountPct: "0",
            lineTotal: "100",
          },
        ]),
      )
      // Products
      .mockReturnValueOnce(makeSelectChain([{ id: "prod-1", name: "Produs A", sku: "SKU-001" }]))
      // lastEntries audit
      .mockReturnValueOnce(makeSelectChain([]));

    dbInsertMock.mockReturnValue(makeInsertChain([{ id: "doc-proforma-1" }]));

    const result = await oblioProformaCreateProcessor(
      makeG39Job({ tenantId: "t1", negotiationId: "neg-1", actorId: "user-1" }),
      {} as never,
    );

    expect(result.ok).toBe(true);
    expect(result.oblioDocumentId).toBeTruthy();
    expect(result.total).toBeCloseTo(119, 1);
    expect(result.hash).toBeTruthy();
    // Trebuie să fi enqueued state:transition → PROFORMA_SENT
    expect(addMock).toHaveBeenCalledWith(
      "negotiation:state:transition",
      expect.objectContaining({ toState: "PROFORMA_SENT" }),
      expect.any(Object),
    );
  });

  it("negociere negăsită → throw", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    await expect(
      oblioProformaCreateProcessor(
        makeG39Job({ tenantId: "t1", negotiationId: "neg-missing", actorId: "u1" }),
        {} as never,
      ),
    ).rejects.toThrow("neg-missing negăsită");
  });

  it("negociere nu e CLOSING (este PROPOSAL) → throw", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "neg-1", currentState: "PROPOSAL", leadId: "lead-1" }]),
    );

    await expect(
      oblioProformaCreateProcessor(
        makeG39Job({ tenantId: "t1", negotiationId: "neg-1", actorId: "u1" }),
        {} as never,
      ),
    ).rejects.toThrow("CLOSING");
  });

  it("negociere fără items → throw", async () => {
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([{ id: "neg-1", currentState: "CLOSING", leadId: "l1" }]),
      )
      .mockReturnValueOnce(makeSelectChain([])); // no items

    await expect(
      oblioProformaCreateProcessor(
        makeG39Job({ tenantId: "t1", negotiationId: "neg-1", actorId: "u1" }),
        {} as never,
      ),
    ).rejects.toThrow("nu are items");
  });

  it("fiscalAuditTrail inserat cu prevHash=GENESIS (prima intrare)", async () => {
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([{ id: "neg-1", currentState: "CLOSING", leadId: "l1" }]),
      )
      .mockReturnValueOnce(
        makeSelectChain([
          {
            id: "i1",
            productId: "p1",
            quantity: 1,
            unitPrice: "100",
            discountPct: "0",
            lineTotal: "100",
          },
        ]),
      )
      .mockReturnValueOnce(makeSelectChain([{ id: "p1", name: "X", sku: "S1" }]))
      .mockReturnValueOnce(makeSelectChain([])); // GENESIS

    const insertValues: unknown[] = [];
    dbInsertMock.mockImplementation(() => {
      const returningChain = {
        returning: vi.fn().mockImplementation((spec) => {
          if (spec && "id" in (spec as Record<string, unknown>)) {
            return Promise.resolve([{ id: "doc-1" }]);
          }
          return Promise.resolve([{ id: "doc-1" }]);
        }),
      };
      return {
        values: vi.fn().mockImplementation((v) => {
          insertValues.push(v);
          return returningChain;
        }),
      };
    });

    await oblioProformaCreateProcessor(
      makeG39Job({ tenantId: "t1", negotiationId: "neg-1", actorId: "u1" }),
      {} as never,
    );

    // Al doilea INSERT este pentru fiscalAuditTrail
    const auditInsert = insertValues.find(
      (v) => (v as Record<string, unknown>).action === "PROFORMA_CREATED",
    );
    expect(auditInsert).toBeDefined();
    expect((auditInsert as Record<string, unknown>).prevHash).toBe("GENESIS");
    expect((auditInsert as Record<string, unknown>).hash).toBeTruthy();
  });

  it("total = subtotal + vat (19%) — CHECK constraint respectat", async () => {
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([{ id: "neg-1", currentState: "CLOSING", leadId: "l1" }]),
      )
      .mockReturnValueOnce(
        makeSelectChain([
          {
            id: "i1",
            productId: "p1",
            quantity: 1,
            unitPrice: "200",
            discountPct: "0",
            lineTotal: "200",
          },
        ]),
      )
      .mockReturnValueOnce(makeSelectChain([{ id: "p1", name: "Y", sku: "S2" }]))
      .mockReturnValueOnce(makeSelectChain([]));

    dbInsertMock.mockReturnValue(makeInsertChain([{ id: "doc-2" }]));

    const result = await oblioProformaCreateProcessor(
      makeG39Job({ tenantId: "t1", negotiationId: "neg-1", actorId: "u1" }),
      {} as never,
    );

    // subtotal=200, vat=38, total=238
    expect(result.total).toBeCloseTo(238, 1);
  });

  it("setSessionTenantId apelat cu tenantId corect", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    await expect(
      oblioProformaCreateProcessor(
        makeG39Job({ tenantId: "t-test", negotiationId: "neg-1", actorId: "u1" }),
        {} as never,
      ),
    ).rejects.toThrow();

    expect(setSessionTenantIdMock).toHaveBeenCalledWith("t-test");
  });

  it("transitionQueue.close() apelat după enqueue", async () => {
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([{ id: "neg-1", currentState: "CLOSING", leadId: "l1" }]),
      )
      .mockReturnValueOnce(
        makeSelectChain([
          {
            id: "i1",
            productId: "p1",
            quantity: 1,
            unitPrice: "50",
            discountPct: "0",
            lineTotal: "50",
          },
        ]),
      )
      .mockReturnValueOnce(makeSelectChain([{ id: "p1", name: "Z", sku: "S3" }]))
      .mockReturnValueOnce(makeSelectChain([]));

    dbInsertMock.mockReturnValue(makeInsertChain([{ id: "doc-3" }]));

    await oblioProformaCreateProcessor(
      makeG39Job({ tenantId: "t1", negotiationId: "neg-1", actorId: "u1" }),
      {} as never,
    );

    expect(closeMock).toHaveBeenCalled();
  });
});

// =============================================================================
// G40 — oblio:proforma:update
// =============================================================================

describe("G40 — oblioProformaUpdateProcessor", () => {
  it("update reușit: PROFORMA + ACTIVE → UPDATE totals + audit", async () => {
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([
          {
            id: "doc-1",
            documentType: "PROFORMA",
            status: "ACTIVE",
            oblioId: "stub-pf-t1",
          },
        ]),
      )
      .mockReturnValueOnce(makeSelectChain([])); // audit GENESIS

    dbUpdateMock.mockReturnValue(makeUpdateChain());
    dbInsertMock.mockReturnValue(makeInsertChain());

    const result = await oblioProformaUpdateProcessor(
      makeG40Job({ tenantId: "t1", oblioDocumentId: "doc-1", actorId: "u1", newSubtotal: 150 }),
      {} as never,
    );

    expect(result.ok).toBe(true);
    expect(result.oblioDocumentId).toBe("doc-1");
    expect(result.newTotal).toBeCloseTo(178.5, 1); // 150 + 28.5
    expect(dbUpdateMock).toHaveBeenCalledTimes(1);
  });

  it("document negăsit → throw", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    await expect(
      oblioProformaUpdateProcessor(
        makeG40Job({
          tenantId: "t1",
          oblioDocumentId: "doc-missing",
          actorId: "u1",
          newSubtotal: 100,
        }),
        {} as never,
      ),
    ).rejects.toThrow("doc-missing negăsit");
  });

  it("document nu e PROFORMA (este INVOICE) → throw", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([
        { id: "doc-1", documentType: "INVOICE", status: "ACTIVE", oblioId: "inv-1" },
      ]),
    );

    await expect(
      oblioProformaUpdateProcessor(
        makeG40Job({ tenantId: "t1", oblioDocumentId: "doc-1", actorId: "u1", newSubtotal: 100 }),
        {} as never,
      ),
    ).rejects.toThrow("nu e PROFORMA");
  });

  it("proforma CANCELLED → throw update imposibil", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([
        { id: "doc-1", documentType: "PROFORMA", status: "CANCELLED", oblioId: "pf-1" },
      ]),
    );

    await expect(
      oblioProformaUpdateProcessor(
        makeG40Job({ tenantId: "t1", oblioDocumentId: "doc-1", actorId: "u1", newSubtotal: 100 }),
        {} as never,
      ),
    ).rejects.toThrow("CANCELLED");
  });

  it("proforma REPLACED → throw update imposibil", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([
        { id: "doc-1", documentType: "PROFORMA", status: "REPLACED", oblioId: "pf-1" },
      ]),
    );

    await expect(
      oblioProformaUpdateProcessor(
        makeG40Job({ tenantId: "t1", oblioDocumentId: "doc-1", actorId: "u1", newSubtotal: 100 }),
        {} as never,
      ),
    ).rejects.toThrow("REPLACED");
  });

  it("fiscalAuditTrail inserat cu action=PROFORMA_UPDATED", async () => {
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([
          { id: "doc-1", documentType: "PROFORMA", status: "ACTIVE", oblioId: "pf-1" },
        ]),
      )
      .mockReturnValueOnce(makeSelectChain([{ hash: "prev-hash-abc" }]));

    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const insertValues: unknown[] = [];
    dbInsertMock.mockImplementation(() => ({
      values: vi.fn().mockImplementation((v) => {
        insertValues.push(v);
        return { returning: vi.fn().mockResolvedValue([{ id: "doc-1" }]) };
      }),
    }));

    await oblioProformaUpdateProcessor(
      makeG40Job({ tenantId: "t1", oblioDocumentId: "doc-1", actorId: "u1", newSubtotal: 80 }),
      {} as never,
    );

    const auditInsert = insertValues.find(
      (v) => (v as Record<string, unknown>).action === "PROFORMA_UPDATED",
    );
    expect(auditInsert).toBeDefined();
    expect((auditInsert as Record<string, unknown>).prevHash).toBe("prev-hash-abc");
  });

  it("setSessionTenantId apelat cu tenantId corect", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    await expect(
      oblioProformaUpdateProcessor(
        makeG40Job({ tenantId: "t-xyz", oblioDocumentId: "d1", actorId: "u1", newSubtotal: 50 }),
        {} as never,
      ),
    ).rejects.toThrow();

    expect(setSessionTenantIdMock).toHaveBeenCalledWith("t-xyz");
  });
});

// =============================================================================
// G41 — oblio:invoice:create
// =============================================================================

describe("G41 — oblioInvoiceCreateProcessor", () => {
  it("invoice creat: PROFORMA+ACTIVE → INSERT INVOICE + UPDATE proforma REPLACED + enqueue INVOICED", async () => {
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([
          {
            id: "pf-1",
            documentType: "PROFORMA",
            status: "ACTIVE",
            oblioId: "stub-pf-t1",
            subtotal: "100",
            vat: "19",
            total: "119",
          },
        ]),
      )
      .mockReturnValueOnce(makeSelectChain([])); // audit GENESIS

    dbInsertMock.mockReturnValue(makeInsertChain([{ id: "inv-doc-1" }]));
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const result = await oblioInvoiceCreateProcessor(
      makeG41Job({
        tenantId: "t1",
        oblioDocumentId: "pf-1",
        negotiationId: "neg-1",
        actorId: "u1",
      }),
      {} as never,
    );

    expect(result.ok).toBe(true);
    expect(result.invoiceDocumentId).toBeTruthy();
    expect(result.oblioId).toBe("stub-inv-t1");
    // Proforma → REPLACED
    expect(dbUpdateMock).toHaveBeenCalledTimes(1);
    // Enqueue state:transition → INVOICED
    expect(addMock).toHaveBeenCalledWith(
      "negotiation:state:transition",
      expect.objectContaining({ toState: "INVOICED", negotiationId: "neg-1" }),
      expect.any(Object),
    );
  });

  it("proforma negăsită → throw", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    await expect(
      oblioInvoiceCreateProcessor(
        makeG41Job({
          tenantId: "t1",
          oblioDocumentId: "pf-missing",
          negotiationId: "neg-1",
          actorId: "u1",
        }),
        {} as never,
      ),
    ).rejects.toThrow("pf-missing negăsită");
  });

  it("document nu e PROFORMA (este INVOICE) → throw", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([
        {
          id: "doc-1",
          documentType: "INVOICE",
          status: "ACTIVE",
          oblioId: "inv-1",
          subtotal: "100",
          vat: "19",
          total: "119",
        },
      ]),
    );

    await expect(
      oblioInvoiceCreateProcessor(
        makeG41Job({
          tenantId: "t1",
          oblioDocumentId: "doc-1",
          negotiationId: "neg-1",
          actorId: "u1",
        }),
        {} as never,
      ),
    ).rejects.toThrow("nu e PROFORMA");
  });

  it("proforma nu e ACTIVE (este REPLACED) → throw", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([
        {
          id: "pf-1",
          documentType: "PROFORMA",
          status: "REPLACED",
          oblioId: "pf-old",
          subtotal: "100",
          vat: "19",
          total: "119",
        },
      ]),
    );

    await expect(
      oblioInvoiceCreateProcessor(
        makeG41Job({
          tenantId: "t1",
          oblioDocumentId: "pf-1",
          negotiationId: "neg-1",
          actorId: "u1",
        }),
        {} as never,
      ),
    ).rejects.toThrow("REPLACED");
  });

  it("fiscalAuditTrail inserat cu action=INVOICE_CREATED", async () => {
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([
          {
            id: "pf-1",
            documentType: "PROFORMA",
            status: "ACTIVE",
            oblioId: "pf-x",
            subtotal: "100",
            vat: "19",
            total: "119",
          },
        ]),
      )
      .mockReturnValueOnce(makeSelectChain([])); // GENESIS

    const insertValues: unknown[] = [];
    dbInsertMock.mockImplementation(() => ({
      values: vi.fn().mockImplementation((v) => {
        insertValues.push(v);
        return { returning: vi.fn().mockResolvedValue([{ id: "inv-1" }]) };
      }),
    }));
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    await oblioInvoiceCreateProcessor(
      makeG41Job({
        tenantId: "t1",
        oblioDocumentId: "pf-1",
        negotiationId: "neg-1",
        actorId: "u1",
      }),
      {} as never,
    );

    const auditInsert = insertValues.find(
      (v) => (v as Record<string, unknown>).action === "INVOICE_CREATED",
    );
    expect(auditInsert).toBeDefined();
    expect((auditInsert as Record<string, unknown>).entityType).toBe("oblio_document");
  });

  it("setSessionTenantId apelat", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    await expect(
      oblioInvoiceCreateProcessor(
        makeG41Job({
          tenantId: "t-inv",
          oblioDocumentId: "d1",
          negotiationId: "n1",
          actorId: "u1",
        }),
        {} as never,
      ),
    ).rejects.toThrow();

    expect(setSessionTenantIdMock).toHaveBeenCalledWith("t-inv");
  });
});

// =============================================================================
// G42 — oblio:invoice:cancel
// =============================================================================

describe("G42 — oblioInvoiceCancelProcessor", () => {
  it("fără approvalRef → HITL escalation + pending=true", async () => {
    const result = await oblioInvoiceCancelProcessor(
      makeG42Job({
        tenantId: "t1",
        oblioDocumentId: "inv-1",
        reason: "client request",
        actorId: "u1",
      }),
      {} as never,
    );

    expect(result.ok).toBe(true);
    expect(result.pending).toBe(true);
    if (result.pending) {
      expect(result.hitlRef).toBeTruthy();
    }
    // HITL enqueued
    expect(addMock).toHaveBeenCalledWith(
      "hitl:escalate",
      expect.objectContaining({
        type: "invoice_cancel_approval",
        entityId: "inv-1",
      }),
      expect.any(Object),
    );
  });

  it("cu approvalRef → cancel + INSERT CREDIT_NOTE + audit, pending=false", async () => {
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([
          {
            id: "inv-1",
            documentType: "INVOICE",
            status: "ACTIVE",
            oblioId: "stub-inv-001",
            subtotal: "100",
            vat: "19",
            total: "119",
            series: "F",
            number: 3001,
          },
        ]),
      )
      .mockReturnValueOnce(makeSelectChain([])); // audit GENESIS

    dbInsertMock.mockReturnValue(makeInsertChain([{ id: "cn-doc-1" }]));
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const result = await oblioInvoiceCancelProcessor(
      makeG42Job({
        tenantId: "t1",
        oblioDocumentId: "inv-1",
        reason: "error",
        actorId: "u1",
        approvalRef: "approval-ref-123",
      }),
      {} as never,
    );

    expect(result.ok).toBe(true);
    expect(result.pending).toBe(false);
    if (!result.pending) {
      expect(result.creditNoteDocumentId).toBeTruthy();
      expect(result.hash).toBeTruthy();
    }
    // UPDATE invoice → CANCELLED
    expect(dbUpdateMock).toHaveBeenCalledTimes(1);
    // INSERT CREDIT_NOTE
    expect(dbInsertMock).toHaveBeenCalledTimes(2); // credit note + audit trail
  });

  it("cu approvalRef, invoice negăsit → throw", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    await expect(
      oblioInvoiceCancelProcessor(
        makeG42Job({
          tenantId: "t1",
          oblioDocumentId: "inv-missing",
          reason: "x",
          actorId: "u1",
          approvalRef: "ref-1",
        }),
        {} as never,
      ),
    ).rejects.toThrow("inv-missing negăsit");
  });

  it("cu approvalRef, document nu e INVOICE → throw", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([
        {
          id: "doc-1",
          documentType: "PROFORMA",
          status: "ACTIVE",
          oblioId: "pf-1",
          subtotal: "100",
          vat: "19",
          total: "119",
          series: "P",
          number: 1,
        },
      ]),
    );

    await expect(
      oblioInvoiceCancelProcessor(
        makeG42Job({
          tenantId: "t1",
          oblioDocumentId: "doc-1",
          reason: "x",
          actorId: "u1",
          approvalRef: "ref-1",
        }),
        {} as never,
      ),
    ).rejects.toThrow("nu e INVOICE");
  });

  it("cu approvalRef, invoice nu e ACTIVE (CANCELLED) → throw", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([
        {
          id: "inv-1",
          documentType: "INVOICE",
          status: "CANCELLED",
          oblioId: "inv-x",
          subtotal: "100",
          vat: "19",
          total: "119",
          series: "F",
          number: 1,
        },
      ]),
    );

    await expect(
      oblioInvoiceCancelProcessor(
        makeG42Job({
          tenantId: "t1",
          oblioDocumentId: "inv-1",
          reason: "x",
          actorId: "u1",
          approvalRef: "ref-1",
        }),
        {} as never,
      ),
    ).rejects.toThrow("CANCELLED");
  });

  it("hitlQueue.close() apelat după escalation", async () => {
    await oblioInvoiceCancelProcessor(
      makeG42Job({ tenantId: "t1", oblioDocumentId: "inv-1", reason: "test", actorId: "u1" }),
      {} as never,
    );

    expect(closeMock).toHaveBeenCalled();
  });

  it("setSessionTenantId apelat", async () => {
    await oblioInvoiceCancelProcessor(
      makeG42Job({ tenantId: "t-cancel", oblioDocumentId: "d1", reason: "x", actorId: "u1" }),
      {} as never,
    );

    expect(setSessionTenantIdMock).toHaveBeenCalledWith("t-cancel");
  });
});

// =============================================================================
// G43 — oblio:client:validate
// =============================================================================

describe("G43 — oblioClientValidateProcessor", () => {
  it("validare client reușită → oblioClientId și CUI returnate", async () => {
    dbSelectMock
      .mockReturnValueOnce(makeSelectChain([{ id: "neg-1", leadId: "company-1" }]))
      .mockReturnValueOnce(
        makeSelectChain([
          { id: "company-1", cui: "1234567", denumire: "SC TEST SRL", platitorTva: true },
        ]),
      );

    const result = await oblioClientValidateProcessor(
      makeG43Job({ tenantId: "t1", negotiationId: "neg-1" }),
      {} as never,
    );

    expect(result.ok).toBe(true);
    expect(result.oblioClientId).toBe("stub-client-1234567");
    expect(result.cui).toBe("1234567");
    expect(result.clientName).toBe("SC TEST SRL");
  });

  it("negociere negăsită → throw", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    await expect(
      oblioClientValidateProcessor(
        makeG43Job({ tenantId: "t1", negotiationId: "neg-missing" }),
        {} as never,
      ),
    ).rejects.toThrow("neg-missing negăsită");
  });

  it("company negăsită → throw", async () => {
    dbSelectMock
      .mockReturnValueOnce(makeSelectChain([{ id: "neg-1", leadId: "lead-missing" }]))
      .mockReturnValueOnce(makeSelectChain([])); // company missing

    await expect(
      oblioClientValidateProcessor(
        makeG43Job({ tenantId: "t1", negotiationId: "neg-1" }),
        {} as never,
      ),
    ).rejects.toThrow("lead-missing negăsită");
  });

  it("oblioClient.validateClient apelat cu CUI corect", async () => {
    dbSelectMock
      .mockReturnValueOnce(makeSelectChain([{ id: "neg-1", leadId: "comp-1" }]))
      .mockReturnValueOnce(
        makeSelectChain([
          { id: "comp-1", cui: "9999999", denumire: "SC X SRL", platitorTva: false },
        ]),
      );

    await oblioClientValidateProcessor(
      makeG43Job({ tenantId: "t1", negotiationId: "neg-1" }),
      {} as never,
    );

    expect(vi.mocked(oblioClient.validateClient)).toHaveBeenCalledWith(
      expect.objectContaining({ cui: "9999999", name: "SC X SRL" }),
    );
  });

  it("setSessionTenantId apelat cu tenantId corect", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    await expect(
      oblioClientValidateProcessor(
        makeG43Job({ tenantId: "t-client", negotiationId: "neg-1" }),
        {} as never,
      ),
    ).rejects.toThrow();

    expect(setSessionTenantIdMock).toHaveBeenCalledWith("t-client");
  });
});

// =============================================================================
// G44 — oblio:stock:sync
// =============================================================================

describe("G44 — oblioStockSyncProcessor", () => {
  it("niciun produs în inventar → syncedCount=0, note=no-inventory", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    const result = await oblioStockSyncProcessor(makeG44Job({ tenantId: "t1" }), {} as never);

    expect(result.ok).toBe(true);
    expect(result.syncedCount).toBe(0);
    expect(result.note).toBe("no-inventory");
    expect(vi.mocked(oblioClient.syncStock)).not.toHaveBeenCalled();
  });

  it("produse cu SKU → syncedCount returnat din oblioClient.syncStock", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([
        { sku: "SKU-1", totalQuantity: 10, reservedQuantity: 3 },
        { sku: "SKU-2", totalQuantity: 5, reservedQuantity: 0 },
        { sku: null, totalQuantity: 2, reservedQuantity: 0 }, // filtrat
      ]),
    );

    const result = await oblioStockSyncProcessor(makeG44Job({ tenantId: "t1" }), {} as never);

    expect(result.syncedCount).toBe(3); // din mock oblioClient.syncStock
    expect(vi.mocked(oblioClient.syncStock)).toHaveBeenCalledWith(
      "t1",
      expect.arrayContaining([
        expect.objectContaining({ sku: "SKU-1", quantity: 7 }),
        expect.objectContaining({ sku: "SKU-2", quantity: 5 }),
      ]),
    );
    // sku=null filtrat — nu apare în array
    const callArgs = vi.mocked(oblioClient.syncStock).mock.calls[0][1];
    expect(callArgs.some((item) => item.sku === null)).toBe(false);
  });

  it("stoc disponibil = total - rezervat (clampat la 0)", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([
        { sku: "SKU-OVER", totalQuantity: 3, reservedQuantity: 10 }, // reserved > total
      ]),
    );

    await oblioStockSyncProcessor(makeG44Job({ tenantId: "t1" }), {} as never);

    const items = vi.mocked(oblioClient.syncStock).mock.calls[0][1];
    expect(items[0].quantity).toBe(0); // Math.max(3-10, 0) = 0
  });

  it("setSessionTenantId apelat cu tenantId corect", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    await oblioStockSyncProcessor(makeG44Job({ tenantId: "t-sync" }), {} as never);

    expect(setSessionTenantIdMock).toHaveBeenCalledWith("t-sync");
  });
});

// =============================================================================
// G45 — oblio:webhook:process
// =============================================================================

describe("G45 — oblioWebhookProcessProcessor", () => {
  it("oblioId necunoscut → processed=false, reason=unknown-document", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    const result = await oblioWebhookProcessProcessor(
      makeG45Job({ tenantId: "t1", oblioId: "unknown-id", eventType: "payment_received" }),
      {} as never,
    );

    expect(result.ok).toBe(true);
    expect(result.processed).toBe(false);
    expect(result.reason).toBe("unknown-document");
    expect(dbUpdateMock).not.toHaveBeenCalled();
  });

  it("document deja terminal (CANCELLED) → processed=false, skip idempotent", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "doc-1", status: "CANCELLED", documentType: "INVOICE" }]),
    );

    const result = await oblioWebhookProcessProcessor(
      makeG45Job({ tenantId: "t1", oblioId: "inv-cancelled", eventType: "document_cancelled" }),
      {} as never,
    );

    expect(result.processed).toBe(false);
    expect(result.reason).toBe("already-terminal");
    expect(dbUpdateMock).not.toHaveBeenCalled();
  });

  it("payment_received → UPDATE status PAID + fiscalAuditTrail", async () => {
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([{ id: "doc-1", status: "ACTIVE", documentType: "INVOICE" }]),
      )
      .mockReturnValueOnce(makeSelectChain([])); // audit GENESIS

    dbUpdateMock.mockReturnValue(makeUpdateChain());
    dbInsertMock.mockReturnValue(makeInsertChain());

    const result = await oblioWebhookProcessProcessor(
      makeG45Job({ tenantId: "t1", oblioId: "inv-001", eventType: "payment_received" }),
      {} as never,
    );

    expect(result.ok).toBe(true);
    expect(result.processed).toBe(true);
    expect(result.eventType).toBe("payment_received");
    expect(dbUpdateMock).toHaveBeenCalledTimes(1);
    expect(dbInsertMock).toHaveBeenCalledTimes(1);
  });

  it("document_cancelled → UPDATE status CANCELLED", async () => {
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([{ id: "doc-1", status: "ACTIVE", documentType: "INVOICE" }]),
      )
      .mockReturnValueOnce(makeSelectChain([]));

    dbUpdateMock.mockReturnValue(makeUpdateChain());
    dbInsertMock.mockReturnValue(makeInsertChain());

    const result = await oblioWebhookProcessProcessor(
      makeG45Job({ tenantId: "t1", oblioId: "inv-002", eventType: "document_cancelled" }),
      {} as never,
    );

    expect(result.processed).toBe(true);
    expect(result.eventType).toBe("document_cancelled");
  });

  it("eventType necunoscut → processed=false, reason=unknown-event-type", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "doc-1", status: "ACTIVE", documentType: "INVOICE" }]),
    );

    const result = await oblioWebhookProcessProcessor(
      makeG45Job({ tenantId: "t1", oblioId: "inv-003", eventType: "unknown_event" }),
      {} as never,
    );

    expect(result.processed).toBe(false);
    expect(result.reason).toBe("unknown-event-type");
    expect(dbUpdateMock).not.toHaveBeenCalled();
  });

  it("fiscalAuditTrail cu action=WEBHOOK_PAYMENT_RECEIVED", async () => {
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([{ id: "doc-1", status: "ACTIVE", documentType: "INVOICE" }]),
      )
      .mockReturnValueOnce(makeSelectChain([{ hash: "prev-hash-xyz" }]));

    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const insertValues: unknown[] = [];
    dbInsertMock.mockImplementation(() => ({
      values: vi.fn().mockImplementation((v) => {
        insertValues.push(v);
        return { returning: vi.fn().mockResolvedValue([{ id: "at-1" }]) };
      }),
    }));

    await oblioWebhookProcessProcessor(
      makeG45Job({ tenantId: "t1", oblioId: "inv-pay", eventType: "payment_received" }),
      {} as never,
    );

    const auditInsert = insertValues[0] as Record<string, unknown>;
    expect(auditInsert.action).toBe("WEBHOOK_PAYMENT_RECEIVED");
    expect(auditInsert.prevHash).toBe("prev-hash-xyz");
  });

  it("hash chain: SHA-256(prevHash+data) calculat corect", async () => {
    const prevHashVal = "prev-hash-known";
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([{ id: "doc-1", status: "ACTIVE", documentType: "INVOICE" }]),
      )
      .mockReturnValueOnce(makeSelectChain([{ hash: prevHashVal }]));

    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const insertValues: unknown[] = [];
    dbInsertMock.mockImplementation(() => ({
      values: vi.fn().mockImplementation((v) => {
        insertValues.push(v);
        return { returning: vi.fn().mockResolvedValue([{ id: "at-2" }]) };
      }),
    }));

    await oblioWebhookProcessProcessor(
      makeG45Job({ tenantId: "t1", oblioId: "inv-hash", eventType: "document_issued" }),
      {} as never,
    );

    const auditInsert = insertValues[0] as Record<string, unknown>;
    const expectedHash = createHash("sha256")
      .update(prevHashVal + JSON.stringify(auditInsert.data))
      .digest("hex");
    expect(auditInsert.hash).toBe(expectedHash);
  });

  it("setSessionTenantId apelat", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    await oblioWebhookProcessProcessor(
      makeG45Job({ tenantId: "t-webhook", oblioId: "x", eventType: "payment_received" }),
      {} as never,
    );

    expect(setSessionTenantIdMock).toHaveBeenCalledWith("t-webhook");
  });
});

// =============================================================================
// oblio-client.ts — verificări structurale
// =============================================================================

describe("oblioClient — verificare structurală", () => {
  it("toate metodele obligatorii există pe oblioClient", () => {
    expect(typeof oblioClient.createProforma).toBe("function");
    expect(typeof oblioClient.updateProforma).toBe("function");
    expect(typeof oblioClient.convertProformaToInvoice).toBe("function");
    expect(typeof oblioClient.cancelInvoice).toBe("function");
    expect(typeof oblioClient.validateClient).toBe("function");
    expect(typeof oblioClient.syncStock).toBe("function");
    expect(typeof oblioClient.processWebhookEvent).toBe("function");
  });
});
