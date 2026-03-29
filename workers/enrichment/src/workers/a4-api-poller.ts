import { createHash } from "node:crypto";
import type { Processor } from "bullmq";
import {
  createCircuitBreaker,
  createQueue,
  QUEUES,
  withCognitiveSpan,
} from "@cerniq/worker-shared";
import { bronzeContacts, db, sql } from "@cerniq/db";
import { jobsProcessed, jobDuration, jobErrors, jobsFailed } from "../lib/worker-metrics.js";
import { insertBronzeRows, triggerNormalizationForContacts } from "./ingest-utils.js";
import { createJobLogger, type JobLogger } from "../lib/job-logger.js";

export type ApiPollerJobData = {
  tenantId: string;
  apiSource: string;
  endpoint: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: unknown;
  pagination?: {
    page: number;
    pageSize: number;
    totalPages?: number;
  };
  enableDeltaDetection?: boolean;
  correlationId: string;
};

const API_POLL_TIMEOUT_MS = Number(process.env.API_POLL_TIMEOUT_MS ?? "30000");

function computeContentHash(row: Record<string, unknown>): string {
  const sorted = JSON.stringify(
    row,
    Object.keys(row).sort((a, b) => a.localeCompare(b)),
  );
  return createHash("sha256").update(sorted).digest("hex");
}

// GAP-B6: Wrap fetch in circuit breaker with timeout + 429 handling
async function fetchWithTimeout(endpoint: string, options: RequestInit): Promise<Response> {
  const response = await fetch(endpoint, {
    ...options,
    signal: AbortSignal.timeout(API_POLL_TIMEOUT_MS),
  });

  if (response.status === 429) {
    const retryAfter = response.headers.get("retry-after");
    const delaySec = retryAfter ? Number.parseInt(retryAfter, 10) : 60;
    throw new Error(
      `API rate limited (429). Retry after ${Number.isFinite(delaySec) ? delaySec : 60}s`,
    );
  }

  if (!response.ok) {
    throw new Error(`API poll failed (${response.status}) for ${endpoint}`);
  }

  return response;
}

const apiPollerBreaker = createCircuitBreaker(
  async (...args: unknown[]) => {
    const endpoint = String(args[0] ?? "");
    const options = (args[1] ?? {}) as RequestInit;
    return fetchWithTimeout(endpoint, options);
  },
  "api-poller",
  {
    timeout: API_POLL_TIMEOUT_MS + 5000,
    errorThresholdPercentage: 50,
    resetTimeout: 60000,
    volumeThreshold: 3,
  },
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalises any API payload shape into a flat array of plain objects.
 * Handles both top-level arrays and single-object responses.
 * Type-guard filter is defined once and reused to avoid duplicate complexity.
 */
function extractRowsFromPayload(payload: unknown): Record<string, unknown>[] {
  const isObjectRow = (item: unknown): item is Record<string, unknown> =>
    !!item && typeof item === "object";
  return Array.isArray(payload) ? payload.filter(isObjectRow) : [payload].filter(isObjectRow);
}

interface DeltaFilterResult {
  filteredRows: Record<string, unknown>[];
  skippedDuplicates: number;
}

/**
 * Performs content-hash delta detection against `bronze.bronze_contacts`.
 * When `enabled` is false or the input array is empty it returns rows unchanged.
 * Kept as an async helper so the processor stays below Sonar S3776 threshold
 * while keeping the for-loop nesting and Drizzle query out of the hot path.
 */
async function filterByDeltaDetection(
  tenantId: string,
  rows: Record<string, unknown>[],
  enabled: boolean,
  log: JobLogger,
): Promise<DeltaFilterResult> {
  if (!enabled || rows.length === 0) {
    return { filteredRows: rows, skippedDuplicates: 0 };
  }

  const hashes = rows.map(computeContentHash);
  const existingResult = await db
    .select({ contentHash: bronzeContacts.contentHash })
    .from(bronzeContacts)
    .where(
      sql`${bronzeContacts.tenantId} = ${tenantId}
        AND ${bronzeContacts.contentHash} = ANY(${hashes})`,
    );

  const existingHashes = new Set(existingResult.map((r) => r.contentHash));
  const filteredRows: Record<string, unknown>[] = [];
  let skippedDuplicates = 0;

  for (const [index, row] of rows.entries()) {
    if (existingHashes.has(hashes[index])) {
      skippedDuplicates++;
    } else {
      filteredRows.push(row);
    }
  }

  if (skippedDuplicates > 0) {
    log.info(
      "delta_filter",
      `Delta detection: ${skippedDuplicates} duplicate(s) sărite (conținut identic deja în bronze)`,
      { totalFetched: rows.length, skippedDuplicates, newRows: filteredRows.length },
    );
  }

  return { filteredRows, skippedDuplicates };
}

/**
 * Inserts the de-duplicated rows into `bronze.bronze_contacts` and triggers
 * the B1 normalisation queue.  Returns the number of rows actually written.
 * The if/else for the "nothing to insert" fast-path is handled here to keep
 * the processor's structural complexity low.
 */
async function ingestFilteredRows(
  tenantId: string,
  filteredRows: Record<string, unknown>[],
  totalFetched: number,
  skippedDuplicates: number,
  correlationId: string,
  log: JobLogger,
): Promise<number> {
  if (filteredRows.length === 0) {
    log.info(
      "no_new_rows",
      `Nicio înregistrare nouă — toate duplicate sau zero rânduri de la API`,
      {
        rowsFetched: totalFetched,
        skippedDuplicates,
      },
    );
    return 0;
  }

  const result = await insertBronzeRows(tenantId, filteredRows, "api");
  await triggerNormalizationForContacts(tenantId, result.insertedIds, correlationId);
  log.info(
    "rows_inserted",
    `${result.rowsInserted} contacte salvate în bronze, normalizare declanșată`,
    {
      rowsInserted: result.rowsInserted,
      triggeredNormalization: result.insertedIds.length,
    },
  );
  return result.rowsInserted;
}

/**
 * Enqueues the next pagination page when the API signals more data is available.
 * Returns true if another page was scheduled, false otherwise.
 * Isolates the queue lifecycle (create → add → close) from the main processor.
 */
async function scheduleNextPageIfNeeded(
  currentPage: number,
  payload: unknown,
  jobData: ApiPollerJobData,
  log: JobLogger,
): Promise<boolean> {
  const asObj =
    payload !== null && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  if (!asObj.hasMore) return false;

  const queue = createQueue(QUEUES.INGEST_API);
  await queue.add("poll-next-page", {
    ...jobData,
    pagination: { ...jobData.pagination, page: currentPage + 1 },
  });
  await queue.close();
  log.info("paginate", `Mai există date — pagina ${currentPage + 1} enqueued`, {
    nextPage: currentPage + 1,
  });
  return true;
}

// ---------------------------------------------------------------------------
// Processor
// ---------------------------------------------------------------------------

export const apiPollerProcessor: Processor<ApiPollerJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:ingest:api",
    async (_span) => {
      const startedAt = Date.now();
      const log = createJobLogger({
        tenantId: job.data.tenantId,
        workerName: "A4:api-poller",
        jobId: String(job.id ?? ""),
        startedAt,
      });

      try {
        const currentPage = job.data.pagination?.page ?? 1;
        const method = job.data.method ?? "GET";

        log.step("start", `Polling API extern: ${job.data.apiSource} — pagina ${currentPage}`, {
          endpoint: job.data.endpoint,
          method,
          page: currentPage,
          deltaDetection: job.data.enableDeltaDetection !== false,
        });

        const response: Response = await apiPollerBreaker.fire(job.data.endpoint, {
          method,
          headers: job.data.headers,
          body: job.data.body === undefined ? undefined : JSON.stringify(job.data.body),
        });

        const payload = (await response.json()) as unknown;
        const rows = extractRowsFromPayload(payload);

        log.info(
          "api_response",
          `API a returnat ${rows.length} înregistrări (pagina ${currentPage})`,
          {
            rowCount: rows.length,
            page: currentPage,
          },
        );

        const { filteredRows, skippedDuplicates } = await filterByDeltaDetection(
          job.data.tenantId,
          rows,
          job.data.enableDeltaDetection !== false,
          log,
        );

        const rowsInserted = await ingestFilteredRows(
          job.data.tenantId,
          filteredRows,
          rows.length,
          skippedDuplicates,
          job.data.correlationId,
          log,
        );

        const hasMore = await scheduleNextPageIfNeeded(currentPage, payload, job.data, log);

        log.done(
          "done",
          `Polling API finalizat: ${rowsInserted} contacte noi, ${skippedDuplicates} duplicate sărite`,
          { rowsFetched: rows.length, rowsInserted, skippedDuplicates, page: currentPage, hasMore },
        );

        await job.updateProgress(100);

        jobsProcessed.add(1, { worker: "a4-api-poller" });

        return {
          ok: true,
          rowsFetched: rows.length,
          rowsInserted,
          skippedDuplicates,
          page: currentPage,
          hasMore,
          deltaDetectionEnabled: job.data.enableDeltaDetection !== false,
        };
      } catch (error) {
        jobErrors.add(1, { worker: "a4-api-poller" });
        jobsFailed.add(1, { worker: "a4-api-poller" });
        log.error("fatal", `Eroare critică la polling API ${job.data.apiSource}`, {
          endpoint: job.data.endpoint,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      } finally {
        jobDuration.record(Date.now() - startedAt, { worker: "a4-api-poller" });
      }
    },
    { tenantId: job.data.tenantId },
  );
};
