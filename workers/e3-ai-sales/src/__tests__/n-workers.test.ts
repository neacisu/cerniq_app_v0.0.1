/**
 * n-workers.test.ts
 * Teste complete pentru Workers N76-N78 HITL E3 — Human-In-The-Loop.
 *
 * Acoperire:
 *  - N76 human:escalate: creare approval task E3, escaladeReason → priority, metrici guardrail
 *  - N77 human:takeover: endedAt pe aiConversations, history log, metrici
 *  - N78 human:approve: APPROVE/REJECT/MODIFY, resolution time, history log triggered_by_type=user
 *  - Edge cases: negotiation not found, task already decided, no operatorId, no conversationId
 *
 * Pattern DB: db.select().from().where().limit(1) — consistent cu toți workerii E3.
 * E3 schema nu este înregistrată în client.ts schema (doar approval, gold, outreach etc.),
 * deci db.query.goldNegotiations nu există pe tip.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── DB mock (hoisted) ───────────────────────────────────────────────────────
const {
  setSessionTenantIdMock,
  dbInsertMock,
  dbUpdateMock,
  dbSelectResultMock,
  dbSelectMock,
  createApprovalTaskMock,
  decideMock,
  aiGuardrailBreachesTotalMock,
  hitlTasksResolvedTotalMock,
  hitlResolutionTimeSecondsMock,
} = vi.hoisted(() => {
  const setSessionTenantIdMock = vi.fn().mockResolvedValue(undefined);
  const dbInsertMock = vi.fn().mockReturnValue({
    values: vi.fn().mockResolvedValue([]),
  });
  const dbUpdateMock = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  });

  // Controlăm rezultatul final al lanțului .select().from().where().limit()
  const dbSelectResultMock = vi.fn().mockResolvedValue([]);

  // Lanț de chaining: select → from → where → limit (calls dbSelectResultMock)
  const dbSelectMock = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: dbSelectResultMock,
      }),
    }),
  });

  const createApprovalTaskMock = vi.fn().mockResolvedValue({ id: "task-1" });
  const decideMock = vi.fn().mockResolvedValue({ id: "task-1", status: "approved" });
  const aiGuardrailBreachesTotalMock = { inc: vi.fn() };
  const hitlTasksResolvedTotalMock = { inc: vi.fn() };
  const hitlResolutionTimeSecondsMock = { observe: vi.fn() };

  return {
    setSessionTenantIdMock,
    dbInsertMock,
    dbUpdateMock,
    dbSelectResultMock,
    dbSelectMock,
    createApprovalTaskMock,
    decideMock,
    aiGuardrailBreachesTotalMock,
    hitlTasksResolvedTotalMock,
    hitlResolutionTimeSecondsMock,
  };
});

vi.mock("@cerniq/db", () => ({
  setSessionTenantId: setSessionTenantIdMock,
  approvalService: {
    createTask: createApprovalTaskMock,
    decide: decideMock,
  },
  db: {
    select: dbSelectMock,
    insert: dbInsertMock,
    update: dbUpdateMock,
  },
  goldNegotiations: {
    tenantId: "gn_tenantId",
    id: "gn_id",
    currentState: "gn_currentState",
    assignedUserId: "gn_assignedUserId",
  },
  aiConversations: {
    tenantId: "ac_tenantId",
    id: "ac_id",
    endedAt: "ac_endedAt",
  },
  negotiationStateHistory: {},
  approvalTasks: {
    tenantId: "at_tenantId",
    id: "at_id",
    status: "at_status",
    approvalType: "at_approvalType",
    createdAt: "at_createdAt",
  },
  eq: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
}));

vi.mock("@cerniq/worker-shared", () => ({
  withCognitiveSpan: vi.fn((_, fn: (span: object) => unknown) => fn({})),
  aiGuardrailBreachesTotal: aiGuardrailBreachesTotalMock,
  hitlTasksResolvedTotal: hitlTasksResolvedTotalMock,
  hitlResolutionTimeSeconds: hitlResolutionTimeSecondsMock,
}));

// ── Imports după mock-uri ───────────────────────────────────────────────────
import { humanEscalateProcessor } from "../workers/n76-human-escalate.js";
import { humanTakeoverProcessor } from "../workers/n77-human-takeover.js";
import { humanApproveProcessor } from "../workers/n78-human-approve.js";

// ── Helper makeJob ──────────────────────────────────────────────────────────
// Returnăm `never` via double-cast pentru a evita conflictul de tipuri
// Job<HumanEscalateJobData> vs Job<HumanApproveJobData> etc. în teste.
// BullMQ's Job<T> are 60+ câmpuri opționale — testele verifică doar logica workerului.
function makeJob<T>(data: T) {
  return { data, id: "job-1", name: "test-job" } as unknown as never;
}

// ── Fixture-uri reutilizabile ───────────────────────────────────────────────
const NEGOTIATION_FIXTURE = {
  id: "neg-1",
  currentState: "NEGOTIATION",
  assignedUserId: null,
};

const NEGOTIATION_PROPOSAL_FIXTURE = {
  id: "neg-1",
  currentState: "PROPOSAL",
  assignedUserId: null,
};

const APPROVAL_TASK_FIXTURE = {
  id: "task-1",
  tenantId: "tenant-1",
  status: "pending",
  approvalType: "manual_verification",
  createdAt: new Date(Date.now() - 3_600_000),
};

// ===========================================================================
// N76 — human:escalate
// ===========================================================================
describe("N76 humanEscalateProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // mockReset curăță coada mockResolvedValueOnce lăsată de teste anterioare
    dbSelectResultMock.mockReset();
    dbSelectResultMock.mockResolvedValue([NEGOTIATION_FIXTURE]);
    createApprovalTaskMock.mockResolvedValue({ id: "task-1" });
  });

  it("apelează setSessionTenantId cu tenantId corect", async () => {
    await humanEscalateProcessor(
      makeJob({
        tenantId: "t-1",
        negotiationId: "neg-1",
        escalateReason: "client_requested" as const,
      }),
      {} as never,
    );
    expect(setSessionTenantIdMock).toHaveBeenCalledWith("t-1");
  });

  it("returnează negotiation_not_found dacă negocierea nu există", async () => {
    dbSelectResultMock.mockReset();
    dbSelectResultMock.mockResolvedValue([]);
    const result = await humanEscalateProcessor(
      makeJob({
        tenantId: "t-1",
        negotiationId: "neg-99",
        escalateReason: "client_requested" as const,
      }),
      {} as never,
    );
    expect(result).toMatchObject({ ok: false, status: "negotiation_not_found" });
    expect(createApprovalTaskMock).not.toHaveBeenCalled();
  });

  it("creează approval task cu priority=critical pentru guardrail_3x_fail", async () => {
    const result = await humanEscalateProcessor(
      makeJob({
        tenantId: "t-1",
        negotiationId: "neg-1",
        escalateReason: "guardrail_3x_fail" as const,
        context: { guardrailFailCount: 3, guardrailType: "price" },
      }),
      {} as never,
    );
    expect(createApprovalTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        priority: "critical",
        etapa: "E3",
        pipelineStage: "E3",
        approvalType: "manual_verification",
      }),
    );
    expect(result).toMatchObject({ ok: true, status: "escalated", approvalTaskId: "task-1" });
  });

  it("creează approval task cu priority=critical pentru discount_director", async () => {
    await humanEscalateProcessor(
      makeJob({
        tenantId: "t-1",
        negotiationId: "neg-1",
        escalateReason: "discount_director" as const,
        context: { discountPct: 35 },
      }),
      {} as never,
    );
    expect(createApprovalTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({ priority: "critical" }),
    );
  });

  it("creează approval task cu priority=high pentru sentiment_negative", async () => {
    await humanEscalateProcessor(
      makeJob({
        tenantId: "t-1",
        negotiationId: "neg-1",
        escalateReason: "sentiment_negative" as const,
        context: { sentimentScore: -0.7 },
      }),
      {} as never,
    );
    expect(createApprovalTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({ priority: "high" }),
    );
  });

  it("incrementează metrica aiGuardrailBreachesTotal pentru guardrail_3x_fail cu guardrailType", async () => {
    await humanEscalateProcessor(
      makeJob({
        tenantId: "t-1",
        negotiationId: "neg-1",
        escalateReason: "guardrail_3x_fail" as const,
        context: { guardrailType: "price" },
      }),
      {} as never,
    );
    expect(aiGuardrailBreachesTotalMock.inc).toHaveBeenCalledWith({
      guardrail_type: "price",
      severity: "CRITICAL",
    });
  });

  it("NU incrementează metrica aiGuardrailBreachesTotal pentru client_requested", async () => {
    await humanEscalateProcessor(
      makeJob({
        tenantId: "t-1",
        negotiationId: "neg-1",
        escalateReason: "client_requested" as const,
      }),
      {} as never,
    );
    expect(aiGuardrailBreachesTotalMock.inc).not.toHaveBeenCalled();
  });

  it("NU incrementează metrica aiGuardrailBreachesTotal pentru guardrail_3x_fail fără guardrailType", async () => {
    await humanEscalateProcessor(
      makeJob({
        tenantId: "t-1",
        negotiationId: "neg-1",
        escalateReason: "guardrail_3x_fail" as const,
        context: { guardrailFailCount: 3 }, // fără guardrailType
      }),
      {} as never,
    );
    expect(aiGuardrailBreachesTotalMock.inc).not.toHaveBeenCalled();
  });

  it("apelează db.update goldNegotiations după creare task", async () => {
    await humanEscalateProcessor(
      makeJob({
        tenantId: "t-1",
        negotiationId: "neg-1",
        escalateReason: "client_requested" as const,
      }),
      {} as never,
    );
    expect(dbUpdateMock).toHaveBeenCalled();
  });

  it("returnează ok=true cu toate câmpurile necesare", async () => {
    const result = (await humanEscalateProcessor(
      makeJob({
        tenantId: "t-1",
        negotiationId: "neg-1",
        escalateReason: "low_confidence" as const,
        context: { aiConfidence: 0.2 },
      }),
      {} as never,
    )) as {
      ok: boolean;
      status: string;
      approvalTaskId: string;
      negotiationId: string;
      priority: string;
      escalateReason: string;
    };
    expect(result.ok).toBe(true);
    expect(result.approvalTaskId).toBe("task-1");
    expect(result.priority).toBe("high");
    expect(result.escalateReason).toBe("low_confidence");
  });
});

// ===========================================================================
// N77 — human:takeover
// ===========================================================================
describe("N77 humanTakeoverProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbSelectResultMock.mockReset();
    dbSelectResultMock.mockResolvedValue([NEGOTIATION_FIXTURE]);
  });

  it("apelează setSessionTenantId cu tenantId corect", async () => {
    await humanTakeoverProcessor(makeJob({ tenantId: "t-1", negotiationId: "neg-1" }), {} as never);
    expect(setSessionTenantIdMock).toHaveBeenCalledWith("t-1");
  });

  it("returnează negotiation_not_found dacă negocierea nu există", async () => {
    dbSelectResultMock.mockReset();
    dbSelectResultMock.mockResolvedValue([]);
    const result = await humanTakeoverProcessor(
      makeJob({ tenantId: "t-1", negotiationId: "neg-99" }),
      {} as never,
    );
    expect(result).toMatchObject({ ok: false, status: "negotiation_not_found" });
  });

  it("actualizează aiConversations.endedAt când conversationId este furnizat", async () => {
    await humanTakeoverProcessor(
      makeJob({ tenantId: "t-1", negotiationId: "neg-1", conversationId: "conv-1" }),
      {} as never,
    );
    expect(dbUpdateMock).toHaveBeenCalled();
  });

  it("NU actualizează aiConversations când conversationId lipsește", async () => {
    await humanTakeoverProcessor(makeJob({ tenantId: "t-1", negotiationId: "neg-1" }), {} as never);
    expect(dbUpdateMock).not.toHaveBeenCalled();
  });

  it("inserează în negotiationStateHistory cu reason conținând human_takeover", async () => {
    await humanTakeoverProcessor(
      makeJob({ tenantId: "t-1", negotiationId: "neg-1", operatorId: "op-1" }),
      {} as never,
    );
    expect(dbInsertMock).toHaveBeenCalled();
    const insertCallArg = dbInsertMock.mock.calls.at(0);
    expect(insertCallArg).toBeDefined();
  });

  it("incrementează aiGuardrailBreachesTotal cu guardrail_type=human_takeover", async () => {
    await humanTakeoverProcessor(makeJob({ tenantId: "t-1", negotiationId: "neg-1" }), {} as never);
    expect(aiGuardrailBreachesTotalMock.inc).toHaveBeenCalledWith({
      guardrail_type: "human_takeover",
      severity: "HIGH",
    });
  });

  it("incrementează hitlTasksResolvedTotal", async () => {
    await humanTakeoverProcessor(makeJob({ tenantId: "t-1", negotiationId: "neg-1" }), {} as never);
    expect(hitlTasksResolvedTotalMock.inc).toHaveBeenCalledWith(
      expect.objectContaining({ decision: "approve", tenant_id: "t-1" }),
    );
  });

  it("returnează ok=true cu status=handed_off și negotiationState", async () => {
    const result = (await humanTakeoverProcessor(
      makeJob({ tenantId: "t-1", negotiationId: "neg-1", operatorId: "op-1" }),
      {} as never,
    )) as { ok: boolean; status: string; negotiationState: string };
    expect(result.ok).toBe(true);
    expect(result.status).toBe("handed_off");
    expect(result.negotiationState).toBe("NEGOTIATION");
  });

  it("returnează conversationId null când nu este furnizat", async () => {
    const result = (await humanTakeoverProcessor(
      makeJob({ tenantId: "t-1", negotiationId: "neg-1" }),
      {} as never,
    )) as { conversationId: null };
    expect(result.conversationId).toBeNull();
  });
});

// ===========================================================================
// N78 — human:approve
// ===========================================================================
describe("N78 humanApproveProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // N78 face 2 select-uri: prima pentru approvalTasks, a doua pentru goldNegotiations.
    // mockReset + mockResolvedValueOnce×2 asigură comportament determinist per test.
    dbSelectResultMock.mockReset();
    dbSelectResultMock
      .mockResolvedValueOnce([APPROVAL_TASK_FIXTURE]) // call 1: approvalTasks
      .mockResolvedValueOnce([NEGOTIATION_PROPOSAL_FIXTURE]); // call 2: goldNegotiations
    decideMock.mockResolvedValue({ id: "task-1", status: "approved" });
  });

  it("apelează setSessionTenantId cu tenantId corect", async () => {
    await humanApproveProcessor(
      makeJob({
        tenantId: "t-1",
        approvalTaskId: "task-1",
        negotiationId: "neg-1",
        decision: "APPROVE" as const,
      }),
      {} as never,
    );
    expect(setSessionTenantIdMock).toHaveBeenCalledWith("t-1");
  });

  it("returnează task_not_found dacă task-ul nu există", async () => {
    dbSelectResultMock.mockReset();
    dbSelectResultMock.mockResolvedValueOnce([]); // approvalTasks: empty
    const result = await humanApproveProcessor(
      makeJob({
        tenantId: "t-1",
        approvalTaskId: "task-99",
        negotiationId: "neg-1",
        decision: "APPROVE" as const,
      }),
      {} as never,
    );
    expect(result).toMatchObject({ ok: false, status: "task_not_found" });
    expect(decideMock).not.toHaveBeenCalled();
  });

  it("returnează skipped dacă task-ul este deja rezolvat (approved)", async () => {
    dbSelectResultMock.mockReset();
    dbSelectResultMock.mockResolvedValueOnce([
      {
        id: "task-1",
        tenantId: "t-1",
        status: "approved",
        approvalType: "manual_verification",
        createdAt: new Date(),
      },
    ]);
    const result = (await humanApproveProcessor(
      makeJob({
        tenantId: "t-1",
        approvalTaskId: "task-1",
        negotiationId: "neg-1",
        decision: "APPROVE" as const,
      }),
      {} as never,
    )) as { ok: boolean; status: string };
    expect(result.ok).toBe(true);
    expect(result.status).toBe("skipped");
  });

  it("returnează skipped dacă task-ul este în stare rejected", async () => {
    dbSelectResultMock.mockReset();
    dbSelectResultMock.mockResolvedValueOnce([
      {
        id: "task-1",
        tenantId: "t-1",
        status: "rejected",
        approvalType: "manual_verification",
        createdAt: new Date(),
      },
    ]);
    const result = (await humanApproveProcessor(
      makeJob({
        tenantId: "t-1",
        approvalTaskId: "task-1",
        negotiationId: "neg-1",
        decision: "APPROVE" as const,
      }),
      {} as never,
    )) as { ok: boolean; status: string; reason: string };
    expect(result.ok).toBe(true);
    expect(result.status).toBe("skipped");
    expect(result.reason).toBe("task_already_rejected");
  });

  it("apelează approvalService.decide cu drizzleDecision=approve pentru APPROVE", async () => {
    await humanApproveProcessor(
      makeJob({
        tenantId: "t-1",
        approvalTaskId: "task-1",
        negotiationId: "neg-1",
        decision: "APPROVE" as const,
        actorId: "op-1",
      }),
      {} as never,
    );
    expect(decideMock).toHaveBeenCalledWith(
      expect.objectContaining({ decision: "approve", actorId: "op-1" }),
    );
  });

  it("apelează approvalService.decide cu drizzleDecision=reject pentru REJECT", async () => {
    await humanApproveProcessor(
      makeJob({
        tenantId: "t-1",
        approvalTaskId: "task-1",
        negotiationId: "neg-1",
        decision: "REJECT" as const,
      }),
      {} as never,
    );
    expect(decideMock).toHaveBeenCalledWith(expect.objectContaining({ decision: "reject" }));
  });

  it("apelează approvalService.decide cu drizzleDecision=approve pentru MODIFY", async () => {
    await humanApproveProcessor(
      makeJob({
        tenantId: "t-1",
        approvalTaskId: "task-1",
        negotiationId: "neg-1",
        decision: "MODIFY" as const,
        modifiedData: { discountPct: 12 },
      }),
      {} as never,
    );
    expect(decideMock).toHaveBeenCalledWith(expect.objectContaining({ decision: "approve" }));
  });

  it("inserează în negotiationStateHistory cu reason conținând triggered_by_type=user", async () => {
    await humanApproveProcessor(
      makeJob({
        tenantId: "t-1",
        approvalTaskId: "task-1",
        negotiationId: "neg-1",
        decision: "APPROVE" as const,
      }),
      {} as never,
    );
    expect(dbInsertMock).toHaveBeenCalled();
  });

  it("incrementează hitlTasksResolvedTotal cu decision=approve", async () => {
    await humanApproveProcessor(
      makeJob({
        tenantId: "t-1",
        approvalTaskId: "task-1",
        negotiationId: "neg-1",
        decision: "APPROVE" as const,
      }),
      {} as never,
    );
    expect(hitlTasksResolvedTotalMock.inc).toHaveBeenCalledWith(
      expect.objectContaining({ decision: "approve", tenant_id: "t-1" }),
    );
  });

  it("observă hitlResolutionTimeSeconds când task are createdAt", async () => {
    await humanApproveProcessor(
      makeJob({
        tenantId: "t-1",
        approvalTaskId: "task-1",
        negotiationId: "neg-1",
        decision: "APPROVE" as const,
      }),
      {} as never,
    );
    expect(hitlResolutionTimeSecondsMock.observe).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: "t-1" }),
      expect.any(Number),
    );
  });

  it("NU observă hitlResolutionTimeSeconds când task nu are createdAt", async () => {
    dbSelectResultMock.mockReset();
    dbSelectResultMock
      .mockResolvedValueOnce([
        {
          id: "task-1",
          tenantId: "t-1",
          status: "pending",
          approvalType: "manual_verification",
          createdAt: null, // fără createdAt
        },
      ])
      .mockResolvedValueOnce([NEGOTIATION_PROPOSAL_FIXTURE]);
    await humanApproveProcessor(
      makeJob({
        tenantId: "t-1",
        approvalTaskId: "task-1",
        negotiationId: "neg-1",
        decision: "APPROVE" as const,
      }),
      {} as never,
    );
    expect(hitlResolutionTimeSecondsMock.observe).not.toHaveBeenCalled();
  });

  it("returnează ok=true cu toate câmpurile necesare", async () => {
    const result = (await humanApproveProcessor(
      makeJob({
        tenantId: "t-1",
        approvalTaskId: "task-1",
        negotiationId: "neg-1",
        decision: "APPROVE" as const,
        pendingAction: "send_offer",
      }),
      {} as never,
    )) as {
      ok: boolean;
      status: string;
      approvalTaskId: string;
      decision: string;
      pendingAction: string;
    };
    expect(result.ok).toBe(true);
    expect(result.status).toBe("processed");
    expect(result.approvalTaskId).toBe("task-1");
    expect(result.decision).toBe("APPROVE");
    expect(result.pendingAction).toBe("send_offer");
  });

  it("NU inserează în history când negocierea nu se găsește", async () => {
    dbSelectResultMock.mockReset();
    dbSelectResultMock
      .mockResolvedValueOnce([APPROVAL_TASK_FIXTURE]) // approvalTasks: found
      .mockResolvedValueOnce([]); // goldNegotiations: not found
    await humanApproveProcessor(
      makeJob({
        tenantId: "t-1",
        approvalTaskId: "task-1",
        negotiationId: "neg-99",
        decision: "APPROVE" as const,
      }),
      {} as never,
    );
    expect(dbInsertMock).not.toHaveBeenCalled();
  });

  it("decide cu metadata corectă pentru MODIFY cu modifiedData", async () => {
    const modifiedData = { discountPct: 15, note: "Aprobat parțial" };
    await humanApproveProcessor(
      makeJob({
        tenantId: "t-1",
        approvalTaskId: "task-1",
        negotiationId: "neg-1",
        decision: "MODIFY" as const,
        modifiedData,
        pendingAction: "apply_discount",
        actorId: "manager-1",
        correlationId: "corr-123",
      }),
      {} as never,
    );
    expect(decideMock).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: "approve",
        actorId: "manager-1",
        metadata: expect.objectContaining({
          decision: "MODIFY",
          modifiedData,
          pendingAction: "apply_discount",
          correlationId: "corr-123",
        }),
      }),
    );
  });
});
