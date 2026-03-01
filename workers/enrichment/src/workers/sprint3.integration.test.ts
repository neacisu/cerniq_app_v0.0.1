import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("S3.PR8 integration - full pipeline Bronze -> Silver -> Gold", () => {
  it("promote-to-gold creeaza gold record din silver eligibil", async () => {
    const silverRow = {
      id: "s1",
      tenantId: "t1",
      cui: "12345678",
      denumire: "Agro SRL",
      statusFirma: "ACTIVA",
      codCaenPrincipal: "0111",
      adresa: "Cluj-Napoca",
      sourceBronzeId: "b1",
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

    const insertReturning = vi.fn(async () => [{ id: "g1" }]);
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

    const { promoteToGoldProcessor } = await import("./p2-promote-to-gold.js");
    const result = await promoteToGoldProcessor({
      id: "j-p2",
      data: { tenantId: "t1", companyId: "s1", correlationId: "corr-p2" },
    } as never);

    expect(dbMock.insert).toHaveBeenCalled();
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "t1",
        silverId: "s1",
        cui: "12345678",
      }),
    );
    expect(result).toMatchObject({ ok: true, status: "success", goldId: "g1" });
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
      id: "a1",
      tenantId: "t1",
      entityId: "c1",
      status: "approved",
      decision: "approve",
      type: "dedup_review",
      approvalType: "dedup_review",
      metadata: { companyA: "c1", companyB: "c2" },
      decisionMetadata: { action: "merge" },
      decidedAt: new Date(),
    }));
    const where = vi.fn(async () => undefined);
    const set = vi.fn(() => ({ where }));

    vi.doMock("./pipeline-utils.js", () => ({
      addQueueJob: addMock,
      patchCompanyMetadata: patchMock,
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
      data: { tenantId: "t1", approvalTaskId: "a1", correlationId: "corr-3" },
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
