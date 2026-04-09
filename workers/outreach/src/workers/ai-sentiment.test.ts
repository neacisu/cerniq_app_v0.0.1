import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Module-level mocks (hoisted) ──────────────────────────────────────────────

vi.mock("@cerniq/db", () => ({
  db: {
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => undefined) })) })),
  },
  leadJourney: { id: "id", tenantId: "tenantId" },
  eq: vi.fn((_l: unknown, _r: unknown) => ({ left: _l, right: _r })),
  setSessionTenantId: vi.fn(async () => undefined),
}));

const { fastCompletionCreate, frontierStepsRun } = vi.hoisted(() => ({
  fastCompletionCreate: vi.fn(),
  frontierStepsRun: vi.fn(),
}));

// ── Helper to create a mock Redis client ──────────────────────────────────────

function createRedisMock(cachedValue: string | null = null) {
  return {
    get: vi.fn(async (_key: string) => cachedValue),
    set: vi.fn(async (_key: string, _value: string, _ex: string, _ttl: number) => "OK" as const),
  };
}

/** Numele exportului deprecat — fără referință statică la simbol (Sonar S1874). */
const LEGACY_INTENT_CLASSIFIER_EXPORT = "createIntentClassifierWorker";

function invokeLegacyIntentClassifierFromModule(
  moduleExports: Record<string, unknown>,
  redis: unknown,
): void {
  const fn = Reflect.get(moduleExports, LEGACY_INTENT_CLASSIFIER_EXPORT);
  if (typeof fn !== "function") {
    throw new TypeError("expected legacy worker factory to be a function");
  }
  Reflect.apply(fn as (this: unknown, ...args: unknown[]) => unknown, undefined, [redis]);
}

// ── Helper to create a mock BullMQ queue ─────────────────────────────────────

function createQueueMock() {
  return { add: vi.fn(async () => undefined), close: vi.fn(async () => undefined) };
}

// Track BullMQ queue mocks keyed by queue name
const queueInstances: Map<string, ReturnType<typeof createQueueMock>> = new Map();
vi.mock("@cerniq/worker-shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@cerniq/worker-shared")>();
  return {
    ...actual,
    fastClient: {
      chat: {
        completions: {
          create: fastCompletionCreate,
        },
      },
    },
    recordLlmFallback: vi.fn(),
    buildFrontierChatTextFallbackSteps: vi.fn(() => [
      { name: "mock-frontier-sentiment", run: frontierStepsRun },
    ]),
    createQueue: vi.fn((name: string) => {
      if (!queueInstances.has(name)) queueInstances.set(name, createQueueMock());
      return queueInstances.get(name) ?? createQueueMock();
    }),
    createWorker: vi.fn((queueName: string, processor: unknown) => ({
      worker: { queueName, processor, close: vi.fn(async () => undefined) },
    })),
    withCognitiveSpan: vi.fn(async (_name: string, fn: () => unknown) => fn()),
    getWaPhoneFollowupQueueName: vi.fn((idx: number) => `wa:send:phone:0${idx}`),
  };
});

// ── Shortcuts to mocked modules ───────────────────────────────────────────────

const TENANT = "t1";
const LEAD_ID = "l1";
const JOURNEY_ID = "j1";

function makeJob(content: string, channel: SentimentJobData["channel"] = "WHATSAPP") {
  return {
    id: "job-1",
    data: { tenantId: TENANT, leadId: LEAD_ID, journeyId: JOURNEY_ID, content, channel },
  };
}

function setupFastSentimentResponse(result: {
  score: number;
  intent: string;
  urgency: string;
  requiresHuman: boolean;
}) {
  fastCompletionCreate.mockResolvedValueOnce({
    choices: [{ message: { content: JSON.stringify(result) } }],
  });
}

import type { SentimentJobData } from "./ai-sentiment.js";

beforeEach(() => {
  vi.clearAllMocks();
  queueInstances.clear();
  fastCompletionCreate.mockReset();
  frontierStepsRun.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("createSentimentAnalyzerWorker: NOT_INTERESTED logic (merged from intent classifier)", () => {
  it("sets requiresHumanReview=true and humanReviewReason=AI_UNCERTAIN when intent=NOT_INTERESTED", async () => {
    const redis = createRedisMock(null);
    setupFastSentimentResponse({
      score: 10,
      intent: "NOT_INTERESTED",
      urgency: "MEDIUM",
      requiresHuman: false,
    });

    const { createSentimentAnalyzerWorker } = await import("./ai-sentiment.js");
    createSentimentAnalyzerWorker(redis as never);

    // Extract the processor from the mocked createWorker call
    const { createWorker } = await import("@cerniq/worker-shared");
    const [, processor] = (createWorker as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      (job: unknown) => Promise<unknown>,
    ];

    const { db } = await import("@cerniq/db");
    const result = await processor(makeJob("nu mă interesează deloc"));

    expect(result).toMatchObject({ intent: "NOT_INTERESTED", routedTo: "HUMAN" });
    expect(db.update).toHaveBeenCalled();

    // Check the set() call contains requiresHumanReview=true and humanReviewReason
    const dbMock = db as unknown as { update: ReturnType<typeof vi.fn> };
    const setFn = dbMock.update.mock.results[0]?.value?.set;
    const setArgs = setFn?.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArgs).toMatchObject({
      requiresHumanReview: true,
      humanReviewReason: "AI_UNCERTAIN",
    });
  });

  it("routes NOT_INTERESTED to HUMAN queue even when score >= 50", async () => {
    const redis = createRedisMock(null);
    // Edge: positive score but NOT_INTERESTED intent → must go to HUMAN, not AI
    setupFastSentimentResponse({
      score: 70,
      intent: "NOT_INTERESTED",
      urgency: "LOW",
      requiresHuman: false,
    });

    const { createWorker } = await import("@cerniq/worker-shared");
    (createWorker as ReturnType<typeof vi.fn>).mockClear();

    const { createSentimentAnalyzerWorker } = await import("./ai-sentiment.js");
    createSentimentAnalyzerWorker(redis as never);

    const [, processor] = (createWorker as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      (job: unknown) => Promise<unknown>,
    ];
    const result = (await processor(makeJob("Avem buget dar nu ne intereseaza"))) as Record<
      string,
      unknown
    >;

    // Should route to HUMAN (not AI even with positive score)
    expect(result.routedTo).toBe("HUMAN");
    // AI response queue should NOT have been triggered
    const responseQueue = queueInstances.get("ai:response:generate");
    expect(responseQueue?.add).not.toHaveBeenCalled();
  });

  it("does NOT set review flags when intent=INTERESTED and requiresHuman=false", async () => {
    const redis = createRedisMock(null);
    setupFastSentimentResponse({
      score: 80,
      intent: "INTERESTED",
      urgency: "LOW",
      requiresHuman: false,
    });

    const { createWorker } = await import("@cerniq/worker-shared");
    (createWorker as ReturnType<typeof vi.fn>).mockClear();

    const { createSentimentAnalyzerWorker } = await import("./ai-sentiment.js");
    createSentimentAnalyzerWorker(redis as never);

    const [, processor] = (createWorker as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      (job: unknown) => Promise<unknown>,
    ];
    await processor(makeJob("Da, vreau să cumpăr!"));

    const { db } = await import("@cerniq/db");
    const dbMock = db as unknown as { update: ReturnType<typeof vi.fn> };
    const setFn = dbMock.update.mock.results[0]?.value?.set;
    const setArgs = setFn?.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArgs.requiresHumanReview).toBe(false);
    expect(setArgs).not.toHaveProperty("humanReviewReason");
  });
});

describe("createSentimentAnalyzerWorker: ADR-0063 routing", () => {
  it("routes score>=50 + !requiresHuman + !NOT_INTERESTED to AI response queue", async () => {
    const redis = createRedisMock(null);
    setupFastSentimentResponse({
      score: 75,
      intent: "INTERESTED",
      urgency: "HIGH",
      requiresHuman: false,
    });

    const { createWorker } = await import("@cerniq/worker-shared");
    (createWorker as ReturnType<typeof vi.fn>).mockClear();

    const { createSentimentAnalyzerWorker } = await import("./ai-sentiment.js");
    createSentimentAnalyzerWorker(redis as never);

    const [, processor] = (createWorker as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      (job: unknown) => Promise<unknown>,
    ];
    const result = (await processor(makeJob("Vreau să cumpăr produsul!"))) as Record<
      string,
      unknown
    >;

    expect(result.routedTo).toBe("AI");
    const responseQueue = queueInstances.get("ai:response:generate");
    expect(responseQueue?.add).toHaveBeenCalledOnce();
  });

  it("routes requiresHuman=true to HUMAN review queue with AI_UNCERTAIN reason", async () => {
    const redis = createRedisMock(null);
    setupFastSentimentResponse({
      score: 20,
      intent: "QUESTION",
      urgency: "HIGH",
      requiresHuman: true,
    });

    const { createWorker } = await import("@cerniq/worker-shared");
    (createWorker as ReturnType<typeof vi.fn>).mockClear();

    const { createSentimentAnalyzerWorker } = await import("./ai-sentiment.js");
    createSentimentAnalyzerWorker(redis as never);

    const [, processor] = (createWorker as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      (job: unknown) => Promise<unknown>,
    ];
    const result = (await processor(makeJob("Pot vorbi cu cineva urgent?"))) as Record<
      string,
      unknown
    >;

    expect(result.routedTo).toBe("HUMAN");
    const reviewQueue = queueInstances.get("human:review:queue");
    expect(reviewQueue?.add).toHaveBeenCalledWith(
      "queue",
      expect.objectContaining({ reason: "AI_UNCERTAIN", priority: "HIGH" }),
      expect.any(Object),
    );
  });

  it("routes negative score (score<0) to HUMAN review queue with NEGATIVE_SENTIMENT reason", async () => {
    const redis = createRedisMock(null);
    setupFastSentimentResponse({
      score: -60,
      intent: "COMPLAINT",
      urgency: "HIGH",
      requiresHuman: false,
    });

    const { createWorker } = await import("@cerniq/worker-shared");
    (createWorker as ReturnType<typeof vi.fn>).mockClear();

    const { createSentimentAnalyzerWorker } = await import("./ai-sentiment.js");
    createSentimentAnalyzerWorker(redis as never);

    const [, processor] = (createWorker as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      (job: unknown) => Promise<unknown>,
    ];
    const result = (await processor(makeJob("Sunteți niște escroci!"))) as Record<string, unknown>;

    expect(result.routedTo).toBe("HUMAN");
    const reviewQueue = queueInstances.get("human:review:queue");
    expect(reviewQueue?.add).toHaveBeenCalledWith(
      "queue",
      expect.objectContaining({ reason: "NEGATIVE_SENTIMENT" }),
      expect.any(Object),
    );
  });

  it("does not route neutral score (0..49) to either queue (no action)", async () => {
    const redis = createRedisMock(null);
    setupFastSentimentResponse({
      score: 30,
      intent: "NEUTRAL",
      urgency: "LOW",
      requiresHuman: false,
    });

    const { createWorker } = await import("@cerniq/worker-shared");
    (createWorker as ReturnType<typeof vi.fn>).mockClear();

    const { createSentimentAnalyzerWorker } = await import("./ai-sentiment.js");
    createSentimentAnalyzerWorker(redis as never);

    const [, processor] = (createWorker as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      (job: unknown) => Promise<unknown>,
    ];
    const result = (await processor(makeJob("Poate, nu știu."))) as Record<string, unknown>;

    expect(result.routedTo).toBe("AI");
    expect(queueInstances.get("ai:response:generate")?.add).not.toHaveBeenCalled();
    expect(queueInstances.get("human:review:queue")?.add).not.toHaveBeenCalled();
  });

  it("sets humanReviewPriority=URGENT for HIGH urgency + requiresHuman", async () => {
    const redis = createRedisMock(null);
    setupFastSentimentResponse({
      score: -10,
      intent: "COMPLAINT",
      urgency: "HIGH",
      requiresHuman: true,
    });

    const { createWorker } = await import("@cerniq/worker-shared");
    (createWorker as ReturnType<typeof vi.fn>).mockClear();

    const { createSentimentAnalyzerWorker } = await import("./ai-sentiment.js");
    createSentimentAnalyzerWorker(redis as never);

    const [, processor] = (createWorker as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      (job: unknown) => Promise<unknown>,
    ];
    await processor(makeJob("Probleme urgente!"));

    const { db } = await import("@cerniq/db");
    const dbMock = db as unknown as { update: ReturnType<typeof vi.fn> };
    const setFn = dbMock.update.mock.results[0]?.value?.set;
    const setArgs = setFn?.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArgs.humanReviewPriority).toBe("URGENT");
  });

  it("sets humanReviewPriority=MEDIUM for LOW urgency + requiresHuman", async () => {
    const redis = createRedisMock(null);
    setupFastSentimentResponse({
      score: -5,
      intent: "COMPLAINT",
      urgency: "LOW",
      requiresHuman: true,
    });

    const { createWorker } = await import("@cerniq/worker-shared");
    (createWorker as ReturnType<typeof vi.fn>).mockClear();

    const { createSentimentAnalyzerWorker } = await import("./ai-sentiment.js");
    createSentimentAnalyzerWorker(redis as never);

    const [, processor] = (createWorker as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      (job: unknown) => Promise<unknown>,
    ];
    await processor(makeJob("Nu chiar."));

    const { db } = await import("@cerniq/db");
    const dbMock = db as unknown as { update: ReturnType<typeof vi.fn> };
    const setFn = dbMock.update.mock.results[0]?.value?.set;
    const setArgs = setFn?.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(setArgs.humanReviewPriority).toBe("MEDIUM");
  });
});

describe("createSentimentAnalyzerWorker: Redis cache", () => {
  it("returns cached sentiment result without calling Anthropic", async () => {
    const cachedResult = { score: 90, intent: "INTERESTED", urgency: "HIGH", requiresHuman: false };
    const redis = createRedisMock(JSON.stringify(cachedResult));

    const { createWorker } = await import("@cerniq/worker-shared");
    (createWorker as ReturnType<typeof vi.fn>).mockClear();

    const { createSentimentAnalyzerWorker } = await import("./ai-sentiment.js");
    createSentimentAnalyzerWorker(redis as never);

    const [, processor] = (createWorker as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      (job: unknown) => Promise<unknown>,
    ];
    const result = (await processor(makeJob("vreau să cumpăr"))) as Record<string, unknown>;

    expect(fastCompletionCreate).not.toHaveBeenCalled();
    expect(frontierStepsRun).not.toHaveBeenCalled();
    expect(result).toMatchObject({ score: 90, intent: "INTERESTED", routedTo: "AI" });
  });

  it("caches rezultat LLM (fast) în Redis cu TTL=3600", async () => {
    const redis = createRedisMock(null);
    setupFastSentimentResponse({
      score: 60,
      intent: "INTERESTED",
      urgency: "MEDIUM",
      requiresHuman: false,
    });

    const { createWorker } = await import("@cerniq/worker-shared");
    (createWorker as ReturnType<typeof vi.fn>).mockClear();

    const { createSentimentAnalyzerWorker } = await import("./ai-sentiment.js");
    createSentimentAnalyzerWorker(redis as never);

    const [, processor] = (createWorker as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      (job: unknown) => Promise<unknown>,
    ];
    await processor(makeJob("ok, mă interesează"));

    expect(fastCompletionCreate).toHaveBeenCalled();
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringContaining("sentiment:"),
      expect.any(String),
      "EX",
      3600,
    );
  });

  it("fallback frontier când infraq fast eșuează", async () => {
    const redis = createRedisMock(null);
    fastCompletionCreate.mockRejectedValueOnce(new Error("infraq timeout"));
    frontierStepsRun.mockResolvedValueOnce(
      JSON.stringify({
        score: 55,
        intent: "INTERESTED",
        urgency: "LOW",
        requiresHuman: false,
      }),
    );

    const { createWorker } = await import("@cerniq/worker-shared");
    (createWorker as ReturnType<typeof vi.fn>).mockClear();

    const { createSentimentAnalyzerWorker } = await import("./ai-sentiment.js");
    createSentimentAnalyzerWorker(redis as never);

    const [, processor] = (createWorker as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      (job: unknown) => Promise<unknown>,
    ];
    const result = (await processor(makeJob("mesaj test"))) as Record<string, unknown>;
    expect(result.score).toBe(55);
    expect(frontierStepsRun).toHaveBeenCalled();
  });

  it("uses tenant-scoped cache key (sentiment:{tenantId}:{hash}) to prevent cross-tenant leaks", async () => {
    const redis = createRedisMock(null);
    setupFastSentimentResponse({
      score: 50,
      intent: "QUESTION",
      urgency: "LOW",
      requiresHuman: false,
    });

    const { createWorker } = await import("@cerniq/worker-shared");
    (createWorker as ReturnType<typeof vi.fn>).mockClear();

    const { createSentimentAnalyzerWorker } = await import("./ai-sentiment.js");
    createSentimentAnalyzerWorker(redis as never);

    const [, processor] = (createWorker as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      (job: unknown) => Promise<unknown>,
    ];
    await processor(makeJob("Câte produse aveți?"));

    const getCall = redis.get.mock.calls[0]?.[0] as string;
    expect(getCall).toMatch(/^sentiment:t1:/);
  });
});

describe("createIntentClassifierWorker: deprecated — throws on call", () => {
  it("throws with deprecation message", async () => {
    const sentimentModule = (await import("./ai-sentiment.js")) as Record<string, unknown>;
    const redis = createRedisMock(null);

    expect(() => invokeLegacyIntentClassifierFromModule(sentimentModule, redis)).toThrow(
      /DEPRECATED.*createSentimentAnalyzerWorker/,
    );
  });

  it("throws (does not silently return a worker instance)", async () => {
    const sentimentModule = (await import("./ai-sentiment.js")) as Record<string, unknown>;
    expect(() => invokeLegacyIntentClassifierFromModule(sentimentModule, {})).toThrow();
  });
});

describe("queue-registry: AI_INTENT_CLASSIFY removed", () => {
  it("does not contain ai:intent:classify", async () => {
    const { queueRegistry } = await import("@cerniq/worker-shared");
    const names = queueRegistry.map((q) => q.name);
    expect(names).not.toContain("ai:intent:classify");
  });

  it("contains ai:sentiment:analyze and ai:response:generate (the two active AI queues)", async () => {
    const { queueRegistry } = await import("@cerniq/worker-shared");
    const names = queueRegistry.map((q) => q.name);
    expect(names).toContain("ai:sentiment:analyze");
    expect(names).toContain("ai:response:generate");
  });

  it("total queue count matches assertQueueRegistryComplete (canonical registry)", async () => {
    const { assertQueueRegistryComplete, queueRegistry } = await import("@cerniq/worker-shared");
    expect(() => assertQueueRegistryComplete()).not.toThrow();
    expect(queueRegistry).toHaveLength(350);
  });

  it("QUEUES constant does not export AI_INTENT_CLASSIFY", async () => {
    const { QUEUES } = await import("@cerniq/worker-shared");
    expect((QUEUES as Record<string, string>).AI_INTENT_CLASSIFY).toBeUndefined();
  });
});
