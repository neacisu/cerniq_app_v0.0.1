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
