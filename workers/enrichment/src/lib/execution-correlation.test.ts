import { describe, expect, it } from "vitest";
import type { Job } from "bullmq";
import { CORRELATION_ID_UUID_RE, ensureExecutionCorrelationUuid } from "./execution-correlation.js";

function makeJob(data: Record<string, unknown>): Job {
  return { data } as Job;
}

describe("ensureExecutionCorrelationUuid", () => {
  it("păstrează correlationId deja UUID", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    const job = makeJob({ tenantId: "t1", correlationId: id });
    ensureExecutionCorrelationUuid(job);
    expect(job.data.correlationId).toBe(id);
  });

  it("înlocuiește string non-UUID cu UUID nou", () => {
    const job = makeJob({ tenantId: "t1", correlationId: "cron-hourly-monitor" });
    ensureExecutionCorrelationUuid(job);
    const c = (job.data as { correlationId: string }).correlationId;
    expect(CORRELATION_ID_UUID_RE.test(c)).toBe(true);
    expect(c).not.toBe("cron-hourly-monitor");
  });

  it("adaugă correlationId dacă lipsește", () => {
    const job = makeJob({ tenantId: "t1" });
    ensureExecutionCorrelationUuid(job);
    const c = (job.data as { correlationId: string }).correlationId;
    expect(CORRELATION_ID_UUID_RE.test(c)).toBe(true);
  });

  it("nu modifică dacă job.data nu e obiect", () => {
    const job = { data: null } as Job;
    ensureExecutionCorrelationUuid(job);
    expect(job.data).toBeNull();
  });
});
