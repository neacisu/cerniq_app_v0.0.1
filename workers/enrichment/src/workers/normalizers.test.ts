import { describe, expect, it, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

function mockDbForNormalization() {
  const updateWhere = vi.fn(async () => undefined);
  const updateSet = vi.fn((_values: Record<string, unknown>) => ({ where: updateWhere }));
  const dbMock = {
    query: {
      bronzeContacts: {
        findFirst: vi.fn(async (): Promise<Record<string, unknown> | null> => null),
      },
    },
    update: vi.fn(() => ({ set: updateSet })),
  };
  return { dbMock, updateSet };
}

function mockDbModule(dbMock: Record<string, unknown>) {
  vi.doMock("@cerniq/db", () => ({
    db: dbMock,
    bronzeContacts: { id: "id", tenantId: "tenantId", metadata: "metadata" },
    setSessionTenantId: vi.fn(async () => undefined),
    sql: Object.assign(
      (parts: TemplateStringsArray, ...values: unknown[]) =>
        parts.map((p, i) => `${p}${values[i] ?? ""}`).join(""),
      { raw: (s: string) => s },
    ),
  }));
}

function mockWorkerShared() {
  vi.doMock("@cerniq/worker-shared", () => ({
    createQueue: vi.fn(() => ({
      add: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
    })),
    enqueueImportJob: vi.fn(async () => ({
      queued: true,
      jobId: "test-job",
      sessionId: null,
      runtimeJobKey: null,
    })),
    enqueueImportJobBulk: vi.fn(async () => []),
    withCognitiveSpan: vi.fn(async (_name: string, fn: (s: null) => unknown) => fn(null)),
    QUEUES: {
      VALIDATE_CUI_MOD11: "validate:cui:mod11",
      PIPELINE_PROMOTE_BRONZE_SILVER: "pipeline:promote:bronze-silver",
    },
  }));
}

function mockMetrics() {
  vi.doMock("../lib/worker-metrics.js", () => ({
    jobsProcessed: { add: vi.fn() },
    jobDuration: { record: vi.fn() },
    jobErrors: { add: vi.fn() },
  }));
}

function mockErrorClassification() {
  vi.doMock("../lib/error-classification.js", () => ({
    classifyAndRethrow: vi.fn((e: unknown) => {
      throw e;
    }),
  }));
}

function mockDiacritics() {
  vi.doMock("../lib/diacritics.js", () => ({
    stripDiacritics: vi.fn((input: string) =>
      input
        .replaceAll(/[ăâ]/g, "a")
        .replaceAll(/[ĂÂ]/g, "A")
        .replaceAll("î", "i")
        .replaceAll("Î", "I")
        .replaceAll(/[șş]/g, "s")
        .replaceAll(/[ȘŞ]/g, "S")
        .replaceAll(/[țţ]/g, "t")
        .replaceAll(/[ȚŢ]/g, "T"),
    ),
  }));
}

// ────────────────────────────────────────────────────────
// B1: Name normalizer
// ────────────────────────────────────────────────────────

describe("B1 - nameNormalizerProcessor", () => {
  it("whitespace-only name returns skipped, not empty string", async () => {
    const { dbMock } = mockDbForNormalization();
    dbMock.query.bronzeContacts.findFirst = vi.fn(async () => ({
      id: "bc-1",
      tenantId: "t1",
      extractedName: "   ",
      extractedCui: null,
      extractedNrRegCom: null,
    }));
    mockDbModule(dbMock);
    mockWorkerShared();
    mockMetrics();
    mockErrorClassification();
    mockDiacritics();

    const { nameNormalizerProcessor } = await import("./b1-name-normalizer.js");
    const result = await nameNormalizerProcessor({
      id: "j1",
      data: { tenantId: "t1", bronzeContactId: "bc-1", correlationId: "c1" },
    } as never);

    expect(result).toMatchObject({ ok: true, status: "skipped", reason: "whitespace_only_name" });
  });

  it("NOISE_WORDS with diacritics are removed correctly", async () => {
    const { dbMock } = mockDbForNormalization();
    dbMock.query.bronzeContacts.findFirst = vi.fn(async () => ({
      id: "bc-2",
      tenantId: "t1",
      extractedName: "ÎNTREPRINDEREA AGRICOLĂ Test Farm SRL",
      extractedCui: null,
      extractedNrRegCom: null,
      metadata: {},
    }));
    mockDbModule(dbMock);
    mockWorkerShared();
    mockMetrics();
    mockErrorClassification();
    mockDiacritics();

    const { nameNormalizerProcessor } = await import("./b1-name-normalizer.js");
    const result = await nameNormalizerProcessor({
      id: "j1",
      data: { tenantId: "t1", bronzeContactId: "bc-2", correlationId: "c1" },
    } as never);

    expect(result).toMatchObject({ ok: true, status: "success" });
    const normalizedName = (result as { normalized: string }).normalized;
    expect(normalizedName).not.toContain("INTREPRINDEREA");
    expect(normalizedName).not.toContain("AGRICOLA");
    expect(normalizedName).toContain("TEST FARM");
  });

  it("normal company name is title-cased in output values", async () => {
    const { dbMock, updateSet } = mockDbForNormalization();
    dbMock.query.bronzeContacts.findFirst = vi.fn(async () => ({
      id: "bc-3",
      tenantId: "t1",
      extractedName: "AGRO FARM SRL",
      extractedCui: "12345678",
      extractedNrRegCom: null,
      metadata: {},
    }));
    mockDbModule(dbMock);
    mockWorkerShared();
    mockMetrics();
    mockErrorClassification();
    mockDiacritics();

    const { nameNormalizerProcessor } = await import("./b1-name-normalizer.js");
    const result = await nameNormalizerProcessor({
      id: "j1",
      data: { tenantId: "t1", bronzeContactId: "bc-3", correlationId: "c1" },
    } as never);

    expect(result).toMatchObject({ ok: true, status: "success", formaJuridica: "SRL" });
    expect(dbMock.update).toHaveBeenCalled();
    const setArg = updateSet.mock.calls[0]?.[0];
    expect(setArg?.extractedName).toMatch(/Agro Farm/);
  });
});

// ────────────────────────────────────────────────────────
// B2: Email normalizer
// ────────────────────────────────────────────────────────

describe("B2 - emailNormalizerProcessor", () => {
  it("email with multiple @ uses lastIndexOf for correct parsing", async () => {
    const { dbMock } = mockDbForNormalization();
    dbMock.query.bronzeContacts.findFirst = vi.fn(async () => ({
      id: "bc-4",
      tenantId: "t1",
      extractedEmail: "user@invalid@domain.com",
      extractedCui: null,
      extractedNrRegCom: null,
      metadata: {},
    }));
    mockDbModule(dbMock);
    mockWorkerShared();
    mockMetrics();
    mockErrorClassification();

    const { emailNormalizerProcessor } = await import("./b2-email-normalizer.js");
    const result = await emailNormalizerProcessor({
      id: "j1",
      data: { tenantId: "t1", bronzeContactId: "bc-4", correlationId: "c1" },
    } as never);

    expect(result).toMatchObject({ ok: true });
    const normalizedEmail = (result as { normalizedEmail: string }).normalizedEmail;
    expect(normalizedEmail).toBe("user@invalid@domain.com");
  });

  it("normalizes uppercase and strips plus alias", async () => {
    const { dbMock } = mockDbForNormalization();
    dbMock.query.bronzeContacts.findFirst = vi.fn(async () => ({
      id: "bc-5",
      tenantId: "t1",
      extractedEmail: "  User+Test@DOMAIN.COM  ",
      extractedCui: null,
      extractedNrRegCom: null,
      metadata: {},
    }));
    mockDbModule(dbMock);
    mockWorkerShared();
    mockMetrics();
    mockErrorClassification();

    const { emailNormalizerProcessor } = await import("./b2-email-normalizer.js");
    const result = await emailNormalizerProcessor({
      id: "j1",
      data: { tenantId: "t1", bronzeContactId: "bc-5", correlationId: "c1" },
    } as never);

    expect(result).toMatchObject({ ok: true, status: "success" });
    expect((result as { normalizedEmail: string }).normalizedEmail).toBe("user@domain.com");
  });
});

// ────────────────────────────────────────────────────────
// B4: Address normalizer
// ────────────────────────────────────────────────────────

describe("B4 - addressNormalizerProcessor", () => {
  it("extractedAddress is updated in values, not just metadata", async () => {
    const { dbMock, updateSet } = mockDbForNormalization();
    dbMock.query.bronzeContacts.findFirst = vi.fn(async () => ({
      id: "bc-6",
      tenantId: "t1",
      extractedAddress: "str. test nr. 5, jud. Cluj",
      extractedCui: null,
      extractedNrRegCom: null,
      metadata: {},
    }));
    mockDbModule(dbMock);
    mockWorkerShared();
    mockMetrics();
    mockErrorClassification();
    mockDiacritics();

    const { addressNormalizerProcessor } = await import("./b4-address-normalizer.js");
    const result = await addressNormalizerProcessor({
      id: "j1",
      data: { tenantId: "t1", bronzeContactId: "bc-6", correlationId: "c1" },
    } as never);

    expect(result).toMatchObject({ ok: true, status: "success" });
    expect(dbMock.update).toHaveBeenCalled();
    const setArg = updateSet.mock.calls[0]?.[0];
    expect(setArg).toHaveProperty("extractedAddress");
    const addr = setArg?.extractedAddress as string;
    expect(typeof addr).toBe("string");
    expect(addr.length).toBeGreaterThan(0);
  });

  it("correctly identifies county code from address", async () => {
    const { dbMock } = mockDbForNormalization();
    dbMock.query.bronzeContacts.findFirst = vi.fn(async () => ({
      id: "bc-7",
      tenantId: "t1",
      extractedAddress: "Str. Libertatii Nr. 10, Cluj",
      extractedCui: null,
      extractedNrRegCom: null,
      metadata: {},
    }));
    mockDbModule(dbMock);
    mockWorkerShared();
    mockMetrics();
    mockErrorClassification();
    mockDiacritics();

    const { addressNormalizerProcessor } = await import("./b4-address-normalizer.js");
    const result = await addressNormalizerProcessor({
      id: "j1",
      data: { tenantId: "t1", bronzeContactId: "bc-7", correlationId: "c1" },
    } as never);

    expect(result).toMatchObject({ ok: true, status: "success", countyCode: "CJ" });
  });
});
