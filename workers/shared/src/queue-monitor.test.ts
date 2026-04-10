import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mock createQueue ──────────────────────────────────────────────────────────

function makeQueueMock(counts: Record<string, number> = {}) {
  return {
    getJobCounts: vi.fn(async (...states: string[]) => {
      const result: Record<string, number> = {};
      for (const s of states) result[s] = counts[s] ?? 0;
      return result;
    }),
    close: vi.fn(async () => undefined),
  };
}

const queueMocks: Map<string, ReturnType<typeof makeQueueMock>> = new Map();

vi.mock("./factory.js", () => ({
  createQueue: vi.fn((name: string) => {
    if (!queueMocks.has(name)) {
      queueMocks.set(name, makeQueueMock());
    }
    return queueMocks.get(name) ?? makeQueueMock();
  }),
}));

// ── Mock metrics ─────────────────────────────────────────────────────────────

const queueDepth = { set: vi.fn() };
const queueDepthByState = { set: vi.fn() };
const dlqDepth = { set: vi.fn() };

vi.mock("./metrics.js", () => ({
  queueDepth,
  queueDepthByState,
  dlqDepth,
}));

beforeEach(() => {
  vi.useFakeTimers();
  queueMocks.clear();
  queueDepth.set.mockClear();
  queueDepthByState.set.mockClear();
  dlqDepth.set.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
});

async function importMonitor() {
  const mod = await import("./queue-monitor.js");
  return mod.startQueueDepthMonitor;
}

describe("startQueueDepthMonitor", () => {
  it("sets queueDepth and queueDepthByState for all states on every interval tick", async () => {
    const startQueueDepthMonitor = await importMonitor();
    queueMocks.set(
      "ingest:csv",
      makeQueueMock({ waiting: 5, active: 2, failed: 1, completed: 10, delayed: 0, paused: 0 }),
    );

    const stop = startQueueDepthMonitor({ queueNames: ["ingest:csv"], intervalMs: 15_000 });

    await vi.advanceTimersByTimeAsync(15_000);

    expect(queueDepth.set).toHaveBeenCalledWith({ queue: "ingest:csv" }, 5);
    expect(queueDepthByState.set).toHaveBeenCalledWith(
      { queue: "ingest:csv", state: "waiting" },
      5,
    );
    expect(queueDepthByState.set).toHaveBeenCalledWith({ queue: "ingest:csv", state: "active" }, 2);
    expect(queueDepthByState.set).toHaveBeenCalledWith({ queue: "ingest:csv", state: "failed" }, 1);
    expect(queueDepthByState.set).toHaveBeenCalledWith(
      { queue: "ingest:csv", state: "completed" },
      10,
    );
    expect(queueDepthByState.set).toHaveBeenCalledWith(
      { queue: "ingest:csv", state: "delayed" },
      0,
    );
    expect(queueDepthByState.set).toHaveBeenCalledWith({ queue: "ingest:csv", state: "paused" }, 0);

    await stop();
  });

  it("sets dlqDepth for each DLQ name", async () => {
    const startQueueDepthMonitor = await importMonitor();
    queueMocks.set("dlq:outreach", makeQueueMock({ waiting: 3 }));

    const stop = startQueueDepthMonitor({
      queueNames: [],
      dlqNames: ["dlq:outreach"],
      intervalMs: 15_000,
    });

    await vi.advanceTimersByTimeAsync(15_000);

    expect(dlqDepth.set).toHaveBeenCalledWith({ queue: "dlq:outreach" }, 3);
    await stop();
  });

  it("logs warn (not throws) when getJobCounts fails for a regular queue", async () => {
    const startQueueDepthMonitor = await importMonitor();
    const failingQueue = makeQueueMock();
    // Reject on every call to verify interval keeps running
    failingQueue.getJobCounts.mockRejectedValue(new Error("Redis ECONNREFUSED"));
    queueMocks.set("normalize:name", failingQueue);

    const warnFn = vi.fn();
    const stop = startQueueDepthMonitor({
      queueNames: ["normalize:name"],
      intervalMs: 15_000,
      logger: { warn: warnFn },
    });

    await vi.advanceTimersByTimeAsync(15_000);
    expect(warnFn).toHaveBeenCalledWith(
      expect.objectContaining({ queue: "normalize:name", error: "Redis ECONNREFUSED" }),
      "Queue depth poll failed",
    );

    // Interval continues after error — second tick also warns
    await vi.advanceTimersByTimeAsync(15_000);
    expect(warnFn).toHaveBeenCalledTimes(2);

    await stop();
  });

  it("logs warn (not throws) when DLQ getJobCounts fails", async () => {
    const startQueueDepthMonitor = await importMonitor();
    const failingDlq = makeQueueMock();
    failingDlq.getJobCounts.mockRejectedValueOnce(new Error("timeout"));
    queueMocks.set("dlq:outreach", failingDlq);

    const warnFn = vi.fn();
    const stop = startQueueDepthMonitor({
      queueNames: [],
      dlqNames: ["dlq:outreach"],
      intervalMs: 15_000,
      logger: { warn: warnFn },
    });

    await vi.advanceTimersByTimeAsync(15_000);

    expect(warnFn).toHaveBeenCalledWith(
      expect.objectContaining({ queue: "dlq:outreach", error: "timeout" }),
      "DLQ depth poll failed",
    );
    await stop();
  });

  it("fires at every interval tick (15s default → 3 ticks in 45s)", async () => {
    const startQueueDepthMonitor = await importMonitor();
    queueMocks.set("q:wa:reply", makeQueueMock({ waiting: 0 }));

    const stop = startQueueDepthMonitor({ queueNames: ["q:wa:reply"], intervalMs: 15_000 });

    await vi.advanceTimersByTimeAsync(45_000);
    expect(queueDepth.set).toHaveBeenCalledTimes(3);

    await stop();
  });

  it("stops polling after stop() is called", async () => {
    const startQueueDepthMonitor = await importMonitor();
    queueMocks.set("pipeline:orchestrate", makeQueueMock({ waiting: 1 }));

    const stop = startQueueDepthMonitor({
      queueNames: ["pipeline:orchestrate"],
      intervalMs: 15_000,
    });

    await vi.advanceTimersByTimeAsync(15_000);
    expect(queueDepth.set).toHaveBeenCalledTimes(1);

    await stop();
    queueDepth.set.mockClear();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(queueDepth.set).not.toHaveBeenCalled();
  });

  it("closes all queue instances on stop()", async () => {
    const startQueueDepthMonitor = await importMonitor();
    queueMocks.set("ingest:csv", makeQueueMock());
    queueMocks.set("dlq:outreach", makeQueueMock());

    const stop = startQueueDepthMonitor({
      queueNames: ["ingest:csv"],
      dlqNames: ["dlq:outreach"],
      intervalMs: 15_000,
    });

    await stop();

    expect(queueMocks.get("ingest:csv")?.close).toHaveBeenCalled();
    expect(queueMocks.get("dlq:outreach")?.close).toHaveBeenCalled();
  });

  it("monitors multiple queues independently", async () => {
    const startQueueDepthMonitor = await importMonitor();
    queueMocks.set("ingest:csv", makeQueueMock({ waiting: 10 }));
    queueMocks.set("normalize:name", makeQueueMock({ waiting: 5 }));

    const stop = startQueueDepthMonitor({
      queueNames: ["ingest:csv", "normalize:name"],
      intervalMs: 15_000,
    });

    await vi.advanceTimersByTimeAsync(15_000);

    expect(queueDepth.set).toHaveBeenCalledWith({ queue: "ingest:csv" }, 10);
    expect(queueDepth.set).toHaveBeenCalledWith({ queue: "normalize:name" }, 5);
    await stop();
  });

  it("apelează logger.warn la eșec poll (semnătură obj, msg)", async () => {
    const startQueueDepthMonitor = await importMonitor();
    const warn = vi.fn();
    const failingQueue = makeQueueMock();
    failingQueue.getJobCounts.mockRejectedValueOnce(new Error("network error"));
    queueMocks.set("score:completeness", failingQueue);

    const stop = startQueueDepthMonitor({
      queueNames: ["score:completeness"],
      intervalMs: 15_000,
      logger: { warn },
    });

    await vi.advanceTimersByTimeAsync(15_000);

    expect(warn).toHaveBeenCalledWith(
      { queue: "score:completeness", error: "network error" },
      "Queue depth poll failed",
    );
    await stop();
  });

  it("supports custom intervalMs", async () => {
    const startQueueDepthMonitor = await importMonitor();
    queueMocks.set("dedup:exact", makeQueueMock({ waiting: 7 }));

    const stop = startQueueDepthMonitor({
      queueNames: ["dedup:exact"],
      intervalMs: 5_000,
    });

    await vi.advanceTimersByTimeAsync(5_000);
    expect(queueDepth.set).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(queueDepth.set).toHaveBeenCalledTimes(2);

    await stop();
  });

  it("handles empty queueNames and dlqNames gracefully (no-op)", async () => {
    const startQueueDepthMonitor = await importMonitor();

    const stop = startQueueDepthMonitor({ queueNames: [], dlqNames: [], intervalMs: 15_000 });
    await vi.advanceTimersByTimeAsync(15_000);

    expect(queueDepth.set).not.toHaveBeenCalled();
    expect(dlqDepth.set).not.toHaveBeenCalled();
    await stop();
  });

  it("monitors multiple DLQ names", async () => {
    const startQueueDepthMonitor = await importMonitor();
    queueMocks.set("dlq:outreach", makeQueueMock({ waiting: 2 }));
    queueMocks.set("dlq:enrichment", makeQueueMock({ waiting: 0 }));

    const stop = startQueueDepthMonitor({
      queueNames: [],
      dlqNames: ["dlq:outreach", "dlq:enrichment"],
      intervalMs: 15_000,
    });

    await vi.advanceTimersByTimeAsync(15_000);

    expect(dlqDepth.set).toHaveBeenCalledWith({ queue: "dlq:outreach" }, 2);
    expect(dlqDepth.set).toHaveBeenCalledWith({ queue: "dlq:enrichment" }, 0);
    await stop();
  });
});

describe("QueueDepthMonitorOptions interface", () => {
  it("dlqNames defaults to empty array when not provided", async () => {
    const { startQueueDepthMonitor } = await import("./queue-monitor.js");
    queueMocks.set("hitl:escalate", makeQueueMock({ waiting: 1 }));

    const stop = startQueueDepthMonitor({ queueNames: ["hitl:escalate"], intervalMs: 15_000 });
    await vi.advanceTimersByTimeAsync(15_000);

    expect(dlqDepth.set).not.toHaveBeenCalled();
    await stop();
  });
});
