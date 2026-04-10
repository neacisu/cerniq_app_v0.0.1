import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

function mockSharedTypes() {
  vi.doMock("@cerniq/shared-types", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@cerniq/shared-types")>();
    return {
      ...actual,
      buildColumnAliasToTargetMap: vi.fn(() => new Map()),
    };
  });
}

function createDbMock(overrides?: Record<string, unknown>) {
  const bronzeQuery = {
    findMany: vi.fn(async () => []),
  };

  return {
    db: {
      insert: vi.fn(),
      query: {
        bronzeContacts: bronzeQuery,
      },
    },
    bronzeContacts: { id: "id", sourceIdentifier: "sourceIdentifier", tenantId: "tenantId" },
    bronzeImportBatches: { id: "id", metadata: "metadata" },
    importRowQuarantine: { id: "id" },
    computeStableSourcePayloadHash: vi.fn((row: Record<string, unknown>) => JSON.stringify(row)),
    resolveBronzeContactIdentity: vi.fn(async () => ({ status: "resolved" as const })),
    setSessionTenantId: vi.fn(async () => undefined),
    insertJobLogRows: vi.fn(async () => undefined),
    sql: (parts: TemplateStringsArray) => parts.join(""),
    ...overrides,
  };
}

function mockWorkerShared() {
  return {
    QUEUES: {
      NORMALIZE_NAME: "normalize:name",
      NORMALIZE_EMAIL: "normalize:email",
      NORMALIZE_PHONE: "normalize:phone",
      NORMALIZE_ADDRESS: "normalize:address",
      ENRICH_BRONZE_ANAF: "enrich:bronze:anaf",
    },
    bronzeContactsIngestedTotal: { inc: vi.fn() },
    createQueue: vi.fn(() => ({
      add: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
    })),
    sanitizeNrRegCom: vi.fn((value: string) => value || null),
  };
}

describe("ingest-utils", () => {
  it("splits oversized bronze inserts into smaller chunks", async () => {
    mockSharedTypes();
    let currentPayload: Array<Record<string, unknown>> = [];
    let idCounter = 0;

    const returning = vi.fn(async () => {
      if (currentPayload.length >= 4) {
        throw new Error('Failed query: insert into "bronze"."bronze_contacts" statement too large');
      }
      return currentPayload.map(() => ({ id: `bronze-${++idCounter}` }));
    });
    const values = vi.fn((payload: Array<Record<string, unknown>>) => {
      currentPayload = payload;
      return { returning };
    });
    const insert = vi.fn(() => ({ values }));

    vi.doMock("@cerniq/db", () => {
      const mock = createDbMock();
      return {
        ...mock,
        db: { ...mock.db, insert },
      };
    });

    vi.doMock("@cerniq/worker-shared", mockWorkerShared);

    vi.doMock("../lib/cui-validation.js", () => ({
      sanitizeCui: vi.fn((value: string) => value || null),
    }));

    vi.doMock("./pipeline-utils.js", () => ({
      createHitlApprovalTask: vi.fn(async () => undefined),
    }));

    const { insertBronzeRows } = await import("./ingest-utils.js");
    const result = await insertBronzeRows(
      "tenant-1",
      [{ companyName: "A" }, { companyName: "B" }, { companyName: "C" }, { companyName: "D" }],
      "csv_import",
      "batch-1",
    );

    expect(result.rowsInserted).toBe(4);
    expect(result.errorRows).toBe(0);
    expect(result.insertedIds).toHaveLength(4);
    expect(values).toHaveBeenCalledTimes(3);
  });

  it("turns a poison row into errorRows instead of failing the whole import", async () => {
    mockSharedTypes();
    let currentPayload: Array<Record<string, unknown>> = [];

    const returning = vi.fn(async () => {
      throw new Error('Failed query: insert into "bronze"."bronze_contacts" invalid byte sequence');
    });
    const values = vi.fn((payload: Array<Record<string, unknown>>) => {
      currentPayload = payload;
      return { returning };
    });
    const insert = vi.fn(() => ({ values }));

    vi.doMock("@cerniq/db", () => {
      const mock = createDbMock();
      return {
        ...mock,
        db: { ...mock.db, insert },
      };
    });

    vi.doMock("@cerniq/worker-shared", mockWorkerShared);

    vi.doMock("../lib/cui-validation.js", () => ({
      sanitizeCui: vi.fn((value: string) => value || null),
    }));

    vi.doMock("./pipeline-utils.js", () => ({
      createHitlApprovalTask: vi.fn(async () => undefined),
    }));

    const { insertBronzeRows } = await import("./ingest-utils.js");
    const result = await insertBronzeRows(
      "tenant-1",
      [{ companyName: "Broken Row", note: currentPayload.length }],
      "excel_import",
      "batch-2",
      "Sheet1",
      { startingRowNumber: 7 },
    );

    expect(result.rowsInserted).toBe(0);
    expect(result.errorRows).toBe(1);
    expect(result.rowErrors).toEqual([
      expect.objectContaining({
        rowNumber: 7,
      }),
    ]);
    expect(values).toHaveBeenCalledTimes(1);
  });
});

describe("normalizeRow", () => {
  it("at target collision, keeps first value (not last)", async () => {
    mockSharedTypes();
    vi.doMock("@cerniq/db", () =>
      createDbMock({
        computeStableSourcePayloadHash: vi.fn(() => "hash"),
      }),
    );
    vi.doMock("@cerniq/worker-shared", mockWorkerShared);
    vi.doMock("../lib/cui-validation.js", () => ({
      sanitizeCui: vi.fn((v: string) => v || null),
    }));
    vi.doMock("./pipeline-utils.js", () => ({
      createHitlApprovalTask: vi.fn(async () => undefined),
    }));

    const { normalizeRow } = await import("./ingest-utils.js");

    const mapping = { col_a: "companyName", col_b: "companyName" };
    const row = { col_a: "First Value", col_b: "Second Value" };
    const result = normalizeRow(row, mapping);

    expect(result.companyName).toBe("First Value");
  });
});

describe("contentHash (order-independent)", () => {
  it("produces the same hash regardless of key order", async () => {
    const { createHash } = await import("node:crypto");

    const row1 = { cui: "12345678", companyName: "Test SRL", email: "test@test.ro" };
    const row2 = { email: "test@test.ro", companyName: "Test SRL", cui: "12345678" };

    const hash1 = createHash("sha256")
      .update(
        JSON.stringify(
          row1,
          Object.keys(row1).sort((a, b) => a.localeCompare(b)),
        ),
      )
      .digest("hex");
    const hash2 = createHash("sha256")
      .update(
        JSON.stringify(
          row2,
          Object.keys(row2).sort((a, b) => a.localeCompare(b)),
        ),
      )
      .digest("hex");

    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different values", async () => {
    const { createHash } = await import("node:crypto");

    const row1 = { cui: "12345678", companyName: "Test SRL" };
    const row2 = { cui: "87654321", companyName: "Test SRL" };

    const hash1 = createHash("sha256")
      .update(
        JSON.stringify(
          row1,
          Object.keys(row1).sort((a, b) => a.localeCompare(b)),
        ),
      )
      .digest("hex");
    const hash2 = createHash("sha256")
      .update(
        JSON.stringify(
          row2,
          Object.keys(row2).sort((a, b) => a.localeCompare(b)),
        ),
      )
      .digest("hex");

    expect(hash1).not.toBe(hash2);
  });
});

describe("ingest-utils control chars and idempotency", () => {
  it("quarantines rows with disallowed control chars before Bronze insert", async () => {
    mockSharedTypes();
    const quarantineValues = vi.fn(async () => undefined);
    const bronzeValues = vi.fn(async () => {
      throw new Error("Bronze insert should not be reached for quarantined rows");
    });
    const insert = vi
      .fn()
      .mockImplementationOnce(() => ({ values: quarantineValues }))
      .mockImplementationOnce(() => ({ values: bronzeValues }));

    vi.doMock("@cerniq/db", () => {
      const mock = createDbMock();
      return {
        ...mock,
        db: { ...mock.db, insert },
      };
    });
    vi.doMock("@cerniq/worker-shared", mockWorkerShared);
    vi.doMock("../lib/cui-validation.js", () => ({
      sanitizeCui: vi.fn((value: string) => value || null),
    }));
    vi.doMock("./pipeline-utils.js", () => ({
      createHitlApprovalTask: vi.fn(async () => undefined),
    }));

    const { insertBronzeRows } = await import("./ingest-utils.js");
    const result = await insertBronzeRows(
      "tenant-1",
      [{ companyName: "Broken\u0007 Row" }],
      "excel_import",
      "batch-3",
      "Sheet1",
      {
        startingRowNumber: 9,
      },
    );

    expect(result.rowsInserted).toBe(0);
    expect(result.quarantineRows).toBe(1);
    expect(result.errorRows).toBe(1);
    expect(quarantineValues).toHaveBeenCalledTimes(1);
    expect(bronzeValues).not.toHaveBeenCalled();
  });

  it("reuses an existing Bronze row when sourceIdentifier hash matches", async () => {
    mockSharedTypes();
    const { createHash } = await import("node:crypto");
    const contentHash = createHash("sha256")
      .update(JSON.stringify({ companyName: "A" }, ["companyName"]))
      .digest("hex");
    const insert = vi.fn(() => ({
      values: vi.fn(async () => {
        throw new Error("Insert should not run when the row already exists with the same hash");
      }),
    }));

    vi.doMock("@cerniq/db", () => {
      const hashFn = vi.fn((row: Record<string, unknown>) => JSON.stringify(row));
      const existingQuery = {
        findMany: vi.fn(async () => [
          {
            id: "bronze-existing-1",
            sourceIdentifier: "csv_import:batch-1:default:1",
            contentHash,
            sourcePayloadHash: '{"companyName":"A"}',
            identityStatus: "resolved",
            doNotProcess: false,
            processingStatus: "pending",
          },
        ]),
      };

      return {
        db: {
          insert,
          query: {
            bronzeContacts: existingQuery,
          },
        },
        bronzeContacts: { id: "id", sourceIdentifier: "sourceIdentifier", tenantId: "tenantId" },
        bronzeImportBatches: { id: "id", metadata: "metadata" },
        importRowQuarantine: { id: "id" },
        computeStableSourcePayloadHash: hashFn,
        resolveBronzeContactIdentity: vi.fn(async () => ({ status: "resolved" as const })),
        setSessionTenantId: vi.fn(async () => undefined),
        sql: (parts: TemplateStringsArray) => parts.join(""),
      };
    });
    vi.doMock("@cerniq/worker-shared", mockWorkerShared);
    vi.doMock("../lib/cui-validation.js", () => ({
      sanitizeCui: vi.fn((value: string) => value || null),
    }));
    vi.doMock("./pipeline-utils.js", () => ({
      createHitlApprovalTask: vi.fn(async () => undefined),
    }));

    const { insertBronzeRows } = await import("./ingest-utils.js");
    const result = await insertBronzeRows(
      "tenant-1",
      [{ companyName: "A" }],
      "csv_import",
      "batch-1",
      undefined,
      { startingRowNumber: 1 },
    );

    expect(result.rowsInserted).toBe(0);
    expect(result.duplicateRows).toBe(1);
    expect(result.processableIds).toEqual(["bronze-existing-1"]);
    expect(insert).not.toHaveBeenCalled();
  });

  it("strips U+0000 before Bronze insert and keeps the row processable", async () => {
    mockSharedTypes();
    let insertedPayload: Array<Record<string, unknown>> = [];
    const returning = vi.fn(async () => [{ id: "bronze-1" }]);
    const values = vi.fn((payload: Array<Record<string, unknown>>) => {
      insertedPayload = payload;
      return { returning };
    });
    const insert = vi.fn(() => ({ values }));

    vi.doMock("@cerniq/db", () => {
      const mock = createDbMock();
      return {
        ...mock,
        db: { ...mock.db, insert },
      };
    });
    vi.doMock("@cerniq/worker-shared", mockWorkerShared);
    vi.doMock("../lib/cui-validation.js", () => ({
      sanitizeCui: vi.fn((value: string) => value || null),
    }));
    vi.doMock("./pipeline-utils.js", () => ({
      createHitlApprovalTask: vi.fn(async () => undefined),
    }));

    const { insertBronzeRows } = await import("./ingest-utils.js");
    const result = await insertBronzeRows(
      "tenant-1",
      [{ companyName: "Parat\u0000", note: "clean" }],
      "excel_import",
      "batch-4",
      "Sheet1",
      { startingRowNumber: 11 },
    );

    expect(result.rowsInserted).toBe(1);
    expect(result.sanitizedRows).toBe(1);
    expect(result.quarantineRows).toBe(0);
    expect(insertedPayload).toHaveLength(1);
    expect(insertedPayload[0]).toEqual(
      expect.objectContaining({
        rawPayload: expect.objectContaining({
          companyName: "Parat",
          note: "clean",
        }),
      }),
    );
  });

  it("quarantines sourceIdentifier conflicts when the existing hashes differ", async () => {
    mockSharedTypes();
    const quarantineValues = vi.fn(async () => undefined);
    const bronzeValues = vi.fn(async () => {
      throw new Error("Bronze insert should not run for hash conflicts");
    });
    const insert = vi
      .fn()
      .mockImplementationOnce(() => ({ values: quarantineValues }))
      .mockImplementationOnce(() => ({ values: bronzeValues }));

    vi.doMock("@cerniq/db", () => {
      const existingQuery = {
        findMany: vi.fn(async () => [
          {
            id: "bronze-existing-2",
            sourceIdentifier: "csv_import:batch-1:default:1",
            contentHash: "existing-content-hash",
            sourcePayloadHash: "existing-source-payload-hash",
            identityStatus: "resolved",
            doNotProcess: false,
            processingStatus: "pending",
          },
        ]),
      };

      return {
        db: {
          insert,
          query: {
            bronzeContacts: existingQuery,
          },
        },
        bronzeContacts: { id: "id", sourceIdentifier: "sourceIdentifier", tenantId: "tenantId" },
        bronzeImportBatches: { id: "id", metadata: "metadata" },
        importRowQuarantine: { id: "id" },
        computeStableSourcePayloadHash: vi.fn((row: Record<string, unknown>) =>
          JSON.stringify(row),
        ),
        resolveBronzeContactIdentity: vi.fn(async () => ({ status: "resolved" as const })),
        setSessionTenantId: vi.fn(async () => undefined),
        sql: (parts: TemplateStringsArray) => parts.join(""),
      };
    });
    vi.doMock("@cerniq/worker-shared", mockWorkerShared);
    vi.doMock("../lib/cui-validation.js", () => ({
      sanitizeCui: vi.fn((value: string) => value || null),
    }));
    vi.doMock("./pipeline-utils.js", () => ({
      createHitlApprovalTask: vi.fn(async () => undefined),
    }));

    const { insertBronzeRows } = await import("./ingest-utils.js");
    const result = await insertBronzeRows(
      "tenant-1",
      [{ companyName: "Changed payload" }],
      "csv_import",
      "batch-1",
      undefined,
      { startingRowNumber: 1 },
    );

    expect(result.rowsInserted).toBe(0);
    expect(result.errorRows).toBe(1);
    expect(result.quarantineRows).toBe(1);
    expect(result.invariantConflictRows).toBe(1);
    expect(quarantineValues).toHaveBeenCalledTimes(1);
    expect(bronzeValues).not.toHaveBeenCalled();
  });
});

describe("ingest-utils source hygiene (F6.11 / F7.1)", () => {
  it("does not use console.* — row-level context folosește createServiceLogger în același modul", () => {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(path.join(dir, "ingest-utils.ts"), "utf8");
    expect(src).not.toMatch(/console\.(log|error|warn|info|debug)\s*\(/);
  });
});
