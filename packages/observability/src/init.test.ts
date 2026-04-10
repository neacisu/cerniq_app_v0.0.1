import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

const startMock = vi.fn();
const shutdownMock = vi.fn(async () => undefined);
const sdkInstance = {
  start: startMock,
  shutdown: shutdownMock,
};

const NodeSDKMock = vi.fn(function NodeSDK() {
  return sdkInstance;
}) as Mock;
const OTLPTraceExporterMock = vi.fn(function OTLPTraceExporter(options: Record<string, unknown>) {
  return options;
});
const OTLPMetricExporterMock = vi.fn(function OTLPMetricExporter(options: Record<string, unknown>) {
  return options;
});
const PeriodicExportingMetricReaderMock = vi.fn(function PeriodicExportingMetricReader(
  options: Record<string, unknown>,
) {
  return options;
});
const resourceFromAttributesMock = vi.fn((attributes: Record<string, unknown>) => attributes);

vi.mock("@fastify/otel", () => ({
  default: class FastifyOtelInstrumentation {
    readonly __testMock = true;
  },
}));

vi.mock("@opentelemetry/auto-instrumentations-node", () => ({
  getNodeAutoInstrumentations: vi.fn(() => []),
}));

vi.mock("@opentelemetry/instrumentation-http", () => ({
  HttpInstrumentation: class HttpInstrumentation {
    readonly __testMock = true;
  },
}));

vi.mock("@opentelemetry/sdk-node", () => ({
  NodeSDK: NodeSDKMock,
}));

vi.mock("@opentelemetry/exporter-trace-otlp-http", () => ({
  OTLPTraceExporter: OTLPTraceExporterMock,
}));

vi.mock("@opentelemetry/exporter-metrics-otlp-http", () => ({
  OTLPMetricExporter: OTLPMetricExporterMock,
}));

vi.mock("@opentelemetry/sdk-metrics", () => ({
  PeriodicExportingMetricReader: PeriodicExportingMetricReaderMock,
}));

vi.mock("@opentelemetry/resources", () => ({
  resourceFromAttributes: resourceFromAttributesMock,
}));

describe("initTelemetry", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.HOSTNAME;
    delete process.env.OTEL_SEMCONV_HTTP_SERVER_ADDRESS;
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    delete process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
    delete process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT;
    delete process.env.OTEL_SDK_DISABLED;
    delete process.env.APP_VERSION;
    delete process.env.NODE_ENV;
    delete process.env.OTEL_PROPAGATORS;
    delete process.env.OTEL_TRACES_SAMPLER;
    delete process.env.CERNIQ_OTEL_TRACE_SAMPLING_RATIO;
  });

  it("is a no-op when no OTLP endpoint is configured", async () => {
    const { initTelemetry, shutdownTelemetry } = await import("./init.js");

    initTelemetry({ serviceName: "cerniq-api" });

    expect(OTLPTraceExporterMock).not.toHaveBeenCalled();
    expect(NodeSDKMock).not.toHaveBeenCalled();
    await shutdownTelemetry();
    expect(shutdownMock).not.toHaveBeenCalled();
  });

  it("is a no-op when telemetry is explicitly disabled", async () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://collector:4318";
    process.env.OTEL_SDK_DISABLED = "true";

    const { initTelemetry } = await import("./init.js");
    initTelemetry({ serviceName: "cerniq-api" });

    expect(NodeSDKMock).not.toHaveBeenCalled();
  });

  it("initializes SDK with traces, metrics, instrumentations, sampler, propagator", async () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://collector:4318";
    process.env.APP_VERSION = "1.2.3";
    process.env.NODE_ENV = "production";

    const { initTelemetry, shutdownTelemetry } = await import("./init.js");
    initTelemetry({ serviceName: "cerniq-api" });

    expect(resourceFromAttributesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        "service.name": "cerniq-api",
        "service.version": "1.2.3",
        "deployment.environment": "production",
        "host.name": expect.any(String),
      }),
    );
    expect(OTLPTraceExporterMock).toHaveBeenCalledWith({
      url: "http://collector:4318/v1/traces",
    });
    expect(OTLPMetricExporterMock).toHaveBeenCalledWith({
      url: "http://collector:4318/v1/metrics",
    });
    expect(PeriodicExportingMetricReaderMock).toHaveBeenCalled();

    expect(NodeSDKMock).toHaveBeenCalledTimes(1);
    const firstSdkArg = NodeSDKMock.mock.calls[0][0];
    expect(firstSdkArg).toBeDefined();
    const cfg = firstSdkArg as unknown as {
      instrumentations: unknown[];
      metricReaders: unknown[];
      sampler: unknown;
      textMapPropagator: unknown;
    };
    expect(cfg.instrumentations.length).toBeGreaterThanOrEqual(3);
    expect(cfg.metricReaders).toHaveLength(1);
    expect(cfg.sampler).toBeDefined();
    /** Producție fără OTEL_TRACES_SAMPLER: implicit ratio (nu AlwaysOn). */
    expect(String(cfg.sampler)).toMatch(/TraceIdRatioBased/i);
    expect(cfg.textMapPropagator).toBeDefined();

    expect(startMock).toHaveBeenCalledTimes(1);

    await shutdownTelemetry();
    expect(shutdownMock).toHaveBeenCalledTimes(1);
  });

  it("normalizes OTLP trace endpoint when only OTLP_TRACES_ENDPOINT is set with trailing slash", async () => {
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = "http://collector:4318/";

    const { initTelemetry } = await import("./init.js");
    initTelemetry({
      serviceName: "cerniq-worker-enrichment",
      serviceVersion: "2.0.0",
      deploymentEnvironment: "staging",
    });

    expect(resourceFromAttributesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        "service.name": "cerniq-worker-enrichment",
        "service.version": "2.0.0",
        "deployment.environment": "staging",
        "host.name": expect.any(String),
      }),
    );
    expect(OTLPTraceExporterMock).toHaveBeenCalledWith({
      url: "http://collector:4318/v1/traces",
    });
  });
});
