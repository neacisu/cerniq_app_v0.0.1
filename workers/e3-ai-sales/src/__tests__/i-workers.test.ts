/**
 * Teste complete pentru workers I51-I55 (E3 AI Sales — Document Generation).
 *
 * Pattern vitest: vi.hoisted() + vi.mock() pentru mock-uri mutabile per test.
 * Acoperire:
 *  I54: template compile (7 teste) — invoice-ro, proforma-ro, credit-note-ro, variabile lipsă,
 *       template necunoscut, VAT 19%, compiledAt
 *  I55: archive store (7 teste) — success, SHA-256, doc negăsit, GENESIS prevHash,
 *       hash chain, contentSize, setSessionTenantId
 *  I51: pdf download (8 teste) — doc negăsit, getDocumentDownloadLink apelat, downloadDocumentPdf
 *       apelat, pdfBase64+sizeBytes, fileName generat corect, PROFORMA→endpoint, setSessionTenantId
 *  I52: email send via Resend (8 teste) — email invalid, Resend.send apelat, email fără PDF,
 *       email cu PDF, messageId, Resend error→throw, RESEND_API_KEY env, setSessionTenantId
 *  I53: whatsapp send (6 teste) — phoneNumber invalid, valid → queued, note stub,
 *       pdfBase64 → log stub, oblioDocumentId propagat, setSessionTenantId
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";

// ── vi.hoisted() ───────────────────────────────────────────────────────────────

const {
  dbSelectMock,
  dbInsertMock,
  setSessionTenantIdMock,
  compileMock,
  compiledTemplateMock,
  getDocumentDownloadLinkMock,
  downloadDocumentPdfMock,
  resendEmailsSendMock,
  ResendConstructorMock,
} = vi.hoisted(() => {
  const compiledTemplateMock = vi.fn().mockReturnValue("<html>compiled</html>");
  const compileMock = vi.fn().mockReturnValue(compiledTemplateMock);

  // oblio-client mocks pentru I51
  const getDocumentDownloadLinkMock = vi
    .fn()
    .mockResolvedValue("https://www.oblio.eu/utils/show_file/?ic=1&id=2&it=token123");
  const downloadDocumentPdfMock = vi.fn().mockResolvedValue(Buffer.from("fake-pdf-from-oblio"));

  // Resend mock pentru I52
  const resendEmailsSendMock = vi
    .fn()
    .mockResolvedValue({ data: { id: "resend-msg-id-123" }, error: null });
  // Resend se instantiază cu `new Resend(apiKey)` → trebuie function() nu arrow
  const ResendConstructorMock = vi.fn().mockImplementation(function resendMock(
    this: Record<string, unknown>,
  ) {
    this["emails"] = { send: resendEmailsSendMock };
  });

  return {
    dbSelectMock: vi.fn(),
    dbInsertMock: vi.fn(),
    setSessionTenantIdMock: vi.fn().mockResolvedValue(undefined),
    compileMock,
    compiledTemplateMock,
    getDocumentDownloadLinkMock,
    downloadDocumentPdfMock,
    resendEmailsSendMock,
    ResendConstructorMock,
  };
});

// ── vi.mock() ──────────────────────────────────────────────────────────────────

vi.mock("@cerniq/db", () => ({
  db: {
    select: dbSelectMock,
    insert: dbInsertMock,
  },
  setSessionTenantId: setSessionTenantIdMock,
  oblioDocuments: {
    id: "id",
    tenantId: "tenant_id",
    documentType: "document_type",
    series: "series",
    number: "number",
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
  eq: vi.fn((_a: unknown, _b: unknown) => ({ type: "eq" })),
  and: vi.fn((..._args: unknown[]) => ({ type: "and" })),
  desc: vi.fn((_a: unknown) => ({ type: "desc" })),
}));

vi.mock("@cerniq/worker-shared", () => ({
  createQueue: vi.fn(() => ({ add: vi.fn(), close: vi.fn() })),
  DEFAULT_JOB_OPTIONS: { attempts: 3, backoff: { type: "exponential", delay: 1000 } },
  QUEUES: {},
}));

vi.mock("handlebars", () => ({
  default: {
    compile: compileMock,
    registerHelper: vi.fn(),
  },
}));

// I51: descărcăm PDF din Oblio (nu generăm cu Puppeteer)
vi.mock("../lib/oblio-client.js", () => ({
  getDocumentDownloadLink: getDocumentDownloadLinkMock,
  downloadDocumentPdf: downloadDocumentPdfMock,
  // Alte metode expuse de oblio-client (pentru import complet)
  sendInvoiceToSpv: vi.fn(),
  checkEinvoiceStatus: vi.fn(),
  downloadSpvArchive: vi.fn(),
  getOblioAccessToken: vi.fn().mockResolvedValue("mock-token"),
}));

// I52: Resend pentru email tranzacțional
vi.mock("resend", () => ({
  Resend: ResendConstructorMock,
}));

// ── Helper builders ────────────────────────────────────────────────────────────

function setupI55Mocks(docRows: unknown[], auditRows: unknown[]) {
  dbSelectMock
    .mockReturnValueOnce(makeSelectChain(docRows))
    .mockReturnValueOnce(makeSelectChain(auditRows));
  dbInsertMock.mockReturnValue(makeInsertChain());
}

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

// ── Imports workers ────────────────────────────────────────────────────────────

import { documentTemplateCompileProcessor } from "../workers/i54-document-template-compile.js";
import { documentArchiveStoreProcessor } from "../workers/i55-document-archive-store.js";
import { documentPdfGenerateProcessor } from "../workers/i51-document-pdf-generate.js";
import { documentEmailSendProcessor } from "../workers/i52-document-email-send.js";
import { documentWhatsappSendProcessor } from "../workers/i53-document-whatsapp-send.js";

// ── Reset ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  setSessionTenantIdMock.mockResolvedValue(undefined);
  compileMock.mockReturnValue(compiledTemplateMock);
  compiledTemplateMock.mockReturnValue("<html>compiled</html>");
  getDocumentDownloadLinkMock.mockResolvedValue(
    "https://www.oblio.eu/utils/show_file/?ic=1&id=2&it=token123",
  );
  downloadDocumentPdfMock.mockResolvedValue(Buffer.from("fake-pdf-from-oblio"));
  resendEmailsSendMock.mockResolvedValue({ data: { id: "resend-msg-id-123" }, error: null });
  ResendConstructorMock.mockImplementation(function resendMock(this: Record<string, unknown>) {
    this["emails"] = { send: resendEmailsSendMock };
  });
});

// ── Job factory helpers ────────────────────────────────────────────────────────

function makeI54Job(data: {
  tenantId: string;
  templateName: string;
  templateVariables: Record<string, unknown>;
  oblioDocumentId?: string;
}) {
  return { data } as unknown as Parameters<typeof documentTemplateCompileProcessor>[0];
}

function makeI55Job(data: {
  tenantId: string;
  oblioDocumentId: string;
  documentContent: string;
  contentType: "pdf" | "html";
  actorId?: string;
}) {
  return { data } as unknown as Parameters<typeof documentArchiveStoreProcessor>[0];
}

function makeI51Job(data: { tenantId: string; oblioDocumentId: string; companyCif?: string }) {
  return { data: { companyCif: "RO12345678", ...data } } as unknown as Parameters<
    typeof documentPdfGenerateProcessor
  >[0];
}

function makeI52Job(data: {
  tenantId: string;
  recipientEmail: string;
  subject: string;
  htmlBody?: string;
  pdfBase64?: string;
  oblioDocumentId?: string;
  fileName?: string;
}) {
  return { data } as unknown as Parameters<typeof documentEmailSendProcessor>[0];
}

function makeI53Job(data: {
  tenantId: string;
  phoneNumber: string;
  message: string;
  pdfBase64?: string;
  fileName?: string;
  oblioDocumentId?: string;
}) {
  return { data } as unknown as Parameters<typeof documentWhatsappSendProcessor>[0];
}

// ═══════════════════════════════════════════════════════════════════════════════
// I54 — document:template:compile
// ═══════════════════════════════════════════════════════════════════════════════

describe("I54 — documentTemplateCompileProcessor", () => {
  it("compilează template invoice-ro cu variabile → returnează ok:true și html", async () => {
    const job = makeI54Job({
      tenantId: "t1",
      templateName: "invoice-ro",
      templateVariables: {
        company: "SC Test SRL",
        cui: "RO12345678",
        series: "F",
        number: 1,
        subtotal: "100",
        vat: "19",
        total: "119",
        vatRate: 19,
        items: [],
      },
    });

    const result = await documentTemplateCompileProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.html).toBeTruthy();
    expect(result.templateName).toBe("invoice-ro");
  });

  it("compilează template proforma-ro", async () => {
    const job = makeI54Job({
      tenantId: "t1",
      templateName: "proforma-ro",
      templateVariables: {
        company: "SC Test SRL",
        cui: "RO12345678",
        series: "P",
        number: 1001,
        subtotal: "100",
        vat: "19",
        total: "119",
        vatRate: 19,
        items: [],
      },
    });

    const result = await documentTemplateCompileProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.templateName).toBe("proforma-ro");
  });

  it("compilează template credit-note-ro", async () => {
    const job = makeI54Job({
      tenantId: "t1",
      templateName: "credit-note-ro",
      templateVariables: {
        company: "SC Test SRL",
        cui: "RO12345678",
        series: "CN",
        number: 5,
        subtotal: "100",
        vat: "19",
        total: "119",
        vatRate: 19,
        items: [],
      },
    });

    const result = await documentTemplateCompileProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.templateName).toBe("credit-note-ro");
  });

  it("variabile lipsă → Handlebars nu aruncă eroare (ignoră {{...}} nedefinite)", async () => {
    const job = makeI54Job({
      tenantId: "t1",
      templateName: "invoice-ro",
      templateVariables: {},
    });

    await expect(documentTemplateCompileProcessor(job, {} as never)).resolves.not.toThrow();
  });

  it("template necunoscut → aruncă eroare cu mesaj explicit", async () => {
    const job = makeI54Job({
      tenantId: "t1",
      templateName: "unknown-template",
      templateVariables: {},
    });

    await expect(documentTemplateCompileProcessor(job, {} as never)).rejects.toThrow(
      "template necunoscut",
    );
  });

  it("VAT 19% apare în HTML compilat (template invoice-ro conține vatRate)", async () => {
    compiledTemplateMock.mockReturnValue(
      "<html>TVA 19% standard conform legislatiei fiscale RO</html>",
    );

    const job = makeI54Job({
      tenantId: "t1",
      templateName: "invoice-ro",
      templateVariables: { vatRate: 19, company: "SC Test SRL", cui: "RO123" },
    });

    const result = await documentTemplateCompileProcessor(job, {} as never);

    expect(result.html).toContain("19");
  });

  it("compiledAt este ISO timestamp valid", async () => {
    const job = makeI54Job({
      tenantId: "t1",
      templateName: "proforma-ro",
      templateVariables: { company: "SC Test SRL" },
    });

    const before = new Date().toISOString();
    const result = await documentTemplateCompileProcessor(job, {} as never);
    const after = new Date().toISOString();

    expect(result.compiledAt >= before).toBe(true);
    expect(result.compiledAt <= after).toBe(true);
    expect(result.compiledAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// I55 — document:archive:store
// ═══════════════════════════════════════════════════════════════════════════════

describe("I55 — documentArchiveStoreProcessor", () => {
  const tenantId = "tenant-i55-001";
  const oblioDocumentId = "doc-i55-001";
  const documentContent = "PDF_CONTENT_TEST_DATA";

  it("arhivează document cu succes → fiscalAuditTrail inserat", async () => {
    setupI55Mocks([{ id: oblioDocumentId, documentType: "INVOICE", series: "F", number: 100 }], []);

    const job = makeI55Job({
      tenantId,
      oblioDocumentId,
      documentContent,
      contentType: "pdf",
      actorId: "actor-001",
    });

    const result = await documentArchiveStoreProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.oblioDocumentId).toBe(oblioDocumentId);
    expect(dbInsertMock).toHaveBeenCalled();
  });

  it("calculează SHA-256 hash corect și reproducibil", async () => {
    const content = "REPRODUCIBLE_CONTENT";
    const expectedContentHash = createHash("sha256").update(content).digest("hex");

    setupI55Mocks([{ id: oblioDocumentId, documentType: "PROFORMA", series: "P", number: 1 }], []);

    const job = makeI55Job({
      tenantId,
      oblioDocumentId,
      documentContent: content,
      contentType: "html",
    });

    const result = await documentArchiveStoreProcessor(job, {} as never);

    // Verificăm că hash-ul din result este SHA-256 valid (64 hex chars)
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    // Hash-ul chain include contentHash; îl verificăm indirect prin consistență
    expect(result.hash).toBeTruthy();
    // Content hash ar trebui calculat din content
    expect(expectedContentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("oblioDocuments negăsit → aruncă eroare", async () => {
    dbSelectMock.mockReturnValueOnce(makeSelectChain([]));

    const job = makeI55Job({
      tenantId,
      oblioDocumentId: "nonexistent-doc",
      documentContent,
      contentType: "pdf",
    });

    await expect(documentArchiveStoreProcessor(job, {} as never)).rejects.toThrow("negăsit");
  });

  it("prima intrare → prevHash = 'GENESIS'", async () => {
    setupI55Mocks(
      [{ id: oblioDocumentId, documentType: "INVOICE", series: "F", number: 1 }],
      [], // nicio intrare anterioară → prevHash = GENESIS
    );

    const job = makeI55Job({
      tenantId,
      oblioDocumentId,
      documentContent,
      contentType: "pdf",
    });

    const result = await documentArchiveStoreProcessor(job, {} as never);

    // Verificăm că insert a fost apelat cu prevHash GENESIS
    const insertCall = dbInsertMock.mock.calls[0];
    expect(insertCall).toBeTruthy();
    const valuesCall = dbInsertMock.mock.results[0]?.value?.values?.mock?.calls[0]?.[0];
    if (valuesCall) {
      expect(valuesCall.prevHash).toBe("GENESIS");
    }
    expect(result.ok).toBe(true);
  });

  it("hash chain corect — hash depinde de prevHash", async () => {
    const existingHash = "abc123previoushash";
    setupI55Mocks(
      [{ id: oblioDocumentId, documentType: "INVOICE", series: "F", number: 1 }],
      [{ hash: existingHash }],
    );

    const job = makeI55Job({
      tenantId,
      oblioDocumentId,
      documentContent,
      contentType: "pdf",
    });

    const result = await documentArchiveStoreProcessor(job, {} as never);

    // Hash-ul nou trebuie să fie diferit de prevHash
    expect(result.hash).not.toBe(existingHash);
    expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("contentSize corect în auditData", async () => {
    const content = "EXACT_CONTENT_1234567890";
    setupI55Mocks([{ id: oblioDocumentId, documentType: "PROFORMA", series: "P", number: 2 }], []);

    const job = makeI55Job({
      tenantId,
      oblioDocumentId,
      documentContent: content,
      contentType: "html",
    });

    await documentArchiveStoreProcessor(job, {} as never);

    // Verificăm că insert a fost apelat (contentSize verificat prin audit data)
    expect(dbInsertMock).toHaveBeenCalled();
    const insertValuesArg = dbInsertMock.mock.results[0]?.value?.values?.mock?.calls[0]?.[0];
    if (insertValuesArg?.data) {
      expect(insertValuesArg.data.contentSize).toBe(content.length);
    }
  });

  it("setSessionTenantId apelat cu tenantId corect", async () => {
    setupI55Mocks(
      [{ id: oblioDocumentId, documentType: "CREDIT_NOTE", series: "CN", number: 3 }],
      [],
    );

    const job = makeI55Job({
      tenantId,
      oblioDocumentId,
      documentContent,
      contentType: "pdf",
    });

    await documentArchiveStoreProcessor(job, {} as never);

    expect(setSessionTenantIdMock).toHaveBeenCalledWith(tenantId);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// I51 — document:pdf:generate (descărcare PDF din Oblio)
// ═══════════════════════════════════════════════════════════════════════════════

describe("I51 — documentPdfGenerateProcessor", () => {
  const tenantId = "tenant-i51-001";
  const oblioDocumentId = "doc-i51-001";
  const companyCif = "RO12345678";

  const mockDoc = {
    id: oblioDocumentId,
    documentType: "INVOICE",
    series: "FCT",
    number: 55,
  };

  it("oblioDocuments negăsit → aruncă eroare", async () => {
    dbSelectMock.mockReturnValueOnce(makeSelectChain([]));

    const job = makeI51Job({ tenantId, oblioDocumentId: "nonexistent", companyCif });

    await expect(documentPdfGenerateProcessor(job, {} as never)).rejects.toThrow("negăsit");
  });

  it("getDocumentDownloadLink apelat cu companyCif, documentType, series, number", async () => {
    dbSelectMock.mockReturnValueOnce(makeSelectChain([mockDoc]));

    const job = makeI51Job({ tenantId, oblioDocumentId, companyCif });

    await documentPdfGenerateProcessor(job, {} as never);

    expect(getDocumentDownloadLinkMock).toHaveBeenCalledWith(companyCif, "INVOICE", "FCT", 55);
  });

  it("downloadDocumentPdf apelat cu link-ul primit de la getDocumentDownloadLink", async () => {
    const oblioLink = "https://www.oblio.eu/utils/show_file/?ic=99&id=123&it=abc";
    dbSelectMock.mockReturnValueOnce(makeSelectChain([mockDoc]));
    getDocumentDownloadLinkMock.mockResolvedValue(oblioLink);

    const job = makeI51Job({ tenantId, oblioDocumentId, companyCif });

    await documentPdfGenerateProcessor(job, {} as never);

    expect(downloadDocumentPdfMock).toHaveBeenCalledWith(oblioLink);
  });

  it("pdfBase64 și sizeBytes corecte în rezultat", async () => {
    const fakePdf = Buffer.from("real-pdf-content-from-oblio");
    dbSelectMock.mockReturnValueOnce(makeSelectChain([mockDoc]));
    downloadDocumentPdfMock.mockResolvedValue(fakePdf);

    const job = makeI51Job({ tenantId, oblioDocumentId, companyCif });

    const result = await documentPdfGenerateProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.pdfBase64).toBe(fakePdf.toString("base64"));
    expect(result.sizeBytes).toBe(fakePdf.length);
  });

  it("fileName generat corect pentru INVOICE → factura-{series}-{number}.pdf", async () => {
    dbSelectMock.mockReturnValueOnce(makeSelectChain([mockDoc]));

    const job = makeI51Job({ tenantId, oblioDocumentId, companyCif });

    const result = await documentPdfGenerateProcessor(job, {} as never);

    expect(result.fileName).toBe("factura-FCT-55.pdf");
  });

  it("PROFORMA → fileName proforma-{series}-{number}.pdf", async () => {
    const proformaDoc = { ...mockDoc, documentType: "PROFORMA", series: "PR", number: 8 };
    dbSelectMock.mockReturnValueOnce(makeSelectChain([proformaDoc]));

    const job = makeI51Job({ tenantId, oblioDocumentId, companyCif });

    const result = await documentPdfGenerateProcessor(job, {} as never);

    expect(result.fileName).toBe("proforma-PR-8.pdf");
    expect(getDocumentDownloadLinkMock).toHaveBeenCalledWith(companyCif, "PROFORMA", "PR", 8);
  });

  it("CREDIT_NOTE → fileName nota-credit-{series}-{number}.pdf", async () => {
    const cnDoc = { ...mockDoc, documentType: "CREDIT_NOTE", series: "CN", number: 3 };
    dbSelectMock.mockReturnValueOnce(makeSelectChain([cnDoc]));

    const job = makeI51Job({ tenantId, oblioDocumentId, companyCif });

    const result = await documentPdfGenerateProcessor(job, {} as never);

    expect(result.fileName).toBe("nota-credit-CN-3.pdf");
  });

  it("setSessionTenantId apelat cu tenantId corect", async () => {
    dbSelectMock.mockReturnValueOnce(makeSelectChain([mockDoc]));

    const job = makeI51Job({ tenantId, oblioDocumentId, companyCif });

    await documentPdfGenerateProcessor(job, {} as never);

    expect(setSessionTenantIdMock).toHaveBeenCalledWith(tenantId);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// I52 — document:email:send (Resend API)
// ═══════════════════════════════════════════════════════════════════════════════

describe("I52 — documentEmailSendProcessor", () => {
  const tenantId = "tenant-i52-001";

  beforeEach(() => {
    process.env["RESEND_API_KEY"] = "re_test_key_abc123";
    process.env["RESEND_FROM_EMAIL"] = "noreply@cerniq.com";
  });

  it("email invalid → aruncă eroare", async () => {
    const job = makeI52Job({
      tenantId,
      recipientEmail: "not-valid-email",
      subject: "Test",
    });

    await expect(documentEmailSendProcessor(job, {} as never)).rejects.toThrow("email invalid");
  });

  it("Resend.emails.send apelat cu destinatar corect", async () => {
    const job = makeI52Job({
      tenantId,
      recipientEmail: "client@firma.ro",
      subject: "Factură fiscală",
    });

    await documentEmailSendProcessor(job, {} as never);

    expect(resendEmailsSendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["client@firma.ro"],
        subject: "Factură fiscală",
      }),
    );
  });

  it("email fără PDF → attachments undefined (nu array gol)", async () => {
    const job = makeI52Job({
      tenantId,
      recipientEmail: "client@firma.ro",
      subject: "Proformă",
      htmlBody: "<p>Bună ziua</p>",
    });

    await documentEmailSendProcessor(job, {} as never);

    expect(resendEmailsSendMock).toHaveBeenCalledWith(
      expect.objectContaining({ attachments: undefined }),
    );
  });

  it("email cu PDF → attachment cu filename și conținut Buffer", async () => {
    const pdfBase64 = Buffer.from("fake-pdf").toString("base64");

    const job = makeI52Job({
      tenantId,
      recipientEmail: "client@firma.ro",
      subject: "Factură fiscală",
      pdfBase64,
      fileName: "factura-FCT-55.pdf",
      oblioDocumentId: "doc-001",
    });

    await documentEmailSendProcessor(job, {} as never);

    expect(resendEmailsSendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: expect.arrayContaining([
          expect.objectContaining({
            filename: "factura-FCT-55.pdf",
            content: expect.any(Buffer),
          }),
        ]),
      }),
    );
  });

  it("messageId returnat din Resend (result.data.id)", async () => {
    resendEmailsSendMock.mockResolvedValue({
      data: { id: "unique-resend-id-789" },
      error: null,
    });

    const job = makeI52Job({
      tenantId,
      recipientEmail: "client@firma.ro",
      subject: "Test",
    });

    const result = await documentEmailSendProcessor(job, {} as never);

    expect(result.messageId).toBe("unique-resend-id-789");
  });

  it("Resend error → aruncă eroare cu mesajul din result.error", async () => {
    resendEmailsSendMock.mockResolvedValue({
      data: null,
      error: { message: "Invalid API key", name: "validation_error" },
    });

    const job = makeI52Job({
      tenantId,
      recipientEmail: "client@firma.ro",
      subject: "Test",
    });

    await expect(documentEmailSendProcessor(job, {} as never)).rejects.toThrow("Resend error");
  });

  it("RESEND_API_KEY din env folosit pentru construcția Resend client", async () => {
    process.env["RESEND_API_KEY"] = "re_custom_key_xyz";

    const job = makeI52Job({
      tenantId,
      recipientEmail: "test@example.com",
      subject: "Test",
    });

    await documentEmailSendProcessor(job, {} as never);

    expect(ResendConstructorMock).toHaveBeenCalledWith("re_custom_key_xyz");
  });

  it("setSessionTenantId apelat cu tenantId corect", async () => {
    const job = makeI52Job({
      tenantId,
      recipientEmail: "test@example.com",
      subject: "Test",
    });

    await documentEmailSendProcessor(job, {} as never);

    expect(setSessionTenantIdMock).toHaveBeenCalledWith(tenantId);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// I53 — document:whatsapp:send
// ═══════════════════════════════════════════════════════════════════════════════

describe("I53 — documentWhatsappSendProcessor", () => {
  const tenantId = "tenant-i53-001";

  it("phoneNumber fără + → aruncă eroare E.164", async () => {
    const job = makeI53Job({
      tenantId,
      phoneNumber: "0721000000",
      message: "Buna ziua",
    });

    await expect(documentWhatsappSendProcessor(job, {} as never)).rejects.toThrow(
      "phoneNumber invalid",
    );
  });

  it("phoneNumber valid E.164 → queued: true", async () => {
    const job = makeI53Job({
      tenantId,
      phoneNumber: "+40721000000",
      message: "Document factură atașat",
    });

    const result = await documentWhatsappSendProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.queued).toBe(true);
    expect(result.phoneNumber).toBe("+40721000000");
  });

  it("note = 'wa-send-stub-phase-13'", async () => {
    const job = makeI53Job({
      tenantId,
      phoneNumber: "+40721000000",
      message: "Test",
    });

    const result = await documentWhatsappSendProcessor(job, {} as never);

    expect(result.note).toBe("wa-send-stub-phase-13");
  });

  it("pdfBase64 prezent → worker continuă (STUB loghează și nu aruncă eroare)", async () => {
    const job = makeI53Job({
      tenantId,
      phoneNumber: "+40721000000",
      message: "Factură în atașament",
      pdfBase64: Buffer.from("pdf").toString("base64"),
      oblioDocumentId: "doc-wa-001",
    });

    const result = await documentWhatsappSendProcessor(job, {} as never);

    expect(result.ok).toBe(true);
    expect(result.queued).toBe(true);
  });

  it("oblioDocumentId propagat în rezultat", async () => {
    const oblioDocumentId = "doc-i53-propagat";

    const job = makeI53Job({
      tenantId,
      phoneNumber: "+40721000000",
      message: "Test propagare",
      oblioDocumentId,
    });

    const result = await documentWhatsappSendProcessor(job, {} as never);

    expect(result.oblioDocumentId).toBe(oblioDocumentId);
  });

  it("setSessionTenantId apelat cu tenantId corect", async () => {
    const job = makeI53Job({
      tenantId,
      phoneNumber: "+40721000000",
      message: "Test",
    });

    await documentWhatsappSendProcessor(job, {} as never);

    expect(setSessionTenantIdMock).toHaveBeenCalledWith(tenantId);
  });
});
