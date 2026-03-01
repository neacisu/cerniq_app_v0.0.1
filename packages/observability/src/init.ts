/**
 * OpenTelemetry SDK initialization for Cerniq services.
 * Must be called as early as possible (before other app imports).
 */
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";

export interface TelemetryOptions {
  /** Service name (e.g. cerniq-api, cerniq-worker-ai) */
  serviceName: string;
  /** Service version (default from env APP_VERSION or 0.0.1) */
  serviceVersion?: string;
  /** OTLP endpoint URL (default from env OTEL_EXPORTER_OTLP_ENDPOINT or disabled) */
  otlpEndpoint?: string;
  /** Deployment environment (default from env NODE_ENV or development) */
  deploymentEnvironment?: string;
}

let sdk: NodeSDK | null = null;

/**
 * Initialize OpenTelemetry tracing. No-op if OTEL_EXPORTER_OTLP_ENDPOINT is not set.
 */
export function initTelemetry(options: TelemetryOptions): void {
  const endpoint =
    options.otlpEndpoint ??
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;

  if (!endpoint || endpoint === "" || process.env.OTEL_SDK_DISABLED === "true") {
    return;
  }

  const serviceName = options.serviceName;
  const serviceVersion = options.serviceVersion ?? process.env.APP_VERSION ?? "0.0.1";
  const deploymentEnvironment =
    options.deploymentEnvironment ?? process.env.NODE_ENV ?? "development";

  const resource = resourceFromAttributes({
    "service.name": serviceName,
    "service.version": serviceVersion,
    "deployment.environment": deploymentEnvironment,
  });

  const traceExporter = new OTLPTraceExporter({
    url: endpoint.endsWith("/") ? `${endpoint}v1/traces` : `${endpoint}/v1/traces`,
  });

  sdk = new NodeSDK({
    resource,
    traceExporter,
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
