import { Counter, Gauge, Histogram, Registry } from "prom-client";

export const metricsRegistry = new Registry();

export const jobsProcessedTotal = new Counter({
  name: "cerniq_worker_jobs_processed_total",
  help: "Total processed jobs",
  labelNames: ["queue"],
  registers: [metricsRegistry],
});

export const jobsFailedTotal = new Counter({
  name: "cerniq_worker_jobs_failed_total",
  help: "Total failed jobs",
  labelNames: ["queue"],
  registers: [metricsRegistry],
});

export const jobsRetriedTotal = new Counter({
  name: "cerniq_worker_jobs_retried_total",
  help: "Total retried jobs",
  labelNames: ["queue"],
  registers: [metricsRegistry],
});

export const jobDurationSeconds = new Histogram({
  name: "cerniq_worker_job_duration_seconds",
  help: "Job duration in seconds",
  labelNames: ["queue"],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [metricsRegistry],
});

export const queueDepth = new Gauge({
  name: "cerniq_worker_queue_depth",
  help: "Approx queue depth",
  labelNames: ["queue"],
  registers: [metricsRegistry],
});

export const jobsActiveGauge = new Gauge({
  name: "cerniq_worker_jobs_active",
  help: "Currently active jobs per queue",
  labelNames: ["queue"],
  registers: [metricsRegistry],
});

// ── Etapa 1 specific metrics ──────────────────────────────────────────────────

export const bronzeContactsIngestedTotal = new Counter({
  name: "cerniq_bronze_contacts_ingested",
  help: "Total Bronze contacts ingested (from CSV, Excel, webhook, API, manual)",
  labelNames: ["source", "tenant_id"],
  registers: [metricsRegistry],
});

export const silverEnrichmentDurationSeconds = new Histogram({
  name: "cerniq_silver_enrichment_duration_seconds",
  help: "Duration of Silver company enrichment in seconds",
  labelNames: ["source", "tenant_id"],
  buckets: [0.5, 1, 2, 5, 10, 30, 60, 120],
  registers: [metricsRegistry],
});

export const silverEnrichmentErrorsTotal = new Counter({
  name: "cerniq_silver_enrichment_errors_total",
  help: "Total Silver enrichment errors per source",
  labelNames: ["source", "tenant_id"],
  registers: [metricsRegistry],
});

export const goldCompaniesTotal = new Gauge({
  name: "cerniq_gold_companies_total",
  help: "Total Gold companies (promoted from Silver)",
  labelNames: ["tenant_id"],
  registers: [metricsRegistry],
});

export const hitlTasksCreatedTotal = new Counter({
  name: "cerniq_hitl_tasks_created_total",
  help: "Total HITL approval tasks created",
  labelNames: ["approval_type", "tenant_id"],
  registers: [metricsRegistry],
});

export const hitlTasksResolvedTotal = new Counter({
  name: "cerniq_hitl_tasks_resolved_total",
  help: "Total HITL approval tasks resolved",
  labelNames: ["approval_type", "decision", "tenant_id"],
  registers: [metricsRegistry],
});

export const hitlResolutionTimeSeconds = new Histogram({
  name: "cerniq_hitl_resolution_time_seconds",
  help: "Time from HITL task creation to resolution in seconds",
  labelNames: ["approval_type", "tenant_id"],
  buckets: [60, 300, 900, 1800, 3600, 7200, 14400, 28800, 86400],
  registers: [metricsRegistry],
});

export const hitlSlaBreachTotal = new Counter({
  name: "cerniq_hitl_sla_breach_total",
  help: "Total HITL tasks that breached SLA (expired without resolution)",
  labelNames: ["approval_type", "tenant_id"],
  registers: [metricsRegistry],
});

// ── Queue depth metrics (all 6 BullMQ states) ───────────────────────────────

export const queueDepthByState = new Gauge({
  name: "cerniq_worker_queue_depth_by_state",
  help: "Queue depth broken down by BullMQ state",
  labelNames: ["queue", "state"],
  registers: [metricsRegistry],
});

export const dlqDepth = new Gauge({
  name: "cerniq_worker_dlq_depth",
  help: "Dead Letter Queue depth",
  labelNames: ["queue"],
  registers: [metricsRegistry],
});

// ── Pipeline stage metrics ───────────────────────────────────────────────────

export const pipelineCompanyStageDuration = new Histogram({
  name: "cerniq_pipeline_company_stage_duration_seconds",
  help: "Time a company spends in each pipeline stage",
  labelNames: ["stage", "tenant_id"],
  buckets: [60, 300, 600, 1800, 3600, 7200, 14400],
  registers: [metricsRegistry],
});

export const importMutationTotal = new Counter({
  name: "cerniq_import_mutation_total",
  help: "Total data mutations during import",
  labelNames: ["operation", "table", "tenant_id"],
  registers: [metricsRegistry],
});

// ── External API metrics ──────────────────────────────────────────────────────

export const externalApiRequestsTotal = new Counter({
  name: "cerniq_external_api_requests_total",
  help: "Total requests made to external APIs",
  labelNames: ["provider", "status"],
  registers: [metricsRegistry],
});

export const externalApiDurationSeconds = new Histogram({
  name: "cerniq_external_api_duration_seconds",
  help: "Duration of external API calls in seconds",
  labelNames: ["provider", "status"],
  buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
});

export const externalApiErrorsTotal = new Counter({
  name: "cerniq_external_api_errors_total",
  help: "Total errors from external APIs",
  labelNames: ["provider", "error_type"],
  registers: [metricsRegistry],
});

/**
 * Wraps an external API call with latency and error metrics.
 * @param provider - Short name for the provider (anaf, termene, hunter, etc.)
 * @param fn - The async function to instrument
 */
export async function withExternalApiMetrics<T>(
  provider: string,
  fn: () => Promise<T>,
): Promise<T> {
  const end = externalApiDurationSeconds.startTimer({ provider });
  try {
    const result = await fn();
    externalApiRequestsTotal.inc({ provider, status: "success" });
    end({ status: "success" });
    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message.toLowerCase() : String(err);
    let errorType = "unknown";
    if (message.includes("timeout") || message.includes("etimedout")) errorType = "timeout";
    else if (message.includes("rate") || message.includes("429")) errorType = "rate_limited";
    else if (message.includes("401") || message.includes("403") || message.includes("unauthorized"))
      errorType = "auth";
    else if (message.includes("404") || message.includes("not found")) errorType = "not_found";
    else if (message.includes("circuit") && message.includes("open")) errorType = "circuit_open";
    else if (
      message.includes("network") ||
      message.includes("econnrefused") ||
      message.includes("5")
    )
      errorType = "network";
    externalApiRequestsTotal.inc({ provider, status: "error" });
    externalApiErrorsTotal.inc({ provider, error_type: errorType });
    end({ status: errorType });
    throw err;
  }
}
