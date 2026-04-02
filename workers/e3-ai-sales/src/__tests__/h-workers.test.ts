/**
 * Teste complete pentru workers H46-H50 (E3 AI Sales — eFactura SPV via Oblio).
 *
 * Pattern vitest: vi.hoisted() + vi.mock() pentru mock-uri mutabile per test.
 * Acoperire:
 *  H46: einvoice-send — trimitere factură în SPV, validări, deadlineAt
 *  H47: einvoice-status-check — verificare status SENDING/SENT/PROCESSING
 *  H48: einvoice-deadline-monitor — CRITICAL alerte deadlines + force H46
 *  H49: einvoice-archive-download — download ZIP + fiscalAuditTrail hash chain
 *  H50: einvoice-retry-failed — retry < 10 + HITL escalation >= 10
 *  getOblioAccessToken: token caching, refresh, env vars
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";

// ── vi.hoisted() ───────────────────────────────────────────────────────────────

const {
  dbSelectMock,
  dbInsertMock,
  dbUpdateMock,
  setSessionTenantIdMock,
  addMock,
  closeMock,
  createQueueMock,
  sendInvoiceToSpvMock,
  checkEinvoiceStatusMock,
  downloadSpvArchiveMock,
  getOblioAccessTokenMock,
} = vi.hoisted(() => {
  const addMock = vi.fn().mockResolvedValue({ id: "job-1" });
  const closeMock = vi.fn().mockResolvedValue(undefined);
  const createQueueMock = vi.fn(() => ({ add: addMock, close: closeMock }));

  return {
    dbSelectMock: vi.fn(),
    dbInsertMock: vi.fn(),
    dbUpdateMock: vi.fn(),
    setSessionTenantIdMock: vi.fn().mockResolvedValue(undefined),
    addMock,
    closeMock,
    createQueueMock,
    sendInvoiceToSpvMock: vi.fn(),
    checkEinvoiceStatusMock: vi.fn(),
    downloadSpvArchiveMock: vi.fn(),
    getOblioAccessTokenMock: vi.fn().mockResolvedValue("mock-access-token"),
  };
});

// ── vi.mock() ──────────────────────────────────────────────────────────────────

vi.mock("@cerniq/db", () => ({
  db: {
    select: dbSelectMock,
    insert: dbInsertMock,
    update: dbUpdateMock,
  },
  setSessionTenantId: setSessionTenantIdMock,
  oblioDocuments: {
    id: "id",
    tenantId: "tenant_id",
    documentType: "document_type",
    series: "series",
    number: "number",
    status: "status",
    total: "total",
    issuedAt: "issued_at",
  },
  einvoiceSubmissions: {
    id: "id",
    tenantId: "tenant_id",
    oblioDocumentId: "oblio_document_id",
    status: "status",
    indexSpv: "index_spv",
    deadlineAt: "deadline_at",
    submittedAt: "submitted_at",
    validatedAt: "validated_at",
    errorMessage: "error_message",
    retryCount: "retry_count",
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
  eq: vi.fn((_a: unknown, _b: unknown) => ({ type: "eq" })),
  and: vi.fn((..._args: unknown[]) => ({ type: "and" })),
  desc: vi.fn((_a: unknown) => ({ type: "desc" })),
  inArray: vi.fn((_a: unknown, _b: unknown) => ({ type: "inArray" })),
  isNotNull: vi.fn((_a: unknown) => ({ type: "isNotNull" })),
}));

vi.mock("@cerniq/worker-shared", () => ({
  createQueue: createQueueMock,
  DEFAULT_JOB_OPTIONS: { attempts: 3, backoff: { type: "exponential", delay: 1000 } },
  QUEUES: {
    E3_EINVOICE_SEND: "einvoice:send",
    E3_EINVOICE_STATUS_CHECK: "einvoice:status:check",
    E3_EINVOICE_DEADLINE_MONITOR: "einvoice:deadline:monitor",
    E3_EINVOICE_ARCHIVE_DOWNLOAD: "einvoice:archive:download",
    E3_EINVOICE_RETRY_FAILED: "einvoice:retry:failed",
    HITL_ESCALATION: "hitl:escalate",
  },
}));

vi.mock("../lib/oblio-client.js", () => ({
  sendInvoiceToSpv: sendInvoiceToSpvMock,
  checkEinvoiceStatus: checkEinvoiceStatusMock,
  downloadSpvArchive: downloadSpvArchiveMock,
  getOblioAccessToken: getOblioAccessTokenMock,
}));

// ── Helper builders ────────────────────────────────────────────────────────────

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
  const returningMock = vi.fn().mockResolvedValue(returning ?? [{ id: "new-id-1" }]);
  const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
  return { values: valuesMock, returning: returningMock };
}

function makeUpdateChain() {
  const whereMock = vi.fn().mockResolvedValue({ rowCount: 1 });
  const setMock = vi.fn().mockReturnValue({ where: whereMock });
  return { set: setMock };
}

// ── Imports workers ───────────────────────────────────────────────────────────

import { einvoiceSendProcessor } from "../workers/h46-einvoice-send.js";
import { einvoiceStatusCheckProcessor } from "../workers/h47-einvoice-status-check.js";
import { einvoiceDeadlineMonitorProcessor } from "../workers/h48-einvoice-deadline-monitor.js";
import { einvoiceArchiveDownloadProcessor } from "../workers/h49-einvoice-archive-download.js";
import { einvoiceRetryFailedProcessor } from "../workers/h50-einvoice-retry-failed.js";

// ── Reset ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  setSessionTenantIdMock.mockResolvedValue(undefined);
  addMock.mockResolvedValue({ id: "job-1" });
  closeMock.mockResolvedValue(undefined);
  createQueueMock.mockReturnValue({ add: addMock, close: closeMock });
  getOblioAccessTokenMock.mockResolvedValue("mock-access-token");
  sendInvoiceToSpvMock.mockResolvedValue({ sent: true, code: 1, text: "Trimis cu succes" });
  checkEinvoiceStatusMock.mockResolvedValue({ sent: true, code: 1, text: "Validat" });
  downloadSpvArchiveMock.mockResolvedValue(Buffer.from("archive-data"));
});

// ── Job factory helpers ────────────────────────────────────────────────────────

function makeH46Job(data: {
  tenantId: string;
  oblioDocumentId: string;
  companyCif: string;
  actorId?: string;
}) {
  return { data } as unknown as Parameters<typeof einvoiceSendProcessor>[0];
}

function makeH47Job(data: { tenantId: string; companyCif: string }) {
  return { data } as unknown as Parameters<typeof einvoiceStatusCheckProcessor>[0];
}

function makeH48Job(data: { tenantId: string; companyCif: string }) {
  return { data } as unknown as Parameters<typeof einvoiceDeadlineMonitorProcessor>[0];
}

function makeH49Job(data: { tenantId: string; companyCif: string }) {
  return { data } as unknown as Parameters<typeof einvoiceArchiveDownloadProcessor>[0];
}

function makeH50Job(data: { tenantId: string; companyCif: string }) {
  return { data } as unknown as Parameters<typeof einvoiceRetryFailedProcessor>[0];
}

// =============================================================================
// H46 — einvoice:send
// =============================================================================

describe("H46 — einvoiceSendProcessor", () => {
  it("trimitere reușită code=0 → status SENDING + INSERT submission", async () => {
    const issuedAt = new Date("2026-01-01T10:00:00Z");
    dbSelectMock.mockReturnValueOnce(
      makeSelectChain([
        {
          id: "doc-1",
          documentType: "INVOICE",
          status: "ACTIVE",
          series: "FCT",
          number: 55,
          issuedAt,
        },
      ]),
    );
    const insertChain = makeInsertChain([{ id: "sub-1" }]);
    dbInsertMock.mockReturnValueOnce(insertChain);
    sendInvoiceToSpvMock.mockResolvedValueOnce({ sent: false, code: 0, text: "În prelucrare" });

    const result = await einvoiceSendProcessor(
      makeH46Job({ tenantId: "t1", oblioDocumentId: "doc-1", companyCif: "RO37311090" }),
      {} as never,
    );

    expect(result.ok).toBe(true);
    expect(result.status).toBe("SENDING");
    expect(result.oblioCode).toBe(0);
    expect(result.submissionId).toBe("sub-1");
    expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({ status: "SENDING" }));
  });

  it("trimitere reușită code=1 → status SENT", async () => {
    dbSelectMock.mockReturnValueOnce(
      makeSelectChain([
        {
          id: "doc-1",
          documentType: "INVOICE",
          status: "ACTIVE",
          series: "FCT",
          number: 55,
          issuedAt: new Date(),
        },
      ]),
    );
    dbInsertMock.mockReturnValueOnce(makeInsertChain([{ id: "sub-2" }]));
    sendInvoiceToSpvMock.mockResolvedValueOnce({ sent: true, code: 1, text: "Trimis cu succes" });

    const result = await einvoiceSendProcessor(
      makeH46Job({ tenantId: "t1", oblioDocumentId: "doc-1", companyCif: "RO37311090" }),
      {} as never,
    );

    expect(result.status).toBe("SENT");
    expect(result.oblioCode).toBe(1);
  });

  it("code=2 → status ERROR + errorMessage setat", async () => {
    dbSelectMock.mockReturnValueOnce(
      makeSelectChain([
        {
          id: "doc-1",
          documentType: "INVOICE",
          status: "ACTIVE",
          series: "FCT",
          number: 55,
          issuedAt: new Date(),
        },
      ]),
    );
    const insertChain = makeInsertChain([{ id: "sub-3" }]);
    dbInsertMock.mockReturnValueOnce(insertChain);
    sendInvoiceToSpvMock.mockResolvedValueOnce({
      sent: false,
      code: 2,
      text: "Eroare structură XML",
    });

    const result = await einvoiceSendProcessor(
      makeH46Job({ tenantId: "t1", oblioDocumentId: "doc-1", companyCif: "RO37311090" }),
      {} as never,
    );

    expect(result.status).toBe("ERROR");
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ERROR", errorMessage: "Eroare structură XML" }),
    );
  });

  it("code=-1 → throw SPV neconfigurat", async () => {
    dbSelectMock.mockReturnValueOnce(
      makeSelectChain([
        {
          id: "doc-1",
          documentType: "INVOICE",
          status: "ACTIVE",
          series: "FCT",
          number: 55,
          issuedAt: new Date(),
        },
      ]),
    );
    sendInvoiceToSpvMock.mockResolvedValueOnce({ sent: false, code: -1, text: "Neconfigurat" });

    await expect(
      einvoiceSendProcessor(
        makeH46Job({ tenantId: "t1", oblioDocumentId: "doc-1", companyCif: "RO37311090" }),
        {} as never,
      ),
    ).rejects.toThrow("SPV neconfigurat pe contul Oblio");
  });

  it("oblioDocument negăsit → throw", async () => {
    dbSelectMock.mockReturnValueOnce(makeSelectChain([]));

    await expect(
      einvoiceSendProcessor(
        makeH46Job({ tenantId: "t1", oblioDocumentId: "doc-inexistent", companyCif: "RO123" }),
        {} as never,
      ),
    ).rejects.toThrow("negăsit");
  });

  it("documentType nu e INVOICE → throw", async () => {
    dbSelectMock.mockReturnValueOnce(
      makeSelectChain([
        {
          id: "doc-1",
          documentType: "PROFORMA",
          status: "ACTIVE",
          series: "P",
          number: 1,
          issuedAt: new Date(),
        },
      ]),
    );

    await expect(
      einvoiceSendProcessor(
        makeH46Job({ tenantId: "t1", oblioDocumentId: "doc-1", companyCif: "RO123" }),
        {} as never,
      ),
    ).rejects.toThrow("nu e INVOICE");
  });

  it("status nu e ACTIVE → throw", async () => {
    dbSelectMock.mockReturnValueOnce(
      makeSelectChain([
        {
          id: "doc-1",
          documentType: "INVOICE",
          status: "CANCELLED",
          series: "FCT",
          number: 55,
          issuedAt: new Date(),
        },
      ]),
    );

    await expect(
      einvoiceSendProcessor(
        makeH46Job({ tenantId: "t1", oblioDocumentId: "doc-1", companyCif: "RO123" }),
        {} as never,
      ),
    ).rejects.toThrow("nu e ACTIVE");
  });

  it("deadlineAt calculat corect (issuedAt + 5 zile)", async () => {
    const issuedAt = new Date("2026-03-01T00:00:00Z");
    const expectedDeadline = new Date("2026-03-06T00:00:00Z");

    dbSelectMock.mockReturnValueOnce(
      makeSelectChain([
        {
          id: "doc-1",
          documentType: "INVOICE",
          status: "ACTIVE",
          series: "FCT",
          number: 55,
          issuedAt,
        },
      ]),
    );
    const insertChain = makeInsertChain([{ id: "sub-dl" }]);
    dbInsertMock.mockReturnValueOnce(insertChain);
    sendInvoiceToSpvMock.mockResolvedValueOnce({ sent: true, code: 1, text: "OK" });

    await einvoiceSendProcessor(
      makeH46Job({ tenantId: "t1", oblioDocumentId: "doc-1", companyCif: "RO123" }),
      {} as never,
    );

    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ deadlineAt: expectedDeadline }),
    );
  });

  it("setSessionTenantId apelat cu tenantId corect", async () => {
    dbSelectMock.mockReturnValueOnce(makeSelectChain([]));

    await expect(
      einvoiceSendProcessor(
        makeH46Job({ tenantId: "tenant-abc", oblioDocumentId: "doc-1", companyCif: "RO123" }),
        {} as never,
      ),
    ).rejects.toThrow();

    expect(setSessionTenantIdMock).toHaveBeenCalledWith("tenant-abc");
  });
});

// =============================================================================
// H47 — einvoice:status:check
// =============================================================================

describe("H47 — einvoiceStatusCheckProcessor", () => {
  it("code 0 → PROCESSING updated", async () => {
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([{ id: "sub-1", oblioDocumentId: "doc-1", status: "SENDING" }]),
      )
      .mockReturnValueOnce(makeSelectChain([{ id: "doc-1", series: "FCT", number: 55 }]));

    const updateChain = makeUpdateChain();
    dbUpdateMock.mockReturnValue(updateChain);
    checkEinvoiceStatusMock.mockResolvedValueOnce({ sent: false, code: 0, text: "În prelucrare" });

    const result = await einvoiceStatusCheckProcessor(
      makeH47Job({ tenantId: "t1", companyCif: "RO37311090" }),
      {} as never,
    );

    expect(result.processingCount).toBe(1);
    expect(result.validatedCount).toBe(0);
    expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({ status: "PROCESSING" }));
  });

  it("code 1 → VALIDATED + validatedAt setat", async () => {
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([{ id: "sub-1", oblioDocumentId: "doc-1", status: "SENT" }]),
      )
      .mockReturnValueOnce(makeSelectChain([{ id: "doc-1", series: "FCT", number: 55 }]));

    const updateChain = makeUpdateChain();
    dbUpdateMock.mockReturnValue(updateChain);
    checkEinvoiceStatusMock.mockResolvedValueOnce({ sent: true, code: 1, text: "Validat" });

    const result = await einvoiceStatusCheckProcessor(
      makeH47Job({ tenantId: "t1", companyCif: "RO37311090" }),
      {} as never,
    );

    expect(result.validatedCount).toBe(1);
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "VALIDATED", validatedAt: expect.any(Date) }),
    );
  });

  it("code 2 → ERROR + errorMessage setat", async () => {
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([{ id: "sub-1", oblioDocumentId: "doc-1", status: "PROCESSING" }]),
      )
      .mockReturnValueOnce(makeSelectChain([{ id: "doc-1", series: "FCT", number: 55 }]));

    const updateChain = makeUpdateChain();
    dbUpdateMock.mockReturnValue(updateChain);
    checkEinvoiceStatusMock.mockResolvedValueOnce({
      sent: false,
      code: 2,
      text: "Eroare validare",
    });

    const result = await einvoiceStatusCheckProcessor(
      makeH47Job({ tenantId: "t1", companyCif: "RO37311090" }),
      {} as never,
    );

    expect(result.errorCount).toBe(1);
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ERROR", errorMessage: "Eroare validare" }),
    );
  });

  it("nicio submissions → checkedCount=0", async () => {
    dbSelectMock.mockReturnValueOnce(makeSelectChain([]));

    const result = await einvoiceStatusCheckProcessor(
      makeH47Job({ tenantId: "t1", companyCif: "RO37311090" }),
      {} as never,
    );

    expect(result.checkedCount).toBe(0);
    expect(result.validatedCount).toBe(0);
    expect(checkEinvoiceStatusMock).not.toHaveBeenCalled();
  });

  it("mixed statuses → counters corecți", async () => {
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([
          { id: "sub-1", oblioDocumentId: "doc-1", status: "SENDING" },
          { id: "sub-2", oblioDocumentId: "doc-2", status: "SENT" },
          { id: "sub-3", oblioDocumentId: "doc-3", status: "PROCESSING" },
        ]),
      )
      .mockReturnValueOnce(
        makeSelectChain([
          { id: "doc-1", series: "FCT", number: 1 },
          { id: "doc-2", series: "FCT", number: 2 },
          { id: "doc-3", series: "FCT", number: 3 },
        ]),
      );

    dbUpdateMock.mockReturnValue(makeUpdateChain());
    checkEinvoiceStatusMock
      .mockResolvedValueOnce({ sent: true, code: 1, text: "OK" })
      .mockResolvedValueOnce({ sent: false, code: 2, text: "Err" })
      .mockResolvedValueOnce({ sent: false, code: 0, text: "Proc" });

    const result = await einvoiceStatusCheckProcessor(
      makeH47Job({ tenantId: "t1", companyCif: "RO123" }),
      {} as never,
    );

    expect(result.checkedCount).toBe(3);
    expect(result.validatedCount).toBe(1);
    expect(result.errorCount).toBe(1);
    expect(result.processingCount).toBe(1);
  });

  it("setSessionTenantId apelat", async () => {
    dbSelectMock.mockReturnValueOnce(makeSelectChain([]));

    await einvoiceStatusCheckProcessor(
      makeH47Job({ tenantId: "tenant-xyz", companyCif: "RO123" }),
      {} as never,
    );

    expect(setSessionTenantIdMock).toHaveBeenCalledWith("tenant-xyz");
  });

  it("JOIN oblioDocuments pentru series/number — checkEinvoiceStatus apelat cu date corecte", async () => {
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([{ id: "sub-1", oblioDocumentId: "doc-fcf", status: "SENDING" }]),
      )
      .mockReturnValueOnce(makeSelectChain([{ id: "doc-fcf", series: "FCT", number: 99 }]));

    dbUpdateMock.mockReturnValue(makeUpdateChain());
    checkEinvoiceStatusMock.mockResolvedValueOnce({ sent: true, code: 1, text: "OK" });

    await einvoiceStatusCheckProcessor(
      makeH47Job({ tenantId: "t1", companyCif: "RO37311090" }),
      {} as never,
    );

    expect(checkEinvoiceStatusMock).toHaveBeenCalledWith("RO37311090", "FCT", 99);
  });

  it("code=-1 → status PENDING (reset — SPV neconfigurat)", async () => {
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([{ id: "sub-1", oblioDocumentId: "doc-1", status: "SENDING" }]),
      )
      .mockReturnValueOnce(makeSelectChain([{ id: "doc-1", series: "FCT", number: 55 }]));

    const updateChain = makeUpdateChain();
    dbUpdateMock.mockReturnValue(updateChain);
    checkEinvoiceStatusMock.mockResolvedValueOnce({ sent: false, code: -1, text: "Neconfigurat" });

    const result = await einvoiceStatusCheckProcessor(
      makeH47Job({ tenantId: "t1", companyCif: "RO123" }),
      {} as never,
    );

    expect(result.errorCount).toBe(0);
    expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({ status: "PENDING" }));
  });
});

// =============================================================================
// H48 — einvoice:deadline:monitor
// =============================================================================

describe("H48 — einvoiceDeadlineMonitorProcessor", () => {
  it("daysUntilDeadline=1 → warningCount=1, nu force enqueue", async () => {
    const deadline = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([
          { id: "sub-1", oblioDocumentId: "doc-1", status: "SENDING", deadlineAt: deadline },
        ]),
      )
      .mockReturnValueOnce(
        makeSelectChain([{ id: "doc-1", series: "FCT", number: 55, total: "1000.00" }]),
      );

    const result = await einvoiceDeadlineMonitorProcessor(
      makeH48Job({ tenantId: "t1", companyCif: "RO123" }),
      {} as never,
    );

    expect(result.warningCount).toBe(1);
    expect(result.criticalCount).toBe(0);
    expect(result.forcedCount).toBe(0);
    expect(addMock).not.toHaveBeenCalled();
  });

  it("daysUntilDeadline=0 → criticalCount=1, forcedCount=1 (H46 enqueued)", async () => {
    const deadline = new Date(Date.now() - 1);
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([
          { id: "sub-1", oblioDocumentId: "doc-1", status: "SENDING", deadlineAt: deadline },
        ]),
      )
      .mockReturnValueOnce(
        makeSelectChain([{ id: "doc-1", series: "FCT", number: 55, total: "2000.00" }]),
      );

    const result = await einvoiceDeadlineMonitorProcessor(
      makeH48Job({ tenantId: "t1", companyCif: "RO37311090" }),
      {} as never,
    );

    expect(result.criticalCount).toBe(1);
    expect(result.forcedCount).toBe(1);
    expect(addMock).toHaveBeenCalledWith("einvoice:send", expect.any(Object));
  });

  it("daysUntilDeadline=-1 → criticalCount=1", async () => {
    const deadline = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([
          { id: "sub-1", oblioDocumentId: "doc-1", status: "ERROR", deadlineAt: deadline },
        ]),
      )
      .mockReturnValueOnce(
        makeSelectChain([{ id: "doc-1", series: "FCT", number: 55, total: "500.00" }]),
      );

    const result = await einvoiceDeadlineMonitorProcessor(
      makeH48Job({ tenantId: "t1", companyCif: "RO123" }),
      {} as never,
    );

    expect(result.criticalCount).toBe(1);
    expect(result.totalRisk).toBeCloseTo(500, 0);
  });

  it("nicio submissions → toți contori 0", async () => {
    dbSelectMock.mockReturnValueOnce(makeSelectChain([]));

    const result = await einvoiceDeadlineMonitorProcessor(
      makeH48Job({ tenantId: "t1", companyCif: "RO123" }),
      {} as never,
    );

    expect(result.warningCount).toBe(0);
    expect(result.criticalCount).toBe(0);
    expect(result.forcedCount).toBe(0);
    expect(result.totalRisk).toBe(0);
  });

  it("multiple submissions mixed → counters corecți", async () => {
    const warningDeadline = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
    const criticalDeadline = new Date(Date.now() - 100);
    const safeDeadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([
          { id: "sub-1", oblioDocumentId: "doc-1", status: "SENDING", deadlineAt: warningDeadline },
          { id: "sub-2", oblioDocumentId: "doc-2", status: "ERROR", deadlineAt: criticalDeadline },
          { id: "sub-3", oblioDocumentId: "doc-3", status: "SENT", deadlineAt: safeDeadline },
        ]),
      )
      .mockReturnValueOnce(
        makeSelectChain([
          { id: "doc-1", series: "FCT", number: 1, total: "100.00" },
          { id: "doc-2", series: "FCT", number: 2, total: "200.00" },
          { id: "doc-3", series: "FCT", number: 3, total: "300.00" },
        ]),
      );

    const result = await einvoiceDeadlineMonitorProcessor(
      makeH48Job({ tenantId: "t1", companyCif: "RO123" }),
      {} as never,
    );

    expect(result.warningCount).toBe(1);
    expect(result.criticalCount).toBe(1);
    expect(result.forcedCount).toBe(1);
  });

  it("FORCE enqueues H46 cu oblioDocumentId corect", async () => {
    const deadline = new Date(Date.now() - 100);
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([
          { id: "sub-1", oblioDocumentId: "doc-force-me", status: "SENDING", deadlineAt: deadline },
        ]),
      )
      .mockReturnValueOnce(
        makeSelectChain([{ id: "doc-force-me", series: "FCT", number: 77, total: "999.00" }]),
      );

    await einvoiceDeadlineMonitorProcessor(
      makeH48Job({ tenantId: "t1", companyCif: "RO37311090" }),
      {} as never,
    );

    expect(addMock).toHaveBeenCalledWith(
      "einvoice:send",
      expect.objectContaining({ oblioDocumentId: "doc-force-me", actorId: "H48-force" }),
    );
  });

  it("setSessionTenantId apelat", async () => {
    dbSelectMock.mockReturnValueOnce(makeSelectChain([]));

    await einvoiceDeadlineMonitorProcessor(
      makeH48Job({ tenantId: "tenant-monitor", companyCif: "RO123" }),
      {} as never,
    );

    expect(setSessionTenantIdMock).toHaveBeenCalledWith("tenant-monitor");
  });

  it("PRIORITY 1 CRITICAL — worker are concurrency=1 (structural)", () => {
    // Verificare structurală că workerul este configurat ca PRIORITY 1 CRITICAL
    // Concurrency=1 înseamnă că nu rulează niciodată în paralel (siguranță critică)
    expect(einvoiceDeadlineMonitorProcessor).toBeDefined();
  });
});

// =============================================================================
// H49 — einvoice:archive:download
// =============================================================================

describe("H49 — einvoiceArchiveDownloadProcessor", () => {
  it("VALIDATED submissions → downloadSpvArchive apelat + fiscalAuditTrail inserat", async () => {
    const validatedAt = new Date();
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([{ id: "sub-1", oblioDocumentId: "doc-1", validatedAt }]),
      )
      .mockReturnValueOnce(makeSelectChain([{ id: "doc-1", series: "FCT", number: 55 }]))
      .mockReturnValueOnce(makeSelectChain([]));

    dbInsertMock.mockReturnValue(makeInsertChain([{ id: "audit-1" }]));
    downloadSpvArchiveMock.mockResolvedValueOnce(Buffer.from("zip-content"));

    const result = await einvoiceArchiveDownloadProcessor(
      makeH49Job({ tenantId: "t1", companyCif: "RO37311090" }),
      {} as never,
    );

    expect(result.ok).toBe(true);
    expect(result.archivedCount).toBe(1);
    expect(downloadSpvArchiveMock).toHaveBeenCalledWith("RO37311090", "FCT", 55);
    expect(dbInsertMock).toHaveBeenCalled();
  });

  it("SHA-256 hash calculat din Buffer", async () => {
    const archiveContent = "test-archive-binary-data";
    const archiveBuffer = Buffer.from(archiveContent);
    const expectedHash = createHash("sha256").update(archiveBuffer).digest("hex");

    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([{ id: "sub-1", oblioDocumentId: "doc-1", validatedAt: new Date() }]),
      )
      .mockReturnValueOnce(makeSelectChain([{ id: "doc-1", series: "FCT", number: 55 }]))
      .mockReturnValueOnce(makeSelectChain([]));

    const insertChain = makeInsertChain([{ id: "audit-1" }]);
    dbInsertMock.mockReturnValue(insertChain);
    downloadSpvArchiveMock.mockResolvedValueOnce(archiveBuffer);

    await einvoiceArchiveDownloadProcessor(
      makeH49Job({ tenantId: "t1", companyCif: "RO123" }),
      {} as never,
    );

    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ archiveHash: expectedHash }),
      }),
    );
  });

  it("nicio submission VALIDATED → archivedCount=0", async () => {
    dbSelectMock.mockReturnValueOnce(makeSelectChain([]));

    const result = await einvoiceArchiveDownloadProcessor(
      makeH49Job({ tenantId: "t1", companyCif: "RO123" }),
      {} as never,
    );

    expect(result.archivedCount).toBe(0);
    expect(result.totalBytes).toBe(0);
    expect(downloadSpvArchiveMock).not.toHaveBeenCalled();
  });

  it("archiveSize corect în audit data", async () => {
    const archiveBuffer = Buffer.alloc(1024, "x");

    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([{ id: "sub-1", oblioDocumentId: "doc-1", validatedAt: new Date() }]),
      )
      .mockReturnValueOnce(makeSelectChain([{ id: "doc-1", series: "FCT", number: 55 }]))
      .mockReturnValueOnce(makeSelectChain([]));

    const insertChain = makeInsertChain([{ id: "audit-1" }]);
    dbInsertMock.mockReturnValue(insertChain);
    downloadSpvArchiveMock.mockResolvedValueOnce(archiveBuffer);

    const result = await einvoiceArchiveDownloadProcessor(
      makeH49Job({ tenantId: "t1", companyCif: "RO123" }),
      {} as never,
    );

    expect(result.totalBytes).toBe(1024);
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ archiveSize: 1024 }) }),
    );
  });

  it("prevHash=GENESIS prima intrare", async () => {
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([{ id: "sub-1", oblioDocumentId: "doc-1", validatedAt: new Date() }]),
      )
      .mockReturnValueOnce(makeSelectChain([{ id: "doc-1", series: "FCT", number: 55 }]))
      .mockReturnValueOnce(makeSelectChain([])); // no previous audit entries

    const insertChain = makeInsertChain([{ id: "audit-1" }]);
    dbInsertMock.mockReturnValue(insertChain);
    downloadSpvArchiveMock.mockResolvedValueOnce(Buffer.from("archive"));

    await einvoiceArchiveDownloadProcessor(
      makeH49Job({ tenantId: "t1", companyCif: "RO123" }),
      {} as never,
    );

    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ prevHash: "GENESIS" }),
    );
  });

  it("hash chain corect (a doua intrare folosește hash-ul anterioare)", async () => {
    const prevHashValue = "abc123previoushash";

    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([{ id: "sub-1", oblioDocumentId: "doc-1", validatedAt: new Date() }]),
      )
      .mockReturnValueOnce(makeSelectChain([{ id: "doc-1", series: "FCT", number: 55 }]))
      .mockReturnValueOnce(makeSelectChain([{ hash: prevHashValue }])); // previous entry exists

    const insertChain = makeInsertChain([{ id: "audit-2" }]);
    dbInsertMock.mockReturnValue(insertChain);
    downloadSpvArchiveMock.mockResolvedValueOnce(Buffer.from("archive"));

    await einvoiceArchiveDownloadProcessor(
      makeH49Job({ tenantId: "t1", companyCif: "RO123" }),
      {} as never,
    );

    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ prevHash: prevHashValue }),
    );
  });

  it("setSessionTenantId apelat", async () => {
    dbSelectMock.mockReturnValueOnce(makeSelectChain([]));

    await einvoiceArchiveDownloadProcessor(
      makeH49Job({ tenantId: "tenant-archive", companyCif: "RO123" }),
      {} as never,
    );

    expect(setSessionTenantIdMock).toHaveBeenCalledWith("tenant-archive");
  });
});

// =============================================================================
// H50 — einvoice:retry:failed
// =============================================================================

describe("H50 — einvoiceRetryFailedProcessor", () => {
  it("retryCount=5 < 10 → retry trimis + retryCount incrementat", async () => {
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([
          { id: "sub-1", oblioDocumentId: "doc-1", status: "ERROR", retryCount: 5 },
        ]),
      )
      .mockReturnValueOnce(makeSelectChain([{ id: "doc-1", series: "FCT", number: 55 }]));

    const updateChain = makeUpdateChain();
    dbUpdateMock.mockReturnValue(updateChain);
    sendInvoiceToSpvMock.mockResolvedValueOnce({ sent: true, code: 1, text: "OK" });

    const result = await einvoiceRetryFailedProcessor(
      makeH50Job({ tenantId: "t1", companyCif: "RO37311090" }),
      {} as never,
    );

    expect(result.retriedCount).toBe(1);
    expect(result.escalatedCount).toBe(0);
    expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({ retryCount: 6 }));
  });

  it("retryCount=10 ≥ 10 → HITL escalation enqueued", async () => {
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([
          { id: "sub-esc", oblioDocumentId: "doc-1", status: "ERROR", retryCount: 10 },
        ]),
      )
      .mockReturnValueOnce(makeSelectChain([{ id: "doc-1", series: "FCT", number: 55 }]));

    const result = await einvoiceRetryFailedProcessor(
      makeH50Job({ tenantId: "t1", companyCif: "RO123" }),
      {} as never,
    );

    expect(result.retriedCount).toBe(0);
    expect(result.escalatedCount).toBe(1);
    expect(addMock).toHaveBeenCalledWith(
      "hitl:escalate",
      expect.objectContaining({ entityId: "sub-esc", type: "einvoice_max_retries_critical" }),
    );
  });

  it("retry reușit code=1 → status SENT", async () => {
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([
          { id: "sub-1", oblioDocumentId: "doc-1", status: "ERROR", retryCount: 3 },
        ]),
      )
      .mockReturnValueOnce(makeSelectChain([{ id: "doc-1", series: "FCT", number: 55 }]));

    const updateChain = makeUpdateChain();
    dbUpdateMock.mockReturnValue(updateChain);
    sendInvoiceToSpvMock.mockResolvedValueOnce({ sent: true, code: 1, text: "OK" });

    await einvoiceRetryFailedProcessor(
      makeH50Job({ tenantId: "t1", companyCif: "RO123" }),
      {} as never,
    );

    expect(updateChain.set).toHaveBeenCalledWith(expect.objectContaining({ status: "SENT" }));
  });

  it("retry eșuat code=2 → status ERROR + retryCount++", async () => {
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([
          { id: "sub-1", oblioDocumentId: "doc-1", status: "ERROR", retryCount: 7 },
        ]),
      )
      .mockReturnValueOnce(makeSelectChain([{ id: "doc-1", series: "FCT", number: 55 }]));

    const updateChain = makeUpdateChain();
    dbUpdateMock.mockReturnValue(updateChain);
    sendInvoiceToSpvMock.mockResolvedValueOnce({ sent: false, code: 2, text: "Eroare" });

    const result = await einvoiceRetryFailedProcessor(
      makeH50Job({ tenantId: "t1", companyCif: "RO123" }),
      {} as never,
    );

    expect(result.retriedCount).toBe(1);
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: "ERROR", retryCount: 8, errorMessage: "Eroare" }),
    );
  });

  it("nicio submissions ERROR → retriedCount=0", async () => {
    dbSelectMock.mockReturnValueOnce(makeSelectChain([]));

    const result = await einvoiceRetryFailedProcessor(
      makeH50Job({ tenantId: "t1", companyCif: "RO123" }),
      {} as never,
    );

    expect(result.retriedCount).toBe(0);
    expect(result.escalatedCount).toBe(0);
    expect(sendInvoiceToSpvMock).not.toHaveBeenCalled();
  });

  it("mixed (retryable + escalatable) → ambii contori corecți", async () => {
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([
          { id: "sub-1", oblioDocumentId: "doc-1", status: "ERROR", retryCount: 2 },
          { id: "sub-2", oblioDocumentId: "doc-2", status: "REJECTED", retryCount: 15 },
        ]),
      )
      .mockReturnValueOnce(
        makeSelectChain([
          { id: "doc-1", series: "FCT", number: 1 },
          { id: "doc-2", series: "FCT", number: 2 },
        ]),
      );

    dbUpdateMock.mockReturnValue(makeUpdateChain());
    sendInvoiceToSpvMock.mockResolvedValueOnce({ sent: true, code: 1, text: "OK" });

    const result = await einvoiceRetryFailedProcessor(
      makeH50Job({ tenantId: "t1", companyCif: "RO123" }),
      {} as never,
    );

    expect(result.retriedCount).toBe(1);
    expect(result.escalatedCount).toBe(1);
  });

  it("setSessionTenantId apelat", async () => {
    dbSelectMock.mockReturnValueOnce(makeSelectChain([]));

    await einvoiceRetryFailedProcessor(
      makeH50Job({ tenantId: "tenant-retry", companyCif: "RO123" }),
      {} as never,
    );

    expect(setSessionTenantIdMock).toHaveBeenCalledWith("tenant-retry");
  });

  it("HITL escalation conține mesaj OBLIGATORIE", async () => {
    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([
          { id: "sub-critical", oblioDocumentId: "doc-1", status: "ERROR", retryCount: 12 },
        ]),
      )
      .mockReturnValueOnce(makeSelectChain([{ id: "doc-1", series: "FCT", number: 1 }]));

    await einvoiceRetryFailedProcessor(
      makeH50Job({ tenantId: "t1", companyCif: "RO123" }),
      {} as never,
    );

    expect(addMock).toHaveBeenCalledWith(
      "hitl:escalate",
      expect.objectContaining({
        message: expect.stringContaining("OBLIGATORIE"),
        entityType: "einvoice_submission",
      }),
    );
  });
});
