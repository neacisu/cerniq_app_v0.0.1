import { describe, expect, it } from "vitest";
import type { Job } from "bullmq";
import {
  CORRELATION_ID_UUID_RE,
  COGNITIVE_SSE_BATCH_ID_RE,
  buildCognitiveWorkerEventContext,
  cognitiveBatchIdFromCorrelation,
  ensureExecutionCorrelationUuid,
} from "./execution-correlation.js";

function makeJob(data: Record<string, unknown>): Job {
  return { data } as Job;
}

describe("ensureExecutionCorrelationUuid", () => {
  it("păstrează correlationId deja UUID", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    const job = makeJob({ tenantId: "t1", correlationId: id });
    ensureExecutionCorrelationUuid(job);
    expect(job.data.correlationId).toBe(id);
  });

  it("înlocuiește string non-UUID cu UUID nou", () => {
    const job = makeJob({ tenantId: "t1", correlationId: "cron-hourly-monitor" });
    ensureExecutionCorrelationUuid(job);
    const c = (job.data as { correlationId: string }).correlationId;
    expect(CORRELATION_ID_UUID_RE.test(c)).toBe(true);
    expect(c).not.toBe("cron-hourly-monitor");
  });

  it("adaugă correlationId dacă lipsește", () => {
    const job = makeJob({ tenantId: "t1" });
    ensureExecutionCorrelationUuid(job);
    const c = (job.data as { correlationId: string }).correlationId;
    expect(CORRELATION_ID_UUID_RE.test(c)).toBe(true);
  });

  it("nu modifică dacă job.data nu e obiect", () => {
    const job = { data: null } as Job;
    ensureExecutionCorrelationUuid(job);
    expect(job.data).toBeNull();
  });
});

describe("cognitiveBatchIdFromCorrelation", () => {
  it("returnează UUID când e valid pentru SSE", () => {
    const id = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
    expect(COGNITIVE_SSE_BATCH_ID_RE.test(id)).toBe(true);
    expect(cognitiveBatchIdFromCorrelation(id)).toBe(id);
  });

  it("returnează undefined pentru string non-UUID", () => {
    expect(cognitiveBatchIdFromCorrelation("cron-hourly")).toBeUndefined();
  });

  it("returnează undefined pentru gol", () => {
    expect(cognitiveBatchIdFromCorrelation("")).toBeUndefined();
    expect(cognitiveBatchIdFromCorrelation(undefined)).toBeUndefined();
  });
});

describe("buildCognitiveWorkerEventContext", () => {
  it("include batchId și correlationId când correlation e UUID SSE", () => {
    const id = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
    expect(buildCognitiveWorkerEventContext("t1", id)).toEqual({
      tenantId: "t1",
      batchId: id,
      correlationId: id,
    });
  });

  it("omite batchId când correlation nu e UUID SSE", () => {
    expect(buildCognitiveWorkerEventContext("t1", "human-batch")).toEqual({
      tenantId: "t1",
      correlationId: "human-batch",
    });
  });

  it("îmbină importExecution complet când payload-ul îl conține", () => {
    const sse = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
    const jobData = {
      importExecution: {
        tenantId: "tenant-from-import",
        batchId: "batch-import-static",
        sessionId: "sess-1",
        runtimeJobKey: "rk:1",
        workerName: "a1-parser",
        stageKey: "ingest",
        traceId: "trace-otel-1",
        entityType: "company",
        entityId: "ent-1",
        correlationId: sse,
      },
    };
    const ctx = buildCognitiveWorkerEventContext("tenant-worker", undefined, jobData);
    expect(ctx.tenantId).toBe("tenant-worker");
    expect(ctx.batchId).toBe(sse);
    expect(ctx.correlationId).toBe(sse);
    expect(ctx.traceId).toBe("trace-otel-1");
    expect(ctx.sessionId).toBe("sess-1");
    expect(ctx.workerName).toBe("a1-parser");
    expect(ctx.stageKey).toBe("ingest");
    expect(ctx.entityType).toBe("company");
    expect(ctx.entityId).toBe("ent-1");
  });

  it("prioritizează correlationId din argument față de import când ambele există", () => {
    const sseArg = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
    const jobData = {
      importExecution: {
        tenantId: "t-imp",
        batchId: "batch-imp",
        sessionId: "s1",
        runtimeJobKey: "rk",
        workerName: "w",
        stageKey: "st",
        correlationId: "non-uuid-corr",
      },
    };
    const ctx = buildCognitiveWorkerEventContext("tw", sseArg, jobData);
    expect(ctx.correlationId).toBe(sseArg);
    expect(ctx.batchId).toBe(sseArg);
  });

  it("păstrează batchId din import când correlation nu e UUID SSE", () => {
    const jobData = {
      importExecution: {
        tenantId: "t-imp",
        batchId: "batch-keep",
        sessionId: "s1",
        runtimeJobKey: "rk",
        workerName: "w",
        stageKey: "st",
        correlationId: "human-corr",
      },
    };
    const ctx = buildCognitiveWorkerEventContext("tw", undefined, jobData);
    expect(ctx.correlationId).toBe("human-corr");
    expect(ctx.batchId).toBe("batch-keep");
  });

  it("cu import fără correlationId, propagă null explicit (ramură ?? importCtx.correlationId)", () => {
    const jobData = {
      importExecution: {
        tenantId: "tenant-aaa",
        batchId: "batch-bbb",
        sessionId: "session-ccc",
        runtimeJobKey: "rk",
        workerName: "w",
        stageKey: "st",
      },
    };
    const ctx = buildCognitiveWorkerEventContext("tw", undefined, jobData);
    expect(ctx.correlationId).toBeNull();
    expect(ctx.batchId).toBe("batch-bbb");
  });

  it("fără importExecution, propagă batchId top-level din job când correlation nu e UUID SSE (A1 CSV)", () => {
    const jobData = {
      tenantId: "t1",
      batchId: "batch-csv-001",
      correlationId: "human-corr",
    };
    const ctx = buildCognitiveWorkerEventContext("t1", jobData.correlationId, jobData);
    expect(ctx.batchId).toBe("batch-csv-001");
    expect(ctx.correlationId).toBe("human-corr");
  });

  it("fără importExecution, prioritizează UUID SSE față de batchId top-level", () => {
    const sse = "11111111-1111-8111-8111-111111111111";
    const jobData = {
      batchId: "batch-csv-001",
      correlationId: sse,
    };
    const ctx = buildCognitiveWorkerEventContext("t1", sse, jobData);
    expect(ctx.batchId).toBe(sse);
  });
});
