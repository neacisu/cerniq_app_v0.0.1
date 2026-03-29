import { describe, expect, it, vi, beforeEach } from "vitest";

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const COMPANY_ID = "22222222-2222-4222-8222-222222222222";

function createFullAnafV9Record(overrides: Record<string, unknown> = {}) {
  return {
    date_generale: {
      cui: 12345678,
      denumire: "Agro Test SRL",
      adresa: "Str. Cluj Nr. 10, Cluj-Napoca",
      stare_inregistrare: "INREGISTRAT",
      cod_CAEN: "0111",
      nrRegCom: "J09/98/2003",
      data: "2024-01-01",
      telefon: "0264-123456",
      fax: "",
      codPostal: "400001",
      act: "",
      data_inregistrare: "2003-05-01",
      iban: "",
      statusRO_e_Factura: true,
      organFiscalCompetent: "AJFP Cluj",
      forma_de_proprietate: "PRIVAT",
      forma_organizare: "SRL",
      forma_juridica: "SRL",
      ...(overrides.date_generale as Record<string, unknown>),
    },
    inregistrare_scop_Tva: {
      scpTVA: true,
      perioade_TVA: [
        {
          data_inceput_ScpTVA: "2003-07-01",
          data_sfarsit_ScpTVA: "",
          data_anul_imp_ScpTVA: "2003",
          mesaj_ScpTVA: "platitor TVA",
        },
      ],
      ...(overrides.inregistrare_scop_Tva as Record<string, unknown>),
    },
    inregistrare_RTVAI: {
      dataInceputTvaInc: "",
      dataSfarsitTvaInc: "",
      dataActualizareTvaInc: "",
      dataPublicareTvaInc: "",
      tipActTvaInc: "",
      statusTvaIncasare: false,
      ...(overrides.inregistrare_RTVAI as Record<string, unknown>),
    },
    stare_inactiv: {
      dataInactivare: "",
      dataReactivare: "",
      dataPublicare: "",
      dataRadiere: "",
      statusInactivi: false,
      ...(overrides.stare_inactiv as Record<string, unknown>),
    },
    inregistrare_SplitTVA: {
      dataInceputSplitTVA: "",
      dataAnulareSplitTVA: "",
      statusSplitTVA: false,
      ...(overrides.inregistrare_SplitTVA as Record<string, unknown>),
    },
    adresa_sediu_social: overrides.adresa_sediu_social ?? {},
    adresa_domiciliu_fiscal: overrides.adresa_domiciliu_fiscal ?? {},
  };
}

function createDbMock() {
  const returning = vi.fn(async () => [{ sources: ["anaf_fiscal"] }]);
  const setValues = vi.fn((_values: Record<string, unknown>) => ({
    where: vi.fn(() => ({ returning })),
  }));
  return {
    update: vi.fn(() => ({ set: setValues })),
    insert: vi.fn(() => ({ values: vi.fn(async () => undefined) })),
    _setValues: setValues,
  };
}

function mockDbModule(dbMock: ReturnType<typeof createDbMock>) {
  vi.doMock("@cerniq/db", () => ({
    db: dbMock,
    silverCompanies: {
      id: "id",
      metadata: "metadata",
      tenantId: "tenantId",
      enrichmentSourcesCompleted: "enrichmentSourcesCompleted",
    },
    silverEnrichmentLog: {},
    setSessionTenantId: vi.fn(async () => undefined),
    upsertCompanyIdentityKey: vi.fn(async () => undefined),
    sql: (parts: TemplateStringsArray, ...values: unknown[]) =>
      parts.map((p, i) => `${p}${values[i] ?? ""}`).join(""),
  }));
}

function mockWorkerShared() {
  vi.doMock("@cerniq/worker-shared", () => ({
    sanitizeCui: vi.fn((v: string) =>
      v.toUpperCase().trim().replace(/^RO/, "").replaceAll(/\D/g, ""),
    ),
    sanitizeNrRegCom: vi.fn((v: string) => v || null),
    createCircuitBreaker: vi.fn((fn: (...a: unknown[]) => unknown) => ({
      fire: (...args: unknown[]) => fn(...args),
      on: vi.fn(),
    })),
    withExternalApiMetrics: vi.fn(async (_p: string, fn: () => unknown) => fn()),
    withCognitiveSpan: vi.fn(async (_name: string, fn: (s: null) => unknown) => fn(null)),
    importMutationTotal: { inc: vi.fn() },
  }));
}

function mockEnrichmentCompletion() {
  vi.doMock("../lib/enrichment-completion.js", () => ({
    markEnrichmentSourceComplete: vi.fn(async () => ({ allComplete: false, completedSources: [] })),
  }));
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("d1-anaf-fiscal: v9 hierarchical field extraction", () => {
  it("extracts denumire, adresa, statusFirma from date_generale", async () => {
    const dbMock = createDbMock();
    mockDbModule(dbMock);
    mockWorkerShared();

    vi.doMock("../lib/anaf-api-client.js", () => ({
      fetchAnafSingleByCui: vi.fn(async () => createFullAnafV9Record()),
    }));
    mockEnrichmentCompletion();

    const { anafFiscalProcessor } = await import("./d1-anaf-fiscal.js");
    const result = await anafFiscalProcessor({
      id: "j1",
      data: { tenantId: TENANT_ID, companyId: COMPANY_ID, cui: "RO12345678" },
    } as never);

    expect(result).toMatchObject({ ok: true, status: "success", source: "anaf_fiscal" });
    expect(dbMock.update).toHaveBeenCalled();
    const setCall = dbMock._setValues.mock.calls[0]?.[0];
    expect(setCall).toHaveProperty("denumire", "Agro Test SRL");
    expect(setCall).toHaveProperty("adresa", "Str. Cluj Nr. 10, Cluj-Napoca");
    expect(setCall).toHaveProperty("statusFirma", "ACTIVA");
  });

  it("does NOT write codCaenPrincipal (that is d5's job)", async () => {
    const dbMock = createDbMock();
    mockDbModule(dbMock);
    mockWorkerShared();

    vi.doMock("../lib/anaf-api-client.js", () => ({
      fetchAnafSingleByCui: vi.fn(async () => createFullAnafV9Record()),
    }));
    mockEnrichmentCompletion();

    const { anafFiscalProcessor } = await import("./d1-anaf-fiscal.js");
    await anafFiscalProcessor({
      id: "j1",
      data: { tenantId: TENANT_ID, companyId: COMPANY_ID, cui: "12345678" },
    } as never);

    const setCall = dbMock._setValues.mock.calls[0]?.[0];
    expect(setCall).not.toHaveProperty("codCaenPrincipal");
  });

  it("maps RADIATA status correctly", async () => {
    const dbMock = createDbMock();
    mockDbModule(dbMock);
    mockWorkerShared();

    vi.doMock("../lib/anaf-api-client.js", () => ({
      fetchAnafSingleByCui: vi.fn(async () =>
        createFullAnafV9Record({
          date_generale: { stare_inregistrare: "RADIAT DIN DATA 2020-01-01" },
        }),
      ),
    }));
    mockEnrichmentCompletion();

    const { anafFiscalProcessor } = await import("./d1-anaf-fiscal.js");
    await anafFiscalProcessor({
      id: "j1",
      data: { tenantId: TENANT_ID, companyId: COMPANY_ID, cui: "12345678" },
    } as never);

    const setCall = dbMock._setValues.mock.calls[0]?.[0];
    expect(setCall).toHaveProperty("statusFirma", "RADIATA");
  });
});

describe("d2-anaf-tva: extracts TVA from v9 structure", () => {
  it("extracts scpTVA from inregistrare_scop_Tva", async () => {
    const dbMock = createDbMock();
    mockDbModule(dbMock);
    mockWorkerShared();

    vi.doMock("../lib/anaf-api-client.js", () => ({
      fetchAnafSingleByCui: vi.fn(async () =>
        createFullAnafV9Record({
          inregistrare_scop_Tva: { scpTVA: true, perioade_TVA: [] },
        }),
      ),
    }));
    mockEnrichmentCompletion();

    const { anafTvaProcessor } = await import("./d2-anaf-tva.js");
    const result = await anafTvaProcessor({
      id: "j1",
      data: { tenantId: TENANT_ID, companyId: COMPANY_ID, cui: "12345678" },
    } as never);

    expect(result).toMatchObject({
      ok: true,
      status: "success",
      source: "anaf_tva",
      tvaActive: true,
    });
  });
});

describe("d3-anaf-efactura: early return when record is null", () => {
  it("returns not_found and does not update when ANAF returns null", async () => {
    const dbMock = createDbMock();
    mockDbModule(dbMock);
    mockWorkerShared();

    vi.doMock("../lib/anaf-api-client.js", () => ({
      fetchAnafSingleByCui: vi.fn(async () => null),
    }));
    mockEnrichmentCompletion();

    const { anafEfacturaProcessor } = await import("./d3-anaf-efactura.js");
    const result = await anafEfacturaProcessor({
      id: "j1",
      data: { tenantId: TENANT_ID, companyId: COMPANY_ID, cui: "12345678" },
    } as never);

    expect(result).toMatchObject({ ok: true, status: "not_found", source: "anaf_efactura" });
    expect(dbMock.update).not.toHaveBeenCalled();
  });

  it("extracts statusRO_e_Factura from date_generale", async () => {
    const dbMock = createDbMock();
    mockDbModule(dbMock);
    mockWorkerShared();

    vi.doMock("../lib/anaf-api-client.js", () => ({
      fetchAnafSingleByCui: vi.fn(async () =>
        createFullAnafV9Record({ date_generale: { statusRO_e_Factura: true } }),
      ),
    }));
    mockEnrichmentCompletion();

    const { anafEfacturaProcessor } = await import("./d3-anaf-efactura.js");
    const result = await anafEfacturaProcessor({
      id: "j1",
      data: { tenantId: TENANT_ID, companyId: COMPANY_ID, cui: "12345678" },
    } as never);

    expect(result).toMatchObject({
      ok: true,
      status: "success",
      source: "anaf_efactura",
      inregistratEFactura: true,
    });
  });
});

describe("d4-anaf-datorii: extracts stare_inactiv data", () => {
  it("extracts statusInactivi from stare_inactiv", async () => {
    const dbMock = createDbMock();
    mockDbModule(dbMock);
    mockWorkerShared();

    vi.doMock("../lib/anaf-api-client.js", () => ({
      fetchAnafSingleByCui: vi.fn(async () =>
        createFullAnafV9Record({
          stare_inactiv: {
            statusInactivi: true,
            dataInactivare: "2020-01-01",
            dataReactivare: "",
            dataPublicare: "",
            dataRadiere: "",
          },
        }),
      ),
    }));
    mockEnrichmentCompletion();

    const { anafDatoriiProcessor } = await import("./d4-anaf-datorii.js");
    const result = await anafDatoriiProcessor({
      id: "j1",
      data: { tenantId: TENANT_ID, companyId: COMPANY_ID, cui: "12345678" },
    } as never);

    expect(result).toMatchObject({ ok: true, status: "success", source: "anaf_datorii" });
    const setCall = dbMock._setValues.mock.calls[0]?.[0];
    expect(setCall).toHaveProperty("statusFirma", "INACTIVA");
  });
});

describe("d5-anaf-caen: writes codCaenPrincipal", () => {
  it("extracts cod_CAEN from date_generale and writes codCaenPrincipal", async () => {
    const dbMock = createDbMock();
    mockDbModule(dbMock);
    mockWorkerShared();

    vi.doMock("../lib/anaf-api-client.js", () => ({
      fetchAnafSingleByCui: vi.fn(async () =>
        createFullAnafV9Record({ date_generale: { cod_CAEN: "0111" } }),
      ),
    }));
    mockEnrichmentCompletion();

    const { anafCaenProcessor } = await import("./d5-anaf-caen.js");
    const result = await anafCaenProcessor({
      id: "j1",
      data: { tenantId: TENANT_ID, companyId: COMPANY_ID, cui: "12345678" },
    } as never);

    expect(result).toMatchObject({
      ok: true,
      status: "success",
      source: "anaf_caen",
      codCaenPrincipal: "0111",
      isAgricultural: true,
    });
    const setCall = dbMock._setValues.mock.calls[0]?.[0];
    expect(setCall).toHaveProperty("codCaenPrincipal", "0111");
  });

  it("early return when ANAF record is null", async () => {
    const dbMock = createDbMock();
    mockDbModule(dbMock);
    mockWorkerShared();

    vi.doMock("../lib/anaf-api-client.js", () => ({
      fetchAnafSingleByCui: vi.fn(async () => null),
    }));
    mockEnrichmentCompletion();

    const { anafCaenProcessor } = await import("./d5-anaf-caen.js");
    const result = await anafCaenProcessor({
      id: "j1",
      data: { tenantId: TENANT_ID, companyId: COMPANY_ID, cui: "12345678" },
    } as never);

    expect(result).toMatchObject({ ok: true, status: "not_found", source: "anaf_caen" });
    expect(dbMock.update).not.toHaveBeenCalled();
  });
});
