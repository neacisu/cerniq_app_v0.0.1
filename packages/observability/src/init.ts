/**
 * OpenTelemetry Node SDK — traces + metrics + propagare W3C/B3 + instrumentare HTTP/Fastify
 * (@fastify/otel oficial) + auto-instrumentări selectate (Undici, Redis, PG, …).
 *
 * Ordinea de încărcare: apelează initTelemetry() înainte de orice import care trage `fastify`
 * (vezi `apps/api/src/index.ts` + `server-runtime.ts`).
 */
import { hostname } from "node:os";
import type { IncomingMessage } from "node:http";
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import FastifyOtelInstrumentation from "@fastify/otel";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import {
  CompositePropagator,
  W3CTraceContextPropagator,
  W3CBaggagePropagator,
} from "@opentelemetry/core";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { B3Propagator, B3InjectEncoding } from "@opentelemetry/propagator-b3";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import type { HTTPMethods } from "fastify";
import { buildTraceSampler } from "./trace-sampling.js";

export interface TelemetryOptions {
  /** Service name (e.g. cerniq-api, cerniq-worker-ai) */
  serviceName: string;
  /** Service version (default from env APP_VERSION or 0.0.1) */
  serviceVersion?: string;
  /** OTLP base URL (traces + metrics dacă nu e setat OTEL_EXPORTER_OTLP_METRICS_ENDPOINT) */
  otlpEndpoint?: string;
  /** Deployment environment (default from env NODE_ENV or development) */
  deploymentEnvironment?: string;
}

let sdk: NodeSDK | null = null;

function otlpBaseUrl(endpoint: string): string {
  return endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
}

function resolveOtlpTracesUrl(base: string, tracesEndpointEnv: string | undefined): string {
  const explicit = tracesEndpointEnv?.trim();
  if (!explicit) {
    return base.endsWith("/v1/traces") ? base : `${base}/v1/traces`;
  }
  if (explicit.includes("/v1/traces")) {
    return explicit;
  }
  return `${otlpBaseUrl(explicit)}/v1/traces`;
}

function resolveOtlpMetricsUrl(
  metricsBase: string,
  metricsEndpointEnv: string | undefined,
): string {
  const explicit = metricsEndpointEnv?.trim();
  if (explicit?.includes("/v1/metrics")) {
    return explicit;
  }
  return `${otlpBaseUrl(metricsBase)}/v1/metrics`;
}

function configureDiag(): void {
  const level = process.env.OTEL_LOG_LEVEL?.toLowerCase();
  if (level === "debug" || level === "verbose") {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
  } else if (level === "info") {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
  } else if (level === "warn") {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);
  } else if (level === "error") {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);
  }
}

function isInfrastructurePath(pathOnly: string): boolean {
  return (
    pathOnly === "/metrics" ||
    pathOnly === "/" ||
    pathOnly.startsWith("/health") ||
    pathOnly.startsWith("/docs") ||
    pathOnly === "/documentation"
  );
}

function buildTextMapPropagator(): CompositePropagator {
  const raw = process.env.OTEL_PROPAGATORS;
  const tokens = raw
    ? raw
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    : ["tracecontext", "baggage"];

  const useB3 = tokens.some((t) => t.includes("b3"));
  const useTraceContext = tokens.includes("tracecontext");
  const useBaggage = tokens.includes("baggage");

  /** Ordinea la `extract`: ultimele propagatoare pot suprascrie contextul. B3 înainte de W3C → `traceparent` câștigă dacă ambele sunt prezente (evită trace-id divergente). */
  const propagators = [];
  if (useB3) {
    propagators.push(new B3Propagator({ injectEncoding: B3InjectEncoding.MULTI_HEADER }));
  }
  if (useTraceContext) {
    propagators.push(new W3CTraceContextPropagator());
  }
  if (useBaggage) {
    propagators.push(new W3CBaggagePropagator());
  }
  if (propagators.length === 0) {
    propagators.push(new W3CTraceContextPropagator(), new W3CBaggagePropagator());
  }
  return new CompositePropagator({ propagators });
}

/**
 * Inițializează OpenTelemetry (traces + metrics OTLP HTTP + instrumentări).
 * No-op dacă OTEL_EXPORTER_OTLP_ENDPOINT lipsește / e gol sau OTEL_SDK_DISABLED=true.
 */
export function initTelemetry(options: TelemetryOptions): void {
  configureDiag();

  const endpoint =
    options.otlpEndpoint ??
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;

  if (!endpoint || endpoint === "" || process.env.OTEL_SDK_DISABLED === "true") {
    return;
  }

  const base = otlpBaseUrl(endpoint);
  const serviceName = options.serviceName;
  const serviceVersion = options.serviceVersion ?? process.env.APP_VERSION ?? "0.0.1";
  const deploymentEnvironment =
    options.deploymentEnvironment ?? process.env.NODE_ENV ?? "development";

  const resource = resourceFromAttributes({
    "service.name": serviceName,
    "service.version": serviceVersion,
    "deployment.environment": deploymentEnvironment,
    /** SemConv: host identity pentru corelare în backend-uri de observabilitate */
    "host.name": process.env.HOSTNAME ?? hostname(),
  });

  const tracesUrl = resolveOtlpTracesUrl(base, process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT);

  const metricsBase =
    process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ??
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
    endpoint;
  const metricsUrl = resolveOtlpMetricsUrl(
    metricsBase,
    process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
  );

  const traceExporter = new OTLPTraceExporter({ url: tracesUrl });

  const metricExportMs = Number.parseInt(process.env.OTEL_METRIC_EXPORT_INTERVAL ?? "60000", 10);
  const metricReader = new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: metricsUrl }),
    exportIntervalMillis: Number.isFinite(metricExportMs) ? metricExportMs : 60000,
  });

  const httpInstrumentation = new HttpInstrumentation({
    ignoreIncomingRequestHook: (req: IncomingMessage) => {
      const u = typeof req.url === "string" ? (req.url.split("?")[0] ?? "") : "";
      return isInfrastructurePath(u);
    },
    /** Atribute server pe span-ul HTTP de intrare (SemConv 1.27+). */
    serverName: process.env.OTEL_SEMCONV_HTTP_SERVER_ADDRESS ?? hostname(),
  });

  const fastifyOtel = new FastifyOtelInstrumentation({
    registerOnInitialization: true,
    recordExceptions: true,
    ignorePaths: (routeOpts: { url: string; method: HTTPMethods }) =>
      isInfrastructurePath(routeOpts.url),
  });

  const autoInstrumentations = getNodeAutoInstrumentations({
    "@opentelemetry/instrumentation-http": { enabled: false },
    "@opentelemetry/instrumentation-fs": { enabled: false },
    "@opentelemetry/instrumentation-dns": { enabled: false },
    "@opentelemetry/instrumentation-net": { enabled: false },
    /** Client HTTP (fetch / Undici) — span-uri outbound explicite. */
    "@opentelemetry/instrumentation-undici": { enabled: true },
    /** Driver `pg` (node-postgres) nu e folosit; `@cerniq/db` folosește `postgres.js` + span-uri în `wrapPostgresClientForTracing`. */
    "@opentelemetry/instrumentation-pg": { enabled: false },
  });

  sdk = new NodeSDK({
    resource,
    traceExporter,
    sampler: buildTraceSampler(),
    textMapPropagator: buildTextMapPropagator(),
    metricReaders: [metricReader],
    instrumentations: [fastifyOtel, httpInstrumentation, autoInstrumentations],
  });

  sdk.start();
}

/**
 * Shutdown the SDK (flush and stop). Call during graceful shutdown.
 */
export async function shutdownTelemetry(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
  }
}
