import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("ingest-utils", () => {
  it("splits oversized bronze inserts into smaller chunks", async () => {
    let currentPayload: Array<Record<string, unknown>> = [];
    let idCounter = 0;

    const returning = vi.fn(async () => {
      if (currentPayload.length >= 4) {
        throw new Error('Failed query: insert into "bronze"."bronze_contacts" statement too large');
      }
      return currentPayload.map(() => ({ id: `bronze-${++idCounter}` }));
    });
    const onConflictDoNothing = vi.fn(() => ({ returning }));
    const values = vi.fn((payload: Array<Record<string, unknown>>) => {
      currentPayload = payload;
      return { onConflictDoNothing };
    });
    const insert = vi.fn(() => ({ values }));

    vi.doMock("@cerniq/db", () => ({
      db: { insert },
      bronzeContacts: { id: "id" },
      bronzeImportBatches: { id: "id", metadata: "metadata" },
      setSessionTenantId: vi.fn(async () => undefined),
      sql: (parts: TemplateStringsArray) => parts.join(""),
    }));

    vi.doMock("@cerniq/worker-shared", () => ({
      createQueue: vi.fn(() => ({
        add: vi.fn(async () => undefined),
        close: vi.fn(async () => undefined),
      })),
      normalizeNrRegCom: vi.fn((value: string) => value || null),
    }));

    vi.doMock("../lib/cui-validation.js", () => ({
      sanitizeCui: vi.fn((value: string) => value || null),
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
    let currentPayload: Array<Record<string, unknown>> = [];

    const returning = vi.fn(async () => {
      throw new Error('Failed query: insert into "bronze"."bronze_contacts" invalid byte sequence');
    });
    const onConflictDoNothing = vi.fn(() => ({ returning }));
    const values = vi.fn((payload: Array<Record<string, unknown>>) => {
      currentPayload = payload;
      return { onConflictDoNothing };
    });
    const insert = vi.fn(() => ({ values }));

    vi.doMock("@cerniq/db", () => ({
      db: { insert },
      bronzeContacts: { id: "id" },
      bronzeImportBatches: { id: "id", metadata: "metadata" },
      setSessionTenantId: vi.fn(async () => undefined),
      sql: (parts: TemplateStringsArray) => parts.join(""),
    }));

    vi.doMock("@cerniq/worker-shared", () => ({
      createQueue: vi.fn(() => ({
        add: vi.fn(async () => undefined),
        close: vi.fn(async () => undefined),
      })),
      normalizeNrRegCom: vi.fn((value: string) => value || null),
    }));

    vi.doMock("../lib/cui-validation.js", () => ({
      sanitizeCui: vi.fn((value: string) => value || null),
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
