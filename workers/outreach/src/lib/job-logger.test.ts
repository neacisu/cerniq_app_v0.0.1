import { describe, expect, it } from "vitest";
import {
  createJobLogger,
  type JobLogLevel,
  type JobLogger,
  type JobLoggerOpts,
} from "./job-logger.js";

describe("outreach job-logger re-export", () => {
  it("matches @cerniq/observability createJobLogger", async () => {
    const obs = await import("@cerniq/observability");
    expect(createJobLogger).toBe(obs.createJobLogger);
  });

  it("re-exportă tipurile JobLogger / JobLoggerOpts / JobLogLevel (contract stabil)", () => {
    const opts: JobLoggerOpts = {
      tenantId: "t1",
      workerName: "w1",
    };
    expect(opts.tenantId).toBe("t1");
    const level: JobLogLevel = "warn";
    expect(level).toBe("warn");
    const log: Pick<JobLogger, "info"> | null = null;
    expect(log).toBeNull();
  });
});
