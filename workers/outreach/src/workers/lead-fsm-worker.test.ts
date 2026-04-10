import { describe, it, expect, vi, beforeEach } from "vitest";

const fsmInc = vi.fn();

vi.mock("@cerniq/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [{ currentState: "COLD", id: "j1" }]),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => undefined),
      })),
    })),
  },
  leadJourney: { id: "id", tenantId: "tenantId" },
  eq: vi.fn((_l: unknown, _r: unknown) => ({ left: _l, right: _r })),
  and: vi.fn((_a: unknown, _b: unknown) => ({ and: [_a, _b] })),
  setSessionTenantId: vi.fn(async () => undefined),
}));

vi.mock("@cerniq/worker-shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@cerniq/worker-shared")>();
  return {
    ...actual,
    createQueue: vi.fn(() => ({
      add: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
    })),
    createWorker: vi.fn((_queueName: string, processor: unknown) => ({
      worker: { processor, close: vi.fn(async () => undefined) },
    })),
    withCognitiveSpan: vi.fn(async (_name: string, fn: () => unknown) => fn()),
    fsmTransitions: { inc: fsmInc },
  };
});

describe("createStateTransitionWorker — tranziție invalidă", () => {
  beforeEach(() => {
    fsmInc.mockClear();
  });

  it("returnează success:false și incrementează fsmTransitions INVALID (fără throw)", async () => {
    const { createWorker } = await import("@cerniq/worker-shared");
    const { createStateTransitionWorker } = await import("./lead-fsm.js");
    createStateTransitionWorker();

    const [, processor] = (createWorker as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      (job: unknown) => Promise<unknown>,
    ];

    const result = (await processor({
      id: "job-1",
      data: {
        tenantId: "t1",
        leadId: "l1",
        journeyId: "j1",
        newState: "CONVERTED",
        trigger: "MANUAL",
      },
    })) as { success: boolean; error?: string; previousState: string; newState: string };

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid transition/i);
    expect(result.previousState).toBe("COLD");
    expect(fsmInc).toHaveBeenCalledWith({ from: "COLD", to: "INVALID" });
  });
});
