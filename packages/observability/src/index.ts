/**
 * @cerniq/observability — OpenTelemetry + structured logging + job/error helpers.
 * Use initTelemetry() at app startup (before other imports when possible).
 */
export { initTelemetry, shutdownTelemetry } from "./init.js";
export type { TelemetryOptions } from "./init.js";
export {
  buildTraceSampler,
  resolveEffectiveOtlpSamplerName,
  CERNIQ_TRACE_BAGGAGE_FORCE_SAMPLE,
} from "./trace-sampling.js";

export { trace, context, metrics } from "@opentelemetry/api";

export { createServiceLogger } from "./logger.js";
export {
  createJobLogger,
  flushJobLogBuffer,
  type JobLogger,
  type JobLoggerOpts,
  type JobLogLevel,
} from "./job-logger.js";
export {
  enrichError,
  fingerprintError,
  isTransientError,
  type ErrorEnrichment,
  type ErrorType,
} from "./error-enrichment.js";

export { withSpan, childLoggerWithActiveSpan } from "./tracing.js";
export {
  getCorrelationStore,
  runWithCorrelation,
  enterCorrelationContext,
  CorrelationContext,
  type CorrelationStore,
} from "./correlation.js";
export {
  clampPromLabelValue,
  PROM_LABEL_VALUE_MAX_LEN,
  CERNIQ_HTTP_PROM_METRIC_LABEL_ALLOWLIST,
  assertHttpMetricLabelsAllowed,
} from "./cardinality.js";

export {
  recordAuditEvent,
  writeAuditEvent,
  auditWriter,
  flushAuditBuffer,
  computeAuditEventHash,
  resetAuditWriterTestState,
  type AuditEventInput,
  type AuditWriterWriteInput,
} from "./audit-writer.js";

export { StructuredLogSchema, type StructuredLog } from "./structured-logs.js";
