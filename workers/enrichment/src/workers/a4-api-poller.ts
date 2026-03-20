import { createHash } from "node:crypto";
import type { Processor } from "bullmq";
import { createCircuitBreaker, createQueue, QUEUES } from "@cerniq/worker-shared";
import { bronzeContacts, db, sql } from "@cerniq/db";
import { jobsProcessed, jobDuration, jobErrors } from "../lib/worker-metrics.js";
import { insertBronzeRows, triggerNormalizationForContacts } from "./ingest-utils.js";

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

export const apiPollerProcessor: Processor<ApiPollerJobData> = async (job) => {
  const startedAt = Date.now();
  try {
    const currentPage = job.data.pagination?.page ?? 1;
    const response: Response = await apiPollerBreaker.fire(job.data.endpoint, {
      method: job.data.method ?? "GET",
      headers: job.data.headers,
      body: job.data.body ? JSON.stringify(job.data.body) : undefined,
    });

    const payload = (await response.json()) as unknown;
    const rows = Array.isArray(payload)
      ? payload.filter(
          (item): item is Record<string, unknown> => !!item && typeof item === "object",
        )
      : [payload].filter(
          (item): item is Record<string, unknown> => !!item && typeof item === "object",
        );

    let filteredRows = rows;
    let skippedDuplicates = 0;

    if (job.data.enableDeltaDetection !== false && filteredRows.length > 0) {
      const hashes = filteredRows.map((row) => computeContentHash(row));
      const existingResult = await db
        .select({ contentHash: bronzeContacts.contentHash })
        .from(bronzeContacts)
        .where(
          sql`${bronzeContacts.tenantId} = ${job.data.tenantId}
            AND ${bronzeContacts.contentHash} = ANY(${hashes})`,
        );

      const existingHashes = new Set(existingResult.map((r) => r.contentHash));
      const newRows: Record<string, unknown>[] = [];
      for (let i = 0; i < filteredRows.length; i++) {
        if (existingHashes.has(hashes[i])) {
          skippedDuplicates++;
        } else {
          newRows.push(filteredRows[i]);
        }
      }
      filteredRows = newRows;
    }

    let rowsInserted = 0;

    if (filteredRows.length > 0) {
      const result = await insertBronzeRows(job.data.tenantId, filteredRows, "api");
      rowsInserted = result.rowsInserted;
      await triggerNormalizationForContacts(
        job.data.tenantId,
        result.insertedIds,
        job.data.correlationId,
      );
    }

    const asObj =
      payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    const hasMore = Boolean(asObj.hasMore);
    if (hasMore) {
      const queue = createQueue(QUEUES.INGEST_API);
      await queue.add("poll-next-page", {
        ...job.data,
        pagination: {
          ...job.data.pagination,
          page: currentPage + 1,
        },
      });
      await queue.close();
    }

    await job.updateProgress(100);
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
    throw error;
  } finally {
    jobsProcessed.add(1, { worker: "a4-api-poller" });
    jobDuration.record(Date.now() - startedAt, { worker: "a4-api-poller" });
  }
};
