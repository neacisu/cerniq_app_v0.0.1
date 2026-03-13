import { describe, expect, it } from "vitest";
import { context, initTelemetry, shutdownTelemetry, trace } from "./index";

describe("@cerniq/observability", () => {
  it("re-exports OpenTelemetry helpers", () => {
    expect(typeof initTelemetry).toBe("function");
    expect(typeof shutdownTelemetry).toBe("function");
    expect(typeof trace.getTracer).toBe("function");
    expect(typeof context.active).toBe("function");
  });
});
