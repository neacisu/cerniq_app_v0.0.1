import { beforeEach, describe, expect, it, vi } from "vitest";

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const SILVER_COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const GOLD_COMPANY_ID = "33333333-3333-4333-8333-333333333333";
const APPROVAL_TASK_ID = "44444444-4444-4444-8444-444444444444";
const COMPANY_B_ID = "55555555-5555-4555-8555-555555555555";

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("S3.PR8 integration - full pipeline Bronze -> Silver -> Gold", () => {
  it("promote-to-gold creeaza gold record din silver eligibil", async () => {
    const silverRow = {
      id: SILVER_COMPANY_ID,
      tenantId: TENANT_ID,
      cui: "12345678",
      denumire: "Agro SRL",
      statusFirma: "ACTIVA",
      codCaenPrincipal: "0111",
      adresa: "Cluj-Napoca",
      sourceBronzeId: GOLD_COMPANY_ID,
      promotionStatus: "eligible",
      totalQualityScore: "85",
      numarAngajati: 25,
      categorieRisc: "LOW",
      cifraAfaceri: "500000",
      profitNet: "75000",
      latitude: "46.77",
      longitude: "23.59",
      locationGeography: null,
      metadata: { agriculturalCrops: true },
    };

    const insertReturning = vi.fn(async () => [{ id: GOLD_COMPANY_ID }]);
    const onConflictDoNothing = vi.fn(() => ({ returning: insertReturning }));
    const insertValues = vi.fn(() => ({ onConflictDoNothing, returning: insertReturning }));
    const whereUpdate = vi.fn(async () => undefined);
    const setUpdate = vi.fn(() => ({ where: whereUpdate }));

    const dbMock = {
      query: {
        silverCompanies: { findFirst: vi.fn(async () => silverRow) },
        goldCompanies: { findFirst: vi.fn(async () => null) },
      },
      insert: vi.fn(() => ({ values: insertValues })),
      update: vi.fn(() => ({ set: setUpdate })),
    };

    vi.doMock("@cerniq/db", () => ({
      db: dbMock,
      setSessionTenantId: vi.fn(async () => undefined),
      goldCompanies: { id: "id", tenantId: "tenantId", silverId: "silverId" },
      silverCompanies: { id: "id" },
      silverEnrichmentLog: {},
      sql: (parts: TemplateStringsArray) => parts.join(""),
    }));
    vi.doMock("@cerniq/worker-shared", () => ({
      validateJobData: vi.fn(),
      goldCompaniesTotal: { inc: vi.fn() },
    }));

    const { promoteToGoldProcessor } = await import("./p2-promote-to-gold.js");
    const result = await promoteToGoldProcessor({
      id: "j-p2",
      data: { tenantId: TENANT_ID, companyId: SILVER_COMPANY_ID, correlationId: "corr-p2" },
    } as never);

    expect(dbMock.insert).toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        silverId: SILVER_COMPANY_ID,
        cui: "12345678",
      }),
    );
    expect(result).toMatchObject({ ok: true, status: "success", goldId: GOLD_COMPANY_ID });
  });
});

describe("S3.PR8 integration - dedup exact + fuzzy", () => {
  it("m1 gaseste duplicate exacte pe CUI", async () => {
    const companies = [
      {
        id: "c1",
        tenantId: "t1",
        cui: "12345678",
        denumire: "Firma A",
        email: "a@test.ro",
        telefon: "+40740111222",
        createdAt: new Date("2025-01-01"),
      },
      {
        id: "c2",
        tenantId: "t1",
        cui: "12345678",
        denumire: "Firma A SRL",
        email: "b@test.ro",
        telefon: "+40740333444",
        createdAt: new Date("2025-02-01"),
      },
    ];

    const whereUpdate = vi.fn(async () => undefined);
    const setUpdate = vi.fn(() => ({ where: whereUpdate }));
    const insertValues = vi.fn(async () => undefined);
    const onConflictDoNothing = vi.fn(() => ({ returning: vi.fn(async () => []) }));

    const dbMock = {
      query: {
        silverCompanies: {
          findFirst: vi.fn(async () => companies[0]),
          findMany: vi.fn(async () => companies.slice(1)),
        },
      },
      insert: vi.fn(() => ({ values: insertValues, onConflictDoNothing })),
      update: vi.fn(() => ({ set: setUpdate })),
    };

    vi.doMock("@cerniq/db", () => ({
      db: dbMock,
      setSessionTenantId: vi.fn(async () => undefined),
      silverCompanies: { id: "id", tenantId: "tenantId", cui: "cui" },
      silverDedupCandidates: {},
      silverEnrichmentLog: {},
      sql: (parts: TemplateStringsArray) => parts.join(""),
    }));

    const { dedupExactHashProcessor } = await import("./m1-dedup-exact-hash.js");
    const result = await dedupExactHashProcessor({
      id: "j-m1",
      data: { tenantId: "t1", companyId: "c1", correlationId: "corr-m1" },
    } as never);

    expect(dbMock.query.silverCompanies.findMany).toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true });
  });

  it("m2 gaseste duplicate fuzzy cu fuzzball", async () => {
    const company = {
      id: "c1",
      tenantId: "t1",
      cui: "12345678",
      denumire: "Agro Farm SRL",
      email: "office@agro.ro",
      telefon: "+40740111222",
      adresa: "Str. Libertatii 10",
      metadata: {},
    };
    const candidates = [
      {
        id: "c2",
        tenantId: "t1",
        cui: "87654321",
        denumire: "Agro Farm S.R.L.",
        email: "contact@agro.ro",
        telefon: "+40740111223",
        adresa: "Str. Libertatii 10",
        metadata: {},
      },
    ];

    const whereUpdate = vi.fn(async () => undefined);
    const setUpdate = vi.fn(() => ({ where: whereUpdate }));
    const insertValues = vi.fn(async () => undefined);

    const dbMock = {
      query: {
        silverCompanies: {
          findFirst: vi.fn(async () => company),
          findMany: vi.fn(async () => candidates),
        },
      },
      insert: vi.fn(() => ({ values: insertValues })),
      update: vi.fn(() => ({ set: setUpdate })),
    };

    vi.doMock("@cerniq/db", () => ({
      db: dbMock,
      setSessionTenantId: vi.fn(async () => undefined),
      silverCompanies: { id: "id", tenantId: "tenantId", cui: "cui", denumire: "denumire" },
      silverDedupCandidates: {},
      silverEnrichmentLog: {},
      sql: (parts: TemplateStringsArray) => parts.join(""),
    }));
    vi.doMock("./pipeline-utils.js", () => ({
      createHitlApprovalTask: vi.fn(async () => "approval-1"),
    }));

    const { dedupFuzzyMatchProcessor } = await import("./m2-dedup-fuzzy-match.js");
    const result = await dedupFuzzyMatchProcessor({
      id: "j-m2",
      data: { tenantId: "t1", companyId: "c1", correlationId: "corr-m2" },
    } as never);

    expect(dbMock.query.silverCompanies.findMany).toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true });
  });
});

describe("S3.PR8 integration - HITL decision flow", () => {
  it("decide approve pe dedup_review si reia pipeline", async () => {
    const addMock = vi.fn(async () => undefined);
    const patchMock = vi.fn(async () => undefined);
    const findFirst = vi.fn(async () => ({
      id: APPROVAL_TASK_ID,
      tenantId: TENANT_ID,
      entityId: SILVER_COMPANY_ID,
      status: "approved",
      decision: "approve",
      type: "dedup_review",
      approvalType: "dedup_review",
      metadata: { companyA: SILVER_COMPANY_ID, companyB: COMPANY_B_ID },
      decisionMetadata: { action: "merge" },
      createdAt: new Date(),
      decidedAt: new Date(),
    }));
    const where = vi.fn(async () => undefined);
    const set = vi.fn(() => ({ where }));

    vi.doMock("./pipeline-utils.js", () => ({
      addQueueJob: addMock,
      patchCompanyMetadata: patchMock,
    }));
    vi.doMock("@cerniq/worker-shared", () => ({
      validateJobData: vi.fn(),
      hitlTasksResolvedTotal: { inc: vi.fn() },
      hitlResolutionTimeSeconds: { observe: vi.fn() },
      createQueue: vi.fn(() => ({
        add: vi.fn(async () => undefined),
        close: vi.fn(async () => undefined),
      })),
    }));
    vi.doMock("@cerniq/db", () => ({
      db: {
        query: { approvalTasks: { findFirst } },
        update: vi.fn(() => ({ set })),
      },
      setSessionTenantId: vi.fn(async () => undefined),
      approvalTasks: { tenantId: "tenantId", id: "id" },
      silverCompanies: { id: "id", metadata: "metadata" },
      silverDedupCandidates: {
        tenantId: "tenantId",
        companyAId: "companyAId",
        companyBId: "companyBId",
        metadata: "metadata",
      },
      sql: (parts: TemplateStringsArray) => parts.join(""),
    }));

    const { hitlResumeAfterApprovalProcessor } = await import("./hitl-resume-after-approval.js");
    const result = await hitlResumeAfterApprovalProcessor({
      id: "job-hitl-resume-dedup",
      data: { tenantId: TENANT_ID, approvalTaskId: APPROVAL_TASK_ID, correlationId: "corr-3" },
    } as never);

    expect(findFirst).toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, status: "success", handled: "dedup_review" });
  });
});

describe("S3.PR2 integration - Email pattern", () => {
  it("g4 detecteaza pattern si actualizeaza compania", async () => {
    const where = vi.fn(async () => undefined);
    const set = vi.fn(() => ({ where }));
    const values = vi.fn(async () => undefined);

    const dbMock = {
      query: {
        silverContacts: {
          findMany: vi.fn(async () => [
            { email: "ana.popescu@firma.ro", prenume: "Ana", nume: "Popescu" },
            { email: "ion.ionescu@firma.ro", prenume: "Ion", nume: "Ionescu" },
            { email: "mara.georgescu@firma.ro", prenume: "Mara", nume: "Georgescu" },
          ]),
        },
      },
      update: vi.fn(() => ({ set })),
      insert: vi.fn(() => ({ values })),
    };

    vi.doMock("@cerniq/db", () => ({
      db: dbMock,
      setSessionTenantId: vi.fn(async () => undefined),
      silverCompanies: { id: "id", metadata: "metadata" },
      silverEnrichmentLog: {},
      sql: (parts: TemplateStringsArray) => parts.join(""),
    }));

    const { emailPatternProcessor } = await import("./g4-email-pattern.js");
    const result = await emailPatternProcessor({
      id: "job-g4",
      data: { tenantId: "t1", companyId: "c1", domain: "firma.ro", correlationId: "corr-1" },
    } as never);

    expect(dbMock.query.silverContacts.findMany).toHaveBeenCalled();
    expect(dbMock.update).toHaveBeenCalled();
    expect(dbMock.insert).toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, status: "success", pattern: "{first}.{last}" });
  });
});

describe("S3.PR2 integration - Carrier detection", () => {
  it("h3 detecteaza operatorul si scrie metadata", async () => {
    const where = vi.fn(async () => undefined);
    const set = vi.fn(() => ({ where }));
    const values = vi.fn(async () => undefined);

    const dbMock = {
      update: vi.fn(() => ({ set })),
      insert: vi.fn(() => ({ values })),
    };

    vi.doMock("@cerniq/db", () => ({
      db: dbMock,
      setSessionTenantId: vi.fn(async () => undefined),
      silverContacts: { id: "id", metadata: "metadata" },
      silverCompanies: { id: "id", metadata: "metadata" },
      silverEnrichmentLog: {},
      sql: (parts: TemplateStringsArray) => parts.join(""),
    }));

    const { carrierDetectionProcessor } = await import("./h3-carrier-detection.js");
    const result = await carrierDetectionProcessor({
      id: "job-h3",
      data: {
        tenantId: "t1",
        entityType: "contact",
        entityId: "ct-1",
        phone: "+40740111222",
        correlationId: "corr-2",
      },
    } as never);

    expect(dbMock.update).toHaveBeenCalled();
    expect(dbMock.insert).toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: true,
      status: "success",
      carrier: "Orange",
      phoneType: "MOBILE",
    });
  });
});
