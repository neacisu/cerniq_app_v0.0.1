import { describe, expect, it, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("S2.PR8 integration - CSV -> Bronze", () => {
  it("a1 parser proceseaza CSV si insereaza randuri in bronze", async () => {
    const insertBronzeRows = vi.fn(async () => ({
      rowsRead: 1,
      rowsInserted: 2,
      insertedIds: ["b1", "b2"],
    }));
    const readInputContent = vi.fn(
      async () => "companyName,cui,email\nAgro Farm,12345678,office@agro.ro",
    );
    const detectColumnMapping = vi.fn(() => ({
      companyName: "companyName",
      cui: "cui",
      email: "email",
    }));
    const normalizeRow = vi.fn((row) => row);
    const updateImportBatchCounters = vi.fn(async () => undefined);
    const triggerNormalizationForContacts = vi.fn(async () => undefined);

    vi.doMock("./ingest-utils.js", () => ({
      insertBronzeRows,
      readInputContent,
      detectColumnMapping,
      normalizeRow,
      updateImportBatchCounters,
      triggerNormalizationForContacts,
      shouldUseStreaming: vi.fn(async () => false),
      createFileReadStream: vi.fn(),
      detectEncoding: vi.fn(() => "utf8"),
      getInsertBatchSize: vi.fn(() => 1000),
    }));
    vi.doMock("@cerniq/db", () => ({
      db: {
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(async () => undefined),
          })),
        })),
      },
      bronzeImportBatches: { id: "id", metadata: "metadata" },
      sql: (parts: TemplateStringsArray) => parts.join(""),
    }));

    const { csvParserProcessor } = await import("./a1-csv-parser.js");
    const result = await csvParserProcessor({
      data: {
        tenantId: "t1",
        batchId: "batch-1",
        filePath: "/tmp/test.csv",
        fileName: "test.csv",
        fileSize: 12,
        correlationId: "corr-1",
      },
    } as never);

    expect(readInputContent).toHaveBeenCalled();
    expect(insertBronzeRows).toHaveBeenCalled();
    expect(updateImportBatchCounters).toHaveBeenCalled();
    expect(triggerNormalizationForContacts).toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, rowsRead: 1, rowsInserted: 2 });
  });
});

describe("S2.PR8 integration - ANAF mock", () => {
  it("d1 fiscal updateaza silver cu raspunsul ANAF", async () => {
    const returning = vi.fn(async () => [{ sources: ["anaf_fiscal"] }]);
    const setValues = vi.fn(() => ({
      where: vi.fn(() => ({ returning })),
    }));
    const dbMock = {
      update: vi.fn(() => ({ set: setValues })),
      insert: vi.fn(() => ({ values: vi.fn(async () => undefined) })),
    };

    vi.doMock("@cerniq/db", () => ({
      db: dbMock,
      silverCompanies: { id: "id", metadata: "metadata" },
      silverEnrichmentLog: {},
      setSessionTenantId: vi.fn(async () => undefined),
      sql: (parts: TemplateStringsArray) => parts.join(""),
    }));

    vi.doMock("../lib/anaf-api-client.js", () => ({
      fetchAnafRecordByCui: vi.fn(async () => ({
        denumire: "Agro SRL",
        adresa: "Cluj",
        stare_inregistrare: "INREGISTRAT",
        cod_CAEN: "0111",
      })),
    }));

    const { anafFiscalProcessor } = await import("./d1-anaf-fiscal.js");
    const result = await anafFiscalProcessor({
      id: "j1",
      data: { tenantId: "t1", companyId: "c1", cui: "RO12345678" },
    } as never);

    expect(dbMock.update).toHaveBeenCalled();
    expect(dbMock.insert).toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, status: "success", source: "anaf_fiscal" });
  });
});

describe("S2.PR8 integration - CSV -> Bronze -> Silver promotion", () => {
  it("c2 valideaza CUI si auto-triggereaza promotion bronze->silver", async () => {
    const where = vi.fn(async () => undefined);
    const set = vi.fn(() => ({ where }));
    const values = vi.fn(async () => undefined);
    const findFirst = vi.fn(async () => ({
      id: "b1",
      tenantId: "t1",
      rawPayload: { companyName: "Test SRL", cui: "12345678", email: "test@test.ro" },
    }));

    const dbMock = {
      query: { bronzeContacts: { findFirst } },
      update: vi.fn(() => ({ set })),
      insert: vi.fn(() => ({ values })),
    };

    const addMock = vi.fn(async (_name: string, _payload: unknown) => undefined);

    vi.doMock("@cerniq/db", () => ({
      db: dbMock,
      setSessionTenantId: vi.fn(async () => undefined),
      bronzeContacts: { id: "id", tenantId: "tenantId" },
      silverCompanies: { id: "id" },
      silverEnrichmentLog: {},
      sql: (parts: TemplateStringsArray) => parts.join(""),
    }));

    vi.doMock("@cerniq/worker-shared", () => ({
      getRedisConnectionOptions: vi.fn(() => ({})),
      createCircuitBreaker: vi.fn((fn: (...a: unknown[]) => unknown) => ({
        fire: (...args: unknown[]) => fn(...args),
      })),
    }));

    vi.doMock("bullmq", () => ({
      Queue: class {
        async add(name: string, payload: unknown) {
          await addMock(name, payload);
        }
        async close() {}
      },
    }));

    const mockFetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        found: [{ denumire: "Test SRL", adresa: "Str. Test 1", scpTVA: false }],
      }),
    }));
    vi.stubGlobal("fetch", mockFetch);

    const { cuiAnafValidatorProcessor } = await import("./c2-cui-anaf-validator.js");
    const result = await cuiAnafValidatorProcessor({
      id: "j-c2",
      data: { tenantId: "t1", bronzeContactId: "b1", cui: "12345678", correlationId: "corr-c2" },
    } as never);

    expect(dbMock.update).toHaveBeenCalled();
    expect(addMock).toHaveBeenCalledWith(
      expect.stringContaining("promote"),
      expect.objectContaining({ tenantId: "t1" }),
    );
    expect(result).toMatchObject({ ok: true });
  });
});

describe("S2.PR8 integration - Termene mock", () => {
  it("e1 balance actualizeaza date financiare in silver", async () => {
    const returning = vi.fn(async () => [{ sources: ["termene_balance"] }]);
    const setValues = vi.fn(() => ({
      where: vi.fn(() => ({ returning })),
    }));
    const dbMock = {
      update: vi.fn(() => ({ set: setValues })),
      insert: vi.fn(() => ({ values: vi.fn(async () => undefined) })),
    };

    vi.doMock("@cerniq/db", () => ({
      db: dbMock,
      silverCompanies: { id: "id", metadata: "metadata" },
      silverEnrichmentLog: {},
      setSessionTenantId: vi.fn(async () => undefined),
      sql: (parts: TemplateStringsArray) => parts.join(""),
    }));

    vi.doMock("../lib/termene-api-client.js", () => ({
      getTermeneBalance: vi.fn(async () => ({
        cifra_afaceri: 1000000,
        profit_net: 125000,
        numar_angajati: 22,
      })),
    }));

    const { termeneBalanceProcessor } = await import("./e1-termene-balance.js");
    const result = await termeneBalanceProcessor({
      id: "j1",
      data: { tenantId: "t1", companyId: "c1", cui: "12345678" },
    } as never);

    expect(dbMock.update).toHaveBeenCalled();
    expect(dbMock.insert).toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, status: "success", source: "termene_balance" });
  });
});
