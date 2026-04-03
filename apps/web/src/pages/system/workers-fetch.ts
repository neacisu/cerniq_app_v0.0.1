/**
 * Apeluri API pentru pagina Workers — în `.ts` (fără JSX) pentru a evita
 * false-positive Sonar (generice TypeScript interpretate ca tag-uri JSX).
 */
import { api } from "@/lib/api.js";

export type QueueRow = {
  name?: string;
  waiting?: number;
  active?: number;
  completed?: number;
  failed?: number;
  delayed?: number;
  paused?: boolean;
  throughput?: number;
  latency?: number;
};

export type LiveResponse = {
  success?: boolean;
  data?: {
    timestamp?: number;
    queues?: QueueRow[];
    system?: Record<string, unknown> | null;
  };
  error?: string;
};

export type QueueControlResponse = {
  success?: boolean;
  data?: QueueRow;
  error?: string;
};

export type QueueDetailApiResponse = {
  success?: boolean;
  data?: QueueRow;
  error?: string;
};

export function fetchAdminLive() {
  return api.get<LiveResponse>("/api/admin/live");
}

export function fetchQueueDetail(queueName: string) {
  return api.get<QueueDetailApiResponse>(`/api/admin/queues/${encodeURIComponent(queueName)}`);
}

export function postQueueControl(
  queueName: string,
  action: "pause" | "resume" | "retry-failed" | "drain",
) {
  return api.post<QueueControlResponse>(
    `/api/admin/queues/${encodeURIComponent(queueName)}/${action}`,
  );
}
