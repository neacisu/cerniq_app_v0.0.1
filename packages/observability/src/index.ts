/**
 * @cerniq/observability — shared OpenTelemetry instrumentation.
 * Use initTelemetry() at app startup (before other imports when possible).
 */
export { initTelemetry, shutdownTelemetry } from "./init.js";
export type { TelemetryOptions } from "./init.js";

// Re-export trace API so consumers can create spans without adding @opentelemetry/api
export { trace, context, metrics } from "@opentelemetry/api";
