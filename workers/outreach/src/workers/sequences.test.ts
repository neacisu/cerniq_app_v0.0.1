/**
 * sequences.test.ts — 100% coverage pentru withCognitiveSpan instrumentation
 * și logica worker-ilor de secvențe outreach.
 *
 * Verifică:
 * 1. createSequenceSchedulerWorker → "e2:sequence:schedule-followup"
 * 2. createSequenceStopWorker      → "e2:sequence:stop"
 * 3. createSequenceAdvanceWorker   → "e2:sequence:advance"
 * 4. createEnrollmentManagerWorker → "e2:sequence:create"
 *
 * ANTI-HALUCINARE: Nu testăm DB direct — mockăm @cerniq/db complet.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// =============================================================================
// Hoisted mocks
// =============================================================================

vi.mock("luxon", async (importOriginal) => {
  const actual = await importOriginal<typeof import("luxon")>();
  return {
    ...actual,
    DateTime: {
      ...actual.DateTime,
      now: vi.fn(() => ({
        setZone: vi.fn().mockReturnThis(),
        plus: vi.fn().mockReturnThis(),
        toISO: vi.fn(() => "2026-03-26T09:00:00.000+02:00"),
        toISODate: vi.fn(() => "2026-03-26"),
        toJSDate: vi.fn(() => new Date("2026-03-26T09:00:00Z")),
        toMillis: vi.fn(() => Date.now() + 3_600_000),
        weekday: 3, // Wednesday
        hour: 9,
        set: vi.fn().mockReturnThis(),
      })),
    },
  };
});

vi.mock("uuid", () => ({ v4: vi.fn(() => "mock-uuid-1234") }));

// Mock @cerniq/db — complex shape required by sequence workers
vi.mock("@cerniq/db", () => {
  const makeLimit = () => ({ limit: vi.fn().mockResolvedValue([]) });
  const makeSetWhere = () => ({
    set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
  });
  return {
    db: {
      select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => makeLimit()) })) })),
      update: vi.fn(() => makeSetWhere()),
      insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
    },
    setSessionTenantId: vi.fn(async () => undefined),
    outreachSequences: { id: "id", respectBusinessHours: "respectBusinessHours" },
    outreachSequenceSteps: {
      sequenceId: "sequenceId",
      stepNumber: "stepNumber",
      delayHours: "delayHours",
      delayMinutes: "delayMinutes",
      channel: "channel",
    },
    sequenceEnrollments: {
      id: "id",
      journeyId: "journeyId",
      status: "status",
      stoppedReason: "stoppedReason",
      completedAt: "completedAt",
      lastStepExecutedAt: "lastStepExecutedAt",
    },
    leadJourney: {
      id: "id",
      leadId: "leadId",
      nextActionAt: "nextActionAt",
      sequenceStep: "sequenceStep",
      sequencePaused: "sequencePaused",
      currentSequenceId: "currentSequenceId",
    },
    eq: vi.fn(),
    and: vi.fn(),
    sql: vi.fn(),
  };
});

// Track withCognitiveSpan calls — key assertion in all tests
const cognitiveSpanCalls: Array<{ nodeKey: string; ctx?: unknown }> = [];
const queueAdds: Map<string, unknown[]> = new Map();

vi.mock("@cerniq/worker-shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@cerniq/worker-shared")>();
  return {
    ...actual,
    createQueue: vi.fn((name: string) => ({
      add: vi.fn(async (_jobName: string, data: unknown) => {
        let items = queueAdds.get(name);
        if (!items) {
          items = [];
          queueAdds.set(name, items);
        }
        items.push(data);
        return { id: `job-${name}` };
      }),
      close: vi.fn(async () => undefined),
    })),
    createWorker: vi.fn((_queueName: string, processor: (job: unknown) => unknown) => ({
      worker: {
        close: vi.fn(async () => undefined),
        _processor: processor,
      },
    })),
    withCognitiveSpan: vi.fn(async (nodeKey: string, fn: () => unknown, ctx?: unknown) => {
      cognitiveSpanCalls.push({ nodeKey, ctx });
      return fn();
    }),
  };
});

// =============================================================================
// Import after mocks are set up
// =============================================================================

import {
  createSequenceSchedulerWorker,
  createSequenceStopWorker,
  createSequenceAdvanceWorker,
  createEnrollmentManagerWorker,
  createMergedEmailColdAnalyticsWorker,
} from "./sequences.js";
import { createWorker, withCognitiveSpan, createQueue } from "@cerniq/worker-shared";
import * as CerniqDb from "@cerniq/db";
// Helpers
function getProcessor(
  workerFactory: () => ReturnType<typeof createSequenceSchedulerWorker>,
): (job: unknown) => Promise<unknown> {
  workerFactory();
  const calls = vi.mocked(createWorker).mock.calls;
  const lastCall = calls[calls.length - 1];
  return lastCall[1] as (job: unknown) => Promise<unknown>;
}

const TENANT = "tenant-abc";
const JOURNEY_ID = "journey-xyz";
const SEQ_ID = "seq-001";
const SEQ_ENROLLMENT_ID = "enroll-001";

function makeSchedulerJob(currentStep = 0) {
  return {
    data: {
      tenantId: TENANT,
      journeyId: JOURNEY_ID,
      sequenceId: SEQ_ID,
      sequenceEnrollmentId: SEQ_ENROLLMENT_ID,
      currentStep,
    },
  };
}

function makeStopJob() {
  return {
    data: { tenantId: TENANT, journeyId: JOURNEY_ID, reason: "LEAD_REPLIED" },
  };
}

function makeAdvanceJob() {
  return {
    data: { tenantId: TENANT, journeyId: JOURNEY_ID, sequenceEnrollmentId: SEQ_ENROLLMENT_ID },
  };
}

function makeEnrollJob() {
  return {
    data: {
      tenantId: TENANT,
      leadId: "lead-001",
      journeyId: JOURNEY_ID,
      sequenceId: SEQ_ID,
      startAt: undefined,
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("sequences.ts — withCognitiveSpan instrumentation", () => {
  beforeEach(() => {
    cognitiveSpanCalls.length = 0;
    queueAdds.clear();
    vi.mocked(withCognitiveSpan).mockClear();
    vi.mocked(createWorker).mockClear();
    vi.mocked(createQueue).mockClear();
  });

  // ===========================================================================
  // createSequenceSchedulerWorker
  // ===========================================================================

  describe("createSequenceSchedulerWorker", () => {
    it("registrează worker pe QUEUES.SEQUENCE_SCHEDULE_FOLLOWUP", () => {
      createSequenceSchedulerWorker();
      const queueName = vi.mocked(createWorker).mock.calls.at(-1)?.[0];
      expect(queueName).toBe("sequence:schedule:followup");
    });

    it("apelează withCognitiveSpan cu nodeKey 'e2:sequence:schedule-followup'", async () => {
      // Sequence not found — short-circuit path
      vi.mocked(CerniqDb.db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })),
        })),
      });

      const processor = getProcessor(createSequenceSchedulerWorker);
      await processor(makeSchedulerJob());

      expect(cognitiveSpanCalls.some((c) => c.nodeKey === "e2:sequence:schedule-followup")).toBe(
        true,
      );
    });

    it("propagă tenantId în ctx", async () => {
      vi.mocked(CerniqDb.db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })),
        })),
      });

      const processor = getProcessor(createSequenceSchedulerWorker);
      await processor(makeSchedulerJob());

      const call = cognitiveSpanCalls.find((c) => c.nodeKey === "e2:sequence:schedule-followup");
      expect(call?.ctx).toMatchObject({ tenantId: TENANT });
    });

    it("returnează { scheduled: false, reason: 'SEQUENCE_NOT_FOUND' } dacă sequenceId lipsește", async () => {
      vi.mocked(CerniqDb.db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })),
        })),
      });

      const processor = getProcessor(createSequenceSchedulerWorker);
      const result = await processor(makeSchedulerJob());

      expect(result).toEqual({ scheduled: false, reason: "SEQUENCE_NOT_FOUND" });
    });

    it("returnează { scheduled: false, reason: 'SEQUENCE_COMPLETE' } la finalul secvenței", async () => {
      // sequence found
      vi.mocked(CerniqDb.db.select as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([{ id: SEQ_ID, respectBusinessHours: false }]),
            })),
          })),
        })
        // next step not found — this query uses .where(and(...)).limit(1)
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([]),
            })),
          })),
        });

      // Also mock db.update
      vi.mocked(CerniqDb.db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
      });

      const processor = getProcessor(createSequenceSchedulerWorker);
      const result = await processor(makeSchedulerJob());

      expect(result).toMatchObject({ scheduled: false, reason: "SEQUENCE_COMPLETE" });
    });
  });

  // ===========================================================================
  // createSequenceStopWorker
  // ===========================================================================

  describe("createSequenceStopWorker", () => {
    it("registrează worker pe QUEUES.SEQUENCE_STOP", () => {
      createSequenceStopWorker();
      const queueName = vi.mocked(createWorker).mock.calls.at(-1)?.[0];
      expect(queueName).toBe("sequence:stop");
    });

    it("apelează withCognitiveSpan cu nodeKey 'e2:sequence:stop'", async () => {
      vi.mocked(CerniqDb.db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
      });

      const processor = getProcessor(createSequenceStopWorker);
      await processor(makeStopJob());

      expect(cognitiveSpanCalls.some((c) => c.nodeKey === "e2:sequence:stop")).toBe(true);
    });

    it("propagă tenantId în ctx", async () => {
      vi.mocked(CerniqDb.db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
      });

      const processor = getProcessor(createSequenceStopWorker);
      await processor(makeStopJob());

      const call = cognitiveSpanCalls.find((c) => c.nodeKey === "e2:sequence:stop");
      expect(call?.ctx).toMatchObject({ tenantId: TENANT });
    });

    it("face UPDATE pe sequenceEnrollments și leadJourney", async () => {
      vi.mocked(CerniqDb.db.update as ReturnType<typeof vi.fn>).mockClear();
      const mockSet = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }));
      vi.mocked(CerniqDb.db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: mockSet,
      });

      const processor = getProcessor(createSequenceStopWorker);
      await processor(makeStopJob());

      // update() este apelat de 2 ori: sequenceEnrollments + leadJourney
      const updateCalls = vi.mocked(CerniqDb.db.update).mock.calls.length;
      expect(updateCalls).toBeGreaterThanOrEqual(2);
    });
  });

  // ===========================================================================
  // createSequenceAdvanceWorker
  // ===========================================================================

  describe("createSequenceAdvanceWorker", () => {
    it("registrează worker pe QUEUES.SEQUENCE_ADVANCE", () => {
      createSequenceAdvanceWorker();
      const queueName = vi.mocked(createWorker).mock.calls.at(-1)?.[0];
      expect(queueName).toBe("sequence:advance");
    });

    it("apelează withCognitiveSpan cu nodeKey 'e2:sequence:advance'", async () => {
      // enrollment ACTIVE
      vi.mocked(CerniqDb.db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ status: "ACTIVE" }]) })),
        })),
      });
      // journey found
      vi.mocked(CerniqDb.db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{ leadId: "lead-001" }]),
          })),
        })),
      });

      const processor = getProcessor(createSequenceAdvanceWorker);
      await processor(makeAdvanceJob());

      expect(cognitiveSpanCalls.some((c) => c.nodeKey === "e2:sequence:advance")).toBe(true);
    });

    it("propagă tenantId în ctx", async () => {
      vi.mocked(CerniqDb.db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ status: "ACTIVE" }]) })),
        })),
      });
      vi.mocked(CerniqDb.db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([{ leadId: "lead-001" }]),
          })),
        })),
      });

      const processor = getProcessor(createSequenceAdvanceWorker);
      await processor(makeAdvanceJob());

      const call = cognitiveSpanCalls.find((c) => c.nodeKey === "e2:sequence:advance");
      expect(call?.ctx).toMatchObject({ tenantId: TENANT });
    });

    it("returnează imediat (skip) dacă enrollment nu e ACTIVE", async () => {
      vi.mocked(CerniqDb.db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ status: "STOPPED" }]) })),
        })),
      });

      const processor = getProcessor(createSequenceAdvanceWorker);
      const result = await processor(makeAdvanceJob());

      // Returns undefined (void) without calling channelSelectorQueue
      expect(result).toBeUndefined();
    });

    it("returnează imediat dacă enrollment lipsește", async () => {
      vi.mocked(CerniqDb.db.select as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })),
        })),
      });

      const processor = getProcessor(createSequenceAdvanceWorker);
      const result = await processor(makeAdvanceJob());

      expect(result).toBeUndefined();
    });
  });

  // ===========================================================================
  // createEnrollmentManagerWorker
  // ===========================================================================

  describe("createEnrollmentManagerWorker", () => {
    it("registrează worker pe QUEUES.SEQUENCE_CREATE", () => {
      createEnrollmentManagerWorker();
      const queueName = vi.mocked(createWorker).mock.calls.at(-1)?.[0];
      expect(queueName).toBe("sequence:create");
    });

    it("apelează withCognitiveSpan cu nodeKey 'e2:sequence:create'", async () => {
      vi.mocked(CerniqDb.db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      vi.mocked(CerniqDb.db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
      });

      const processor = getProcessor(createEnrollmentManagerWorker);
      await processor(makeEnrollJob());

      expect(cognitiveSpanCalls.some((c) => c.nodeKey === "e2:sequence:create")).toBe(true);
    });

    it("propagă tenantId în ctx", async () => {
      vi.mocked(CerniqDb.db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      vi.mocked(CerniqDb.db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
      });

      const processor = getProcessor(createEnrollmentManagerWorker);
      await processor(makeEnrollJob());

      const call = cognitiveSpanCalls.find((c) => c.nodeKey === "e2:sequence:create");
      expect(call?.ctx).toMatchObject({ tenantId: TENANT });
    });

    it("returnează enrollmentId din uuid mock", async () => {
      vi.mocked(CerniqDb.db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      vi.mocked(CerniqDb.db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
      });

      const processor = getProcessor(createEnrollmentManagerWorker);
      const result = await processor(makeEnrollJob());

      expect(result).toEqual({ enrollmentId: "mock-uuid-1234" });
    });

    it("adaugă job în schedulerQueue cu currentStep=-1", async () => {
      vi.mocked(CerniqDb.db.insert as ReturnType<typeof vi.fn>).mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });
      vi.mocked(CerniqDb.db.update as ReturnType<typeof vi.fn>).mockReturnValue({
        set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
      });

      const processor = getProcessor(createEnrollmentManagerWorker);
      await processor(makeEnrollJob());

      const schedulerJobs = queueAdds.get("sequence:schedule:followup") ?? [];
      const firstJob = schedulerJobs[0] as { currentStep: number };
      expect(firstJob?.currentStep).toBe(-1);
    });
  });

  // ===========================================================================
  // createMergedEmailColdAnalyticsWorker
  // ===========================================================================

  describe("createMergedEmailColdAnalyticsWorker", () => {
    it("registrează worker pe QUEUES.EMAIL_COLD_ANALYTICS_FETCH", () => {
      createMergedEmailColdAnalyticsWorker();
      const queueName = vi.mocked(createWorker).mock.calls.at(-1)?.[0];
      expect(queueName).toBe("email:cold:analytics:fetch");
    });
  });
});

// =============================================================================
// Note: validateTransition este exportat din lead-fsm.ts, nu din sequences.ts.
// Testele pentru FSM se află în lead-fsm.test.ts.
// =============================================================================
