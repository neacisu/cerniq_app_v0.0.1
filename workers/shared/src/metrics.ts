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
