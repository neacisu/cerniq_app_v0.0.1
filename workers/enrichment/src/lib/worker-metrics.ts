import { metrics } from "@cerniq/observability";

const meter = metrics.getMeter("enrichment-workers");

export const jobsProcessed = meter.createCounter("worker.jobs.processed", {
  description: "Total number of worker jobs processed",
});

export const jobDuration = meter.createHistogram("worker.jobs.duration_ms", {
  description: "Worker job processing duration in milliseconds",
  unit: "ms",
});

export const jobErrors = meter.createCounter("worker.jobs.errors", {
  description: "Total number of worker job errors",
});

export const jobsFailed = meter.createCounter("worker.jobs.failed", {
  description: "Worker jobs that failed after processing attempt (success path not reached)",
});
