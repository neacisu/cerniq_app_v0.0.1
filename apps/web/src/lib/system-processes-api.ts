import { api } from "./api.js";

export type SystemProcessCategory =
  | "Imports"
  | "Enrichment Pipeline"
  | "Outreach Batches"
  | "AI Tasks"
  | "Other";

export type SystemProcessRow = {
  id: string;
  category: SystemProcessCategory;
  name: string;
  progressPercent: number | null;
  durationMs: number | null;
  status: "running" | "queued" | "paused" | "failed" | "completed";
  cancellable: boolean;
  cancel?: { kind: "import_batch"; batchId: string };
  startedAt: string | null;
  meta?: Record<string, unknown>;
};

export type SystemProcessesResponse = {
  success: boolean;
  data: {
    processes: SystemProcessRow[];
    activeCount: number;
    queuesReachable: boolean;
  };
  meta?: { fetchedAt?: number };
};

export async function fetchSystemProcesses(): Promise<SystemProcessesResponse> {
  return api.get<SystemProcessesResponse>("/api/v1/system/processes");
}
