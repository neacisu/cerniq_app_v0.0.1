import { createHash } from "node:crypto";
import type { Processor } from "bullmq";
import { createQueue } from "@cerniq/worker-shared";
import { bronzeContacts, db, sql } from "@cerniq/db";
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

function computeContentHash(row: Record<string, unknown>): string {
  const sorted = JSON.stringify(row, Object.keys(row).sort());
  return createHash("sha256").update(sorted).digest("hex");
}

export const apiPollerProcessor: Processor<ApiPollerJobData> = async (job) => {
  const currentPage = job.data.pagination?.page ?? 1;
  const response = await fetch(job.data.endpoint, {
    method: job.data.method ?? "GET",
    headers: job.data.headers,
    body: job.data.body ? JSON.stringify(job.data.body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API poll failed (${response.status}) for ${job.data.endpoint}`);
  }

  const payload = (await response.json()) as unknown;
  const rows = Array.isArray(payload)
    ? payload.filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
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

  const asObj = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const hasMore = Boolean(asObj.hasMore);
  if (hasMore) {
    const queue = createQueue("ingest:api");
    await queue.add("poll-next-page", {
      ...job.data,
      pagination: {
        ...job.data.pagination,
        page: currentPage + 1,
      },
    });
    await queue.close();
  }

  return {
    ok: true,
    rowsFetched: rows.length,
    rowsInserted,
    skippedDuplicates,
    page: currentPage,
    hasMore,
    deltaDetectionEnabled: job.data.enableDeltaDetection !== false,
  };
};
