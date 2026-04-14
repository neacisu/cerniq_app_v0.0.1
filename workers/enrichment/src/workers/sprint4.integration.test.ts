import { beforeEach, describe, expect, it, vi } from "vitest";

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const COMPANY_ID = "22222222-2222-4222-8222-222222222222";
const APPROVAL_TASK_ID = "33333333-3333-4333-8333-333333333333";

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
    vi.doMock("@cerniq/worker-shared", () => ({
      getImportExecutionContext: vi.fn(() => null),
      createQueue: vi.fn(() => ({
        add: vi.fn(async () => undefined),
        close: vi.fn(async () => undefined),
      })),
      withCognitiveSpan: vi.fn(async (_name: string, fn: (s: null) => unknown) => fn(null)),
      QUEUES: {
        PIPELINE_PROMOTE_TO_GOLD: "pipeline:promote:to-gold",
        PIPELINE_ORCHESTRATE: "pipeline:orchestrate",
        PIPELINE_PROMOTE_BRONZE_SILVER: "pipeline:promote:bronze-silver",
      },
    }));
    vi.doMock("./pipeline-utils.js", () => ({ createHitlApprovalTask: vi.fn(async () => "a1") }));

    const { qualityRollupProcessor } = await import("./o2-quality-rollup.js");
    const result = await qualityRollupProcessor({
      id: "j1",
      data: { tenantId: TENANT_ID, companyId: COMPANY_ID, correlationId: "corr-1" },
    } as never);

    expect(dbMock.update).toHaveBeenCalled();
    expect(dbMock.insert).toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, status: "success" });
  });
});

describe("S4 integration - orchestrator", () => {
  it("p1 declanseaza joburi post_validation", async () => {
    const sql = Object.assign((parts: TemplateStringsArray) => parts.join(""), {
      raw: (value: string) => value,
    });
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
      sql,
    }));
    vi.doMock("@cerniq/worker-shared", () => ({
      getImportExecutionContext: vi.fn(() => null),
      validateJobData: vi.fn(),
      silverEnrichmentDurationSeconds: { observe: vi.fn() },
      silverEnrichmentErrorsTotal: { inc: vi.fn() },
      withCognitiveSpan: vi.fn(async (_name: string, fn: (s: null) => unknown) => fn(null)),
    }));
    vi.doMock("./pipeline-utils.js", () => ({ addQueueJob: add }));

    const { pipelineOrchestratorProcessor } = await import("./p1-orchestrate.js");
    const result = await pipelineOrchestratorProcessor({
      id: "j2",
      data: {
        tenantId: TENANT_ID,
        companyId: COMPANY_ID,
        stage: "post_validation",
        correlationId: "corr-2",
      },
    } as never);

    expect(add).toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, status: "success", stage: "post_validation" });
  });

  it("p1 enfilează agri:culturi pentru companii cu CAEN agricol", async () => {
    const sql = Object.assign((parts: TemplateStringsArray) => parts.join(""), {
      raw: (value: string) => value,
    });
    const dbMock = {
      query: {
        silverCompanies: {
          findFirst: vi.fn(async () => ({
            id: "c1",
            tenantId: "t1",
            cui: "12345678",
            cuiValidated: true,
            codCaenPrincipal: "0111",
            denumire: "Agro SRL",
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
      sql,
    }));
    vi.doMock("@cerniq/worker-shared", () => ({
      getImportExecutionContext: vi.fn(() => null),
      validateJobData: vi.fn(),
      silverEnrichmentDurationSeconds: { observe: vi.fn() },
      silverEnrichmentErrorsTotal: { inc: vi.fn() },
      withCognitiveSpan: vi.fn(async (_name: string, fn: (s: null) => unknown) => fn(null)),
    }));
    vi.doMock("./pipeline-utils.js", () => ({ addQueueJob: add }));

    const { pipelineOrchestratorProcessor } = await import("./p1-orchestrate.js");
    await pipelineOrchestratorProcessor({
      id: "j-agri",
      data: {
        tenantId: TENANT_ID,
        companyId: COMPANY_ID,
        stage: "post_validation",
        correlationId: "corr-agri",
      },
    } as never);

    const culturiCalls = add.mock.calls.filter((c) => c[0] === "agri:culturi");
    expect(culturiCalls.length).toBe(1);
    expect(culturiCalls[0]?.[1]).toMatchObject({
      tenantId: TENANT_ID,
      companyId: COMPANY_ID,
      correlationId: "corr-agri",
      codCaen: "0111",
    });
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
    vi.doMock("@cerniq/worker-shared", () => ({
      getImportExecutionContext: vi.fn(() => null),
      createQueue: vi.fn(() => ({
        add,
        close: vi.fn(async () => undefined),
      })),
      withCognitiveSpan: vi.fn(async (_name: string, fn: (s: null) => unknown) => fn(null)),
    }));
    vi.doMock("./pipeline-utils.js", () => ({ createHitlApprovalTask: vi.fn(async () => "a1") }));

    const { pipelineErrorHandlerProcessor } = await import("./p4-error-handler.js");
    const result = await pipelineErrorHandlerProcessor({
      id: "job-p4",
      data: {
        tenantId: TENANT_ID,
        companyId: COMPANY_ID,
        errorType: "API_TIMEOUT",
        errorMessage: "timeout",
        sourceWorker: "enrich:anaf:fiscal-status",
        sourcePayload: { tenantId: TENANT_ID, companyId: COMPANY_ID, cui: "12345678" },
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
    vi.doMock("@cerniq/worker-shared", () => ({
      getImportExecutionContext: vi.fn(() => null),
      validateJobData: vi.fn(),
      hitlTasksResolvedTotal: { inc: vi.fn() },
      hitlResolutionTimeSeconds: { observe: vi.fn() },
      recordDataMutation: vi.fn(async () => undefined),
      createQueue: vi.fn(() => ({
        add: vi.fn(async () => undefined),
        close: vi.fn(async () => undefined),
      })),
      withCognitiveSpan: vi.fn(async (_name: string, fn: (s: null) => unknown) => fn(null)),
      QUEUES: {
        PIPELINE_PROMOTE_TO_GOLD: "pipeline:promote:to-gold",
        PIPELINE_ORCHESTRATE: "pipeline:orchestrate",
        PIPELINE_PROMOTE_BRONZE_SILVER: "pipeline:promote:bronze-silver",
        HITL_RESUME_AFTER_APPROVAL: "hitl:resume-after-approval",
      },
    }));
    vi.doMock("@cerniq/db", () => ({
      db: {
        query: {
          approvalTasks: {
            findFirst: vi.fn(async () => ({
              id: APPROVAL_TASK_ID,
              tenantId: TENANT_ID,
              entityId: COMPANY_ID,
              status: "approved",
              decision: "approve",
              type: "quality_review",
              approvalType: "quality_review",
              metadata: {},
              decisionMetadata: {},
              createdAt: new Date(),
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
      data: { tenantId: TENANT_ID, approvalTaskId: APPROVAL_TASK_ID, correlationId: "corr-2" },
    } as never);

    expect(set).toHaveBeenCalled();
    expect(addQueueJob).toHaveBeenCalledWith(
      "pipeline:promote:to-gold",
      expect.objectContaining({ tenantId: TENANT_ID, companyId: COMPANY_ID, force: true }),
    );
    expect(patchCompanyMetadata).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: true, status: "success", handled: "quality_review" });
  });
});
