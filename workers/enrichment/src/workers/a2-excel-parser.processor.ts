import type { Job } from "bullmq";
import {
  beginImportRuntimeJob,
  completeImportRuntimeJob,
  failImportRuntimeJob,
  QUEUES,
} from "@cerniq/worker-shared";
import { excelParserProcessor, type ExcelParserJobData } from "./a2-excel-parser.js";

export default async function sandboxedExcelParserProcessor(job: Job<ExcelParserJobData>) {
  const runtime = await beginImportRuntimeJob(QUEUES.INGEST_EXCEL, job, QUEUES.INGEST_EXCEL);
  if (runtime.paused) {
    return { ok: true, status: "paused" };
  }

  try {
    const result = await excelParserProcessor(job);
    await completeImportRuntimeJob(job, result as Record<string, unknown> | undefined);
    return result;
  } catch (error) {
    await failImportRuntimeJob(job, error);
    throw error;
  }
}
