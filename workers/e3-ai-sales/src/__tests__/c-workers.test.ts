/**
 * Teste complete pentru workers C13-C18 (E3 AI Sales — AI Agent Core).
 *
 * Pattern vitest: vi.hoisted() + vi.mock() pentru mock-uri mutabile per test.
 * Acoperire:
 *  C13: context build success, negociere lipsă → throw, truncare history
 *  C14: orchestrate success, fallback model, tool call extragere
 *  C15: clean think blocks, simple complexity fastChat, detect language
 *  C16: all guardrails pass, violation → retry, violation → HITL escalare
 *  C17: creare conversație nouă, store mesaje, store cu tool calls, marker validated
 *  C18: retry < max, retry >= max → HITL escalare
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── vi.hoisted() — variabile accesibile în factory-urile vi.mock ───────────────

const {
  dbSelectMock,
  dbInsertMock,
  dbUpdateMock,
  setSessionTenantIdMock,
  fastChatMock,
  reasoningChatMock,
  addMock,
  createQueueMock,
} = vi.hoisted(() => {
  const addMock = vi.fn().mockResolvedValue({ id: "job-123" });
  const createQueueMock = vi.fn(() => ({ add: addMock }));

  return {
    dbSelectMock: vi.fn(),
    dbInsertMock: vi.fn(),
    dbUpdateMock: vi.fn(),
    setSessionTenantIdMock: vi.fn().mockResolvedValue(undefined),
    fastChatMock: vi.fn(),
    reasoningChatMock: vi.fn(),
    addMock,
    createQueueMock,
  };
});

// ── vi.mock() ──────────────────────────────────────────────────────────────────

vi.mock("@cerniq/db", () => ({
  db: {
    select: dbSelectMock,
    insert: dbInsertMock,
    update: dbUpdateMock,
    execute: vi.fn().mockResolvedValue([]),
  },
  setSessionTenantId: setSessionTenantIdMock,
  goldCompanies: {
    id: "id",
    tenantId: "tenant_id",
    name: "name",
  },
  goldNegotiations: {
    id: "id",
    tenantId: "tenant_id",
    currentState: "current_state",
    engagementScore: "engagement_score",
    closeProbability: "close_probability",
    totalValue: "total_value",
  },
  aiConversations: {
    id: "id",
    tenantId: "tenant_id",
    leadId: "lead_id",
    negotiationId: "negotiation_id",
    sessionId: "session_id",
    modelUsed: "model_used",
    startedAt: "started_at",
    endedAt: "ended_at",
    totalTokens: "total_tokens",
  },
  aiConversationMessages: {
    id: "id",
    tenantId: "tenant_id",
    conversationId: "conversation_id",
    role: "role",
    content: "content",
    tokens: "tokens",
    createdAt: "created_at",
  },
  aiToolCalls: {
    id: "id",
    tenantId: "tenant_id",
    conversationId: "conversation_id",
    messageId: "message_id",
    toolName: "tool_name",
    input: "input",
    output: "output",
    durationMs: "duration_ms",
    success: "success",
  },
  fsmStateAllowedTools: {
    id: "id",
    fsmType: "fsm_type",
    state: "state",
    toolName: "tool_name",
  },
  guardrailViolations: {
    id: "id",
    tenantId: "tenant_id",
    nodeKey: "node_key",
    violationType: "violation_type",
    severity: "severity",
    details: "details",
  },
  negotiationItems: {
    id: "id",
    tenantId: "tenant_id",
    negotiationId: "negotiation_id",
  },
  goldProducts: {
    id: "id",
    tenantId: "tenant_id",
    sku: "sku",
    unitPrice: "unit_price",
    isActive: "is_active",
  },
  priceRules: {
    id: "id",
    tenantId: "tenant_id",
    productId: "product_id",
    minMarginPct: "min_margin_pct",
  },
  eq: vi.fn((_a: unknown, _b: unknown) => ({ type: "eq" })),
  and: vi.fn((..._args: unknown[]) => ({ type: "and" })),
  desc: vi.fn((_a: unknown) => ({ type: "desc" })),
  sql: Object.assign(
    vi.fn((_strings: TemplateStringsArray, ..._values: unknown[]) => ({ type: "sql" })),
    { raw: vi.fn((s: string) => ({ type: "sql-raw", s })) },
  ),
  inArray: vi.fn((_a: unknown, _b: unknown) => ({ type: "inArray" })),
}));

vi.mock("@cerniq/worker-shared", () => ({
  createQueue: createQueueMock,
  DEFAULT_JOB_OPTIONS: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
  QUEUES: {
    E3_AI_CONTEXT_BUILD: "ai:context:build",
    E3_AI_AGENT_ORCHESTRATE: "ai:agent:orchestrate",
    E3_AI_RESPONSE_GENERATE: "ai:e3:response:generate",
    E3_AI_RESPONSE_VALIDATE: "ai:response:validate",
    E3_AI_CONVERSATION_STORE: "ai:conversation:store",
    E3_AI_RETRY_REGENERATE: "ai:retry:regenerate",
    HITL_ESCALATION: "hitl:escalate",
  },
}));

vi.mock("../lib/llm-client.js", () => ({
  fastChat: fastChatMock,
  reasoningChat: reasoningChatMock,
}));

vi.mock("../lib/guardrails.js", () => ({
  runPriceCheck: vi.fn().mockResolvedValue({ passed: true, guardrailType: "price" }),
  runStockCheck: vi.fn().mockResolvedValue({ passed: true, guardrailType: "stock" }),
  runDiscountCheck: vi.fn().mockResolvedValue({ passed: true, guardrailType: "discount" }),
  runSkuValidate: vi.fn().mockResolvedValue({ passed: true, guardrailType: "sku" }),
  runFiscalValidate: vi.fn().mockResolvedValue({ passed: true, guardrailType: "fiscal" }),
  persistGuardrailViolation: vi.fn().mockResolvedValue(undefined),
}));

// ── Helper builders ────────────────────────────────────────────────────────────

function makeSelectChain(rows: unknown[]) {
  const basePromise = Promise.resolve(rows);
  const chain = Object.assign(basePromise, {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn().mockResolvedValue(rows),
    orderBy: vi.fn(),
  });
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  chain.limit.mockResolvedValue(rows);
  return chain;
}

function makeInsertChain() {
  return { values: vi.fn().mockResolvedValue(undefined) };
}

function makeUpdateChain() {
  const setChain = { where: vi.fn().mockResolvedValue({ rowCount: 1 }) };
  return { set: vi.fn().mockReturnValue(setChain) };
}

function makeJob<T>(data: T) {
  return { data, id: "test-job-1", name: "test" } as { data: T; id: string; name: string };
}

// ── Reset ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  setSessionTenantIdMock.mockResolvedValue(undefined);
  addMock.mockResolvedValue({ id: "job-123" });
  createQueueMock.mockReturnValue({ add: addMock });
});

// ── C13: ai:context:build ──────────────────────────────────────────────────────

describe("C13 — aiContextBuildProcessor", () => {
  it("success — context build complet cu conversație existentă", async () => {
    let selectCall = 0;
    dbSelectMock.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) return makeSelectChain([{ id: "lead-1", name: "Acme SRL" }]);
      if (selectCall === 2)
        return makeSelectChain([
          {
            id: "neg-1",
            currentState: "PROPOSAL",
            engagementScore: "75",
            closeProbability: "60",
            totalValue: "50000",
          },
        ]);
      if (selectCall === 3) return makeSelectChain([{ id: "conv-1" }]);
      if (selectCall === 4)
        return makeSelectChain([
          { role: "user", content: "Vreau ofertă" },
          { role: "assistant", content: "Iată oferta" },
        ]);
      return makeSelectChain([{ toolName: "get_price" }, { toolName: "check_stock" }]);
    });

    const { aiContextBuildProcessor } = await import("../workers/c13-ai-context-build.js");

    const job = makeJob({
      tenantId: "tenant-1",
      sessionId: "sess-1",
      leadId: "lead-1",
      negotiationId: "neg-1",
      userMessage: "Cât costă produsul X?",
    });

    const result = await aiContextBuildProcessor(job as never, {} as never);

    expect(result).toMatchObject({ ok: true, sessionId: "sess-1" });
    expect(typeof (result as { contextTokens: number }).contextTokens).toBe("number");
    expect(setSessionTenantIdMock).toHaveBeenCalledWith("tenant-1");
    expect(addMock).toHaveBeenCalledWith(
      "ai:agent:orchestrate",
      expect.objectContaining({ sessionId: "sess-1", tenantId: "tenant-1" }),
      expect.any(Object),
    );
  });

  it("success — fără conversație existentă (prima interacțiune)", async () => {
    let selectCall = 0;
    dbSelectMock.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) return makeSelectChain([{ id: "lead-2", name: "Beta SRL" }]);
      if (selectCall === 2)
        return makeSelectChain([
          {
            id: "neg-2",
            currentState: "DISCOVERY",
            engagementScore: null,
            closeProbability: null,
            totalValue: null,
          },
        ]);
      if (selectCall === 3) return makeSelectChain([]); // fără conversație
      return makeSelectChain([]); // fără tool-uri
    });

    const { aiContextBuildProcessor } = await import("../workers/c13-ai-context-build.js");

    const job = makeJob({
      tenantId: "tenant-2",
      sessionId: "sess-2",
      leadId: "lead-2",
      negotiationId: "neg-2",
      userMessage: "Bună ziua!",
    });

    const result = await aiContextBuildProcessor(job as never, {} as never);

    expect(result).toMatchObject({ ok: true, sessionId: "sess-2" });
    expect(addMock).toHaveBeenCalledTimes(1);
  });

  it("throw — negociere inexistentă", async () => {
    let selectCall = 0;
    dbSelectMock.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) return makeSelectChain([{ id: "lead-1", name: "Acme SRL" }]);
      return makeSelectChain([]); // negociere nu există
    });

    const { aiContextBuildProcessor } = await import("../workers/c13-ai-context-build.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s1",
      leadId: "lead-1",
      negotiationId: "neg-missing",
      userMessage: "Test",
    });

    await expect(aiContextBuildProcessor(job as never, {} as never)).rejects.toThrow(
      "negotiation not found",
    );
  });

  it("systemPrompt conține starea FSM și tool-urile permise", async () => {
    let selectCall = 0;
    dbSelectMock.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) return makeSelectChain([{ id: "lead-3", name: "Gamma SA" }]);
      if (selectCall === 2)
        return makeSelectChain([
          {
            id: "neg-3",
            currentState: "NEGOTIATION",
            engagementScore: "85",
            closeProbability: "70",
            totalValue: "120000",
          },
        ]);
      if (selectCall === 3) return makeSelectChain([]);
      return makeSelectChain([{ toolName: "apply_discount" }, { toolName: "generate_proforma" }]);
    });

    const { aiContextBuildProcessor } = await import("../workers/c13-ai-context-build.js");

    const job = makeJob({
      tenantId: "t3",
      sessionId: "s3",
      leadId: "lead-3",
      negotiationId: "neg-3",
      userMessage: "Vrem reducere 15%",
    });

    await aiContextBuildProcessor(job as never, {} as never);

    const enqueuedPayload = addMock.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(enqueuedPayload).toBeDefined();
    expect(typeof enqueuedPayload?.["systemPrompt"]).toBe("string");
    const prompt = enqueuedPayload?.["systemPrompt"] as string;
    expect(prompt).toContain("NEGOTIATION");
    expect(Array.isArray(enqueuedPayload?.["allowedTools"])).toBe(true);
  });

  it("userMessage lung depășește MAX_CONTEXT_TOKENS → conversationHistory goală", async () => {
    let selectCall = 0;
    dbSelectMock.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) return makeSelectChain([{ id: "lead-4", name: "Epsilon SA" }]);
      if (selectCall === 2)
        return makeSelectChain([
          {
            id: "neg-4",
            currentState: "PROPOSAL",
            engagementScore: null,
            closeProbability: null,
            totalValue: null,
          },
        ]);
      if (selectCall === 3) return makeSelectChain([{ id: "conv-4" }]);
      if (selectCall === 4)
        return makeSelectChain([
          { role: "user", content: "Mesaj vechi 1" },
          { role: "assistant", content: "Răspuns vechi 1" },
        ]);
      return makeSelectChain([]);
    });

    const { aiContextBuildProcessor } = await import("../workers/c13-ai-context-build.js");

    const job = makeJob({
      tenantId: "tenant-4",
      sessionId: "sess-4",
      leadId: "lead-4",
      negotiationId: "neg-4",
      userMessage: "x".repeat(100_000), // ~25000 tokens → buget total epuizat
    });

    const result = await aiContextBuildProcessor(job as never, {} as never);

    expect(result).toMatchObject({ ok: true, sessionId: "sess-4" });
    const payload = addMock.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(Array.isArray(payload?.["conversationHistory"])).toBe(true);
    expect((payload?.["conversationHistory"] as unknown[]).length).toBe(0);
  });

  it("lead lipsă din DB → fallback 'Lead necunoscut', procesorul continuă fără throw", async () => {
    let selectCall = 0;
    dbSelectMock.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) return makeSelectChain([]); // lead nu există
      if (selectCall === 2)
        return makeSelectChain([
          {
            id: "neg-5",
            currentState: "DISCOVERY",
            engagementScore: null,
            closeProbability: null,
            totalValue: null,
          },
        ]);
      if (selectCall === 3) return makeSelectChain([]); // fără conversație
      return makeSelectChain([]); // fără tool-uri
    });

    const { aiContextBuildProcessor } = await import("../workers/c13-ai-context-build.js");

    const result = await aiContextBuildProcessor(
      makeJob({
        tenantId: "t5",
        sessionId: "s5",
        leadId: "lead-missing",
        negotiationId: "neg-5",
        userMessage: "Bună ziua",
      }) as never,
      {} as never,
    );

    expect(result).toMatchObject({ ok: true, sessionId: "s5" });
    const payload = addMock.mock.calls[0]?.[1] as Record<string, unknown>;
    const prompt = payload?.["systemPrompt"] as string;
    expect(prompt).toContain("Lead necunoscut");
  });

  it("system prompt conține '(niciun tool permis în această stare)' când tool-uri=[]", async () => {
    let selectCall = 0;
    dbSelectMock.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) return makeSelectChain([{ id: "lead-6", name: "Zeta SRL" }]);
      if (selectCall === 2)
        return makeSelectChain([
          {
            id: "neg-6",
            currentState: "DEAD",
            engagementScore: null,
            closeProbability: null,
            totalValue: null,
          },
        ]);
      if (selectCall === 3) return makeSelectChain([]); // fără conversație
      return makeSelectChain([]); // niciun tool permis în DEAD
    });

    const { aiContextBuildProcessor } = await import("../workers/c13-ai-context-build.js");

    await aiContextBuildProcessor(
      makeJob({
        tenantId: "t6",
        sessionId: "s6",
        leadId: "lead-6",
        negotiationId: "neg-6",
        userMessage: "Redeschide",
      }) as never,
      {} as never,
    );

    const payload = addMock.mock.calls[0]?.[1] as Record<string, unknown>;
    const prompt = payload?.["systemPrompt"] as string;
    expect(prompt).toContain("(niciun tool permis în această stare)");
    expect((payload?.["allowedTools"] as unknown[]).length).toBe(0);
  });

  it("enqueue C14 cu attemptNumber=1 întotdeauna", async () => {
    let selectCall = 0;
    dbSelectMock.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) return makeSelectChain([{ id: "lead-7", name: "Eta SA" }]);
      if (selectCall === 2)
        return makeSelectChain([
          {
            id: "neg-7",
            currentState: "PROPOSAL",
            engagementScore: "50",
            closeProbability: "40",
            totalValue: "10000",
          },
        ]);
      if (selectCall === 3) return makeSelectChain([]); // fără conversație
      return makeSelectChain([]);
    });

    const { aiContextBuildProcessor } = await import("../workers/c13-ai-context-build.js");

    await aiContextBuildProcessor(
      makeJob({
        tenantId: "t7",
        sessionId: "s7",
        leadId: "lead-7",
        negotiationId: "neg-7",
        userMessage: "Test",
      }) as never,
      {} as never,
    );

    const payload = addMock.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload?.["attemptNumber"]).toBe(1);
  });
});

// ── C13 helpers — truncateHistoryToTokenBudget ─────────────────────────────────

describe("C13 helpers — truncateHistoryToTokenBudget", () => {
  it("budget = 0 → array gol", async () => {
    const { truncateHistoryToTokenBudget } = await import("../workers/c13-ai-context-build.js");
    const history = [
      { role: "user", content: "Vreau ofertă" },
      { role: "assistant", content: "Iată oferta" },
    ];
    expect(truncateHistoryToTokenBudget(history, 0)).toEqual([]);
  });

  it("budget negativ → array gol", async () => {
    const { truncateHistoryToTokenBudget } = await import("../workers/c13-ai-context-build.js");
    const history = [{ role: "user", content: "Test" }];
    expect(truncateHistoryToTokenBudget(history, -500)).toEqual([]);
  });

  it("budget suficient → returnează întreg istoricul în ordine cronologică", async () => {
    const { truncateHistoryToTokenBudget } = await import("../workers/c13-ai-context-build.js");
    const history = [
      { role: "user", content: "Bună ziua" },
      { role: "assistant", content: "Bună!" },
      { role: "user", content: "Cât costă?" },
    ];
    const result = truncateHistoryToTokenBudget(history, 10_000);
    expect(result).toHaveLength(3);
    expect(result).toEqual(history);
  });

  it("istoric gol → returnează array gol", async () => {
    const { truncateHistoryToTokenBudget } = await import("../workers/c13-ai-context-build.js");
    expect(truncateHistoryToTokenBudget([], 1000)).toEqual([]);
  });

  it("buget parțial → păstrează mesajele cele mai recente în ordine cronologică", async () => {
    const { truncateHistoryToTokenBudget } = await import("../workers/c13-ai-context-build.js");
    // fiecare mesaj: "user: " + 100 chars = 106 chars ≈ 27 tokens
    const history = [
      { role: "user", content: "a".repeat(100) }, // msg 1 (oldest)
      { role: "user", content: "b".repeat(100) }, // msg 2
      { role: "user", content: "c".repeat(100) }, // msg 3
      { role: "user", content: "d".repeat(100) }, // msg 4
      { role: "user", content: "e".repeat(100) }, // msg 5 (newest)
    ];
    // budget 60 → ceil(106/4) = 27 tokens per mesaj
    // 2 mesaje = 54 ≤ 60 → fit; 3 mesaje = 81 > 60 → break
    const result = truncateHistoryToTokenBudget(history, 60);
    expect(result.length).toBe(2);
    // trebuie să fie cele 2 mai noi (msg 4 și msg 5), în ordine cronologică
    expect(result[0]).toEqual({ role: "user", content: "d".repeat(100) });
    expect(result[1]).toEqual({ role: "user", content: "e".repeat(100) });
  });

  it("un singur mesaj ce depășește bugetul → array gol", async () => {
    const { truncateHistoryToTokenBudget } = await import("../workers/c13-ai-context-build.js");
    // mesaj de 1000 chars = 250 tokens, budget = 100
    const history = [{ role: "user", content: "x".repeat(1000) }];
    expect(truncateHistoryToTokenBudget(history, 100)).toEqual([]);
  });

  it("ordine cronologică păstrată: cel mai vechi mesaj care încape e primul", async () => {
    const { truncateHistoryToTokenBudget } = await import("../workers/c13-ai-context-build.js");
    // 3 mesaje de ~10 tokens fiecare → toate încap în budget 500
    const history = [
      { role: "user", content: "primul" },
      { role: "assistant", content: "al doilea" },
      { role: "user", content: "al treilea" },
    ];
    const result = truncateHistoryToTokenBudget(history, 500);
    expect(result[0]?.content).toBe("primul");
    expect(result.at(-1)?.content).toBe("al treilea");
  });
});

// ── C14: ai:agent:orchestrate ──────────────────────────────────────────────────

describe("C14 — aiAgentOrchestrateProcessor", () => {
  it("success — QwQ-32B răspunde, enqueue C15", async () => {
    reasoningChatMock.mockResolvedValue({
      text: "Vă ofer un preț special de 1000 RON/buc pentru comenzi de 100+ bucăți.",
      modelUsed: "Qwen/QwQ-32B-AWQ",
    });

    const { aiAgentOrchestrateProcessor } = await import("../workers/c14-ai-agent-orchestrate.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s1",
      leadId: "lead-1",
      negotiationId: "neg-1",
      conversationId: "conv-1",
      systemPrompt: "Ești agent AI pentru E3.",
      userMessage: "Ce prețuri aveți?",
      conversationHistory: [
        { role: "user", content: "Bună ziua" },
        { role: "assistant", content: "Bună!" },
      ],
      allowedTools: ["get_price"],
      attemptNumber: 1,
    });

    const result = await aiAgentOrchestrateProcessor(job as never, {} as never);

    expect(result).toMatchObject({ ok: true, sessionId: "s1", modelUsed: "Qwen/QwQ-32B-AWQ" });
    expect(reasoningChatMock).toHaveBeenCalledTimes(1);
    expect(addMock).toHaveBeenCalledWith(
      "ai:e3:response:generate",
      expect.objectContaining({ sessionId: "s1", modelUsed: "Qwen/QwQ-32B-AWQ" }),
      expect.any(Object),
    );
  });

  it("extrage tool_call din răspuns", async () => {
    reasoningChatMock.mockResolvedValue({
      text: 'Verific prețul acum. <tool_call>{"name": "get_price", "input": {"productId": "p1"}}</tool_call> Iată rezultatul.',
      modelUsed: "Qwen/QwQ-32B-AWQ",
    });

    const { aiAgentOrchestrateProcessor } = await import("../workers/c14-ai-agent-orchestrate.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s2",
      leadId: "lead-1",
      negotiationId: "neg-1",
      conversationId: null,
      systemPrompt: "System",
      userMessage: "Preț produs P1?",
      conversationHistory: [],
      allowedTools: ["get_price"],
      attemptNumber: 1,
    });

    const result = await aiAgentOrchestrateProcessor(job as never, {} as never);

    expect(result).toMatchObject({ ok: true, toolCallsCount: 1 });
    const enqueuedPayload = addMock.mock.calls[0]?.[1] as Record<string, unknown>;
    const toolCalls = enqueuedPayload?.["toolCalls"] as unknown[];
    expect(Array.isArray(toolCalls)).toBe(true);
    expect(toolCalls).toHaveLength(1);
  });

  it("include correctionNote în userPrompt la retry", async () => {
    reasoningChatMock.mockResolvedValue({ text: "Corect!", modelUsed: "Qwen/QwQ-32B-AWQ" });

    const { aiAgentOrchestrateProcessor } = await import("../workers/c14-ai-agent-orchestrate.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s3",
      leadId: "l1",
      negotiationId: "n1",
      conversationId: "c1",
      systemPrompt: "System",
      userMessage: "Test retry",
      conversationHistory: [],
      allowedTools: [],
      attemptNumber: 2,
      correctionNote: "CORECȚIE: prețul greșit",
    });

    await aiAgentOrchestrateProcessor(job as never, {} as never);

    const callArgs = reasoningChatMock.mock.calls[0];
    expect(callArgs).toBeDefined();
    const userPrompt = callArgs?.[1] as string;
    expect(userPrompt).toContain("CORECȚIE: prețul greșit");
  });

  it("aruncă eroare când reasoningChat eșuează complet", async () => {
    reasoningChatMock.mockRejectedValue(new Error("All LLM endpoints down"));

    const { aiAgentOrchestrateProcessor } = await import("../workers/c14-ai-agent-orchestrate.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s4",
      leadId: "l1",
      negotiationId: "n1",
      conversationId: null,
      systemPrompt: "System",
      userMessage: "Test",
      conversationHistory: [],
      allowedTools: [],
    });

    await expect(aiAgentOrchestrateProcessor(job as never, {} as never)).rejects.toThrow(
      "All LLM endpoints down",
    );
  });

  it("extrage multiple tool_calls (2) dintr-un singur răspuns", async () => {
    reasoningChatMock.mockResolvedValue({
      text: 'Verific stoc și preț. <tool_call>{"name": "check_stock", "input": {"sku": "CIM-001"}}</tool_call> și <tool_call>{"name": "get_price", "input": {"productId": "p1"}}</tool_call>',
      modelUsed: "Qwen/QwQ-32B-AWQ",
    });

    const { aiAgentOrchestrateProcessor } = await import("../workers/c14-ai-agent-orchestrate.js");

    const result = await aiAgentOrchestrateProcessor(
      makeJob({
        tenantId: "t1",
        sessionId: "s5",
        leadId: "l1",
        negotiationId: "n1",
        conversationId: "c1",
        systemPrompt: "System",
        userMessage: "Verifică stoc și preț P1",
        conversationHistory: [],
        allowedTools: ["check_stock", "get_price"],
      }) as never,
      {} as never,
    );

    expect(result).toMatchObject({ ok: true, toolCallsCount: 2 });
    const payload = addMock.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload?.["toolCalls"] as unknown[]).toHaveLength(2);
  });

  it("malformed JSON în tool_call → ignorat, calls=[]", async () => {
    reasoningChatMock.mockResolvedValue({
      text: "Ceva text. <tool_call>INVALID JSON :{:</tool_call> Continuu.",
      modelUsed: "Qwen/QwQ-32B-AWQ",
    });

    const { aiAgentOrchestrateProcessor } = await import("../workers/c14-ai-agent-orchestrate.js");

    const result = await aiAgentOrchestrateProcessor(
      makeJob({
        tenantId: "t1",
        sessionId: "s6",
        leadId: "l1",
        negotiationId: "n1",
        conversationId: null,
        systemPrompt: "System",
        userMessage: "Test",
        conversationHistory: [],
        allowedTools: [],
      }) as never,
      {} as never,
    );

    expect(result).toMatchObject({ ok: true, toolCallsCount: 0 });
  });

  it("conversationHistory goală (prima interacțiune) → prompt corect fără history", async () => {
    reasoningChatMock.mockResolvedValue({
      text: "Bună ziua! Cum vă pot ajuta?",
      modelUsed: "Qwen/QwQ-32B-AWQ",
    });

    const { aiAgentOrchestrateProcessor } = await import("../workers/c14-ai-agent-orchestrate.js");

    await aiAgentOrchestrateProcessor(
      makeJob({
        tenantId: "t1",
        sessionId: "s7",
        leadId: "l1",
        negotiationId: "n1",
        conversationId: null,
        systemPrompt: "System",
        userMessage: "Prima interogare",
        conversationHistory: [],
        allowedTools: [],
      }) as never,
      {} as never,
    );

    const callArgs = reasoningChatMock.mock.calls[0];
    const userPrompt = callArgs?.[1] as string;
    // Fără history → promptul conține doar "[USER]: Prima interogare"
    expect(userPrompt).toBe("[USER]: Prima interogare");
    expect(userPrompt).not.toContain("[ASSISTANT]");
  });
});

// ── C15: ai:e3:response:generate ──────────────────────────────────────────────────

describe("C15 — aiResponseGenerateProcessor", () => {
  it("curăță <think> blocks din răspuns QwQ", async () => {
    const { aiResponseGenerateProcessor } = await import("../workers/c15-ai-response-generate.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s1",
      conversationId: "conv-1",
      leadId: "lead-1",
      negotiationId: "neg-1",
      rawResponse: "<think>Gândindu-mă la asta...</think>Prețul este 1000 RON.",
      modelUsed: "Qwen/QwQ-32B-AWQ",
      userMessage: "Preț?",
      promptTokens: 100,
      responseTokens: 50,
      complexity: "complex",
    });

    const result = await aiResponseGenerateProcessor(job as never, {} as never);

    expect(result).toMatchObject({ ok: true, sessionId: "s1" });
    const clean = (result as { cleanResponse: string }).cleanResponse;
    expect(clean).not.toContain("<think>");
    expect(clean).toContain("Prețul este 1000 RON.");
    expect(addMock).toHaveBeenCalledTimes(2);
  });

  it("complexity=simple → apelează fastChat pentru reformatare", async () => {
    fastChatMock.mockResolvedValue("Prețul reformatat este 1000 RON.");

    const { aiResponseGenerateProcessor } = await import("../workers/c15-ai-response-generate.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s2",
      conversationId: null,
      leadId: "l1",
      negotiationId: "n1",
      rawResponse: "Prețul este 1000 RON.",
      modelUsed: "Qwen/QwQ-32B-AWQ",
      userMessage: "Test",
      promptTokens: 50,
      responseTokens: 20,
      complexity: "simple",
      language: "RO",
    });

    const result = await aiResponseGenerateProcessor(job as never, {} as never);

    expect(result).toMatchObject({ ok: true });
    expect(fastChatMock).toHaveBeenCalledTimes(1);
  });

  it("enqueue C16 și C17 în paralel", async () => {
    const { aiResponseGenerateProcessor } = await import("../workers/c15-ai-response-generate.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s3",
      conversationId: "c1",
      leadId: "l1",
      negotiationId: "n1",
      rawResponse: "Răspuns valid pentru client.",
      modelUsed: "gpt-4o",
      userMessage: "Test",
      promptTokens: 80,
      responseTokens: 30,
    });

    await aiResponseGenerateProcessor(job as never, {} as never);

    const queueNames = addMock.mock.calls.map((c) => c[0] as string);
    expect(queueNames).toContain("ai:response:validate");
    expect(queueNames).toContain("ai:conversation:store");
  });

  it("detectează limba română din răspuns", async () => {
    const { aiResponseGenerateProcessor } = await import("../workers/c15-ai-response-generate.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s4",
      conversationId: null,
      leadId: "l1",
      negotiationId: "n1",
      rawResponse: "Bună ziua! Vă oferim un preț special și reducere pentru comanda dumneavoastră.",
      modelUsed: "Qwen/QwQ-32B-AWQ",
      userMessage: "Salut",
      promptTokens: 60,
      responseTokens: 25,
    });

    const result = await aiResponseGenerateProcessor(job as never, {} as never);

    expect((result as { language: string }).language).toBe("RO");
  });

  it("aruncă eroare când răspunsul curat este gol", async () => {
    const { aiResponseGenerateProcessor } = await import("../workers/c15-ai-response-generate.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s5",
      conversationId: null,
      leadId: "l1",
      negotiationId: "n1",
      rawResponse: "<think>doar gânduri, nicio concluzie</think>",
      modelUsed: "Qwen/QwQ-32B-AWQ",
      userMessage: "Test",
      promptTokens: 10,
      responseTokens: 5,
    });

    await expect(aiResponseGenerateProcessor(job as never, {} as never)).rejects.toThrow(
      "clean response is empty",
    );
  });

  it("curăță <tool_call> blocks din răspuns", async () => {
    const { aiResponseGenerateProcessor } = await import("../workers/c15-ai-response-generate.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s6",
      conversationId: null,
      leadId: "l1",
      negotiationId: "n1",
      rawResponse:
        'Verific stocul. <tool_call>{"name": "check_stock", "input": {}}</tool_call> Stocul este disponibil.',
      modelUsed: "Qwen/QwQ-32B-AWQ",
      userMessage: "Test",
      promptTokens: 30,
      responseTokens: 20,
    });

    const result = await aiResponseGenerateProcessor(job as never, {} as never);

    const clean = (result as { cleanResponse: string }).cleanResponse;
    expect(clean).not.toContain("<tool_call>");
    expect(clean).toContain("Stocul este disponibil.");
  });

  it("multiple <think> blocks curățate complet", async () => {
    const { aiResponseGenerateProcessor } = await import("../workers/c15-ai-response-generate.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s7",
      conversationId: null,
      leadId: "l1",
      negotiationId: "n1",
      rawResponse: "<think>Primul gând</think>Prețul este <think>Recalculez...</think>1000 RON.",
      modelUsed: "Qwen/QwQ-32B-AWQ",
      userMessage: "Preț?",
      promptTokens: 20,
      responseTokens: 15,
    });

    const result = await aiResponseGenerateProcessor(job as never, {} as never);

    const clean = (result as { cleanResponse: string }).cleanResponse;
    expect(clean).not.toContain("<think>");
    expect(clean).not.toContain("Primul gând");
    expect(clean).not.toContain("Recalculez...");
    expect(clean).toContain("1000 RON.");
  });

  it("fastChat failure la complexity=simple → fallback la răspunsul curățat", async () => {
    fastChatMock.mockRejectedValueOnce(new Error("FastChat timeout"));

    const { aiResponseGenerateProcessor } = await import("../workers/c15-ai-response-generate.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s8",
      conversationId: null,
      leadId: "l1",
      negotiationId: "n1",
      rawResponse: "Prețul pentru produsul solicitat.",
      modelUsed: "Qwen/QwQ-32B-AWQ",
      userMessage: "Test",
      promptTokens: 25,
      responseTokens: 15,
      complexity: "simple",
    });

    // Nu aruncă — fallback la răspunsul original curățat
    const result = await aiResponseGenerateProcessor(job as never, {} as never);

    expect(result).toMatchObject({ ok: true });
    const clean = (result as { cleanResponse: string }).cleanResponse;
    expect(clean).toBe("Prețul pentru produsul solicitat.");
  });

  it("detectează limba engleză când text nu are cuvinte române", async () => {
    const { aiResponseGenerateProcessor } = await import("../workers/c15-ai-response-generate.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s9",
      conversationId: null,
      leadId: "l1",
      negotiationId: "n1",
      rawResponse: "The price for this product is competitive. We offer excellent quality.",
      modelUsed: "Qwen/QwQ-32B-AWQ",
      userMessage: "What is the price?",
      promptTokens: 40,
      responseTokens: 25,
    });

    const result = await aiResponseGenerateProcessor(job as never, {} as never);

    expect((result as { language: string }).language).toBe("EN");
  });

  it("totalTokens = promptTokens + responseTokens verificat", async () => {
    const { aiResponseGenerateProcessor } = await import("../workers/c15-ai-response-generate.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s10",
      conversationId: "c1",
      leadId: "l1",
      negotiationId: "n1",
      rawResponse: "Răspuns corect cu informații pentru client.",
      modelUsed: "gpt-4o",
      userMessage: "Test",
      promptTokens: 150,
      responseTokens: 75,
    });

    const result = await aiResponseGenerateProcessor(job as never, {} as never);

    expect((result as { totalTokens: number }).totalTokens).toBe(225);
  });
});

// ── C16: ai:response:validate ──────────────────────────────────────────────────

describe("C16 — aiResponseValidateProcessor", () => {
  it("all guardrails pass — enqueue C17 cu validated=true", async () => {
    const { aiResponseValidateProcessor } = await import("../workers/c16-ai-response-validate.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s1",
      conversationId: "conv-1",
      negotiationId: "neg-1",
      response: "Prețul pentru 100 buc este 50.000 RON, marja respectată.",
      attemptCount: 0,
    });

    const result = await aiResponseValidateProcessor(job as never, {} as never);

    expect(result).toMatchObject({ ok: true, sessionId: "s1", passed: true });
    expect((result as { violations: unknown[] }).violations).toHaveLength(0);
    expect(setSessionTenantIdMock).toHaveBeenCalledWith("t1");
    expect(addMock).toHaveBeenCalledWith(
      "ai:conversation:store",
      expect.objectContaining({ validated: true, sessionId: "s1" }),
      expect.any(Object),
    );
  });

  it("pass — verifică că NU enqueue retry la succes", async () => {
    const { aiResponseValidateProcessor } = await import("../workers/c16-ai-response-validate.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s2",
      conversationId: null,
      negotiationId: "n1",
      response: "Ofertă corectă.",
      attemptCount: 0,
    });

    await aiResponseValidateProcessor(job as never, {} as never);

    const queueNames = addMock.mock.calls.map((c) => c[0] as string);
    expect(queueNames).not.toContain("ai:retry:regenerate");
    expect(queueNames).not.toContain("hitl:escalate");
  });

  it("fără job.data.attemptCount → default la 0", async () => {
    const { aiResponseValidateProcessor } = await import("../workers/c16-ai-response-validate.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s3",
      conversationId: "c1",
      negotiationId: "n1",
      response: "Răspuns valid.",
    });

    const result = await aiResponseValidateProcessor(job as never, {} as never);

    expect(result).toMatchObject({ ok: true, passed: true });
  });

  it("guardrail price FAIL + attemptCount=0 → enqueue C18 retry, INSERT violation în DB", async () => {
    const { aiResponseValidateProcessor, guardrailRegistry } =
      await import("../workers/c16-ai-response-validate.js");

    const originalCheckPrice = guardrailRegistry.checkPrice;
    guardrailRegistry.checkPrice = vi.fn().mockResolvedValueOnce({
      passed: false,
      violation: "Preț sub marja minimă de 8%",
    });

    dbInsertMock.mockReturnValue(makeInsertChain());

    const job = makeJob({
      tenantId: "t1",
      sessionId: "sv1",
      conversationId: "c1",
      negotiationId: "n1",
      response: "Oferta cu discount 95%.",
      attemptCount: 0,
    });

    const result = await aiResponseValidateProcessor(job as never, {} as never);

    // Restaurare
    guardrailRegistry.checkPrice = originalCheckPrice;

    expect(result).toMatchObject({ ok: true, passed: false });
    expect((result as { violations: Array<{ guardrail: string }> }).violations[0]?.guardrail).toBe(
      "price",
    );

    // DB INSERT pentru violation
    expect(dbInsertMock).toHaveBeenCalledTimes(1);

    // Enqueue C18 retry cu attempt=1
    expect(addMock).toHaveBeenCalledWith(
      "ai:retry:regenerate",
      expect.objectContaining({ attemptNumber: 1, sessionId: "sv1" }),
      expect.any(Object),
    );

    // NU enqueue HITL (attempt prea mic)
    const queueNames = addMock.mock.calls.map((c) => c[0] as string);
    expect(queueNames).not.toContain("hitl:escalate");
  });

  it("guardrail discount FAIL + attemptCount=2 → enqueue C18 (ultima șansă)", async () => {
    const { aiResponseValidateProcessor, guardrailRegistry } =
      await import("../workers/c16-ai-response-validate.js");

    const originalCheckDiscount = guardrailRegistry.checkDiscount;
    guardrailRegistry.checkDiscount = vi.fn().mockResolvedValueOnce({
      passed: false,
      violation: "Discount 45% depășește limita aprobată",
    });

    dbInsertMock.mockReturnValue(makeInsertChain());

    const job = makeJob({
      tenantId: "t1",
      sessionId: "sv2",
      conversationId: null,
      negotiationId: "n1",
      response: "Discount special 45%.",
      attemptCount: 2,
    });

    const result = await aiResponseValidateProcessor(job as never, {} as never);

    guardrailRegistry.checkDiscount = originalCheckDiscount;

    expect(result).toMatchObject({ ok: true, passed: false });
    expect(addMock).toHaveBeenCalledWith(
      "ai:retry:regenerate",
      expect.objectContaining({ attemptNumber: 3 }),
      expect.any(Object),
    );
    const queueNames = addMock.mock.calls.map((c) => c[0] as string);
    expect(queueNames).not.toContain("hitl:escalate");
  });

  it("guardrail fiscal FAIL + attemptCount=3 → escaladare HITL cu discriminator 'guardrail-fail'", async () => {
    const { aiResponseValidateProcessor, guardrailRegistry } =
      await import("../workers/c16-ai-response-validate.js");

    const originalCheckFiscal = guardrailRegistry.checkFiscal;
    guardrailRegistry.checkFiscal = vi.fn().mockResolvedValueOnce({
      passed: false,
      violation: "Eroare TVA — procentaj incorect",
    });

    dbInsertMock.mockReturnValue(makeInsertChain());

    const job = makeJob({
      tenantId: "t1",
      sessionId: "sv3",
      conversationId: "c1",
      negotiationId: "n1",
      response: "TVA 15%.",
      attemptCount: 3,
    });

    const result = await aiResponseValidateProcessor(job as never, {} as never);

    guardrailRegistry.checkFiscal = originalCheckFiscal;

    expect(result).toMatchObject({ ok: true, passed: false });
    expect(addMock).toHaveBeenCalledWith(
      "hitl:escalate",
      expect.objectContaining({ discriminator: "guardrail-fail", sessionId: "sv3" }),
      expect.any(Object),
    );
    const queueNames = addMock.mock.calls.map((c) => c[0] as string);
    expect(queueNames).not.toContain("ai:retry:regenerate");
  });

  it("multiple violations → toate logate în DB (un INSERT per violation)", async () => {
    const { aiResponseValidateProcessor, guardrailRegistry } =
      await import("../workers/c16-ai-response-validate.js");

    const origPrice = guardrailRegistry.checkPrice;
    const origSku = guardrailRegistry.checkSku;
    guardrailRegistry.checkPrice = vi
      .fn()
      .mockResolvedValueOnce({ passed: false, violation: "Preț mic" });
    guardrailRegistry.checkSku = vi
      .fn()
      .mockResolvedValueOnce({ passed: false, violation: "SKU invalid" });

    dbInsertMock.mockReturnValue(makeInsertChain());

    const job = makeJob({
      tenantId: "t1",
      sessionId: "sv4",
      conversationId: null,
      negotiationId: "n1",
      response: "Test multiple violations.",
      attemptCount: 0,
    });

    const result = await aiResponseValidateProcessor(job as never, {} as never);

    guardrailRegistry.checkPrice = origPrice;
    guardrailRegistry.checkSku = origSku;

    expect((result as { violations: unknown[] }).violations).toHaveLength(2);
    expect(dbInsertMock).toHaveBeenCalledTimes(2);
  });
});

// ── C17: ai:conversation:store ─────────────────────────────────────────────────

describe("C17 — aiConversationStoreProcessor", () => {
  it("creare conversație nouă + INSERT mesaje user și assistant", async () => {
    dbInsertMock.mockReturnValue(makeInsertChain());
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const { aiConversationStoreProcessor } =
      await import("../workers/c17-ai-conversation-store.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s1",
      conversationId: null,
      leadId: "lead-1",
      negotiationId: "neg-1",
      userMessage: "Vreau ofertă pentru 200 buc.",
      assistantResponse: "Iată oferta noastră: 900 RON/buc la 200+ buc.",
      modelUsed: "Qwen/QwQ-32B-AWQ",
      tokens: { user: 50, assistant: 80, total: 130 },
    });

    const result = await aiConversationStoreProcessor(job as never, {} as never);

    expect(result).toMatchObject({ ok: true, messagesStored: 2 });
    expect(typeof (result as { conversationId: string }).conversationId).toBe("string");
    expect(setSessionTenantIdMock).toHaveBeenCalledWith("t1");
    expect(dbInsertMock).toHaveBeenCalledTimes(3); // 1 conv + 1 user msg + 1 assistant msg
    expect(dbUpdateMock).toHaveBeenCalledTimes(1);
  });

  it("store cu conversationId existent — fără INSERT conversație nouă", async () => {
    dbInsertMock.mockReturnValue(makeInsertChain());
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const { aiConversationStoreProcessor } =
      await import("../workers/c17-ai-conversation-store.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s2",
      conversationId: "existing-conv-id",
      leadId: "lead-1",
      negotiationId: "neg-1",
      userMessage: "Modificare cantitate la 300.",
      assistantResponse: "Prețul actualizat este 880 RON/buc.",
      modelUsed: "gpt-4o",
      tokens: { user: 30, assistant: 60, total: 90 },
    });

    const result = await aiConversationStoreProcessor(job as never, {} as never);

    expect(result).toMatchObject({
      ok: true,
      conversationId: "existing-conv-id",
      messagesStored: 2,
    });
    expect(dbInsertMock).toHaveBeenCalledTimes(2); // doar 2 mesaje, fără INSERT conversație
  });

  it("store cu tool calls — INSERT în ai_tool_calls", async () => {
    dbInsertMock.mockReturnValue(makeInsertChain());
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const { aiConversationStoreProcessor } =
      await import("../workers/c17-ai-conversation-store.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s3",
      conversationId: "conv-tc",
      leadId: "l1",
      negotiationId: "n1",
      userMessage: "Verifică stoc.",
      assistantResponse: "Stoc disponibil: 500 buc.",
      modelUsed: "Qwen/QwQ-32B-AWQ",
      tokens: { user: 20, assistant: 30, total: 50 },
      toolCalls: [
        {
          toolName: "check_stock",
          input: { productId: "p1" },
          output: { quantity: 500 },
          durationMs: 120,
          success: true,
        },
      ],
    });

    const result = await aiConversationStoreProcessor(job as never, {} as never);

    expect(result).toMatchObject({ ok: true, messagesStored: 3 }); // 2 mesaje + 1 tool call
    expect(dbInsertMock).toHaveBeenCalledTimes(3); // 2 mesaje + 1 tool call
  });

  it("marker validated=true fără mesaje — returnează fără store", async () => {
    const { aiConversationStoreProcessor } =
      await import("../workers/c17-ai-conversation-store.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s4",
      conversationId: "conv-val",
      negotiationId: "n1",
      validated: true,
    });

    const result = await aiConversationStoreProcessor(job as never, {} as never);

    expect(result).toMatchObject({ ok: true, messagesStored: 0 });
    expect(dbInsertMock).not.toHaveBeenCalled();
  });

  it("fără userMessage → nu inserează mesaje, doar UPDATE tokens", async () => {
    dbInsertMock.mockReturnValue(makeInsertChain());
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const { aiConversationStoreProcessor } =
      await import("../workers/c17-ai-conversation-store.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s5",
      conversationId: "existing-conv",
      negotiationId: "n1",
      // fără userMessage și fără assistantResponse
      tokens: { user: 0, assistant: 0, total: 0 },
    });

    const result = await aiConversationStoreProcessor(job as never, {} as never);

    expect(result).toMatchObject({ ok: true, messagesStored: 0 });
    // Fără INSERT mesaje, dar cu UPDATE conversație
    expect(dbInsertMock).not.toHaveBeenCalled();
    expect(dbUpdateMock).toHaveBeenCalledTimes(1);
  });

  it("fără câmpul tokens → fallback estimare din lungimea textului", async () => {
    dbInsertMock.mockReturnValue(makeInsertChain());
    dbUpdateMock.mockReturnValue(makeUpdateChain());

    const { aiConversationStoreProcessor } =
      await import("../workers/c17-ai-conversation-store.js");

    const userMsg = "a".repeat(400); // 400 chars → ceil(400/4) = 100 tokens
    const assistantMsg = "b".repeat(800); // 800 chars → ceil(800/4) = 200 tokens

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s6",
      conversationId: "conv-no-tokens",
      negotiationId: "n1",
      userMessage: userMsg,
      assistantResponse: assistantMsg,
      modelUsed: "Qwen/QwQ-32B-AWQ",
      // fără câmpul tokens
    });

    const result = await aiConversationStoreProcessor(job as never, {} as never);

    expect(result).toMatchObject({ ok: true, messagesStored: 2 });
    // Verificăm că INSERT user message a fost apelat (estimare fallback)
    expect(dbInsertMock).toHaveBeenCalledTimes(2);
  });
});

// ── C18: ai:retry:regenerate ───────────────────────────────────────────────────

describe("C18 — aiRetryRegenerateProcessor", () => {
  it("attemptNumber < MAX (3) — re-enqueue C14 cu correctionNote", async () => {
    const { aiRetryRegenerateProcessor } = await import("../workers/c18-ai-retry-regenerate.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s1",
      conversationId: "conv-1",
      negotiationId: "neg-1",
      leadId: "lead-1",
      originalUserMessage: "Vreau reducere 20%",
      violations: [{ guardrail: "discount", violation: "Discount 20% depășește limita de 15%" }],
      attemptNumber: 1,
    });

    const result = await aiRetryRegenerateProcessor(job as never, {} as never);

    expect(result).toMatchObject({ ok: true, sessionId: "s1", retrying: true, escalated: false });
    expect(addMock).toHaveBeenCalledWith(
      "ai:agent:orchestrate",
      expect.objectContaining({
        attemptNumber: 2,
        correctionNote: expect.stringContaining("CORECȚIE"),
      }),
      expect.any(Object),
    );
  });

  it("correctionNote conține detaliile violării", async () => {
    const { aiRetryRegenerateProcessor } = await import("../workers/c18-ai-retry-regenerate.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s2",
      conversationId: "c1",
      negotiationId: "n1",
      leadId: "l1",
      originalUserMessage: "Test",
      violations: [
        { guardrail: "price", violation: "Preț sub cost" },
        { guardrail: "stock", violation: "Stoc insuficient" },
      ],
      attemptNumber: 2,
    });

    await aiRetryRegenerateProcessor(job as never, {} as never);

    const enqueuedPayload = addMock.mock.calls[0]?.[1] as Record<string, unknown>;
    const correctionNote = enqueuedPayload?.["correctionNote"] as string;
    expect(correctionNote).toContain("PRICE");
    expect(correctionNote).toContain("STOCK");
  });

  it("attemptNumber >= 3 — escaladare HITL, NU re-enqueue C14", async () => {
    const { aiRetryRegenerateProcessor } = await import("../workers/c18-ai-retry-regenerate.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s3",
      conversationId: "c1",
      negotiationId: "n1",
      leadId: "l1",
      originalUserMessage: "Test max retries",
      violations: [{ guardrail: "fiscal", violation: "Eroare fiscală gravă" }],
      attemptNumber: 3,
    });

    const result = await aiRetryRegenerateProcessor(job as never, {} as never);

    expect(result).toMatchObject({ ok: true, escalated: true });
    expect(addMock).toHaveBeenCalledWith(
      "hitl:escalate",
      expect.objectContaining({ discriminator: "max-retries-exceeded", sessionId: "s3" }),
      expect.any(Object),
    );
    const queueNames = addMock.mock.calls.map((c) => c[0] as string);
    expect(queueNames).not.toContain("ai:agent:orchestrate");
  });

  it("escalare cu attemptNumber=10 (depășit mult)", async () => {
    const { aiRetryRegenerateProcessor } = await import("../workers/c18-ai-retry-regenerate.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s4",
      conversationId: null,
      negotiationId: "n1",
      leadId: null,
      originalUserMessage: null,
      violations: [],
      attemptNumber: 10,
    });

    const result = await aiRetryRegenerateProcessor(job as never, {} as never);

    expect(result).toMatchObject({ ok: true, escalated: true });
  });

  it("violations=[] → correctionNote generată (conține instrucțiunile standard), re-enqueue C14", async () => {
    const { aiRetryRegenerateProcessor } = await import("../workers/c18-ai-retry-regenerate.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s5",
      conversationId: "c1",
      negotiationId: "n1",
      leadId: "l1",
      originalUserMessage: "Test fără violări",
      violations: [],
      attemptNumber: 1,
    });

    const result = await aiRetryRegenerateProcessor(job as never, {} as never);

    expect(result).toMatchObject({ ok: true, retrying: true, escalated: false });
    const payload = addMock.mock.calls[0]?.[1] as Record<string, unknown>;
    const correctionNote = payload?.["correctionNote"] as string;
    // Chiar fără violări, correctionNote conține instrucțiunile standard
    expect(correctionNote).toContain("CORECȚIE NECESARĂ");
    expect(correctionNote).toContain("Regenerează răspunsul");
  });

  it("attemptNumber=2 → re-enqueue C14 cu attemptNumber=3", async () => {
    const { aiRetryRegenerateProcessor } = await import("../workers/c18-ai-retry-regenerate.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s6",
      conversationId: "c1",
      negotiationId: "n1",
      leadId: "l1",
      originalUserMessage: "Vreau reducere",
      violations: [{ guardrail: "discount", violation: "Discount 30%" }],
      attemptNumber: 2,
    });

    await aiRetryRegenerateProcessor(job as never, {} as never);

    const payload = addMock.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload?.["attemptNumber"]).toBe(3);
    const queueName = addMock.mock.calls[0]?.[0] as string;
    expect(queueName).toBe("ai:agent:orchestrate");
  });

  it("originalUserMessage=null → userMessage='' în payload C14", async () => {
    const { aiRetryRegenerateProcessor } = await import("../workers/c18-ai-retry-regenerate.js");

    const job = makeJob({
      tenantId: "t1",
      sessionId: "s7",
      conversationId: null,
      negotiationId: "n1",
      leadId: null,
      originalUserMessage: null,
      violations: [{ guardrail: "sku", violation: "SKU inexistent" }],
      attemptNumber: 1,
    });

    await aiRetryRegenerateProcessor(job as never, {} as never);

    const payload = addMock.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload?.["userMessage"]).toBe("");
  });
});
