import { describe, expect, it, vi } from "vitest";
import type { Job } from "bullmq";
import { CORRELATION_ID_UUID_RE } from "../lib/execution-correlation.js";

const beginImportRuntimeJob = vi.fn();
const completeImportRuntimeJob = vi.fn();
const failImportRuntimeJob = vi.fn();
const excelParserProcessor = vi.fn();

vi.mock("@cerniq/worker-shared", () => ({
  QUEUES: { INGEST_EXCEL: "ingest:excel" },
  beginImportRuntimeJob: (...args: unknown[]) => beginImportRuntimeJob(...args),
  completeImportRuntimeJob: (...args: unknown[]) => completeImportRuntimeJob(...args),
  failImportRuntimeJob: (...args: unknown[]) => failImportRuntimeJob(...args),
}));

vi.mock("./a2-excel-parser.js", () => ({
  excelParserProcessor: (...args: unknown[]) => excelParserProcessor(...args),
}));

describe("sandboxedExcelParserProcessor (worker thread entry)", () => {
  it("apelează ensureExecutionCorrelationUuid înainte de beginImportRuntimeJob (payload non-UUID)", async () => {
    beginImportRuntimeJob.mockResolvedValueOnce({ context: null, paused: true });
    const { default: sandboxedExcelParserProcessor } =
      await import("./a2-excel-parser.processor.js");

    const job = {
      id: "job-1",
      name: "x",
      data: {
        tenantId: "11111111-1111-4111-8111-111111111111",
        batchId: "22222222-2222-4222-8222-222222222222",
        filePath: "/tmp/x.xlsx",
        fileName: "x.xlsx",
        correlationId: "cron-excel-ingest",
      },
      attemptsMade: 0,
      opts: { attempts: 3 },
    } as unknown as Job;

    const out = await sandboxedExcelParserProcessor(job);
    expect(out).toEqual({ ok: true, status: "paused" });
    expect(beginImportRuntimeJob).toHaveBeenCalledTimes(1);
    const passedJob = beginImportRuntimeJob.mock.calls[0][1] as Job;
    const cid = (passedJob.data as { correlationId: string }).correlationId;
    expect(CORRELATION_ID_UUID_RE.test(cid)).toBe(true);
    expect(cid).not.toBe("cron-excel-ingest");
    expect(excelParserProcessor).not.toHaveBeenCalled();
  });
});
