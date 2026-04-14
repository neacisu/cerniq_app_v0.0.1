import { tmpdir } from "node:os";
import { describe, expect, it, vi, beforeEach } from "vitest";

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const BRONZE_CONTACT_ID = "33333333-3333-4333-8333-333333333333";
const BATCH_ID = "44444444-4444-4444-8444-444444444444";

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
      processableIds: ["b1", "b2"],
      errorRows: 0,
      duplicateRows: 0,
      resolvedRows: 2,
      identityConflictRows: 0,
      insufficientIdentifierRows: 0,
      rowErrors: [],
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
    const triggerAnafBronzeEnrichment = vi.fn(async () => undefined);
    const markImportBatchFailed = vi.fn(async () => undefined);

    vi.doMock("./ingest-utils.js", () => ({
      insertBronzeRows,
      readInputContent,
      detectColumnMapping,
      normalizeRow,
      updateImportBatchCounters,
      triggerNormalizationForContacts,
      triggerAnafBronzeEnrichment,
      markImportBatchFailed,
      verifyFileHash: vi.fn(async () => ({ valid: true })),
      shouldUseStreaming: vi.fn(async () => false),
      createFileReadStream: vi.fn(),
      detectEncoding: vi.fn(() => "utf8"),
      getInsertBatchSize: vi.fn(() => 1000),
    }));
    vi.doMock("@cerniq/db", () => ({
      db: {
        query: {
          bronzeImportBatches: { findFirst: vi.fn(async () => null) },
        },
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: vi.fn(async () => undefined),
          })),
        })),
        insert: vi.fn(() => ({ values: vi.fn(async () => undefined) })),
      },
      bronzeImportBatches: { id: "id", metadata: "metadata" },
      jobLogs: {},
      sql: (parts: TemplateStringsArray) => parts.join(""),
    }));

    const { csvParserProcessor } = await import("./a1-csv-parser.js");
    const result = await csvParserProcessor({
      data: {
        tenantId: TENANT_ID,
        batchId: BATCH_ID,
        filePath: `${tmpdir()}/test.csv`,
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
    const upsertCompanyIdentityKey = vi.fn(async () => undefined);

    vi.doMock("@cerniq/db", () => ({
      db: dbMock,
      silverCompanies: { id: "id", metadata: "metadata" },
      silverEnrichmentLog: {},
      setSessionTenantId: vi.fn(async () => undefined),
      upsertCompanyIdentityKey,
      sql: (parts: TemplateStringsArray) => parts.join(""),
    }));

    vi.doMock("../lib/anaf-api-client.js", () => ({
      fetchAnafSingleByCui: vi.fn(async () => ({
        date_generale: {
          cui: 12345678,
          denumire: "Agro SRL",
          adresa: "Cluj",
          stare_inregistrare: "INREGISTRAT",
          cod_CAEN: "0111",
          nrRegCom: "",
          data: "",
          telefon: "",
          fax: "",
          codPostal: "",
          act: "",
          data_inregistrare: "",
          iban: "",
          statusRO_e_Factura: false,
          organFiscalCompetent: "",
          forma_de_proprietate: "",
          forma_organizare: "",
          forma_juridica: "",
        },
        inregistrare_scop_Tva: { scpTVA: false, perioade_TVA: [] },
        inregistrare_RTVAI: {
          dataInceputTvaInc: "",
          dataSfarsitTvaInc: "",
          dataActualizareTvaInc: "",
          dataPublicareTvaInc: "",
          tipActTvaInc: "",
          statusTvaIncasare: false,
        },
        stare_inactiv: {
          dataInactivare: "",
          dataReactivare: "",
          dataPublicare: "",
          dataRadiere: "",
          statusInactivi: false,
        },
        inregistrare_SplitTVA: {
          dataInceputSplitTVA: "",
          dataAnulareSplitTVA: "",
          statusSplitTVA: false,
        },
        adresa_sediu_social: {},
        adresa_domiciliu_fiscal: {},
      })),
    }));
    vi.doMock("../lib/enrichment-completion.js", () => ({
      markEnrichmentSourceComplete: vi.fn(async () => undefined),
    }));

    const { anafFiscalProcessor } = await import("./d1-anaf-fiscal.js");
    const result = await anafFiscalProcessor({
      id: "j1",
      data: { tenantId: TENANT_ID, companyId: COMPANY_ID, cui: "RO12345678" },
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

    const txUpdateWhere = vi.fn(async () => undefined);
    const txUpdateSet = vi.fn(() => ({ where: txUpdateWhere }));
    const txInsertValues = vi.fn(async () => undefined);
    const txSelectWhere = vi.fn(async () => []);
    const txSelectFrom = vi.fn(() => ({ where: txSelectWhere }));
    const txSelect = vi.fn(() => ({ from: txSelectFrom }));
    const transaction = vi.fn(async (callback: (tx: Record<string, unknown>) => unknown) =>
      callback({
        execute: vi.fn(async () => undefined),
        query: {
          bronzeContacts: {
            findFirst: vi.fn(async () => null),
          },
        },
        update: vi.fn(() => ({ set: txUpdateSet })),
        insert: vi.fn(() => ({ values: txInsertValues })),
        select: txSelect,
      }),
    );

    const dbMock = {
      query: { bronzeContacts: { findFirst } },
      update: vi.fn(() => ({ set })),
      insert: vi.fn(() => ({ values })),
      transaction,
    };

    const addMock = vi.fn(async (_name: string, _payload: unknown) => undefined);
    const enqueueImportJobMock = vi.fn(async () => ({
      queued: true,
      jobId: "promote-test",
      sessionId: null,
      runtimeJobKey: null,
    }));

    vi.doMock("@cerniq/db", () => ({
      db: dbMock,
      setSessionTenantId: vi.fn(async () => undefined),
      bronzeContacts: {
        id: "id",
        tenantId: "tenantId",
        extractedCui: "extractedCui",
        metadata: "metadata",
      },
      silverCompanies: { id: "id", metadata: "metadata" },
      silverEnrichmentLog: {},
      jobLogs: {},
      and: vi.fn((...args: unknown[]) => args),
      eq: vi.fn((left: unknown, right: unknown) => ({ left, right })),
      sql: (parts: TemplateStringsArray) => parts.join(""),
    }));

    vi.doMock("@cerniq/worker-shared", () => ({
      createQueue: vi.fn(() => ({
        add: addMock,
        close: vi.fn(async () => undefined),
      })),
      enqueueImportJob: enqueueImportJobMock,
      enqueueImportJobBulk: vi.fn(async () => []),
      QUEUES: {
        PIPELINE_PROMOTE_BRONZE_SILVER: "pipeline:promote:bronze-silver",
      },
      createCircuitBreaker: vi.fn((fn: (...a: unknown[]) => unknown) => ({
        fire: (...args: unknown[]) => fn(...args),
        on: vi.fn(),
      })),
      sanitizeNrRegCom: vi.fn((value: string) => value),
      withExternalApiMetrics: vi.fn(async (_provider: string, fn: () => unknown) => fn()),
      withCognitiveSpan: vi.fn(async (_name: string, fn: (s: null) => unknown) => fn(null)),
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
      data: {
        tenantId: TENANT_ID,
        bronzeContactId: BRONZE_CONTACT_ID,
        cui: "12345678",
        correlationId: "corr-c2",
      },
    } as never);

    expect(dbMock.transaction).toHaveBeenCalled();
    expect(enqueueImportJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queueName: "pipeline:promote:bronze-silver",
        jobName: expect.stringContaining("promote"),
        payload: expect.objectContaining({
          tenantId: TENANT_ID,
          bronzeContactId: BRONZE_CONTACT_ID,
        }),
      }),
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

    vi.doMock("@cerniq/worker-shared", () => ({
      importMutationTotal: { inc: vi.fn() },
      withCognitiveSpan: vi.fn(async (_name: string, fn: (s: null) => unknown) => fn(null)),
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
