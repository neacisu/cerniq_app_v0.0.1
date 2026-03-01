import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("S4 integration - quality rollup", () => {
  it("o2 calculeaza scor total si promotion status", async () => {
    const where = vi.fn(async () => undefined);
    const set = vi.fn(() => ({ where }));
    const values = vi.fn(async () => undefined);
    const dbMock = {
      query: {
        silverCompanies: {
          findFirst: vi.fn(async () => ({
            id: "c1",
            tenantId: "t1",
            completenessScore: "80",
            accuracyScore: "70",
            freshnessScore: "60",
            cui: "12345678",
            statusFirma: "ACTIVA",
          })),
        },
      },
      update: vi.fn(() => ({ set })),
      insert: vi.fn(() => ({ values })),
    };

    vi.doMock("@cerniq/db", () => ({
      db: dbMock,
      setSessionTenantId: vi.fn(async () => undefined),
      silverCompanies: { id: "id", metadata: "metadata" },
      silverEnrichmentLog: {},
      sql: (parts: TemplateStringsArray) => parts.join(""),
    }));
    vi.doMock("@cerniq/worker-shared", () => ({ getRedisConnectionOptions: vi.fn(() => ({})) }));
    vi.doMock("bullmq", () => ({
      Queue: class {
        async add() {}
        async close() {}
      },
    }));
    vi.doMock("./pipeline-utils.js", () => ({ createHitlApprovalTask: vi.fn(async () => "a1") }));

    const { qualityRollupProcessor } = await import("./o2-quality-rollup.js");
    const result = await qualityRollupProcessor({
      id: "j1",
      data: { tenantId: "t1", companyId: "c1", correlationId: "corr-1" },
    } as never);

    expect(dbMock.update).toHaveBeenCalled();
    expect(dbMock.insert).toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, status: "success" });
  });
});

describe("S4 integration - orchestrator", () => {
  it("p1 declanseaza joburi post_validation", async () => {
    const dbMock = {
      query: {
        silverCompanies: {
          findFirst: vi.fn(async () => ({
            id: "c1",
            tenantId: "t1",
            cui: "12345678",
            denumire: "Agro Test",
            adresa: "Str. Test",
            localitate: "Braila",
            judet: "BR",
            metadata: {},
          })),
        },
      },
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => undefined) })) })),
    };

    const add = vi.fn(async (_name: string, _payload: unknown) => undefined);
    vi.doMock("@cerniq/db", () => ({
      db: dbMock,
      setSessionTenantId: vi.fn(async () => undefined),
      silverCompanies: { id: "id" },
    }));
    vi.doMock("@cerniq/worker-shared", () => ({ getRedisConnectionOptions: vi.fn(() => ({})) }));
    vi.doMock("bullmq", () => ({
      Queue: class {
        async add(name: string, payload: unknown) {
          await add(name, payload);
        }
        async close() {}
      },
    }));

    const { pipelineOrchestratorProcessor } = await import("./p1-orchestrate.js");
    const result = await pipelineOrchestratorProcessor({
      id: "j2",
      data: { tenantId: "t1", companyId: "c1", stage: "post_validation", correlationId: "corr-2" },
    } as never);

    expect(add).toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, status: "success", stage: "post_validation" });
  });
});

describe("S4 integration - error handler replay", () => {
  it("p4 programeaza replay pentru erori tranzitorii", async () => {
    const values = vi.fn(async () => [{ id: "err1" }]);
    const where = vi.fn(async () => undefined);
    const set = vi.fn(() => ({ where }));
    const dbMock = {
      insert: vi.fn(() => ({ values })),
      update: vi.fn(() => ({ set })),
    };

    const add = vi.fn(async (_name: string, _payload: unknown) => undefined);
    vi.doMock("@cerniq/db", () => ({
      db: dbMock,
      setSessionTenantId: vi.fn(async () => undefined),
      pipelineErrors: { tenantId: "tenantId", workerName: "workerName", jobId: "jobId" },
      silverCompanies: { id: "id", metadata: "metadata" },
      sql: (parts: TemplateStringsArray) => parts.join(""),
    }));
    vi.doMock("@cerniq/worker-shared", () => ({ getRedisConnectionOptions: vi.fn(() => ({})) }));
    vi.doMock("./pipeline-utils.js", () => ({ createHitlApprovalTask: vi.fn(async () => "a1") }));
    vi.doMock("bullmq", () => ({
      Queue: class {
        async add(name: string, payload: unknown) {
          await add(name, payload);
        }
        async close() {}
      },
    }));

    const { pipelineErrorHandlerProcessor } = await import("./p4-error-handler.js");
    const result = await pipelineErrorHandlerProcessor({
      id: "job-p4",
      data: {
        tenantId: "t1",
        companyId: "c1",
        errorType: "API_TIMEOUT",
        errorMessage: "timeout",
        sourceWorker: "silver:enrich:anaf-fiscal-status",
        sourcePayload: { tenantId: "t1", companyId: "c1", cui: "12345678" },
        retryCount: 1,
        maxRetries: 3,
      },
    } as never);

    expect(dbMock.insert).toHaveBeenCalled();
    expect(dbMock.update).toHaveBeenCalled();
    expect(add).toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: true,
      status: "handled",
      recoveryAction: "scheduled_replay",
    });
  });
});

describe("S4 integration - HITL escalation worker", () => {
  it("escaladeaza taskurile cu SLA depasit", async () => {
    const findMany = vi
      .fn()
      .mockResolvedValueOnce([
        { id: "warn-1", metadata: {}, dueAt: new Date(), createdAt: new Date(), status: "pending" },
      ])
      .mockResolvedValueOnce([
        { id: "task-1", dueAt: new Date(Date.now() - 60_000), status: "pending" },
      ]);
    const where = vi.fn(async () => undefined);
    const set = vi.fn(() => ({ where }));
    const escalate = vi.fn(async () => ({ id: "task-1" }));

    vi.doMock("@cerniq/db", () => ({
      db: {
        query: {
          approvalTasks: { findMany },
        },
        update: vi.fn(() => ({ set })),
      },
      approvalTasks: {
        id: "id",
        tenantId: "tenantId",
        status: "status",
        metadata: "metadata",
        createdAt: "createdAt",
        dueAt: "dueAt",
        updatedAt: "updatedAt",
      },
      approvalService: { escalate },
      sql: (parts: TemplateStringsArray) => parts.join(""),
      setSessionTenantId: vi.fn(async () => undefined),
    }));

    const { hitlEscalationProcessor } = await import("./hitl-escalation.js");
    const result = await hitlEscalationProcessor({
      id: "job-hitl-escalate",
      data: { tenantId: "t1", correlationId: "corr-1" },
    } as never);

    expect(findMany).toHaveBeenCalledTimes(2);
    expect(escalate).toHaveBeenCalledWith({
      tenantId: "t1",
      taskId: "task-1",
      reason: "SLA breach reached 100%",
    });
    expect(result).toMatchObject({ ok: true, status: "success", escalatedCount: 1 });
  });
});

describe("S4 integration - HITL resume worker", () => {
  it("aplica decizia quality_review approved si enqueuie promotion", async () => {
    const addQueueJob = vi.fn(async () => undefined);
    const patchCompanyMetadata = vi.fn(async () => undefined);
    const where = vi.fn(async () => undefined);
    const set = vi.fn(() => ({ where }));

    vi.doMock("./pipeline-utils.js", () => ({
      addQueueJob,
      patchCompanyMetadata,
    }));
    vi.doMock("@cerniq/db", () => ({
      db: {
        query: {
          approvalTasks: {
            findFirst: vi.fn(async () => ({
              id: "a1",
              tenantId: "t1",
              entityId: "c1",
              status: "approved",
              decision: "approve",
              type: "quality_review",
              approvalType: "quality_review",
              metadata: {},
              decisionMetadata: {},
              decidedAt: new Date(),
            })),
          },
        },
        update: vi.fn(() => ({ set })),
      },
      setSessionTenantId: vi.fn(async () => undefined),
      approvalTasks: { tenantId: "tenantId", id: "id" },
      silverCompanies: { id: "id", metadata: "metadata" },
      silverDedupCandidates: {
        tenantId: "tenantId",
        companyAId: "companyAId",
        companyBId: "companyBId",
        metadata: "metadata",
      },
      sql: (parts: TemplateStringsArray) => parts.join(""),
    }));

    const { hitlResumeAfterApprovalProcessor } = await import("./hitl-resume-after-approval.js");
    const result = await hitlResumeAfterApprovalProcessor({
      id: "job-hitl-resume",
      data: { tenantId: "t1", approvalTaskId: "a1", correlationId: "corr-2" },
    } as never);

    expect(set).toHaveBeenCalled();
    expect(addQueueJob).toHaveBeenCalledWith(
      "pipeline:promote-to-gold",
      expect.objectContaining({ tenantId: "t1", companyId: "c1", force: true }),
    );
    expect(patchCompanyMetadata).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, status: "success", handled: "quality_review" });
  });
});
