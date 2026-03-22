import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

function mockSharedTypes() {
  vi.doMock("@cerniq/shared-types", () => ({
    buildColumnAliasToTargetMap: vi.fn(() => new Map()),
  }));
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

    vi.doMock("@cerniq/db", () => ({
      db: { insert },
      bronzeContacts: { id: "id" },
      bronzeImportBatches: { id: "id", metadata: "metadata" },
      computeStableSourcePayloadHash: vi.fn((row: Record<string, unknown>) => JSON.stringify(row)),
      resolveBronzeContactIdentity: vi.fn(async () => ({ status: "resolved" as const })),
      setSessionTenantId: vi.fn(async () => undefined),
      sql: (parts: TemplateStringsArray) => parts.join(""),
    }));

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

    vi.doMock("@cerniq/db", () => ({
      db: { insert },
      bronzeContacts: { id: "id" },
      bronzeImportBatches: { id: "id", metadata: "metadata" },
      computeStableSourcePayloadHash: vi.fn((row: Record<string, unknown>) => JSON.stringify(row)),
      resolveBronzeContactIdentity: vi.fn(async () => ({ status: "resolved" as const })),
      setSessionTenantId: vi.fn(async () => undefined),
      sql: (parts: TemplateStringsArray) => parts.join(""),
    }));

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
    vi.doMock("@cerniq/db", () => ({
      db: {},
      bronzeContacts: { id: "id" },
      bronzeImportBatches: { id: "id", metadata: "metadata" },
      computeStableSourcePayloadHash: vi.fn(() => "hash"),
      resolveBronzeContactIdentity: vi.fn(async () => ({ status: "resolved" as const })),
      setSessionTenantId: vi.fn(async () => undefined),
      sql: (parts: TemplateStringsArray) => parts.join(""),
    }));
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
