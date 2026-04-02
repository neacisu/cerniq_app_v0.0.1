/**
 * imports-bronze-workers.test.ts
 * Teste de integritate structurală pentru IMPORT_RUNTIME_WORKERS,
 * IMPORT_RUNTIME_WORKER_BY_NAME și SILVER_LOG_SOURCE_TO_WORKER_NAME
 * din apps/api/src/routes/imports-bronze.ts.
 *
 * Verifică:
 *  - D0:anaf-full-fetch este prezent în IMPORT_RUNTIME_WORKERS
 *  - D1-D5 nu mai există în IMPORT_RUNTIME_WORKERS (deprecated, înlocuite de D0)
 *  - SILVER_LOG_SOURCE_TO_WORKER_NAME["anaf_full"] → "D0:anaf-full-fetch"
 *  - Cheile legacy D1-D5 (anaf_fiscal etc.) → "D0:anaf-full-fetch" (backward compat)
 *  - Toate valorile din SILVER_LOG_SOURCE_TO_WORKER_NAME există în IMPORT_RUNTIME_WORKER_BY_NAME
 */
import { describe, it, expect, vi } from "vitest";

// ── Mock dependențe grele pentru a putea importa constante module-level ────────

vi.mock("@cerniq/db", () => ({
  db: {},
  bronzeContacts: {},
  bronzeImportBatches: {},
  importRuntimeJobs: {},
  importRuntimeSessions: {},
  importRuntimeWorkerCounters: {},
  jobLogs: {},
  silverContacts: {},
  silverEnrichmentLog: {},
  tenants: {},
  setSessionTenantId: vi.fn(),
  sql: vi.fn(),
  batchIdMetadataEquals: vi.fn(),
  failedReprocessContactEquals: vi.fn(),
  eq: vi.fn(),
  and: vi.fn(),
  or: vi.fn(),
  inArray: vi.fn(),
  ne: vi.fn(),
  desc: vi.fn(),
  asc: vi.fn(),
  count: vi.fn(),
  lt: vi.fn(),
  gt: vi.fn(),
  lte: vi.fn(),
  gte: vi.fn(),
  isNull: vi.fn(),
  isNotNull: vi.fn(),
}));

vi.mock("exceljs", () => ({
  default: { Workbook: vi.fn() },
  Workbook: vi.fn(),
}));

vi.mock("papaparse", () => ({
  default: { parse: vi.fn(), unparse: vi.fn() },
}));

vi.mock("@cerniq/worker-shared", async () => {
  // Importăm modulul real pentru a păstra QUEUES (string constants fără side effects)
  const actual =
    await vi.importActual<typeof import("@cerniq/worker-shared")>("@cerniq/worker-shared");
  return {
    ...actual,
    enqueueImportJob: vi.fn(),
    resumeImportRuntimeJobs: vi.fn(),
    setBatchImportPause: vi.fn(),
    setBatchWorkerPause: vi.fn(),
    setTenantImportGlobalPause: vi.fn(),
    markImportBatchDeleteRequested: vi.fn(),
    assertQueueRegistryComplete: vi.fn(),
  };
});

vi.mock("../src/lib/queue-factory.js", () => ({
  createQueue: vi.fn(() => ({
    add: vi.fn(),
    getJobCounts: vi.fn().mockResolvedValue({}),
    close: vi.fn(),
  })),
}));

vi.mock("../src/routes/utils.js", () => ({
  getActorId: vi.fn(),
  parseLimit: vi.fn(),
  parseOffset: vi.fn(),
  requireTenantId: vi.fn(),
}));

vi.mock("../src/middleware/authz.js", () => ({
  requireRole: vi.fn(() => vi.fn()),
}));

vi.mock("../src/schemas/etapa1.js", () => ({
  importConfigSchema: { safeParse: vi.fn() },
  listBronzeContactsSchema: { safeParse: vi.fn() },
}));

// ── Importuri subiect ──────────────────────────────────────────────────────────
import {
  IMPORT_RUNTIME_WORKERS,
  IMPORT_RUNTIME_WORKER_BY_NAME,
  SILVER_LOG_SOURCE_TO_WORKER_NAME,
} from "../src/routes/imports-bronze.js";

// ── Constante reutilizate între suite-uri ──────────────────────────────────────
/**
 * Numele workerilor ANAF deprecați (D1-D5 — înlocuiți de D0:anaf-full-fetch).
 * Definit la nivel de modul pentru a garanta consistența între suite-uri și
 * pentru lookup O(1) cu Set.has(), conform best-practices (SonarQube S7776).
 */
const DEPRECATED_ANAF_WORKER_NAMES = new Set([
  "D1:anaf-fiscal-status",
  "D2:anaf-tva-status",
  "D3:anaf-efactura",
  "D4:anaf-datorii",
  "D5:anaf-caen",
]);

// ── Teste ─────────────────────────────────────────────────────────────────────

describe("IMPORT_RUNTIME_WORKERS — migrare D0 (ANAF unificat)", () => {
  it("conține intrarea D0:anaf-full-fetch cu coada corectă", () => {
    const d0 = IMPORT_RUNTIME_WORKERS.find((w) => w.workerName === "D0:anaf-full-fetch");
    // toMatchObject() verifică existența și structura într-o singură aserție,
    // eliminând nevoia de non-null assertion (!) — rezolvă SonarQube S4325.
    expect(d0).toMatchObject({
      queueName: "enrich:anaf:full",
      stage: "ANAF",
    });
  });

  it("NU conține intrările deprecated D1-D5", () => {
    for (const name of DEPRECATED_ANAF_WORKER_NAMES) {
      expect(
        IMPORT_RUNTIME_WORKERS.find((w) => w.workerName === name),
        `Intrarea deprecated "${name}" trebuie eliminată din IMPORT_RUNTIME_WORKERS`,
      ).toBeUndefined();
    }
  });

  it("niciun workerName nu este duplicat", () => {
    const names = IMPORT_RUNTIME_WORKERS.map((w) => w.workerName);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("IMPORT_RUNTIME_WORKER_BY_NAME — consistență Map", () => {
  it("indexul Map reflectă corect IMPORT_RUNTIME_WORKERS", () => {
    for (const worker of IMPORT_RUNTIME_WORKERS) {
      expect(IMPORT_RUNTIME_WORKER_BY_NAME.get(worker.workerName)).toStrictEqual(worker);
    }
  });

  it("Map nu conține intrări orfane față de IMPORT_RUNTIME_WORKERS", () => {
    const workerSet = new Set(IMPORT_RUNTIME_WORKERS.map((w) => w.workerName));
    for (const key of IMPORT_RUNTIME_WORKER_BY_NAME.keys()) {
      expect(workerSet.has(key), `Cheie orfană în Map: "${key}"`).toBe(true);
    }
  });
});

describe("SILVER_LOG_SOURCE_TO_WORKER_NAME — migrare la D0", () => {
  it('"anaf_full" mapează la "D0:anaf-full-fetch" (D0 vizibil în UI)', () => {
    expect(SILVER_LOG_SOURCE_TO_WORKER_NAME["anaf_full"]).toBe("D0:anaf-full-fetch");
  });

  it("toate cheile sursă legacy D1-D5 mapează la D0 (backward compat)", () => {
    const legacySources = ["anaf_fiscal", "anaf_tva", "anaf_efactura", "anaf_datorii", "anaf_caen"];
    for (const source of legacySources) {
      expect(
        SILVER_LOG_SOURCE_TO_WORKER_NAME[source],
        `Sursa legacy "${source}" trebuie redirecționată la D0`,
      ).toBe("D0:anaf-full-fetch");
    }
  });

  it("toate valorile din map corespund unui worker existent în IMPORT_RUNTIME_WORKER_BY_NAME", () => {
    for (const [source, workerName] of Object.entries(SILVER_LOG_SOURCE_TO_WORKER_NAME)) {
      expect(
        IMPORT_RUNTIME_WORKER_BY_NAME.get(workerName),
        `Sursa "${source}" → workerName "${workerName}" nu există în IMPORT_RUNTIME_WORKERS`,
      ).toBeDefined();
    }
  });

  it("nicio valoare din map nu referențiază intrări D1-D5 deprecate", () => {
    // DEPRECATED_ANAF_WORKER_NAMES.has() oferă lookup O(1) (SonarQube S7776).
    for (const [source, workerName] of Object.entries(SILVER_LOG_SOURCE_TO_WORKER_NAME)) {
      expect(
        DEPRECATED_ANAF_WORKER_NAMES.has(workerName),
        `Sursa "${source}" încă referențiază workerul deprecat "${workerName}"`,
      ).toBe(false);
    }
  });
});
