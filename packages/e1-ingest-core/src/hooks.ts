/**
 * Worker-specific hooks pentru inserare bronze (G7): `e1-ingest-core` nu depinde
 * direct de `cui-validation` / `pipeline-utils` din worker.
 */

export type HitlApprovalTaskArgs = {
  tenantId: string;
  entityType: string;
  entityId: string;
  type:
    | "dedup_review"
    | "quality_review"
    | "identity_conflict"
    | "ai_structuring_review"
    | "ai_merge_review"
    | "low_confidence_review"
    | "data_anomaly"
    | "manual_verification"
    | "error_review";
  title: string;
  description?: string;
  aiConfidence?: number;
  aiRecommendation?: string;
  aiReasoning?: string;
  priority?: number;
  urgency?: "low" | "medium" | "high" | "critical";
  blockedJobId?: string;
  blockedQueueName?: string;
  metadata?: Record<string, unknown>;
  expiresInHours?: number;
  ttlHours?: number;
};

export type E1IngestWorkerHooks = {
  sanitizeCui: (raw: string) => string | null;
  createHitlApprovalTask: (args: HitlApprovalTaskArgs) => Promise<string | null>;
};

let workerHooks: E1IngestWorkerHooks | null = null;

export function configureE1IngestWorkerHooks(hooks: E1IngestWorkerHooks): void {
  workerHooks = hooks;
}

export function getE1IngestWorkerHooks(): E1IngestWorkerHooks {
  if (!workerHooks) {
    throw new Error(
      "configureE1IngestWorkerHooks() must be called from worker-enrichment before using ingest hooks",
    );
  }
  return workerHooks;
}

/** Doar teste. */
export function resetE1IngestWorkerHooksForTests(): void {
  workerHooks = null;
}
