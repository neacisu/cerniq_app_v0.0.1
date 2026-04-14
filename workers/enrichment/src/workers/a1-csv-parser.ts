import type { Processor } from "bullmq";
import { bronzeImportBatches, db, sql } from "@cerniq/db";
import {
  updateImportRuntimeProgress,
  type ImportExecutionContext,
  withCognitiveSpan,
} from "@cerniq/worker-shared";
import { createServiceLogger } from "@cerniq/observability";
import {
  executeCsvParserJob,
  type BronzeCsvParserDeps,
  type CsvParserJobData,
} from "@cerniq/cognitive-brain-neurons";
import { jobsProcessed, jobDuration, jobErrors } from "../lib/worker-metrics.js";
import { buildCognitiveWorkerEventContext } from "../lib/execution-correlation.js";
import { createJobLogger } from "../lib/job-logger.js";
import {
  createFileReadStream,
  detectColumnMapping,
  detectEncoding,
  getInsertBatchSize,
  insertBronzeRows,
  markImportBatchFailed,
  readInputContent,
  shouldUseStreaming,
  triggerNormalizationForContacts,
  triggerAnafBronzeEnrichment,
  updateImportBatchCounters,
  verifyFileHash,
} from "./ingest-utils.js";

export type { CsvParserJobData } from "@cerniq/cognitive-brain-neurons";

const svcLog = createServiceLogger("a1-csv-parser", { etapa: "e1" });

async function getBatchFileHash(args: {
  tenantId: string;
  batchId: string;
}): Promise<string | undefined> {
  const batch = await db.query.bronzeImportBatches.findFirst({
    where: (t, { eq }) => eq(t.id, args.batchId),
  });
  return (batch?.metadata as Record<string, unknown> | null)?.fileHash as string | undefined;
}

async function persistBatchColumnMapping(
  tenantId: string,
  batchId: string,
  mapping: Record<string, string>,
): Promise<void> {
  if (!batchId || Object.keys(mapping).length === 0) return;
  await db
    .update(bronzeImportBatches)
    .set({
      metadata: sql`jsonb_set(COALESCE(${bronzeImportBatches.metadata}, '{}'::jsonb), '{columnMapping}', ${JSON.stringify(mapping)}::jsonb)`,
    })
    .where(
      sql`${bronzeImportBatches.tenantId} = ${tenantId} AND ${bronzeImportBatches.id} = ${batchId}`,
    );
}

function buildBronzeCsvParserDeps(): BronzeCsvParserDeps {
  return {
    getBatchFileHash,
    verifyFileHash,
    readInputContent,
    createFileReadStream,
    detectEncoding,
    detectColumnMapping,
    getInsertBatchSize,
    shouldUseStreaming,
    insertBronzeRows: (
      tenantId: string,
      rows: Array<Record<string, unknown>>,
      sourceType: "csv_import",
      batchId: string | undefined,
      sheetName: undefined,
      options: {
        startingRowNumber: number;
        columnMapping: Record<string, string> | undefined;
        importExecution: ImportExecutionContext | null;
      },
    ) =>
      insertBronzeRows(tenantId, rows, sourceType, batchId, sheetName, {
        startingRowNumber: options.startingRowNumber,
        columnMapping: options.columnMapping,
        importExecution: options.importExecution,
      }),
    updateImportBatchCounters,
    markImportBatchFailed,
    triggerNormalizationForContacts,
    triggerAnafBronzeEnrichment,
    persistBatchColumnMapping,
    updateImportRuntimeProgress: (job, patch) =>
      updateImportRuntimeProgress(job as never, patch as never),
    createJobLogger: (opts) => createJobLogger({ ...opts, importExecution: opts.importExecution }),
    recordParserWorkerError: () => {
      jobErrors.add(1, { worker: "a1-csv-parser" });
    },
  };
}

const bronzeCsvParserDeps = buildBronzeCsvParserDeps();

export const csvParserProcessor: Processor<CsvParserJobData> = async (job) => {
  const spanCtx = buildCognitiveWorkerEventContext(
    job.data.tenantId,
    job.data.correlationId,
    job.data,
  );
  return withCognitiveSpan(
    "e1:ingest:csv",
    async (_span) => {
      const startedAt = Date.now();
      const useStreaming = await shouldUseStreaming(job.data);
      svcLog.info(
        {
          tenantId: job.data.tenantId,
          correlationId: job.data.correlationId,
          batchId: job.data.batchId,
          fileName: job.data.fileName,
          useStreaming,
        },
        "A1 csv-parser job",
      );

      const result = await executeCsvParserJob(job, bronzeCsvParserDeps);
      jobsProcessed.add(1, { worker: "a1-csv-parser", status: "success" });
      jobDuration.record(Date.now() - startedAt, { worker: "a1-csv-parser" });
      return result;
    },
    spanCtx,
  );
};
