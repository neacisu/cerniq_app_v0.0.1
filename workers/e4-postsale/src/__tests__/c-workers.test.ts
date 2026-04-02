/**
 * Teste de integrare pentru C13-D21 (E4 Credit Scoring 100p — FAZA 8d)
 * Testele funcțiilor pure sunt în lib-functions.test.ts (fișier separat).
 *
 * Acoperire workers:
 *   - C13: creare profil + FlowProducer fan-out
 *   - C14: fetch ANAF
 *   - C15: fetch bilanț Termene.ro
 *   - C16: fetch dosare/BPI Termene.ro
 *   - C17: calculare scor 100p (parent FlowProducer)
 *   - C18: calcul limită credit + HITL >50K RON
 *   - D19: verificare limită credit
 *   - D20: rezervare credit
 *   - D21: eliberare rezervare (paid/cancelled)
 *   - credit-refresh-all: bulk refresh cron
 *   - reservation-expire: expirare rezervări cron
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── vi.hoisted() ─────────────────────────────────────────────────────────────
const {
  dbSelectMock,
  dbInsertMock,
  dbUpdateMock,
  setSessionTenantIdMock,
  addMock,
  createQueueMock,
  approvalServiceCreateTaskMock,
  FlowProducerMock,
  flowProducerAddMock,
  flowProducerCloseMock,
  e4CreditScoringDurationSecondsObserveMock,
  e4CreditScoreCalculatedTotalIncMock,
  e4CreditLimitChecksTotalIncMock,
  e4CreditReservationsTotalIncMock,
} = vi.hoisted(() => {
  const addMock = vi.fn().mockResolvedValue({ id: "job-123" });
  const closeMock = vi.fn().mockResolvedValue(undefined);
  const createQueueMock = vi.fn(() => ({ add: addMock, close: closeMock }));
  const flowProducerAddMock = vi.fn().mockResolvedValue(undefined);
  const flowProducerCloseMock = vi.fn().mockResolvedValue(undefined);
  const FlowProducerMock = vi.fn(function (this: {
    add: typeof flowProducerAddMock;
    close: typeof flowProducerCloseMock;
  }) {
    this.add = flowProducerAddMock;
    this.close = flowProducerCloseMock;
  });

  return {
    dbSelectMock: vi.fn(),
    dbInsertMock: vi.fn(),
    dbUpdateMock: vi.fn(),
    setSessionTenantIdMock: vi.fn().mockResolvedValue(undefined),
    addMock,
    createQueueMock,
    approvalServiceCreateTaskMock: vi.fn().mockResolvedValue({ id: "hitl-task-001" }),
    FlowProducerMock,
    flowProducerAddMock,
    flowProducerCloseMock,
    e4CreditScoringDurationSecondsObserveMock: vi.fn(),
    e4CreditScoreCalculatedTotalIncMock: vi.fn(),
    e4CreditLimitChecksTotalIncMock: vi.fn(),
    e4CreditReservationsTotalIncMock: vi.fn(),
  };
});

// ── vi.mock() ────────────────────────────────────────────────────────────────

vi.mock("bullmq", () => ({
  FlowProducer: FlowProducerMock,
}));

vi.mock("@cerniq/db", () => ({
  db: {
    select: dbSelectMock,
    insert: dbInsertMock,
    update: dbUpdateMock,
  },
  setSessionTenantId: setSessionTenantIdMock,
  approvalService: { createTask: approvalServiceCreateTaskMock },
  // Schema tables stub
  goldCreditProfiles: {
    id: "id",
    tenantId: "tenant_id",
    clientId: "client_id",
    creditScore: "credit_score",
    riskTier: "risk_tier",
    creditLimit: "credit_limit",
    creditUsed: "credit_used",
    scoreComponents: "score_components",
    bpiStatus: "bpi_status",
    autoRefreshEnabled: "auto_refresh_enabled",
    nextReviewAt: "next_review_at",
    updatedAt: "updated_at",
  },
  goldCreditScores: { id: "id", profileId: "profile_id" },
  goldCreditReservations: {
    id: "id",
    profileId: "profile_id",
    orderId: "order_id",
    amount: "amount",
    status: "status",
    expiresAt: "expires_at",
    updatedAt: "updated_at",
  },
  goldOrders: {
    id: "id",
    tenantId: "tenant_id",
    leadId: "lead_id",
    status: "status",
    totalAmount: "total_amount",
    amountPaid: "amount_paid",
    paymentDueAt: "payment_due_at",
    deletedAt: "deleted_at",
    createdAt: "created_at",
  },
  goldCompanies: { id: "id", cui: "cui" },
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values,
    _tag: "sql",
  })),
  eq: vi.fn((a, b) => ({ _tag: "eq", a, b })),
  and: vi.fn((...args) => ({ _tag: "and", args })),
  or: vi.fn((...args) => ({ _tag: "or", args })),
  lt: vi.fn((a, b) => ({ _tag: "lt", a, b })),
  lte: vi.fn((a, b) => ({ _tag: "lte", a, b })),
  isNull: vi.fn((a) => ({ _tag: "isNull", a })),
  isNotNull: vi.fn((a) => ({ _tag: "isNotNull", a })),
  inArray: vi.fn((a, b) => ({ _tag: "inArray", a, b })),
}));

vi.mock("@cerniq/worker-shared", () => ({
  withCognitiveSpan: vi.fn((_name: string, fn: (s: unknown) => unknown, _ctx?: unknown) => fn({})),
  createQueue: createQueueMock,
  createWorker: vi.fn(),
  getRedisConnectionOptions: vi.fn(() => ({ host: "localhost", port: 6379, db: 4 })),
  sanitizeCui: vi.fn((cui: string) => cui.trim()),
  QUEUES: {
    E4_CREDIT_PROFILE_CREATE: "credit:profile:create",
    E4_CREDIT_DATA_FETCH_ANAF: "credit:data:fetch-anaf",
    E4_CREDIT_DATA_FETCH_BILANT: "credit:data:fetch-bilant",
    E4_CREDIT_DATA_FETCH_BPI: "credit:data:fetch-bpi",
    E4_CREDIT_SCORE_CALCULATE: "credit:score:calculate",
    E4_CREDIT_LIMIT_CALCULATE: "credit:limit:calculate",
    E4_CREDIT_LIMIT_CHECK: "credit:limit:check",
    E4_CREDIT_LIMIT_RESERVE: "credit:limit:reserve",
    E4_CREDIT_LIMIT_RELEASE: "credit:limit:release",
    E4_CREDIT_REFRESH_ALL: "pipeline:credit:refresh-all",
    E4_RESERVATION_EXPIRE: "pipeline:reservation:expire",
  },
  createCircuitBreaker: vi.fn((fn: (path: string) => unknown) => ({
    fire: vi.fn((arg: unknown) => fn(arg as string)),
  })),
  withExternalApiMetrics: vi.fn((_name: string, fn: () => unknown) => fn()),
}));

vi.mock("../e4-metrics.js", () => ({
  e4CreditScoringDurationSeconds: { observe: e4CreditScoringDurationSecondsObserveMock },
  e4CreditScoreCalculatedTotal: { inc: e4CreditScoreCalculatedTotalIncMock },
  e4CreditLimitChecksTotal: { inc: e4CreditLimitChecksTotalIncMock },
  e4CreditReservationsTotal: { inc: e4CreditReservationsTotalIncMock },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeSelectChain(result: unknown[]) {
  const chain = {
    from: vi.fn(),
    leftJoin: vi.fn(),
    where: vi.fn(),
    limit: vi.fn().mockResolvedValue(result),
  };
  chain.from.mockReturnValue(chain);
  chain.leftJoin.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  return chain;
}

function makeInsertChain(result: unknown[] = []) {
  const chain = {
    values: vi.fn(),
    onConflictDoNothing: vi.fn(),
    returning: vi.fn().mockResolvedValue(result),
  };
  chain.values.mockReturnValue(chain);
  chain.onConflictDoNothing.mockReturnValue(chain);
  chain.returning.mockReturnValue(Promise.resolve(result));
  return chain;
}

function makeUpdateChain() {
  const chain = {
    set: vi.fn(),
    where: vi.fn().mockResolvedValue([]),
  };
  chain.set.mockReturnValue(chain);
  return chain;
}

function makeJob<T>(data: T, extra: Record<string, unknown> = {}): unknown {
  return {
    id: "job-test-123",
    data,
    log: vi.fn(),
    getChildrenValues: vi.fn().mockResolvedValue({}),
    ...extra,
  };
}

// ── PART 4: C13 — credit:profile:create ──────────────────────────────────────

import { creditProfileCreateProcessor } from "../workers/c13-credit-profile-create.js";

describe("C13 — creditProfileCreateProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbSelectMock.mockReset();
    dbInsertMock.mockReturnValue(makeInsertChain([{ id: "profile-001" }]));
  });

  it("crează profil nou + dispatchează FlowProducer C14+C15+C16→C17", async () => {
    dbSelectMock.mockReturnValueOnce(makeSelectChain([]));

    dbInsertMock.mockReturnValue(makeInsertChain([{ id: "profile-001" }]));

    const job = makeJob({
      tenantId: "tenant-01",
      clientId: "client-01",
      cui: "12345678",
    });

    const result = await creditProfileCreateProcessor(
      job as Parameters<typeof creditProfileCreateProcessor>[0],
    );

    expect(result).toMatchObject({
      ok: true,
      status: "created",
      profileId: "profile-001",
    });
    expect(flowProducerAddMock).toHaveBeenCalledOnce();
    const flowCall = flowProducerAddMock.mock.calls[0]?.[0];
    expect(flowCall?.queueName).toBe("credit:score:calculate");
    expect(flowCall?.children).toHaveLength(3);
    const childQueues = flowCall?.children.map((c: { queueName: string }) => c.queueName);
    expect(childQueues).toContain("credit:data:fetch-anaf");
    expect(childQueues).toContain("credit:data:fetch-bilant");
    expect(childQueues).toContain("credit:data:fetch-bpi");
    expect(flowProducerCloseMock).toHaveBeenCalledOnce();
  });

  it("profil existent → re-triggering scoring fără insert nou", async () => {
    dbSelectMock.mockReturnValueOnce(makeSelectChain([{ id: "profile-existing" }]));

    const job = makeJob({ tenantId: "tenant-01", clientId: "client-01", cui: "12345678" });
    const result = await creditProfileCreateProcessor(
      job as Parameters<typeof creditProfileCreateProcessor>[0],
    );

    expect(result).toMatchObject({
      ok: true,
      status: "re-triggered",
      profileId: "profile-existing",
    });
    expect(dbInsertMock).not.toHaveBeenCalled();
    expect(flowProducerAddMock).toHaveBeenCalledOnce();
  });

  it("insert conflict → fallback select", async () => {
    dbSelectMock
      .mockReturnValueOnce(makeSelectChain([]))
      .mockReturnValueOnce(makeSelectChain([{ id: "profile-race-condition" }]));
    dbInsertMock.mockReturnValue(makeInsertChain([]));

    const job = makeJob({ tenantId: "tenant-01", clientId: "client-01", cui: "12345678" });
    const result = await creditProfileCreateProcessor(
      job as Parameters<typeof creditProfileCreateProcessor>[0],
    );

    expect(result).toMatchObject({ ok: true, profileId: "profile-race-condition" });
  });
});

// ── PART 5: C14 — credit:data:fetch-anaf ─────────────────────────────────────

vi.mock("../lib/anaf-client.js", () => ({
  fetchAnafByCui: vi.fn(),
  parseAnafForCredit: vi.fn(() => ({
    isActivFiscal: true,
    isTvaActiv: true,
    stareInregistrare: "ACTIVA",
  })),
}));

import { creditDataFetchAnafProcessor } from "../workers/c14-credit-data-fetch-anaf.js";
import { fetchAnafByCui, parseAnafForCredit as parseAnafMock } from "../lib/anaf-client.js";

describe("C14 — creditDataFetchAnafProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbUpdateMock.mockReturnValue(makeUpdateChain());
  });

  it("ANAF găsit → parsează + UPDATE scoreComponents + status=fetched", async () => {
    vi.mocked(fetchAnafByCui).mockResolvedValue({
      date_generale: { cui: 12345678, stare_inregistrare: "ACTIVA" },
    } as Parameters<typeof parseAnafMock>[0]);
    vi.mocked(parseAnafMock).mockReturnValue({
      isActivFiscal: true,
      isTvaActiv: true,
      stareInregistrare: "ACTIVA",
    });

    const job = makeJob({ tenantId: "t1", clientId: "c1", cui: "12345678", profileId: "p1" });
    const result = await creditDataFetchAnafProcessor(
      job as Parameters<typeof creditDataFetchAnafProcessor>[0],
    );

    expect(result).toMatchObject({ ok: true, status: "fetched" });
    expect(result.anafData).toMatchObject({ isActivFiscal: true, isTvaActiv: true });
    expect(dbUpdateMock).toHaveBeenCalledOnce();
  });

  it("ANAF negăsit → status=not_found + scoreComponents cu fallback NOT_FOUND", async () => {
    vi.mocked(fetchAnafByCui).mockResolvedValue(null);

    const job = makeJob({ tenantId: "t1", clientId: "c1", cui: "99999999", profileId: "p1" });
    const result = await creditDataFetchAnafProcessor(
      job as Parameters<typeof creditDataFetchAnafProcessor>[0],
    );

    expect(result).toMatchObject({ ok: true, status: "not_found", anafData: null });
    expect(dbUpdateMock).toHaveBeenCalledOnce();
  });
});

// ── PART 6: C15 — credit:data:fetch-bilant ───────────────────────────────────

vi.mock("../lib/termene-client.js", () => ({
  getTermeneBilant: vi.fn(),
  getTermeneDosare: vi.fn(),
  parseBilant: vi.fn(() => ({
    years: [
      {
        an: 2023,
        cifraAfaceri: 1_000_000,
        profitNet: 100_000,
        capitaluriProprii: 500_000,
        activeCirculante: 400_000,
        datoriiCurente: 200_000,
      },
    ],
  })),
  parseDosare: vi.fn(() => ({
    proceduri_insolventa_active: 0,
    proceduri_insolventa_inchise: 0,
    dosare_parat_active: 0,
    dosare_parat_inactive: 0,
  })),
}));

import { creditDataFetchBilantProcessor } from "../workers/c15-credit-data-fetch-bilant.js";
import {
  getTermeneBilant,
  parseBilant as parseBilantMock,
  getTermeneDosare,
  parseDosare as parseDosareMock,
} from "../lib/termene-client.js";

describe("C15 — creditDataFetchBilantProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbUpdateMock.mockReturnValue(makeUpdateChain());
  });

  it("bilanț găsit → parsează + UPDATE scoreComponents", async () => {
    vi.mocked(getTermeneBilant).mockResolvedValue({ bilant: [] } as Record<string, unknown>);
    vi.mocked(parseBilantMock).mockReturnValue({
      years: [
        {
          an: 2023,
          cifraAfaceri: 1_000_000,
          profitNet: 100_000,
          capitaluriProprii: 500_000,
          activeCirculante: 400_000,
          datoriiCurente: 200_000,
        },
      ],
    });

    const job = makeJob({ tenantId: "t1", clientId: "c1", cui: "12345678", profileId: "p1" });
    const result = await creditDataFetchBilantProcessor(
      job as Parameters<typeof creditDataFetchBilantProcessor>[0],
    );

    expect(result).toMatchObject({ ok: true, status: "fetched" });
    expect(result.bilantData.years).toHaveLength(1);
    expect(dbUpdateMock).toHaveBeenCalledOnce();
  });

  it("bilanț negăsit → status=not_found + years=[]", async () => {
    vi.mocked(getTermeneBilant).mockResolvedValue(null);

    const job = makeJob({ tenantId: "t1", clientId: "c1", cui: "99999", profileId: "p1" });
    const result = await creditDataFetchBilantProcessor(
      job as Parameters<typeof creditDataFetchBilantProcessor>[0],
    );

    expect(result).toMatchObject({ ok: true, status: "not_found" });
    expect(result.bilantData.years).toHaveLength(0);
    expect(dbUpdateMock).toHaveBeenCalledOnce();
  });
});

// ── PART 7: C16 — credit:data:fetch-bpi ──────────────────────────────────────

import { creditDataFetchBpiProcessor } from "../workers/c16-credit-data-fetch-bpi.js";

describe("C16 — creditDataFetchBpiProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbUpdateMock.mockReturnValue(makeUpdateChain());
  });

  it("dosare găsite cu proceduri active → bpiStatus=ACTIVE + UPDATE DB", async () => {
    vi.mocked(getTermeneDosare).mockResolvedValue({ proceduri_insolventa: [] });
    vi.mocked(parseDosareMock).mockReturnValue({
      proceduri_insolventa_active: 1,
      proceduri_insolventa_inchise: 0,
      dosare_parat_active: 0,
      dosare_parat_inactive: 0,
    });

    const job = makeJob({ tenantId: "t1", clientId: "c1", cui: "12345678", profileId: "p1" });
    const result = await creditDataFetchBpiProcessor(
      job as Parameters<typeof creditDataFetchBpiProcessor>[0],
    );

    expect(result).toMatchObject({ ok: true, status: "fetched" });
    expect(result.bpiData.proceduri_insolventa_active).toBe(1);
    expect(dbUpdateMock).toHaveBeenCalledOnce();
  });

  it("dosare negăsite → status=not_found + bpiData zero default", async () => {
    vi.mocked(getTermeneDosare).mockResolvedValue(null);

    const job = makeJob({ tenantId: "t1", clientId: "c1", cui: "12345678", profileId: "p1" });
    const result = await creditDataFetchBpiProcessor(
      job as Parameters<typeof creditDataFetchBpiProcessor>[0],
    );

    expect(result).toMatchObject({ ok: true, status: "not_found" });
    expect(result.bpiData.proceduri_insolventa_active).toBe(0);
    expect(dbUpdateMock).toHaveBeenCalledOnce();
  });

  it("zero proceduri → bpiStatus=NONE; dosare inchise → bpiStatus=CLOSED", async () => {
    vi.mocked(getTermeneDosare).mockResolvedValue({});

    // Test 1: dosare inchise → bpiStatus=CLOSED
    const updateChain1 = makeUpdateChain();
    dbUpdateMock.mockReturnValueOnce(updateChain1);
    vi.mocked(parseDosareMock).mockReturnValueOnce({
      proceduri_insolventa_active: 0,
      proceduri_insolventa_inchise: 2,
      dosare_parat_active: 0,
      dosare_parat_inactive: 0,
    });
    const job1 = makeJob({ tenantId: "t1", clientId: "c1", cui: "1", profileId: "p1" });
    await creditDataFetchBpiProcessor(job1 as Parameters<typeof creditDataFetchBpiProcessor>[0]);
    const call1 = updateChain1.set.mock.calls[0]?.[0];
    expect(call1?.bpiStatus).toBe("CLOSED");

    // Test 2: zero proceduri → bpiStatus=NONE
    const updateChain2 = makeUpdateChain();
    dbUpdateMock.mockReturnValueOnce(updateChain2);
    vi.mocked(parseDosareMock).mockReturnValueOnce({
      proceduri_insolventa_active: 0,
      proceduri_insolventa_inchise: 0,
      dosare_parat_active: 0,
      dosare_parat_inactive: 0,
    });
    const job2 = makeJob({ tenantId: "t1", clientId: "c1", cui: "2", profileId: "p2" });
    await creditDataFetchBpiProcessor(job2 as Parameters<typeof creditDataFetchBpiProcessor>[0]);
    const call2 = updateChain2.set.mock.calls[0]?.[0];
    expect(call2?.bpiStatus).toBe("NONE");
  });
});

// ── PART 8: C17 — credit:score:calculate ─────────────────────────────────────

import { creditScoreCalculateProcessor } from "../workers/c17-credit-score-calculate.js";

describe("C17 — creditScoreCalculateProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbSelectMock.mockReturnValue(makeSelectChain([]));
    dbUpdateMock.mockReturnValue(makeUpdateChain());
    dbInsertMock.mockReturnValue(makeInsertChain([{ id: "score-log-001" }]));
  });

  it("calculează scor din childrenValues + UPDATE profile + INSERT score log + enqueue C18", async () => {
    const childrenValues = {
      "credit:data:fetch-anaf:c14:p1": {
        ok: true,
        anafData: { isActivFiscal: true, isTvaActiv: true, stareInregistrare: "ACTIVA" },
      },
      "credit:data:fetch-bilant:c15:p1": {
        ok: true,
        bilantData: {
          years: [
            {
              an: 2023,
              cifraAfaceri: 1_000_000,
              profitNet: 100_000,
              capitaluriProprii: 500_000,
              activeCirculante: 400_000,
              datoriiCurente: 200_000,
            },
          ],
        },
      },
      "credit:data:fetch-bpi:c16:p1": {
        ok: true,
        bpiData: {
          proceduri_insolventa_active: 0,
          proceduri_insolventa_inchise: 0,
          dosare_parat_active: 0,
          dosare_parat_inactive: 0,
        },
      },
    };

    const job = makeJob(
      { tenantId: "t1", clientId: "c1", cui: "12345678", profileId: "p1" },
      { getChildrenValues: vi.fn().mockResolvedValue(childrenValues) },
    );

    const result = await creditScoreCalculateProcessor(
      job as Parameters<typeof creditScoreCalculateProcessor>[0],
    );

    expect(result.ok).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.riskTier).toBeDefined();
    expect(dbUpdateMock).toHaveBeenCalled();
    expect(dbInsertMock).toHaveBeenCalled();
    expect(createQueueMock).toHaveBeenCalledWith("credit:limit:calculate", expect.any(Object));
    expect(addMock).toHaveBeenCalled();
    expect(e4CreditScoringDurationSecondsObserveMock).toHaveBeenCalledWith(
      { tenant_id: "t1" },
      expect.any(Number),
    );
    expect(e4CreditScoreCalculatedTotalIncMock).toHaveBeenCalled();
  });

  it("childrenValues gol → folosește default (activ=false, bilant gol) → scor minim", async () => {
    const job = makeJob(
      { tenantId: "t1", clientId: "c1", cui: "12345678", profileId: "p1" },
      { getChildrenValues: vi.fn().mockResolvedValue({}) },
    );

    const result = await creditScoreCalculateProcessor(
      job as Parameters<typeof creditScoreCalculateProcessor>[0],
    );
    expect(result.ok).toBe(true);
    // Fără date ANAF și bilanț: anafStatus=0, financialHealth=0, dar BPI+payment+litigation = 42p (defaults curate)
    expect(result.score).toBeLessThan(50);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it("include payment history din DB (2 plăți, amândouă la timp)", async () => {
    const orders = [
      {
        id: "o1",
        amountPaid: "1000",
        totalAmount: "1000",
        paymentDueAt: new Date(Date.now() + 86400000),
        status: "PAID",
        createdAt: new Date(),
      },
      {
        id: "o2",
        amountPaid: "2000",
        totalAmount: "2000",
        paymentDueAt: new Date(Date.now() + 86400000),
        status: "PAID",
        createdAt: new Date(),
      },
    ];
    dbSelectMock.mockReturnValue(makeSelectChain(orders));

    const childrenValues = {
      c14: {
        ok: true,
        anafData: { isActivFiscal: true, isTvaActiv: true, stareInregistrare: "ACTIVA" },
      },
      c15: { ok: true, bilantData: { years: [] } },
      c16: {
        ok: true,
        bpiData: {
          proceduri_insolventa_active: 0,
          proceduri_insolventa_inchise: 0,
          dosare_parat_active: 0,
          dosare_parat_inactive: 0,
        },
      },
    };

    const job = makeJob(
      { tenantId: "t1", clientId: "c1", cui: "12345678", profileId: "p1" },
      { getChildrenValues: vi.fn().mockResolvedValue(childrenValues) },
    );

    const result = await creditScoreCalculateProcessor(
      job as Parameters<typeof creditScoreCalculateProcessor>[0],
    );
    expect(result.ok).toBe(true);
    expect(result.components).toHaveProperty("paymentHistory");
    expect(result.components.paymentHistory).toBe(25);
  });
});

// ── PART 9: C18 — credit:limit:calculate ─────────────────────────────────────

import { creditLimitCalculateProcessor } from "../workers/c18-credit-limit-calculate.js";

describe("C18 — creditLimitCalculateProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbUpdateMock.mockReturnValue(makeUpdateChain());
  });

  it("PREMIUM tier (>50K) → UPDATE creditLimit + HITL task creat (SLA 4h CFO)", async () => {
    const job = makeJob({
      tenantId: "t1",
      clientId: "c1",
      profileId: "p1",
      riskTier: "PREMIUM" as const,
      creditLimit: 100_000,
    });

    const result = await creditLimitCalculateProcessor(
      job as Parameters<typeof creditLimitCalculateProcessor>[0],
    );

    expect(result.ok).toBe(true);
    expect(result.creditLimit).toBe(100_000);
    expect(result.hitlRequired).toBe(true);
    expect(result.hitlTaskId).toBe("hitl-task-001");
    expect(dbUpdateMock).toHaveBeenCalled();
    expect(approvalServiceCreateTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "t1",
        entityType: "gold_credit_profiles",
        entityId: "p1",
        priority: "high",
        etapa: "E4",
        metadata: expect.objectContaining({
          approverRole: "CFO",
          hitlInvestigationType: "credit_limit_approval",
          creditLimit: 100_000,
        }),
      }),
    );
  });

  it("HIGH tier (50K = pragul) → NO HITL (<=50K, nu >50K)", async () => {
    const job = makeJob({
      tenantId: "t1",
      clientId: "c1",
      profileId: "p1",
      riskTier: "HIGH" as const,
      creditLimit: 50_000,
    });
    const result = await creditLimitCalculateProcessor(
      job as Parameters<typeof creditLimitCalculateProcessor>[0],
    );

    expect(result.hitlRequired).toBe(false);
    expect(approvalServiceCreateTaskMock).not.toHaveBeenCalled();
  });

  it.each([
    ["BLOCKED", 0],
    ["LOW", 5_000],
    ["MEDIUM", 20_000],
    ["HIGH", 50_000],
    ["PREMIUM", 100_000],
  ] as const)(
    "tier %s → creditLimit corect %i RON din CREDIT_LIMIT_MAP",
    async (tier, expectedLimit) => {
      const job = makeJob({
        tenantId: "t1",
        clientId: "c1",
        profileId: "p1",
        riskTier: tier,
        creditLimit: expectedLimit,
      });
      const result = await creditLimitCalculateProcessor(
        job as Parameters<typeof creditLimitCalculateProcessor>[0],
      );

      expect(result.creditLimit).toBe(expectedLimit);
    },
  );
});

// ── PART 10: D19 — credit:limit:check ────────────────────────────────────────

import { creditLimitCheckProcessor } from "../workers/d19-credit-limit-check.js";

describe("D19 — creditLimitCheckProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("VERIFICARE PLAN: order 30K + used 25K vs limit 50K → REJECTED", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "p1", creditLimit: "50000", creditUsed: "25000", riskTier: "HIGH" }]),
    );

    const job = makeJob({
      tenantId: "t1",
      orderId: "o1",
      clientId: "c1",
      orderAmount: 30_000,
    });

    const result = await creditLimitCheckProcessor(
      job as Parameters<typeof creditLimitCheckProcessor>[0],
    );

    expect(result.result).toBe("rejected");
    expect(e4CreditLimitChecksTotalIncMock).toHaveBeenCalledWith({
      result: "rejected",
      tenant_id: "t1",
    });
    expect(createQueueMock).not.toHaveBeenCalled();
  });

  it("order 20K + used 25K vs limit 50K → APPROVED (5K disponibil? Nu — 50-25=25 > 20 → APPROVED)", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "p1", creditLimit: "50000", creditUsed: "25000", riskTier: "HIGH" }]),
    );

    const job = makeJob({ tenantId: "t1", orderId: "o1", clientId: "c1", orderAmount: 20_000 });
    const result = await creditLimitCheckProcessor(
      job as Parameters<typeof creditLimitCheckProcessor>[0],
    );

    expect(result.result).toBe("approved");
    expect(createQueueMock).toHaveBeenCalledWith("credit:limit:reserve", expect.any(Object));
    expect(addMock).toHaveBeenCalled();
    expect(e4CreditLimitChecksTotalIncMock).toHaveBeenCalledWith({
      result: "approved",
      tenant_id: "t1",
    });
  });

  it("fără profil credit → approved_no_profile (C13 crează async)", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    const job = makeJob({ tenantId: "t1", orderId: "o1", clientId: "c1", orderAmount: 5_000 });
    const result = await creditLimitCheckProcessor(
      job as Parameters<typeof creditLimitCheckProcessor>[0],
    );

    expect(result.result).toBe("approved_no_profile");
    expect(createQueueMock).not.toHaveBeenCalled();
    expect(e4CreditLimitChecksTotalIncMock).toHaveBeenCalledWith({
      result: "approved_no_profile",
      tenant_id: "t1",
    });
  });

  it("BLOCKED tier (creditLimit=0) → REJECTED orice sumă", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "p1", creditLimit: "0", creditUsed: "0", riskTier: "BLOCKED" }]),
    );

    const job = makeJob({ tenantId: "t1", orderId: "o1", clientId: "c1", orderAmount: 1 });
    const result = await creditLimitCheckProcessor(
      job as Parameters<typeof creditLimitCheckProcessor>[0],
    );

    expect(result.result).toBe("rejected");
  });
});

// ── PART 11: D20 — credit:limit:reserve ──────────────────────────────────────

import { creditLimitReserveProcessor } from "../workers/d20-credit-limit-reserve.js";

describe("D20 — creditLimitReserveProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbUpdateMock.mockReturnValue(makeUpdateChain());
  });

  it("crează rezervare ACTIVE + incrementează creditUsed", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));
    dbInsertMock.mockReturnValue(makeInsertChain([{ id: "res-001" }]));

    const job = makeJob({
      tenantId: "t1",
      orderId: "o1",
      clientId: "c1",
      profileId: "p1",
      orderAmount: 10_000,
    });
    const result = await creditLimitReserveProcessor(
      job as Parameters<typeof creditLimitReserveProcessor>[0],
    );

    expect(result.ok).toBe(true);
    expect(result.status).toBe("reserved");
    expect(result.reservationId).toBe("res-001");
    expect(dbInsertMock).toHaveBeenCalledOnce();
    expect(dbUpdateMock).toHaveBeenCalledOnce();
    expect(e4CreditReservationsTotalIncMock).toHaveBeenCalledWith({
      action: "reserve",
      tenant_id: "t1",
    });
  });

  it("idempotency: rezervare deja există → already_reserved fără insert", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([{ id: "res-existing" }]));

    const job = makeJob({
      tenantId: "t1",
      orderId: "o1",
      clientId: "c1",
      profileId: "p1",
      orderAmount: 5_000,
    });
    const result = await creditLimitReserveProcessor(
      job as Parameters<typeof creditLimitReserveProcessor>[0],
    );

    expect(result.status).toBe("already_reserved");
    expect(result.reservationId).toBe("res-existing");
    expect(dbInsertMock).not.toHaveBeenCalled();
    expect(dbUpdateMock).not.toHaveBeenCalled();
  });
});

// ── PART 12: D21 — credit:limit:release ──────────────────────────────────────

import { creditLimitReleaseProcessor } from "../workers/d21-credit-limit-release.js";

describe("D21 — creditLimitReleaseProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbUpdateMock.mockReturnValue(makeUpdateChain());
  });

  it("order:paid → status=USED (creditUsed NU scade)", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "res-001", amount: "5000", status: "ACTIVE" }]),
    );

    const job = makeJob({
      tenantId: "t1",
      orderId: "o1",
      profileId: "p1",
      trigger: "order:paid" as const,
    });
    const result = await creditLimitReleaseProcessor(
      job as Parameters<typeof creditLimitReleaseProcessor>[0],
    );

    expect(result.status).toBe("used");
    expect(e4CreditReservationsTotalIncMock).toHaveBeenCalledWith({
      action: "used",
      tenant_id: "t1",
    });
    expect(dbUpdateMock).toHaveBeenCalledTimes(1);
  });

  it("order:cancelled → status=RELEASED + creditUsed scade", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "res-001", amount: "10000", status: "ACTIVE" }]),
    );

    const job = makeJob({
      tenantId: "t1",
      orderId: "o1",
      profileId: "p1",
      trigger: "order:cancelled" as const,
    });
    const result = await creditLimitReleaseProcessor(
      job as Parameters<typeof creditLimitReleaseProcessor>[0],
    );

    expect(result.status).toBe("released");
    expect(e4CreditReservationsTotalIncMock).toHaveBeenCalledWith({
      action: "release",
      tenant_id: "t1",
    });
    expect(dbUpdateMock).toHaveBeenCalledTimes(2);
  });

  it("rezervare inexistentă → no_reservation (graceful)", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    const job = makeJob({
      tenantId: "t1",
      orderId: "o1",
      profileId: "p1",
      trigger: "order:paid" as const,
    });
    const result = await creditLimitReleaseProcessor(
      job as Parameters<typeof creditLimitReleaseProcessor>[0],
    );

    expect(result.status).toBe("no_reservation");
    expect(dbUpdateMock).not.toHaveBeenCalled();
  });

  it("rezervare non-ACTIVE (deja procesată) → already_processed (idempotent)", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "res-001", amount: "5000", status: "USED" }]),
    );

    const job = makeJob({
      tenantId: "t1",
      orderId: "o1",
      profileId: "p1",
      trigger: "order:paid" as const,
    });
    const result = await creditLimitReleaseProcessor(
      job as Parameters<typeof creditLimitReleaseProcessor>[0],
    );

    expect(result.status).toBe("already_processed");
    expect(dbUpdateMock).not.toHaveBeenCalled();
  });
});

// ── PART 13: credit-refresh-all (cron 0 3 * * *) ─────────────────────────────

import { creditRefreshAllProcessor } from "../workers/credit-refresh-all.js";

describe("credit-refresh-all CRON — creditRefreshAllProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("niciun profil pending → refreshed=0", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    const job = makeJob({});
    const result = await creditRefreshAllProcessor(
      job as Parameters<typeof creditRefreshAllProcessor>[0],
    );

    expect(result).toMatchObject({ ok: true, refreshed: 0 });
    expect(flowProducerAddMock).not.toHaveBeenCalled();
  });

  it("2 profiluri pending → dispatchează 2 flow-uri FlowProducer", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([
        { id: "p1", tenantId: "t1", clientId: "c1", cui: "12345678" },
        { id: "p2", tenantId: "t1", clientId: "c2", cui: "87654321" },
      ]),
    );

    const job = makeJob({});
    const result = await creditRefreshAllProcessor(
      job as Parameters<typeof creditRefreshAllProcessor>[0],
    );

    expect(result).toMatchObject({ ok: true, refreshed: 2 });
    expect(flowProducerAddMock).toHaveBeenCalledTimes(2);
    expect(flowProducerCloseMock).toHaveBeenCalledOnce();
  });

  it("profil fără CUI → sărit (nu dispatchează)", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([
        { id: "p1", tenantId: "t1", clientId: "c1", cui: null },
        { id: "p2", tenantId: "t1", clientId: "c2", cui: "12345678" },
      ]),
    );

    const job = makeJob({});
    const result = await creditRefreshAllProcessor(
      job as Parameters<typeof creditRefreshAllProcessor>[0],
    );

    expect(result).toMatchObject({ ok: true, refreshed: 1 });
    expect(flowProducerAddMock).toHaveBeenCalledTimes(1);
  });

  it("fiecare FlowProducer add are 3 children (C14+C15+C16→C17)", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([{ id: "p1", tenantId: "t1", clientId: "c1", cui: "12345678" }]),
    );

    const job = makeJob({});
    await creditRefreshAllProcessor(job as Parameters<typeof creditRefreshAllProcessor>[0]);

    const flowCall = flowProducerAddMock.mock.calls[0]?.[0];
    expect(flowCall?.queueName).toBe("credit:score:calculate");
    expect(flowCall?.children).toHaveLength(3);
  });
});

// ── PART 14: reservation-expire (cron */15 * * * *) ──────────────────────────

import { reservationExpireProcessor } from "../workers/reservation-expire.js";

describe("reservation-expire CRON — reservationExpireProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbUpdateMock.mockReturnValue(makeUpdateChain());
  });

  it("nicio rezervare expirată → expired=0", async () => {
    dbSelectMock.mockReturnValue(makeSelectChain([]));

    const job = makeJob({});
    const result = await reservationExpireProcessor(
      job as Parameters<typeof reservationExpireProcessor>[0],
    );

    expect(result).toMatchObject({ ok: true, expired: 0 });
    expect(dbUpdateMock).not.toHaveBeenCalled();
  });

  it("3 rezervări expirate → UPDATE 3x reservation + 3x creditUsed", async () => {
    dbSelectMock.mockReturnValue(
      makeSelectChain([
        { id: "r1", profileId: "p1", amount: "5000" },
        { id: "r2", profileId: "p1", amount: "10000" },
        { id: "r3", profileId: "p2", amount: "15000" },
      ]),
    );

    const job = makeJob({});
    const result = await reservationExpireProcessor(
      job as Parameters<typeof reservationExpireProcessor>[0],
    );

    expect(result).toMatchObject({ ok: true, expired: 3 });
    expect(dbUpdateMock).toHaveBeenCalledTimes(6); // 3 reservation + 3 profile updates
    expect(e4CreditReservationsTotalIncMock).toHaveBeenCalledWith({
      action: "expire",
      tenant_id: "cron",
    });
  });
});
