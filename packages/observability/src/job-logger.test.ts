import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { insertJobLogRowsMock } = vi.hoisted(() => ({
  insertJobLogRowsMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@cerniq/db", () => ({
  insertJobLogRows: insertJobLogRowsMock,
}));

describe("createJobLogger", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    insertJobLogRowsMock.mockResolvedValue(undefined);
    const { resetJobLogTestState } = await import("./job-logger.js");
    resetJobLogTestState();
  });

  afterEach(async () => {
    const { resetJobLogTestState } = await import("./job-logger.js");
    resetJobLogTestState();
  });

  it("enqueues rows with etapa e1 and flushes to db.insert", async () => {
    const { createJobLogger, flushJobLogBuffer } = await import("./job-logger.js");
    const log = createJobLogger({
      tenantId: "00000000-0000-4000-8000-000000000001",
      batchId: "00000000-0000-4000-8000-000000000002",
      workerName: "w1",
    });
    log.info("s1", "msg");
    await flushJobLogBuffer();
    expect(insertJobLogRowsMock).toHaveBeenCalledTimes(1);
    expect(insertJobLogRowsMock).toHaveBeenCalledWith([
      expect.objectContaining({
        etapa: "e1",
        tenantId: "00000000-0000-4000-8000-000000000001",
        workerName: "w1",
        level: "info",
      }),
    ]);
  });

  it("persists without batchId", async () => {
    const { createJobLogger, flushJobLogBuffer } = await import("./job-logger.js");
    const log = createJobLogger({
      tenantId: "00000000-0000-4000-8000-000000000001",
      workerName: "w2",
    });
    log.warn("s", "x");
    await flushJobLogBuffer();
    expect(insertJobLogRowsMock).toHaveBeenCalledWith([
      expect.objectContaining({ batchId: null, etapa: "e1" }),
    ]);
  });

  it("folosește traceId din correlation store (ALS)", async () => {
    const { createJobLogger, flushJobLogBuffer } = await import("./job-logger.js");
    const { runWithCorrelation } = await import("./correlation.js");
    runWithCorrelation(
      {
        correlationId: "00000000-0000-4000-8000-0000000000cc",
        traceId: "trace-from-als-9",
      },
      () => {
        const log = createJobLogger({
          tenantId: "00000000-0000-4000-8000-000000000001",
          workerName: "w-als",
        });
        log.info("step", "m");
      },
    );
    await flushJobLogBuffer();
    expect(insertJobLogRowsMock).toHaveBeenCalledWith([
      expect.objectContaining({
        traceId: "trace-from-als-9",
        correlationId: "00000000-0000-4000-8000-0000000000cc",
      }),
    ]);
  });
});
