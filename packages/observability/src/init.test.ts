import { beforeEach, describe, expect, it, vi } from "vitest";

const startMock = vi.fn();
const shutdownMock = vi.fn(async () => undefined);
const sdkInstance = {
  start: startMock,
  shutdown: shutdownMock,
};

const NodeSDKMock = vi.fn(function NodeSDK() {
  return sdkInstance;
});
const OTLPTraceExporterMock = vi.fn(function OTLPTraceExporter(options: Record<string, unknown>) {
  return options;
});
const resourceFromAttributesMock = vi.fn((attributes: Record<string, unknown>) => attributes);

vi.mock("@opentelemetry/sdk-node", () => ({
  NodeSDK: NodeSDKMock,
}));

vi.mock("@opentelemetry/exporter-trace-otlp-http", () => ({
  OTLPTraceExporter: OTLPTraceExporterMock,
}));

vi.mock("@opentelemetry/resources", () => ({
  resourceFromAttributes: resourceFromAttributesMock,
}));

describe("initTelemetry", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    delete process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
    delete process.env.OTEL_SDK_DISABLED;
    delete process.env.APP_VERSION;
    delete process.env.NODE_ENV;
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

  it("initializes SDK with normalized OTLP endpoint and env fallbacks", async () => {
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "http://collector:4318";
    process.env.APP_VERSION = "1.2.3";
    process.env.NODE_ENV = "production";

    const { initTelemetry, shutdownTelemetry } = await import("./init.js");
    initTelemetry({ serviceName: "cerniq-api" });

    expect(resourceFromAttributesMock).toHaveBeenCalledWith({
      "service.name": "cerniq-api",
      "service.version": "1.2.3",
      "deployment.environment": "production",
    });
    expect(OTLPTraceExporterMock).toHaveBeenCalledWith({
      url: "http://collector:4318/v1/traces",
    });
    expect(NodeSDKMock).toHaveBeenCalledWith({
      resource: {
        "service.name": "cerniq-api",
        "service.version": "1.2.3",
        "deployment.environment": "production",
      },
      traceExporter: {
        url: "http://collector:4318/v1/traces",
      },
    });
    expect(startMock).toHaveBeenCalledTimes(1);

    await shutdownTelemetry();
    expect(shutdownMock).toHaveBeenCalledTimes(1);
  });

  it("supports explicit trace endpoint overrides with trailing slash", async () => {
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = "http://collector:4318/";

    const { initTelemetry } = await import("./init.js");
    initTelemetry({
      serviceName: "cerniq-worker-enrichment",
      serviceVersion: "2.0.0",
      deploymentEnvironment: "staging",
    });

    expect(resourceFromAttributesMock).toHaveBeenCalledWith({
      "service.name": "cerniq-worker-enrichment",
      "service.version": "2.0.0",
      "deployment.environment": "staging",
    });
    expect(OTLPTraceExporterMock).toHaveBeenCalledWith({
      url: "http://collector:4318/v1/traces",
    });
  });
});
