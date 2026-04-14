import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const updateChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
  return {
    findMany: vi.fn(),
    enqueueImportJobBulk: vi.fn(async (_payload: unknown) => undefined),
    enqueueImportJob: vi.fn(async (_payload: unknown) => undefined),
    updateChain,
    dbUpdate: vi.fn(() => updateChain),
  };
});

vi.mock("@cerniq/worker-shared", () => ({
  QUEUES: {
    NORMALIZE_NAME: "normalize:name",
    NORMALIZE_EMAIL: "normalize:email",
    NORMALIZE_PHONE: "normalize:phone",
    NORMALIZE_ADDRESS: "normalize:address",
    ENRICH_BRONZE_ANAF: "enrich:bronze:anaf",
  },
  enqueueImportJobBulk: mocks.enqueueImportJobBulk,
  enqueueImportJob: mocks.enqueueImportJob,
}));

vi.mock("@cerniq/db", () => ({
  bronzeContacts: { metadata: "metadata_col" },
  db: {
    query: { bronzeContacts: { findMany: mocks.findMany } },
    update: mocks.dbUpdate,
  },
  setSessionTenantId: vi.fn(async () => undefined),
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values })),
}));

vi.mock("@cerniq/observability", () => ({
  createServiceLogger: () => ({ info: vi.fn() }),
}));

import {
  collectBronzeIdsForChunk,
  resolveNormalizerWorkerName,
  triggerAnafBronzeEnrichment,
  triggerNormalizationForContacts,
} from "./triggers.js";

describe("e1-ingest-core triggers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockReset();
  });

  it("collectBronzeIdsForChunk uses empty id list when CUI is absent from map", () => {
    const m = new Map<string, string[]>([["RO1", ["a", "b"]]]);
    expect(collectBronzeIdsForChunk(["RO1", "UNKNOWN"], m, ["nr1"], true)).toEqual(
      expect.arrayContaining(["a", "b", "nr1"]),
    );
    expect(collectBronzeIdsForChunk(["RO1"], m, ["nr1"], false)).toEqual(
      expect.arrayContaining(["a", "b"]),
    );
  });

  it("resolveNormalizerWorkerName throws for unknown queue", () => {
    expect(() => resolveNormalizerWorkerName("unknown:queue")).toThrow(
      /Unknown normalization queue/,
    );
  });

  it("resolveNormalizerWorkerName returns worker for normalize:name", () => {
    expect(resolveNormalizerWorkerName("normalize:name")).toBe("B1:name-normalizer");
  });

  it("triggerNormalizationForContacts returns early when no ids", async () => {
    await triggerNormalizationForContacts("t1", [], "c1", "b1", null);
    expect(mocks.enqueueImportJobBulk).not.toHaveBeenCalled();
  });

  it("triggerNormalizationForContacts enqueues bulk jobs for one contact", async () => {
    await triggerNormalizationForContacts("t1", ["bc1"], "corr-1", "batch-1", null);
    expect(mocks.enqueueImportJobBulk).toHaveBeenCalledTimes(4);
    const first = mocks.enqueueImportJobBulk.mock.calls[0]?.[0] as { items: unknown[] };
    expect(first.items).toHaveLength(1);
  });

  it("triggerAnafBronzeEnrichment returns when no ids", async () => {
    await triggerAnafBronzeEnrichment("t1", "b1", [], "c1", null);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("triggerAnafBronzeEnrichment returns when no contacts with CUI", async () => {
    mocks.findMany.mockResolvedValueOnce([]);
    await triggerAnafBronzeEnrichment("t1", "b1", ["x"], "c1", null);
    expect(mocks.enqueueImportJob).not.toHaveBeenCalled();
  });

  it("triggerAnafBronzeEnrichment enqueues job for unique CUI", async () => {
    mocks.findMany
      .mockResolvedValueOnce([{ id: "bc1", extractedCui: "RO123" }])
      .mockResolvedValueOnce([]);
    await triggerAnafBronzeEnrichment("t1", "b1", ["bc1"], "c1", null);
    expect(mocks.enqueueImportJob).toHaveBeenCalledTimes(1);
    const arg = mocks.enqueueImportJob.mock.calls[0]?.[0] as { payload: { cuiList: string[] } };
    expect(arg.payload.cuiList).toEqual(["RO123"]);
  });

  it("triggerAnafBronzeEnrichment logs when duplicate CUIs deduped", async () => {
    mocks.findMany
      .mockResolvedValueOnce([
        { id: "bc1", extractedCui: "RO1" },
        { id: "bc2", extractedCui: "RO1" },
      ])
      .mockResolvedValueOnce([]);
    await triggerAnafBronzeEnrichment("t1", "b1", ["bc1", "bc2"], "c1", null);
    expect(mocks.enqueueImportJob).toHaveBeenCalled();
  });

  it("triggerAnafBronzeEnrichment uses batchId when correlationId is omitted in payload", async () => {
    mocks.findMany
      .mockResolvedValueOnce([{ id: "bc1", extractedCui: "RO1" }])
      .mockResolvedValueOnce([]);
    await triggerAnafBronzeEnrichment("t1", "batch-uuid-1", ["bc1"], undefined, null);
    const arg = mocks.enqueueImportJob.mock.calls[0]?.[0] as { payload: { correlationId: string } };
    expect(arg.payload.correlationId).toBe("batch-uuid-1");
  });

  it("triggerAnafBronzeEnrichment splits into multiple batches when CUI count exceeds batch size", async () => {
    const many = Array.from({ length: 101 }, (_, i) => ({
      id: `bc${i}`,
      extractedCui: `RO${i}`,
    }));
    mocks.findMany.mockResolvedValueOnce(many).mockResolvedValueOnce([]);
    await triggerAnafBronzeEnrichment(
      "t1",
      "b1",
      many.map((m) => m.id),
      "c1",
      null,
    );
    expect(mocks.enqueueImportJob).toHaveBeenCalledTimes(2);
  });

  it("triggerAnafBronzeEnrichment skips null CUI entries when building CUI map", async () => {
    mocks.findMany
      .mockResolvedValueOnce([
        { id: "bc1", extractedCui: "RO1" },
        { id: "bc2", extractedCui: null },
      ])
      .mockResolvedValueOnce([]);
    await triggerAnafBronzeEnrichment("t1", "b1", ["bc1", "bc2"], "c1", null);
    expect(mocks.enqueueImportJob).toHaveBeenCalled();
  });

  it("triggerAnafBronzeEnrichment runs both findMany where-clause builders", async () => {
    const and = (...parts: unknown[]) => parts;
    const eq = () => ({});
    const inArray = () => ({});
    const isNotNull = () => ({});
    const isNull = () => ({});
    mocks.findMany
      .mockImplementationOnce(
        async (args: { where: (t: unknown, ops: Record<string, unknown>) => unknown }) => {
          args.where({}, { and, eq, isNotNull, inArray, isNull });
          return [{ id: "bc1", extractedCui: "RO9" }];
        },
      )
      .mockImplementationOnce(
        async (args: { where: (t: unknown, ops: Record<string, unknown>) => unknown }) => {
          args.where({}, { and, eq, isNotNull, inArray, isNull });
          return [{ id: "bc2" }];
        },
      );
    await triggerAnafBronzeEnrichment("t1", "b1", ["bc1", "bc2"], "c1", null);
    expect(mocks.enqueueImportJob).toHaveBeenCalled();
  });
});
