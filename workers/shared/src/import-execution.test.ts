import { describe, it, expect, vi } from "vitest";

// Mock @cerniq/db before any imports to prevent DATABASE_URL requirement at module load.
// The pure functions under test (buildImportRuntimeJobKey, getImportExecutionContext)
// do not use the DB at all — only async functions called at runtime do.
vi.mock("@cerniq/db", () => ({
  db: {},
  bronzeImportBatches: {},
  importRuntimeJobs: {},
  importRuntimeSessions: {},
  importRuntimeWorkerCounters: {},
  silverContacts: {},
  tenants: {},
  sql: vi.fn(),
  setSessionTenantId: vi.fn(),
  eq: vi.fn(),
  and: vi.fn(),
  or: vi.fn(),
  inArray: vi.fn(),
  isNull: vi.fn(),
  isNotNull: vi.fn(),
}));

// Mock factory (uses bullmq + redis at init time)
vi.mock("./factory.js", () => ({
  createQueue: vi.fn(),
}));

import { buildImportRuntimeJobKey, getImportExecutionContext } from "./import-execution.js";

// ─── buildImportRuntimeJobKey ─────────────────────────────────────────────────

describe("buildImportRuntimeJobKey", () => {
  const BASE_ARGS = {
    queueName: "ingest:csv",
    jobName: "parse-row",
    workerName: "a1-csv-parser",
    batchId: "batch-uuid-1111",
  };

  it("returns a string in <workerName>:<24-hex> format", () => {
    const key = buildImportRuntimeJobKey(BASE_ARGS);
    expect(key).toMatch(/^a1-csv-parser:[0-9a-f]{24}$/);
  });

  it("is deterministic — identical inputs produce the same key", () => {
    const key1 = buildImportRuntimeJobKey(BASE_ARGS);
    const key2 = buildImportRuntimeJobKey({ ...BASE_ARGS });
    expect(key1).toBe(key2);
  });

  it("produces different keys for different batchIds", () => {
    const key1 = buildImportRuntimeJobKey(BASE_ARGS);
    const key2 = buildImportRuntimeJobKey({ ...BASE_ARGS, batchId: "batch-uuid-2222" });
    expect(key1).not.toBe(key2);
  });

  it("produces different keys for different workerNames", () => {
    const key1 = buildImportRuntimeJobKey(BASE_ARGS);
    const key2 = buildImportRuntimeJobKey({ ...BASE_ARGS, workerName: "b1-name-normalizer" });
    expect(key1).not.toBe(key2);
    // worker prefix is embedded
    expect(key2).toMatch(/^b1-name-normalizer:/);
  });

  it("null and omitted optional fields produce the same hash", () => {
    const withNulls = buildImportRuntimeJobKey({
      ...BASE_ARGS,
      entityType: null,
      entityId: null,
      idempotencyScope: null,
      correlationId: null,
      parentRuntimeJobKey: null,
    });
    const withoutOptionals = buildImportRuntimeJobKey(BASE_ARGS);
    expect(withNulls).toBe(withoutOptionals);
  });

  it("distinct entity inputs produce distinct keys", () => {
    const withEntity = buildImportRuntimeJobKey({
      ...BASE_ARGS,
      entityType: "company",
      entityId: "entity-abc",
    });
    const withoutEntity = buildImportRuntimeJobKey(BASE_ARGS);
    expect(withEntity).not.toBe(withoutEntity);
  });

  it("correlationId affects the key", () => {
    const withCorr = buildImportRuntimeJobKey({ ...BASE_ARGS, correlationId: "corr-123" });
    const withoutCorr = buildImportRuntimeJobKey(BASE_ARGS);
    expect(withCorr).not.toBe(withoutCorr);
  });
});

// ─── getImportExecutionContext ────────────────────────────────────────────────

const VALID_EXECUTION = {
  tenantId: "tenant-aaa",
  batchId: "batch-bbb",
  sessionId: "session-ccc",
  runtimeJobKey: "a1-csv-parser:deadbeef012345678901abcd",
  workerName: "a1-csv-parser",
  stageKey: "parse",
};

describe("getImportExecutionContext", () => {
  it("returns null for null payload", () => {
    expect(getImportExecutionContext(null)).toBeNull();
  });

  it("returns null for non-object primitives", () => {
    expect(getImportExecutionContext("string")).toBeNull();
    expect(getImportExecutionContext(42)).toBeNull();
    expect(getImportExecutionContext(true)).toBeNull();
  });

  it("returns null when importExecution is absent", () => {
    expect(getImportExecutionContext({})).toBeNull();
    expect(getImportExecutionContext({ other: "field" })).toBeNull();
  });

  it("returns null when importExecution is an empty object", () => {
    expect(getImportExecutionContext({ importExecution: {} })).toBeNull();
  });

  it("returns null when a required field is missing", () => {
    expect(
      getImportExecutionContext({ importExecution: { ...VALID_EXECUTION, sessionId: undefined } }),
    ).toBeNull();
  });

  it("returns null when a required field has the wrong type", () => {
    expect(
      getImportExecutionContext({
        importExecution: { ...VALID_EXECUTION, tenantId: 12345 },
      }),
    ).toBeNull();
  });

  it("returns the full context when all required fields are present", () => {
    const ctx = getImportExecutionContext({ importExecution: VALID_EXECUTION });
    expect(ctx).not.toBeNull();
    expect(ctx!.tenantId).toBe("tenant-aaa");
    expect(ctx!.batchId).toBe("batch-bbb");
    expect(ctx!.sessionId).toBe("session-ccc");
    expect(ctx!.runtimeJobKey).toBe("a1-csv-parser:deadbeef012345678901abcd");
    expect(ctx!.workerName).toBe("a1-csv-parser");
    expect(ctx!.stageKey).toBe("parse");
  });

  it("sets optional string fields when provided", () => {
    const ctx = getImportExecutionContext({
      importExecution: {
        ...VALID_EXECUTION,
        entityType: "company",
        entityId: "ent-001",
        correlationId: "corr-xyz",
        queueName: "ingest:csv",
        parentRuntimeJobKey: "parent-key",
        idempotencyScope: "scope-a",
      },
    });
    expect(ctx!.entityType).toBe("company");
    expect(ctx!.entityId).toBe("ent-001");
    expect(ctx!.correlationId).toBe("corr-xyz");
    expect(ctx!.queueName).toBe("ingest:csv");
    expect(ctx!.parentRuntimeJobKey).toBe("parent-key");
    expect(ctx!.idempotencyScope).toBe("scope-a");
  });

  it("nullifies optional fields when their type is wrong", () => {
    const ctx = getImportExecutionContext({
      importExecution: {
        ...VALID_EXECUTION,
        entityType: 999,
        entityId: true,
        correlationId: {},
        queueName: [],
      },
    });
    expect(ctx).not.toBeNull();
    expect(ctx!.entityType).toBeNull();
    expect(ctx!.entityId).toBeNull();
    expect(ctx!.correlationId).toBeNull();
    expect(ctx!.queueName).toBeNull();
  });

  it("returns null for parentRuntimeJobKey when its type is wrong", () => {
    const ctx = getImportExecutionContext({
      importExecution: { ...VALID_EXECUTION, parentRuntimeJobKey: 42 },
    });
    expect(ctx!.parentRuntimeJobKey).toBeNull();
  });
});
