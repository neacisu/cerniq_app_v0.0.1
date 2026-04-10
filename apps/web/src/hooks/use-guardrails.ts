import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api.js";

const REFETCH_MS = 15_000;

export type GuardrailStatusPayload = {
  by_violation_type: Array<{
    violationType: string;
    count: number;
    lastAt: string | null;
  }>;
  by_severity: Array<{ severity: string | null; count: number }>;
  source: string;
};

export type LlmAuditRow = {
  id: string;
  workerQueue: string;
  modelUsed: string;
  provider: string;
  isSelfhosted: boolean;
  costUsd: string;
  latencyMs: number;
  guardrailPassed: boolean;
  guardrailViolations: Record<string, unknown>[] | null;
  regenerationAttempt: number;
  llmguardScores: Record<string, unknown> | null;
  allResponses: Record<string, unknown>[] | null;
  createdAt: string;
  promptHash: string;
};

export type GuardrailMetricsPayload = {
  violations_daily_last_7_days: Array<{ day: string; count: number }>;
  llm_audit_7d: { total: number; passed: number; failed: number };
  regeneration: {
    totalAttempts: string;
    callsWithRegeneration: number;
    windowDays: number;
  };
  latency_ms_by_queue: Array<{
    workerQueue: string;
    p50: number;
    p95: number;
    p99: number;
    samples: number;
  }>;
  model_routing: Array<{ workerQueue: string; modelUsed: string; count: number }>;
  source: { violations: string; audit: string };
};

export function useGuardrailStatus() {
  return useQuery({
    queryKey: ["ai", "guardrails", "status"],
    queryFn: () =>
      api.get<{ success?: boolean; data?: GuardrailStatusPayload }>("/api/v1/ai/guardrails/status"),
    refetchInterval: REFETCH_MS,
    staleTime: 5_000,
  });
}

export function useAuditLog(options?: { readonly limit?: number; readonly type?: "guardrail" }) {
  const limit = options?.limit ?? 50;
  const type = options?.type;
  return useQuery({
    queryKey: ["ai", "audit-log", limit, type ?? "all"],
    queryFn: () => {
      const sp = new URLSearchParams({ limit: String(limit) });
      if (type) sp.set("type", type);
      return api.get<{ success?: boolean; data?: LlmAuditRow[] }>(
        `/api/v1/ai/audit-log?${sp.toString()}`,
      );
    },
    refetchInterval: REFETCH_MS,
    staleTime: 5_000,
  });
}

export function useGuardrailMetrics(latencyDays = 30) {
  return useQuery({
    queryKey: ["ai", "guardrails", "metrics", latencyDays],
    queryFn: () =>
      api.get<{ success?: boolean; data?: GuardrailMetricsPayload }>(
        `/api/v1/ai/guardrails/metrics?latencyDays=${latencyDays}`,
      ),
    refetchInterval: REFETCH_MS,
    staleTime: 5_000,
  });
}
