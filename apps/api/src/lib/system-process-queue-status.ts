/** Snapshot minimal din Monitoring API (`/api/queues`). */
export type QueueSnapshotLike = {
  paused?: boolean;
  waiting?: number;
  active?: number;
  delayed?: number;
  failed?: number;
};

export type QueueDerivedStatus = "running" | "queued" | "paused" | "failed";

/**
 * Mapare agregată pentru panoul „Procese în fundal”.
 * Joburile `failed` rămân în Redis până la retry/clean; cozile cu `delayed` (cron) nu sunt „coadă moartă”.
 */
export function deriveQueueSnapshotStatus(q: QueueSnapshotLike): QueueDerivedStatus {
  if (q.paused) return "paused";
  if ((q.active ?? 0) > 0) return "running";
  const waiting = q.waiting ?? 0;
  const delayed = q.delayed ?? 0;
  if (waiting > 0 || delayed > 0) return "queued";
  if ((q.failed ?? 0) > 0) return "failed";
  return "queued";
}
