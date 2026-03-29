import { describe, it, expect, vi, beforeEach } from "vitest";

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const VALID_CUI = "12345678";

// ── Redis proxy — vi.mock (hoisted) delegates to this mutable object ──────────

type MockFn = (...args: unknown[]) => unknown;

interface RedisMockLike {
  get: MockFn;
  setex: MockFn;
  on: MockFn;
  // vitest spy handle so we can read .mock.calls in assertions
  _spies: {
    get: ReturnType<typeof vi.fn>;
    setex: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
  };
}

function buildRedisMock(cachedValue: string | null = null): RedisMockLike {
  const getSpy = vi.fn(async () => cachedValue);
  const setexSpy = vi.fn(async () => "OK");
  const onSpy = vi.fn();
  return {
    get: getSpy as unknown as MockFn,
    setex: setexSpy as unknown as MockFn,
    on: onSpy as unknown as MockFn,
    _spies: { get: getSpy, setex: setexSpy, on: onSpy },
  };
}

let _activeRedisMock: RedisMockLike = buildRedisMock(null);

// Hoisted — vitest processes this before any imports in the file.
// The class delegates every call to _activeRedisMock so individual tests
// can swap _activeRedisMock without re-registering a mock.
vi.mock("ioredis", () => ({
  default: class MockIORedis {
    on(...args: unknown[]) {
      return _activeRedisMock.on(...args);
    }
    get(...args: unknown[]) {
      return _activeRedisMock.get(...args);
    }
    setex(...args: unknown[]) {
      return _activeRedisMock.setex(...args);
    }
  },
}));

function setRedisMock(cachedValue: string | null = null) {
  _activeRedisMock = buildRedisMock(cachedValue);
}

// ── ANAF V9 fixture ───────────────────────────────────────────────────────────

function createFullAnafRecord(overrides: Record<string, unknown> = {}) {
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
      perioade_TVA: [{ data_inceput_ScpTVA: "2003-07-01", data_sfarsit_ScpTVA: "" }],
      ...(overrides.inregistrare_scop_Tva as Record<string, unknown>),
    },
    inregistrare_RTVAI: {
      statusTvaIncasare: false,
      ...(overrides.inregistrare_RTVAI as Record<string, unknown>),
    },
    ...(overrides.stare_insolv === undefined ? {} : { stare_insolv: overrides.stare_insolv }),
    ...(overrides.stare_inactivi === undefined ? {} : { stare_inactivi: overrides.stare_inactivi }),
    ...(overrides.inregistrare_RO_e_Factura === undefined
      ? {}
      : { inregistrare_RO_e_Factura: overrides.inregistrare_RO_e_Factura }),
  };
}

// ── DB mock factory ───────────────────────────────────────────────────────────

function createDbMock() {
  const whereFn = vi.fn(async () => undefined);
  const setFn = vi.fn((_values: Record<string, unknown>) => ({ where: whereFn }));
  const updateFn = vi.fn(() => ({ set: setFn }));
  const insertValuesFn = vi.fn(async () => undefined);
  const insertFn = vi.fn(() => ({ values: insertValuesFn }));
  return { update: updateFn, insert: insertFn, _setFn: setFn, _insertValues: insertValuesFn };
}

// ── Module mocking helpers ────────────────────────────────────────────────────

function mockDb(dbMock: ReturnType<typeof createDbMock>) {
  vi.doMock("@cerniq/db", () => ({
    db: dbMock,
    silverCompanies: { id: "id", metadata: "metadata" },
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
    importMutationTotal: { inc: vi.fn() },
    getRedisConnectionOptions: vi.fn(() => ({ host: "localhost", port: 6379 })),
    withCognitiveSpan: vi.fn(async (_name: string, fn: (s: null) => unknown) => fn(null)),
  }));
}

function mockAnafClient(record: unknown) {
  vi.doMock("../lib/anaf-api-client.js", () => ({
    fetchAnafSingleByCui: vi.fn(async () => record),
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
  setRedisMock(null);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("d0-anaf-full-fetch: cache MISS — live ANAF call", () => {
  it("performs a single UPDATE with all d1-d5 fields on a valid record", async () => {
    const dbMock = createDbMock();
    setRedisMock(null);
    mockDb(dbMock);
    mockWorkerShared();
    mockAnafClient(createFullAnafRecord());
    mockEnrichmentCompletion();

    const { anafFullFetchProcessor } = await import("./d0-anaf-full-fetch.js");
    const result = await anafFullFetchProcessor({
      id: "j1",
      data: { tenantId: TENANT_ID, companyId: COMPANY_ID, cui: VALID_CUI },
    } as never);

    expect(result).toMatchObject({
      ok: true,
      status: "success",
      source: "anaf_full",
      statusFirma: "ACTIVA",
      tvaActive: true,
      efacturaStatus: true,
      codCaenPrincipal: "0111",
      isAgricultural: true,
    });
    expect(dbMock.update).toHaveBeenCalledTimes(1);
  });

  it("stores result in Redis cache after live fetch", async () => {
    const dbMock = createDbMock();
    setRedisMock(null);
    mockDb(dbMock);
    mockWorkerShared();
    mockAnafClient(createFullAnafRecord());
    mockEnrichmentCompletion();

    const { anafFullFetchProcessor } = await import("./d0-anaf-full-fetch.js");
    await anafFullFetchProcessor({
      id: "j1",
      data: { tenantId: TENANT_ID, companyId: COMPANY_ID, cui: VALID_CUI },
    } as never);

    expect(_activeRedisMock._spies.setex).toHaveBeenCalledWith(
      `anaf:cache:${TENANT_ID}:${VALID_CUI}`,
      300,
      expect.any(String),
    );
    const cachedJson = (_activeRedisMock._spies.setex.mock.calls[0]?.[2] as string) ?? "";
    expect(() => JSON.parse(cachedJson)).not.toThrow();
  });

  it("increments importMutationTotal after successful update", async () => {
    const dbMock = createDbMock();
    setRedisMock(null);
    mockDb(dbMock);
    const incMock = vi.fn();
    vi.doMock("@cerniq/worker-shared", () => ({
      sanitizeCui: vi.fn((v: string) => v.replaceAll(/\D/g, "")),
      sanitizeNrRegCom: vi.fn((v: string) => v || null),
      importMutationTotal: { inc: incMock },
      getRedisConnectionOptions: vi.fn(() => ({})),
      withCognitiveSpan: vi.fn(async (_name: string, fn: (s: null) => unknown) => fn(null)),
    }));
    mockAnafClient(createFullAnafRecord());
    mockEnrichmentCompletion();

    const { anafFullFetchProcessor } = await import("./d0-anaf-full-fetch.js");
    await anafFullFetchProcessor({
      id: "j1",
      data: { tenantId: TENANT_ID, companyId: COMPANY_ID, cui: VALID_CUI },
    } as never);

    expect(incMock).toHaveBeenCalledWith({
      operation: "update",
      table: "silver_companies",
      tenant_id: TENANT_ID,
    });
  });

  it("marks all 5 ANAF sources complete on success", async () => {
    const dbMock = createDbMock();
    setRedisMock(null);
    mockDb(dbMock);
    mockWorkerShared();
    mockAnafClient(createFullAnafRecord());
    const markComplete = vi.fn(async () => ({ allComplete: false, completedSources: [] }));
    vi.doMock("../lib/enrichment-completion.js", () => ({
      markEnrichmentSourceComplete: markComplete,
    }));

    const { anafFullFetchProcessor } = await import("./d0-anaf-full-fetch.js");
    await anafFullFetchProcessor({
      id: "j1",
      data: { tenantId: TENANT_ID, companyId: COMPANY_ID, cui: VALID_CUI },
    } as never);

    const calledSources = (markComplete.mock.calls as unknown as string[][]).map((c) => c[2]);
    expect(calledSources).toContain("anaf_fiscal");
    expect(calledSources).toContain("anaf_tva");
    expect(calledSources).toContain("anaf_efactura");
    expect(calledSources).toContain("anaf_datorii");
    expect(calledSources).toContain("anaf_caen");
    expect(markComplete).toHaveBeenCalledTimes(5);
  });

  it("writes silverEnrichmentLog with source=anaf_full", async () => {
    const dbMock = createDbMock();
    setRedisMock(null);
    mockDb(dbMock);
    mockWorkerShared();
    mockAnafClient(createFullAnafRecord());
    mockEnrichmentCompletion();

    const { anafFullFetchProcessor } = await import("./d0-anaf-full-fetch.js");
    await anafFullFetchProcessor({
      id: "j1",
      data: { tenantId: TENANT_ID, companyId: COMPANY_ID, cui: VALID_CUI },
    } as never);

    expect(dbMock.insert).toHaveBeenCalled();
    const logEntry = ((dbMock._insertValues.mock.calls as unknown as unknown[][])[0]?.[0] ??
      {}) as Record<string, unknown>;
    expect(logEntry).toMatchObject({
      tenantId: TENANT_ID,
      entityType: "company",
      entityId: COMPANY_ID,
      source: "anaf_full",
      operation: "fetch",
    });
  });
});

describe("d0-anaf-full-fetch: cache HIT — no ANAF call", () => {
  it("skips fetchAnafSingleByCui when cache contains a valid record", async () => {
    const dbMock = createDbMock();
    const cachedRecord = createFullAnafRecord({ date_generale: { cod_CAEN: "0112" } });
    setRedisMock(JSON.stringify(cachedRecord));
    mockDb(dbMock);
    mockWorkerShared();

    const fetchFn = vi.fn(async () => createFullAnafRecord());
    vi.doMock("../lib/anaf-api-client.js", () => ({ fetchAnafSingleByCui: fetchFn }));
    mockEnrichmentCompletion();

    const { anafFullFetchProcessor } = await import("./d0-anaf-full-fetch.js");
    const result = await anafFullFetchProcessor({
      id: "j2",
      data: { tenantId: TENANT_ID, companyId: COMPANY_ID, cui: VALID_CUI },
    } as never);

    expect(fetchFn).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, status: "success", codCaenPrincipal: "0112" });
  });

  it("returns not_found without DB update when cache stores NOT_FOUND sentinel", async () => {
    const dbMock = createDbMock();
    setRedisMock("NOT_FOUND");
    mockDb(dbMock);
    mockWorkerShared();
    const fetchFn = vi.fn(async () => createFullAnafRecord());
    vi.doMock("../lib/anaf-api-client.js", () => ({ fetchAnafSingleByCui: fetchFn }));
    mockEnrichmentCompletion();

    const { anafFullFetchProcessor } = await import("./d0-anaf-full-fetch.js");
    const result = await anafFullFetchProcessor({
      id: "j3",
      data: { tenantId: TENANT_ID, companyId: COMPANY_ID, cui: VALID_CUI },
    } as never);

    expect(fetchFn).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, status: "not_found" });
    expect(dbMock.update).not.toHaveBeenCalled();
  });
});

describe("d0-anaf-full-fetch: ANAF returns null (CUI invalid/unfound)", () => {
  it("does not UPDATE silverCompanies when record is null", async () => {
    const dbMock = createDbMock();
    setRedisMock(null);
    mockDb(dbMock);
    mockWorkerShared();
    mockAnafClient(null);
    const markComplete = vi.fn(async () => ({ allComplete: false, completedSources: [] }));
    vi.doMock("../lib/enrichment-completion.js", () => ({
      markEnrichmentSourceComplete: markComplete,
    }));

    const { anafFullFetchProcessor } = await import("./d0-anaf-full-fetch.js");
    const result = await anafFullFetchProcessor({
      id: "j4",
      data: { tenantId: TENANT_ID, companyId: COMPANY_ID, cui: "99999999" },
    } as never);

    expect(result).toMatchObject({ ok: true, status: "not_found", source: "anaf_full" });
    expect(dbMock.update).not.toHaveBeenCalled();
    expect(markComplete).toHaveBeenCalledTimes(5);
    expect(_activeRedisMock._spies.setex).toHaveBeenCalledWith(
      expect.stringContaining("anaf:cache:"),
      300,
      "NOT_FOUND",
    );
  });

  it("writes a silverEnrichmentLog entry even on not_found", async () => {
    const dbMock = createDbMock();
    setRedisMock(null);
    mockDb(dbMock);
    mockWorkerShared();
    mockAnafClient(null);
    mockEnrichmentCompletion();

    const { anafFullFetchProcessor } = await import("./d0-anaf-full-fetch.js");
    await anafFullFetchProcessor({
      id: "j4b",
      data: { tenantId: TENANT_ID, companyId: COMPANY_ID, cui: "99999999" },
    } as never);

    expect(dbMock.insert).toHaveBeenCalled();
    const logEntry = ((dbMock._insertValues.mock.calls as unknown as unknown[][])[0]?.[0] ??
      {}) as Record<string, unknown>;
    expect(logEntry).toMatchObject({ source: "anaf_full", responsePayload: null });
  });
});

describe("d0-anaf-full-fetch: partial ANAF record (some fields missing)", () => {
  it("handles missing TVA info gracefully (null fallbacks)", async () => {
    const dbMock = createDbMock();
    setRedisMock(null);
    mockDb(dbMock);
    mockWorkerShared();
    const partialRecord = {
      date_generale: {
        cui: 12345678,
        denumire: "Partial SRL",
        adresa: "Bucuresti",
        stare_inregistrare: "INREGISTRAT",
        cod_CAEN: "4711",
        nrRegCom: "",
        statusRO_e_Factura: false,
      },
    };
    mockAnafClient(partialRecord);
    mockEnrichmentCompletion();

    const { anafFullFetchProcessor } = await import("./d0-anaf-full-fetch.js");
    const result = await anafFullFetchProcessor({
      id: "j5",
      data: { tenantId: TENANT_ID, companyId: COMPANY_ID, cui: VALID_CUI },
    } as never);

    expect(result).toMatchObject({ ok: true, status: "success" });
    expect(dbMock.update).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ tvaActive: null, efacturaStatus: false });
  });

  it("handles non-agricultural CAEN code correctly", async () => {
    const dbMock = createDbMock();
    setRedisMock(null);
    mockDb(dbMock);
    mockWorkerShared();
    mockAnafClient(createFullAnafRecord({ date_generale: { cod_CAEN: "6201" } }));
    mockEnrichmentCompletion();

    const { anafFullFetchProcessor } = await import("./d0-anaf-full-fetch.js");
    const result = await anafFullFetchProcessor({
      id: "j6",
      data: { tenantId: TENANT_ID, companyId: COMPANY_ID, cui: VALID_CUI },
    } as never);

    expect(result).toMatchObject({ isAgricultural: false, codCaenPrincipal: "6201" });
  });
});

describe("d0-anaf-full-fetch: RADIATA / INACTIVA / INSOLVENTA status mapping", () => {
  it.each([
    ["RADIAT DIN 2020", "RADIATA"],
    ["INACTIV", "INACTIVA"],
    ["IN INSOLVENTA", "INSOLVENTA"],
    ["DIZOLVATA", "DIZOLVARE"],
    ["INREGISTRAT", "ACTIVA"],
  ])("maps '%s' stare_inregistrare to statusFirma='%s'", async (stare, expected) => {
    const dbMock = createDbMock();
    setRedisMock(null);
    mockDb(dbMock);
    mockWorkerShared();
    mockAnafClient(createFullAnafRecord({ date_generale: { stare_inregistrare: stare } }));
    mockEnrichmentCompletion();

    const { anafFullFetchProcessor } = await import("./d0-anaf-full-fetch.js");
    const result = await anafFullFetchProcessor({
      id: "jmap",
      data: { tenantId: TENANT_ID, companyId: COMPANY_ID, cui: VALID_CUI },
    } as never);

    expect(result).toMatchObject({ statusFirma: expected });
  });
});

describe("d0-anaf-full-fetch: Redis cache failure is non-fatal", () => {
  it("proceeds with live ANAF fetch when Redis GET throws", async () => {
    const dbMock = createDbMock();
    const getSpy = vi.fn(async (): Promise<string | null> => {
      throw new Error("Redis ECONNREFUSED");
    });
    const setexSpy = vi.fn(async () => "OK");
    const onSpy = vi.fn();
    _activeRedisMock = {
      get: getSpy as unknown as MockFn,
      setex: setexSpy as unknown as MockFn,
      on: onSpy as unknown as MockFn,
      _spies: { get: getSpy, setex: setexSpy, on: onSpy },
    };
    mockDb(dbMock);
    mockWorkerShared();
    mockAnafClient(createFullAnafRecord());
    mockEnrichmentCompletion();

    const { anafFullFetchProcessor } = await import("./d0-anaf-full-fetch.js");
    const result = await anafFullFetchProcessor({
      id: "j7",
      data: { tenantId: TENANT_ID, companyId: COMPANY_ID, cui: VALID_CUI },
    } as never);

    expect(result).toMatchObject({ ok: true, status: "success" });
    expect(dbMock.update).toHaveBeenCalledTimes(1);
  });

  it("proceeds with DB update when Redis SETEX throws (cache write non-fatal)", async () => {
    const dbMock = createDbMock();
    const getSpy = vi.fn(async (): Promise<string | null> => null);
    const setexSpy = vi.fn(async () => {
      throw new Error("Redis OOM");
    });
    const onSpy = vi.fn();
    _activeRedisMock = {
      get: getSpy as unknown as MockFn,
      setex: setexSpy as unknown as MockFn,
      on: onSpy as unknown as MockFn,
      _spies: { get: getSpy, setex: setexSpy, on: onSpy },
    };
    mockDb(dbMock);
    mockWorkerShared();
    mockAnafClient(createFullAnafRecord());
    mockEnrichmentCompletion();

    const { anafFullFetchProcessor } = await import("./d0-anaf-full-fetch.js");
    const result = await anafFullFetchProcessor({
      id: "j8",
      data: { tenantId: TENANT_ID, companyId: COMPANY_ID, cui: VALID_CUI },
    } as never);

    expect(result).toMatchObject({ ok: true, status: "success" });
    expect(dbMock.update).toHaveBeenCalledTimes(1);
  });
});

describe("d0-anaf-full-fetch: correlationId is propagated", () => {
  it("passes correlationId to enrichment log", async () => {
    const dbMock = createDbMock();
    setRedisMock(null);
    mockDb(dbMock);
    mockWorkerShared();
    mockAnafClient(createFullAnafRecord());
    mockEnrichmentCompletion();

    const { anafFullFetchProcessor } = await import("./d0-anaf-full-fetch.js");
    await anafFullFetchProcessor({
      id: "j9",
      data: {
        tenantId: TENANT_ID,
        companyId: COMPANY_ID,
        cui: VALID_CUI,
        correlationId: "corr-abc-123",
      },
    } as never);

    const logEntry = ((dbMock._insertValues.mock.calls as unknown as unknown[][])[0]?.[0] ??
      {}) as Record<string, unknown>;
    expect(logEntry.correlationId).toBe("corr-abc-123");
  });
});
