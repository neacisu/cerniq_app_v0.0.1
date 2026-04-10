import type { ImportExecutionContext } from "@cerniq/worker-shared";
import { describe, expect, it, vi } from "vitest";

vi.mock("@cerniq/observability", () => ({
  createJobLogger: vi.fn((opts: Record<string, unknown>) => ({
    opts,
    step: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    done: vi.fn(),
    forContact: vi.fn(function (this: unknown) {
      return this;
    }),
  })),
}));

describe("enrichment job-logger wrapper", () => {
  it("maps ImportExecutionContext into core job logger opts", async () => {
    const { createJobLogger } = await import("@cerniq/observability");
    const { createJobLogger: createEnrichmentJobLogger } = await import("./job-logger.js");

    const importExecution: ImportExecutionContext = {
      tenantId: "t1",
      batchId: "b1",
      sessionId: "sess-1",
      runtimeJobKey: "run-1",
      parentRuntimeJobKey: "parent-1",
      workerName: "w1",
      stageKey: "s1",
    };

    createEnrichmentJobLogger({
      tenantId: "t1",
      workerName: "test",
      jobId: "j1",
      importExecution,
    });

    expect(createJobLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "t1",
        workerName: "test",
        jobId: "j1",
        sessionId: "sess-1",
        runtimeJobKey: "run-1",
        parentRuntimeJobKey: "parent-1",
      }),
    );
  });
});
