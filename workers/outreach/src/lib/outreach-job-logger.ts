/**
 * Factory BullMQ → `job_logs` pentru workers Etapa 2 (outreach), cu tenant și corelație uniforme.
 */
import type { Job } from "bullmq";
import { createJobLogger, type JobLogger } from "./job-logger.js";

/** Tenant sintetic pentru job-uri fără `tenantId` în payload (cron, rutare internă). */
export const OUTREACH_SYSTEM_TENANT = "_outreach_system";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Extrage `tenantId` din payload; altfel tenant de sistem. */
export function tenantIdFromUnknownPayload(data: unknown): string {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const t = (data as Record<string, unknown>).tenantId;
    if (typeof t === "string" && t.trim().length > 0) return t.trim();
  }
  return OUTREACH_SYSTEM_TENANT;
}

/** UUID valid din `correlationId` sau `traceId` (doar forma UUID — pentru coloana `correlation_id`). */
export function outreachCorrelationFromPayload(data: unknown): string | undefined {
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
  const o = data as Record<string, unknown>;
  for (const key of ["correlationId", "traceId"] as const) {
    const v = o[key];
    if (typeof v === "string" && UUID_RE.test(v.trim())) return v.trim();
  }
  return undefined;
}

export function outreachTraceIdFromPayload(data: unknown): string | undefined {
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
  const t = (data as Record<string, unknown>).traceId;
  if (typeof t === "string" && t.trim().length > 0) return t.trim();
  return undefined;
}

export interface OutreachJobLoggerOptions {
  workerName: string;
  queueName: string;
  tenantId: string;
  entityType?: string;
  entityId?: string;
  correlationId?: string;
  traceId?: string;
}

function jobIdForLogs(job: Job): string | undefined {
  if (job.id === undefined || job.id === null) return undefined;
  return String(job.id);
}

/** Logger per-job: `etapa: e2`, coadă, corelație din payload sau opțiuni. */
export function createOutreachJobLogger(job: Job, options: OutreachJobLoggerOptions): JobLogger {
  const d = job.data as unknown;
  return createJobLogger({
    tenantId: options.tenantId,
    workerName: options.workerName,
    jobId: jobIdForLogs(job),
    queueName: options.queueName,
    etapa: "e2",
    startedAt: Date.now(),
    correlationId: options.correlationId ?? outreachCorrelationFromPayload(d),
    traceId: options.traceId ?? outreachTraceIdFromPayload(d),
    entityType: options.entityType,
    entityId: options.entityId,
  });
}
