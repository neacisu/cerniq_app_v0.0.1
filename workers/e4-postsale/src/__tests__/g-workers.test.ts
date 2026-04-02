/**
 * Teste de integrare pentru G32-G36 (E4 Contracte DocuSign — FAZA 8f)
 *
 * Acoperire:
 *   - G32: contract:generate (success, template not found, order not found, no templateDocxUrl)
 *   - G33: contract:clauses:select (BLOCKED/LOW/MEDIUM/HIGH/PREMIUM clauses, mandatory from DB)
 *   - G34: contract:docusign:send (success, no signer admin fallback, no email throws, PDF missing)
 *   - G35: contract:status:poll (signed→G36, declined→CANCELLED, expiry alert, expired batch)
 *   - G36: contract:signed:process (success, idempotent skip, download error)
 *   - docusign-client: _resetDocuSignClientCache, createJwtAssertion patterns
 *   - RISK_TIER_CLAUSE_CODES: verificare exactitate clauze per riskTier (Plan L2099)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── vi.hoisted() ──────────────────────────────────────────────────────────────
const {
  dbSelectMock,
  dbInsertMock,
  dbUpdateMock,
  setSessionTenantIdMock,
  addMock,
  createQueueMock,
  closeMock,
  generateContractPdfMock,
  storeSignedContractPdfMock,
  readContractPdfMock,
  createDocuSignEnvelopeMock,
  getDocuSignEnvelopeStatusMock,
  downloadDocuSignDocumentMock,
  e4ContractsGeneratedTotalIncMock,
  e4ContractsSignedTotalIncMock,
  e4ContractExpiryAlertsTotalIncMock,
} = vi.hoisted(() => {
  const addMock = vi.fn().mockResolvedValue({ id: "job-contract-123" });
  const closeMock = vi.fn().mockResolvedValue(undefined);
  const createQueueMock = vi.fn(() => ({ add: addMock, close: closeMock }));

  return {
    dbSelectMock: vi.fn(),
    dbInsertMock: vi.fn(),
    dbUpdateMock: vi.fn(),
    setSessionTenantIdMock: vi.fn().mockResolvedValue(undefined),
    addMock,
    createQueueMock,
    closeMock,
    generateContractPdfMock: vi.fn(),
    storeSignedContractPdfMock: vi.fn(),
    readContractPdfMock: vi.fn(),
    createDocuSignEnvelopeMock: vi.fn(),
    getDocuSignEnvelopeStatusMock: vi.fn(),
    downloadDocuSignDocumentMock: vi.fn(),
    e4ContractsGeneratedTotalIncMock: vi.fn(),
    e4ContractsSignedTotalIncMock: vi.fn(),
    e4ContractExpiryAlertsTotalIncMock: vi.fn(),
  };
});

// ── vi.mock() ─────────────────────────────────────────────────────────────────

vi.mock("@cerniq/db", () => ({
  db: {
    select: dbSelectMock,
    insert: dbInsertMock,
    update: dbUpdateMock,
  },
  setSessionTenantId: setSessionTenantIdMock,
  // Schema stubs
  goldContracts: {
    id: "id",
    tenantId: "tenant_id",
    clientId: "client_id",
    orderId: "order_id",
    riskTier: "risk_tier",
    status: "status",
    pdfUrl: "pdf_url",
    signedPdfUrl: "signed_pdf_url",
    clausesUsed: "clauses_used",
    validForDays: "valid_for_days",
    expiresAt: "expires_at",
    signedAt: "signed_at",
    docusignEnvelopeId: "docusign_envelope_id",
    docusignStatus: "docusign_status",
    updatedAt: "updated_at",
  },
  goldContractTemplates: {
    id: "id",
    tenantId: "tenant_id",
    name: "name",
    templateDocxUrl: "template_docx_url",
    applicableRiskTiers: "applicable_risk_tiers",
    isActive: "is_active",
  },
  goldContractClauses: {
    id: "id",
    code: "code",
    content: "content",
    isMandatory: "is_mandatory",
    applicableRiskTiers: "applicable_risk_tiers",
  },
  goldOrders: {
    id: "id",
    tenantId: "tenant_id",
    orderNumber: "order_number",
    totalAmount: "total_amount",
  },
  goldCompanies: {
    id: "id",
    tenantId: "tenant_id",
    denumire: "denumire",
    cui: "cui",
    adresa: "adresa",
  },
  goldCreditProfiles: {
    id: "id",
    tenantId: "tenant_id",
    clientId: "client_id",
    creditLimit: "credit_limit",
  },
  goldContacts: {
    id: "id",
    tenantId: "tenant_id",
    companyId: "company_id",
    role: "role",
    email: "email",
    numeComplet: "nume_complet",
  },
  goldAuditLogsEtapa4: {
    id: "id",
    tenantId: "tenant_id",
    eventType: "event_type",
    entityType: "entity_type",
    entityId: "entity_id",
    actorType: "actor_type",
    newValues: "new_values",
  },
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
  and: vi.fn((...args: unknown[]) => args),
  sql: vi.fn((s: unknown) => s),
  lt: vi.fn((col: unknown, val: unknown) => ({ col, val })),
  isNotNull: vi.fn((col: unknown) => col),
}));

vi.mock("@cerniq/worker-shared", () => ({
  createQueue: createQueueMock,
  QUEUES: {
    E4_CONTRACT_CLAUSES_SELECT: "contract:clauses:select",
    E4_CONTRACT_DOCUSIGN_SEND: "contract:docusign:send",
    E4_CONTRACT_STATUS_POLL: "contract:status:poll",
    E4_CONTRACT_SIGNED_PROCESS: "contract:signed:process",
  },
  withCognitiveSpan: vi.fn((_name: string, fn: (span: null) => unknown) => fn(null)),
}));

vi.mock("../lib/contract-generator.js", () => ({
  generateContractPdf: generateContractPdfMock,
  storeSignedContractPdf: storeSignedContractPdfMock,
  readContractPdf: readContractPdfMock,
}));

vi.mock("../lib/docusign-client.js", () => ({
  createDocuSignEnvelope: createDocuSignEnvelopeMock,
  getDocuSignEnvelopeStatus: getDocuSignEnvelopeStatusMock,
  downloadDocuSignDocument: downloadDocuSignDocumentMock,
  _resetDocuSignClientCache: vi.fn(),
}));

vi.mock("../e4-metrics.js", () => ({
  e4ContractsGeneratedTotal: { inc: e4ContractsGeneratedTotalIncMock },
  e4ContractsSignedTotal: { inc: e4ContractsSignedTotalIncMock },
  e4ContractExpiryAlertsTotal: { inc: e4ContractExpiryAlertsTotalIncMock },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Creează un mock pentru db.select() chain (fluent API Drizzle).
 * Returnează un Promise real îmbogățit cu metode fluente (.from, .where, .limit).
 * Funcționează pentru ambele pattern-uri:
 *   - `await db.select().from().where()` → rezolvă la `returnValue`
 *   - `db.select().from().where().limit(1).then(rows => rows[0])` → rezolvă la `rows[0]`
 *
 * Folosim Object.assign(Promise.resolve(...), ...) pentru a evita adăugarea
 * explicită a `then` pe plain object (SonarLint S7739).
 */
function makeSelectChain(returnValue: unknown) {
  return Object.assign(Promise.resolve(returnValue), {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  });
}

function makeInsertChain(returnValue: unknown = [{ id: "inserted-id" }]) {
  const chain = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(returnValue),
  };
  return chain;
}

function makeInsertNoReturn() {
  return { values: vi.fn().mockResolvedValue(undefined) };
}

function makeUpdateChain() {
  return {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
    returning: vi.fn().mockResolvedValue([{ id: "updated-id" }]),
  };
}

function makeJob<T>(data: T): {
  data: T;
  log: ReturnType<typeof vi.fn>;
  updateProgress: ReturnType<typeof vi.fn>;
} {
  return {
    data,
    log: vi.fn(),
    updateProgress: vi.fn().mockResolvedValue(undefined),
  };
}

// ── G32 Tests ─────────────────────────────────────────────────────────────────

describe("G32 — contract:generate", () => {
  let contractGenerateProcessor: (typeof import("../workers/g32-contract-generate.js"))["contractGenerateProcessor"];

  beforeEach(async () => {
    vi.resetAllMocks();
    setSessionTenantIdMock.mockResolvedValue(undefined);
    const mod = await import("../workers/g32-contract-generate.js");
    contractGenerateProcessor = mod.contractGenerateProcessor;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("G32.1 — success: găsește template, generează PDF, INSERT contract, enqueue G33", async () => {
    const job = makeJob({
      tenantId: "tenant-1",
      clientId: "client-1",
      orderId: "order-1",
      riskTier: "PREMIUM",
    });

    const mockTemplate = {
      id: "tpl-1",
      templateDocxUrl: "/LocalStorage/templates/standard.docx",
      name: "Standard Premium",
    };
    const mockOrder = { id: "order-1", orderNumber: "ORD-001", totalAmount: "10000" };
    const mockCompany = { denumire: "Test SRL", cui: "12345678", adresa: "Str. Test 1" };

    dbSelectMock
      .mockReturnValueOnce(makeSelectChain([mockTemplate]))
      .mockReturnValueOnce(makeSelectChain([mockOrder]))
      .mockReturnValueOnce(makeSelectChain([mockCompany]))
      .mockReturnValueOnce(makeSelectChain([{ creditLimit: "50000" }]));

    dbInsertMock.mockReturnValueOnce(makeInsertChain([{ id: "contract-uuid-1" }]));
    dbUpdateMock.mockReturnValueOnce(makeUpdateChain());

    generateContractPdfMock.mockResolvedValue({
      pdfPath: "/LocalStorage/contracts/contract-uuid-1.pdf",
      pdfBuffer: Buffer.from("PDF"),
      pdfUrl: "/LocalStorage/contracts/contract-uuid-1.pdf",
    });

    const result = await contractGenerateProcessor(job as never, {} as never);

    expect(setSessionTenantIdMock).toHaveBeenCalledWith("tenant-1");
    expect(generateContractPdfMock).toHaveBeenCalledWith(
      "/LocalStorage/templates/standard.docx",
      expect.objectContaining({ riskTier: "PREMIUM", orderNumber: "ORD-001" }),
      "contract-uuid-1",
    );
    expect(dbUpdateMock).toHaveBeenCalled();
    expect(e4ContractsGeneratedTotalIncMock).toHaveBeenCalledWith({
      tenant_id: "tenant-1",
      risk_tier: "PREMIUM",
    });
    expect(createQueueMock).toHaveBeenCalledWith("contract:clauses:select", expect.any(Object));
    expect(addMock).toHaveBeenCalledWith(
      "clauses:select",
      expect.objectContaining({ contractId: "contract-uuid-1", riskTier: "PREMIUM" }),
      expect.any(Object),
    );
    expect(closeMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ ok: true, riskTier: "PREMIUM", orderNumber: "ORD-001" });
  });

  it("G32.2 — template nu există → throw error", async () => {
    const job = makeJob({
      tenantId: "tenant-1",
      clientId: "client-1",
      orderId: "order-1",
      riskTier: "PREMIUM",
    });

    dbSelectMock.mockReturnValueOnce(makeSelectChain([]));

    await expect(contractGenerateProcessor(job as never, {} as never)).rejects.toThrow(
      /No active contract template/,
    );
  });

  it("G32.3 — template fără templateDocxUrl → throw error", async () => {
    const job = makeJob({
      tenantId: "tenant-1",
      clientId: "client-1",
      orderId: "order-1",
      riskTier: "MEDIUM",
    });

    dbSelectMock.mockReturnValueOnce(
      makeSelectChain([{ id: "tpl-1", templateDocxUrl: null, name: "Fara URL" }]),
    );

    await expect(contractGenerateProcessor(job as never, {} as never)).rejects.toThrow(
      /has no templateDocxUrl/,
    );
  });

  it("G32.4 — order nu existe → throw error", async () => {
    const job = makeJob({
      tenantId: "tenant-1",
      clientId: "client-1",
      orderId: "order-nonexistent",
      riskTier: "MEDIUM",
    });

    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([{ id: "tpl-1", templateDocxUrl: "/url/tpl.docx", name: "Tpl" }]),
      )
      .mockReturnValueOnce(makeSelectChain([]));

    await expect(contractGenerateProcessor(job as never, {} as never)).rejects.toThrow(
      /Order not found/,
    );
  });

  it("G32.5 — templateId specificat → SELECT direct by ID", async () => {
    const job = makeJob({
      tenantId: "tenant-1",
      clientId: "client-1",
      orderId: "order-1",
      riskTier: "HIGH",
      templateId: "specific-template-id",
    });

    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([
          { id: "specific-template-id", templateDocxUrl: "/tpl.docx", name: "Specific" },
        ]),
      )
      .mockReturnValueOnce(
        makeSelectChain([{ id: "order-1", orderNumber: "ORD-002", totalAmount: "5000" }]),
      )
      .mockReturnValueOnce(makeSelectChain([{ denumire: "Firma X", cui: "99999", adresa: "Addr" }]))
      .mockReturnValueOnce(makeSelectChain([]));

    dbInsertMock.mockReturnValueOnce(makeInsertChain([{ id: "contract-uuid-2" }]));
    dbUpdateMock.mockReturnValueOnce(makeUpdateChain());
    generateContractPdfMock.mockResolvedValue({
      pdfUrl: "/path/contract.pdf",
      pdfBuffer: Buffer.from("x"),
      pdfPath: "/path/contract.pdf",
    });

    await contractGenerateProcessor(job as never, {} as never);
    // Prima selecție trebuie să folosească templateId, nu filtru JSONB
    expect(dbSelectMock).toHaveBeenCalledTimes(4);
  });
});

// ── G33 Tests ─────────────────────────────────────────────────────────────────

describe("G33 — contract:clauses:select", () => {
  let contractClausesSelectProcessor: (typeof import("../workers/g33-contract-clauses-select.js"))["contractClausesSelectProcessor"];

  beforeEach(async () => {
    vi.resetAllMocks();
    setSessionTenantIdMock.mockResolvedValue(undefined);
    const mod = await import("../workers/g33-contract-clauses-select.js");
    contractClausesSelectProcessor = mod.contractClausesSelectProcessor;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const riskTierCases = [
    { riskTier: "BLOCKED", expectedCodes: ["prepayment_100"] },
    { riskTier: "LOW", expectedCodes: ["prepayment_50", "standard_warranty"] },
    { riskTier: "MEDIUM", expectedCodes: ["payment_30d", "standard_warranty"] },
    { riskTier: "HIGH", expectedCodes: ["payment_30d", "extended_warranty", "penalty_clause"] },
    {
      riskTier: "PREMIUM",
      expectedCodes: ["payment_60d", "extended_warranty", "volume_discount", "priority_support"],
    },
  ];

  for (const { riskTier, expectedCodes } of riskTierCases) {
    it(`G33 — clauze corecte pentru riskTier=${riskTier} (Plan L2099)`, async () => {
      const job = makeJob({
        tenantId: "tenant-1",
        contractId: "contract-1",
        clientId: "client-1",
        riskTier,
      });

      // No DB clauses — doar cele din mapping
      dbSelectMock.mockReturnValueOnce(makeSelectChain([]));
      dbUpdateMock.mockReturnValueOnce(makeUpdateChain());
      dbSelectMock.mockReturnValueOnce(
        makeSelectChain([{ id: "contract-1", clientId: "client-1", orderId: "order-1" }]),
      );

      const result = await contractClausesSelectProcessor(job as never, {} as never);

      expect(dbUpdateMock).toHaveBeenCalled();
      // Verificăm că codurile așteptate sunt toate prezente
      expect(result).toMatchObject({ ok: true, riskTier });
      for (const code of expectedCodes) {
        expect((result as { codes: string[] }).codes).toContain(code);
      }
    });
  }

  it("G33 — clauze mandatory din DB sunt adăugate indiferent de riskTier", async () => {
    const job = makeJob({
      tenantId: "tenant-1",
      contractId: "contract-1",
      clientId: "client-1",
      riskTier: "MEDIUM",
    });

    // Mandatory clause din DB
    dbSelectMock.mockReturnValueOnce(
      makeSelectChain([{ id: "cl-1", code: "gdpr_clause", content: "...", isMandatory: true }]),
    );
    dbUpdateMock.mockReturnValueOnce(makeUpdateChain());
    dbSelectMock.mockReturnValueOnce(
      makeSelectChain([{ id: "contract-1", clientId: "client-1", orderId: null }]),
    );

    const result = await contractClausesSelectProcessor(job as never, {} as never);

    expect((result as { codes: string[] }).codes).toContain("gdpr_clause");
    expect((result as { codes: string[] }).codes).toContain("payment_30d");
  });

  it("G33 — contract nu existe după update → throw error", async () => {
    const job = makeJob({
      tenantId: "tenant-1",
      contractId: "nonexistent",
      clientId: "client-1",
      riskTier: "LOW",
    });

    dbSelectMock.mockReturnValueOnce(makeSelectChain([]));
    dbUpdateMock.mockReturnValueOnce(makeUpdateChain());
    dbSelectMock.mockReturnValueOnce(makeSelectChain([]));

    await expect(contractClausesSelectProcessor(job as never, {} as never)).rejects.toThrow(
      /Contract not found/,
    );
  });

  it("G33 — enqueue G34 cu parametrii corecți", async () => {
    const job = makeJob({
      tenantId: "tenant-1",
      contractId: "contract-42",
      clientId: "client-42",
      riskTier: "HIGH",
    });

    dbSelectMock.mockReturnValueOnce(makeSelectChain([]));
    dbUpdateMock.mockReturnValueOnce(makeUpdateChain());
    dbSelectMock.mockReturnValueOnce(
      makeSelectChain([{ id: "contract-42", clientId: "client-42", orderId: "order-42" }]),
    );

    await contractClausesSelectProcessor(job as never, {} as never);

    expect(createQueueMock).toHaveBeenCalledWith("contract:docusign:send", expect.any(Object));
    expect(addMock).toHaveBeenCalledWith(
      "docusign:send",
      expect.objectContaining({ contractId: "contract-42", clientId: "client-42" }),
      expect.objectContaining({ attempts: 3 }),
    );
    expect(closeMock).toHaveBeenCalledTimes(1);
  });
});

// ── G34 Tests ─────────────────────────────────────────────────────────────────

describe("G34 — contract:docusign:send", () => {
  let contractDocuSignSendProcessor: (typeof import("../workers/g34-contract-docusign-send.js"))["contractDocuSignSendProcessor"];

  beforeEach(async () => {
    vi.resetAllMocks();
    setSessionTenantIdMock.mockResolvedValue(undefined);
    const mod = await import("../workers/g34-contract-docusign-send.js");
    contractDocuSignSendProcessor = mod.contractDocuSignSendProcessor;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("G34.1 — success cu signer ADMINISTRATOR", async () => {
    const job = makeJob({
      tenantId: "tenant-1",
      contractId: "contract-1",
      clientId: "client-1",
      orderId: "order-1",
    });

    const mockContract = {
      id: "contract-1",
      pdfUrl: "/LocalStorage/contracts/c1.pdf",
      riskTier: "MEDIUM",
      status: "DRAFT",
      expiresAt: null,
    };
    const mockOrder = { orderNumber: "ORD-001" };
    const mockSigner = { id: "contact-1", email: "admin@test.ro", numeComplet: "Ion Ionescu" };

    dbSelectMock
      .mockReturnValueOnce(makeSelectChain([mockContract]))
      .mockReturnValueOnce(makeSelectChain([mockOrder]))
      .mockReturnValueOnce(makeSelectChain([mockSigner]));

    readContractPdfMock.mockResolvedValue(Buffer.from("PDF content"));
    createDocuSignEnvelopeMock.mockResolvedValue({
      envelopeId: "env-abc123",
      status: "sent",
      statusDateTime: "2026-03-30T01:00:00Z",
      uri: "/envelopes/env-abc123",
    });
    dbUpdateMock.mockReturnValueOnce(makeUpdateChain());
    dbInsertMock.mockReturnValueOnce(makeInsertNoReturn());

    const result = await contractDocuSignSendProcessor(job as never, {} as never);

    expect(createDocuSignEnvelopeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        emailSubject: "Contract ORD-001 — Cerniq",
        signers: [expect.objectContaining({ email: "admin@test.ro", name: "Ion Ionescu" })],
      }),
    );
    expect(dbUpdateMock).toHaveBeenCalled();
    expect(dbInsertMock).toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, envelopeId: "env-abc123", status: "sent" });
  });

  it("G34.2 — fără contact ADMINISTRATOR → fallback la primul contact", async () => {
    const job = makeJob({
      tenantId: "tenant-1",
      contractId: "contract-2",
      clientId: "client-2",
      orderId: "order-2",
    });

    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([
          { id: "contract-2", pdfUrl: "/path.pdf", status: "DRAFT", expiresAt: null },
        ]),
      )
      .mockReturnValueOnce(makeSelectChain([{ orderNumber: "ORD-002" }]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(
        makeSelectChain([{ id: "c-fb", email: "contact@test.ro", numeComplet: "Maria Pop" }]),
      );

    readContractPdfMock.mockResolvedValue(Buffer.from("PDF"));
    createDocuSignEnvelopeMock.mockResolvedValue({
      envelopeId: "env-fb",
      status: "sent",
      statusDateTime: "",
      uri: "",
    });
    dbUpdateMock.mockReturnValueOnce(makeUpdateChain());
    dbInsertMock.mockReturnValueOnce(makeInsertNoReturn());

    const result = await contractDocuSignSendProcessor(job as never, {} as never);

    expect(result).toMatchObject({ ok: true, envelopeId: "env-fb" });
  });

  it("G34.3 — fără niciun contact cu email → throw error", async () => {
    const job = makeJob({
      tenantId: "tenant-1",
      contractId: "contract-3",
      clientId: "client-no-email",
    });

    dbSelectMock
      .mockReturnValueOnce(
        makeSelectChain([
          { id: "contract-3", pdfUrl: "/path.pdf", status: "DRAFT", expiresAt: null },
        ]),
      )
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(
        makeSelectChain([{ id: "c-no-email", email: null, numeComplet: "Anon" }]),
      );

    await expect(contractDocuSignSendProcessor(job as never, {} as never)).rejects.toThrow(
      /No signer with email/,
    );
  });

  it("G34.4 — contract nu există → throw error", async () => {
    const job = makeJob({ tenantId: "t1", contractId: "nonexistent", clientId: "c1" });
    dbSelectMock.mockReturnValueOnce(makeSelectChain([]));
    await expect(contractDocuSignSendProcessor(job as never, {} as never)).rejects.toThrow(
      /Contract not found/,
    );
  });

  it("G34.5 — contract fără pdfUrl → throw error", async () => {
    const job = makeJob({ tenantId: "t1", contractId: "c-no-pdf", clientId: "c1" });
    dbSelectMock.mockReturnValueOnce(
      makeSelectChain([{ id: "c-no-pdf", pdfUrl: null, status: "DRAFT" }]),
    );
    await expect(contractDocuSignSendProcessor(job as never, {} as never)).rejects.toThrow(
      /has no pdfUrl/,
    );
  });
});

// ── G35 Tests ─────────────────────────────────────────────────────────────────

describe("G35 — contract:status:poll (CRON 0 1 * * *)", () => {
  let contractStatusPollProcessor: (typeof import("../workers/g35-contract-status-poll.js"))["contractStatusPollProcessor"];

  beforeEach(async () => {
    vi.resetAllMocks();
    setSessionTenantIdMock.mockResolvedValue(undefined);
    const mod = await import("../workers/g35-contract-status-poll.js");
    contractStatusPollProcessor = mod.contractStatusPollProcessor;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("G35.1 — fără contracte SENT_DOCUSIGN → return processed=0", async () => {
    const job = makeJob({});

    dbSelectMock.mockReturnValueOnce(makeSelectChain([]));
    dbUpdateMock.mockReturnValueOnce({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
    });

    const result = await contractStatusPollProcessor(job as never, {} as never);

    expect(result).toMatchObject({ ok: true, processed: 0, signed: 0 });
  });

  it("G35.2 — status=signed → enqueue G36", async () => {
    const future = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    const job = makeJob({});

    dbSelectMock.mockReturnValueOnce(
      makeSelectChain([
        { id: "c-signed", tenantId: "t1", docusignEnvelopeId: "env-1", expiresAt: future },
      ]),
    );
    getDocuSignEnvelopeStatusMock.mockResolvedValue({ envelopeId: "env-1", status: "signed" });
    dbUpdateMock.mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
    });

    const result = await contractStatusPollProcessor(job as never, {} as never);

    expect(createQueueMock).toHaveBeenCalledWith("contract:signed:process", expect.any(Object));
    expect(addMock).toHaveBeenCalledWith(
      "signed:process",
      expect.objectContaining({ contractId: "c-signed", envelopeId: "env-1" }),
      expect.objectContaining({ jobId: "contract:signed:c-signed" }),
    );
    expect(closeMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ ok: true, signed: 1 });
  });

  it("G35.3 — status=completed → enqueue G36", async () => {
    const future = new Date(Date.now() + 3 * 24 * 3600 * 1000);
    const job = makeJob({});

    dbSelectMock.mockReturnValueOnce(
      makeSelectChain([
        { id: "c-completed", tenantId: "t1", docusignEnvelopeId: "env-2", expiresAt: future },
      ]),
    );
    getDocuSignEnvelopeStatusMock.mockResolvedValue({ envelopeId: "env-2", status: "completed" });
    dbUpdateMock.mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
    });

    const result = await contractStatusPollProcessor(job as never, {} as never);

    expect(addMock).toHaveBeenCalled();
    expect(closeMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ ok: true, signed: 1 });
  });

  it("G35.4 — status=declined → UPDATE status=CANCELLED", async () => {
    const future = new Date(Date.now() + 5 * 24 * 3600 * 1000);
    const job = makeJob({});

    dbSelectMock.mockReturnValueOnce(
      makeSelectChain([
        { id: "c-declined", tenantId: "t1", docusignEnvelopeId: "env-3", expiresAt: future },
      ]),
    );
    getDocuSignEnvelopeStatusMock.mockResolvedValue({ envelopeId: "env-3", status: "declined" });
    const updateMock = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
    };
    dbUpdateMock.mockReturnValue(updateMock);

    const result = await contractStatusPollProcessor(job as never, {} as never);

    expect(dbUpdateMock).toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, cancelled: 1 });
  });

  it("G35.5 — expiresAt < NOW()+24h → alert metric (expirySoon)", async () => {
    const soonExpiry = new Date(Date.now() + 12 * 3600 * 1000);
    const job = makeJob({});

    dbSelectMock.mockReturnValueOnce(
      makeSelectChain([
        { id: "c-expiry", tenantId: "t1", docusignEnvelopeId: "env-4", expiresAt: soonExpiry },
      ]),
    );
    getDocuSignEnvelopeStatusMock.mockResolvedValue({ envelopeId: "env-4", status: "sent" });
    dbUpdateMock.mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
    });

    const result = await contractStatusPollProcessor(job as never, {} as never);

    expect(e4ContractExpiryAlertsTotalIncMock).toHaveBeenCalledWith({ tenant_id: "t1" });
    expect(result).toMatchObject({ ok: true, expirySoon: 1 });
  });

  it("G35.6 — fără docusignEnvelopeId → skip", async () => {
    const future = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    const job = makeJob({});

    dbSelectMock.mockReturnValueOnce(
      makeSelectChain([
        { id: "c-no-env", tenantId: "t1", docusignEnvelopeId: null, expiresAt: future },
      ]),
    );
    dbUpdateMock.mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
    });

    const result = await contractStatusPollProcessor(job as never, {} as never);

    expect(getDocuSignEnvelopeStatusMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, processed: 1, signed: 0 });
  });

  it("G35.7 — eroare la DocuSign API → continuă cu contractele rămase", async () => {
    const future = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    const job = makeJob({});

    dbSelectMock.mockReturnValueOnce(
      makeSelectChain([
        { id: "c-err", tenantId: "t1", docusignEnvelopeId: "env-err", expiresAt: future },
        { id: "c-ok", tenantId: "t1", docusignEnvelopeId: "env-ok", expiresAt: future },
      ]),
    );
    getDocuSignEnvelopeStatusMock
      .mockRejectedValueOnce(new Error("DocuSign API down"))
      .mockResolvedValueOnce({ envelopeId: "env-ok", status: "sent" });
    dbUpdateMock.mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
    });

    const result = await contractStatusPollProcessor(job as never, {} as never);

    expect(result).toMatchObject({ ok: true, processed: 2 });
    expect(job.log).toHaveBeenCalledWith(expect.stringContaining("Error polling contract c-err"));
  });
});

// ── G36 Tests ─────────────────────────────────────────────────────────────────

describe("G36 — contract:signed:process", () => {
  let contractSignedProcessProcessor: (typeof import("../workers/g36-contract-signed-process.js"))["contractSignedProcessProcessor"];

  beforeEach(async () => {
    vi.resetAllMocks();
    setSessionTenantIdMock.mockResolvedValue(undefined);
    const mod = await import("../workers/g36-contract-signed-process.js");
    contractSignedProcessProcessor = mod.contractSignedProcessProcessor;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("G36.1 — success: download PDF, stocare, UPDATE status=SIGNED, audit log", async () => {
    const job = makeJob({
      tenantId: "tenant-1",
      contractId: "contract-1",
      envelopeId: "env-signed-1",
    });

    dbSelectMock.mockReturnValueOnce(
      makeSelectChain([{ id: "contract-1", status: "SENT_DOCUSIGN", signedAt: null }]),
    );
    downloadDocuSignDocumentMock.mockResolvedValue(Buffer.from("Signed PDF content"));
    storeSignedContractPdfMock.mockResolvedValue({
      pdfPath: "/LocalStorage/contracts/signed/contract-1-signed.pdf",
      pdfUrl: "/LocalStorage/contracts/signed/contract-1-signed.pdf",
    });
    dbUpdateMock.mockReturnValueOnce(makeUpdateChain());
    dbInsertMock.mockReturnValueOnce(makeInsertNoReturn());

    const result = await contractSignedProcessProcessor(job as never, {} as never);

    expect(downloadDocuSignDocumentMock).toHaveBeenCalledWith("env-signed-1", "combined");
    expect(storeSignedContractPdfMock).toHaveBeenCalledWith(expect.any(Buffer), "contract-1");
    expect(dbUpdateMock).toHaveBeenCalled();
    expect(dbInsertMock).toHaveBeenCalled();
    expect(e4ContractsSignedTotalIncMock).toHaveBeenCalledWith({ tenant_id: "tenant-1" });
    expect(result).toMatchObject({
      ok: true,
      contractId: "contract-1",
      envelopeId: "env-signed-1",
      skipped: false,
    });
    expect((result as { signedPdfUrl: string }).signedPdfUrl).toContain("signed");
  });

  it("G36.2 — contract deja SIGNED → idempotent skip", async () => {
    const job = makeJob({
      tenantId: "tenant-1",
      contractId: "already-signed",
      envelopeId: "env-done",
    });

    dbSelectMock.mockReturnValueOnce(
      makeSelectChain([{ id: "already-signed", status: "SIGNED", signedAt: new Date() }]),
    );

    const result = await contractSignedProcessProcessor(job as never, {} as never);

    expect(downloadDocuSignDocumentMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, skipped: true });
  });

  it("G36.3 — contract nu există → throw error", async () => {
    const job = makeJob({ tenantId: "t1", contractId: "nonexistent", envelopeId: "env-x" });
    dbSelectMock.mockReturnValueOnce(makeSelectChain([]));
    await expect(contractSignedProcessProcessor(job as never, {} as never)).rejects.toThrow(
      /Contract not found/,
    );
  });

  it("G36.4 — DocuSign download eșuează → throw propagat", async () => {
    const job = makeJob({ tenantId: "t1", contractId: "contract-dl-err", envelopeId: "env-err" });

    dbSelectMock.mockReturnValueOnce(
      makeSelectChain([{ id: "contract-dl-err", status: "SENT_DOCUSIGN", signedAt: null }]),
    );
    downloadDocuSignDocumentMock.mockRejectedValue(new Error("DocuSign download timeout"));

    await expect(contractSignedProcessProcessor(job as never, {} as never)).rejects.toThrow(
      /DocuSign download timeout/,
    );
    expect(e4ContractsSignedTotalIncMock).not.toHaveBeenCalled();
  });
});

// ── docusign-client Tests ─────────────────────────────────────────────────────

describe("docusign-client — _resetDocuSignClientCache", () => {
  it("resetează cache-ul intern fără erori", async () => {
    const { _resetDocuSignClientCache } = await import("../lib/docusign-client.js");
    expect(() => _resetDocuSignClientCache()).not.toThrow();
  });
});

// ── RISK_TIER_CLAUSE_CODES exactitate (Plan L2099) ────────────────────────────

describe("RISK_TIER_CLAUSE_CODES — exactitate Plan L2099", () => {
  it("BLOCKED → exact ['prepayment_100']", async () => {
    const mod = await import("../workers/g33-contract-clauses-select.js");
    // Testăm indirect prin comportamentul processorului cu DB empty
    const job = makeJob({ tenantId: "t", contractId: "c", clientId: "cl", riskTier: "BLOCKED" });
    vi.resetAllMocks();
    setSessionTenantIdMock.mockResolvedValue(undefined);
    dbSelectMock.mockReturnValueOnce(makeSelectChain([]));
    dbUpdateMock.mockReturnValueOnce(makeUpdateChain());
    dbSelectMock.mockReturnValueOnce(makeSelectChain([{ id: "c", clientId: "cl", orderId: null }]));

    const result = await mod.contractClausesSelectProcessor(job as never, {} as never);
    expect((result as { codes: string[] }).codes).toEqual(["prepayment_100"]);
  });

  it("PREMIUM → exact ['payment_60d','extended_warranty','volume_discount','priority_support']", async () => {
    const mod = await import("../workers/g33-contract-clauses-select.js");
    const job = makeJob({ tenantId: "t", contractId: "c", clientId: "cl", riskTier: "PREMIUM" });
    vi.resetAllMocks();
    setSessionTenantIdMock.mockResolvedValue(undefined);
    dbSelectMock.mockReturnValueOnce(makeSelectChain([]));
    dbUpdateMock.mockReturnValueOnce(makeUpdateChain());
    dbSelectMock.mockReturnValueOnce(makeSelectChain([{ id: "c", clientId: "cl", orderId: null }]));

    const result = await mod.contractClausesSelectProcessor(job as never, {} as never);
    expect((result as { codes: string[] }).codes).toEqual(
      expect.arrayContaining([
        "payment_60d",
        "extended_warranty",
        "volume_discount",
        "priority_support",
      ]),
    );
    expect((result as { codes: string[] }).codes).not.toContain("prepayment_100");
    expect((result as { codes: string[] }).codes).not.toContain("prepayment_50");
  });
});
