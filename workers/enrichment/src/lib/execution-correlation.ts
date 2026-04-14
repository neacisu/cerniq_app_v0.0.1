import { randomUUID } from "node:crypto";
import type { Job } from "bullmq";
import type { ImportExecutionContext } from "@cerniq/worker-shared";
import { getImportExecutionContext } from "@cerniq/worker-shared";

/** RFC 4122 UUID v1–v5 shape (folosit pentru correlation_id în observabilitate). */
export const CORRELATION_ID_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Aliniat la `parseCorrelationUuid` din `cognitive-helpers` — doar acest shape devine * `batchId` pe canalul Redis `cognitive:events:{batchId}` pentru SSE.
 */
export const COGNITIVE_SSE_BATCH_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Extrage batchId pentru evenimente cognitive / SSE din correlationId job. */
export function cognitiveBatchIdFromCorrelation(
  correlationId: string | null | undefined,
): string | undefined {
  if (!correlationId?.trim()) return undefined;
  const t = correlationId.trim();
  return COGNITIVE_SSE_BATCH_ID_RE.test(t) ? t : undefined;
}

/**
 * Context `Partial<ImportExecutionContext>` pentru `withCognitiveSpan` / `emitCognitiveEvent`.
 *
 * - **Îmbinare completă:** dacă `jobData` conține `importExecution` valid (vezi `getImportExecutionContext`),
 *   toate câmpurile acelui context (traceId, workerName, stageKey, sessionId, entityType, …) sunt propagate;
 *   `tenantId` din argument rămâne sursa de adevăr pentru workerul E1 curent.
 * - **Canal SSE Redis:** `batchId` pentru `cognitive:events:{batchId}` folosește UUID-ul din `correlationId`
 *   când respectă `COGNITIVE_SSE_BATCH_ID_RE`; altfel se păstrează `batchId` din import (fluxuri fără corelație SSE).
 * - **Fără import:** același comportament ca înainte — doar `tenantId`, opțional `correlationId` / `batchId` din corelație.
 */
export function buildCognitiveWorkerEventContext(
  tenantId: string,
  correlationId?: string | null,
  jobData?: unknown,
): Partial<ImportExecutionContext> & { tenantId: string } {
  const importCtx =
    jobData !== undefined && jobData !== null ? getImportExecutionContext(jobData) : null;

  const paramCorr =
    typeof correlationId === "string" && correlationId.trim() ? correlationId.trim() : undefined;
  const importCorr =
    typeof importCtx?.correlationId === "string" && importCtx.correlationId.trim()
      ? importCtx.correlationId.trim()
      : undefined;
  const corrResolved = paramCorr ?? importCorr;
  const sseBatchId = cognitiveBatchIdFromCorrelation(corrResolved);

  if (importCtx) {
    return {
      ...importCtx,
      tenantId,
      correlationId: corrResolved ?? importCtx.correlationId,
      batchId: sseBatchId ?? importCtx.batchId,
    };
  }

  return {
    tenantId,
    ...(corrResolved ? { correlationId: corrResolved } : {}),
    ...(sseBatchId ? { batchId: sseBatchId } : {}),
  };
}

/**
 * Asigură un `correlationId` UUID pe durata execuției job-ului BullMQ (mută `job.data`),
 * astfel încât logurile / auditul să poată filtra corect pe correlation_id fără a pierde
 * job-urile cron cu stringuri umane (ex. `cron-hourly-monitor`).
 */
export function ensureExecutionCorrelationUuid(job: Job): void {
  const d = job.data as Record<string, unknown> | null;
  if (!d || typeof d !== "object" || Array.isArray(d)) return;
  const c = d.correlationId;
  if (typeof c === "string" && CORRELATION_ID_UUID_RE.test(c.trim())) return;
  d.correlationId = randomUUID();
}
