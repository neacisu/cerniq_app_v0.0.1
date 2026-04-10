import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Job } from "bullmq";

const createJobLoggerMock = vi.hoisted(() =>
  vi.fn(() => ({
    info: vi.fn(),
    done: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    step: vi.fn(),
    forContact: vi.fn(),
  })),
);

vi.mock("./job-logger.js", () => ({
  createJobLogger: createJobLoggerMock,
}));

import {
  OUTREACH_SYSTEM_TENANT,
  tenantIdFromUnknownPayload,
  outreachCorrelationFromPayload,
  outreachTraceIdFromPayload,
  createOutreachJobLogger,
} from "./outreach-job-logger.js";

describe("outreach-job-logger helpers", () => {
  beforeEach(() => {
    createJobLoggerMock.mockClear();
  });

  it("tenantIdFromUnknownPayload returnează sistem pentru non-obiect", () => {
    expect(tenantIdFromUnknownPayload(null)).toBe(OUTREACH_SYSTEM_TENANT);
    expect(tenantIdFromUnknownPayload(undefined)).toBe(OUTREACH_SYSTEM_TENANT);
    expect(tenantIdFromUnknownPayload("x")).toBe(OUTREACH_SYSTEM_TENANT);
    expect(tenantIdFromUnknownPayload([1])).toBe(OUTREACH_SYSTEM_TENANT);
  });

  it("tenantIdFromUnknownPayload citește tenantId", () => {
    expect(tenantIdFromUnknownPayload({ tenantId: "  t1  " })).toBe("t1");
  });

  it("tenantIdFromUnknownPayload ignoră tenant gol", () => {
    expect(tenantIdFromUnknownPayload({ tenantId: "   " })).toBe(OUTREACH_SYSTEM_TENANT);
    expect(tenantIdFromUnknownPayload({ tenantId: "" })).toBe(OUTREACH_SYSTEM_TENANT);
  });

  it("outreachCorrelationFromPayload", () => {
    expect(outreachCorrelationFromPayload(null)).toBeUndefined();
    expect(outreachCorrelationFromPayload([])).toBeUndefined();
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(outreachCorrelationFromPayload({ correlationId: `  ${uuid}  ` })).toBe(uuid);
    expect(outreachCorrelationFromPayload({ traceId: uuid })).toBe(uuid);
    expect(outreachCorrelationFromPayload({ correlationId: "not-a-uuid" })).toBeUndefined();
  });

  it("outreachTraceIdFromPayload", () => {
    expect(outreachTraceIdFromPayload(null)).toBeUndefined();
    expect(outreachTraceIdFromPayload({ traceId: "  abc  " })).toBe("abc");
    expect(outreachTraceIdFromPayload({ traceId: "   " })).toBeUndefined();
  });

  it("createOutreachJobLogger propagă opțiuni către createJobLogger", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const job = {
      id: "job-1",
      data: { tenantId: "t1", correlationId: uuid },
    } as unknown as Job;

    createOutreachJobLogger(job, {
      workerName: "outreach-test",
      queueName: "q:test",
      tenantId: "t1",
      entityType: "journey",
      entityId: "j1",
    });

    expect(createJobLoggerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        etapa: "e2",
        workerName: "outreach-test",
        queueName: "q:test",
        tenantId: "t1",
        jobId: "job-1",
        entityType: "journey",
        entityId: "j1",
        correlationId: uuid,
        startedAt: expect.any(Number),
      }),
    );
  });

  it("createOutreachJobLogger folosește override correlation/trace", () => {
    const job = { id: "1", data: {} } as unknown as Job;
    createOutreachJobLogger(job, {
      workerName: "w",
      queueName: "q",
      tenantId: "t",
      correlationId: "650e8400-e29b-41d4-a716-446655440001",
      traceId: "trace-val",
    });
    expect(createJobLoggerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: "650e8400-e29b-41d4-a716-446655440001",
        traceId: "trace-val",
      }),
    );
  });

  it("createOutreachJobLogger omite jobId când id lipsește", () => {
    const job = { data: {} } as unknown as Job;
    createOutreachJobLogger(job, { workerName: "w", queueName: "q", tenantId: "t" });
    expect(createJobLoggerMock).toHaveBeenCalledWith(expect.objectContaining({ jobId: undefined }));
  });
});
