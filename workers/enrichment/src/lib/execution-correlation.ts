import { randomUUID } from "node:crypto";
import type { Job } from "bullmq";

/** RFC 4122 UUID v1–v5 shape (folosit pentru correlation_id în observabilitate). */
export const CORRELATION_ID_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
