import { beforeEach, describe, expect, it } from "vitest";
import {
  buildTraceSampler,
  CERNIQ_TRACE_BAGGAGE_FORCE_SAMPLE,
  resolveEffectiveOtlpSamplerName,
} from "./trace-sampling.js";

function clearSamplingEnv(): void {
  delete process.env.OTEL_TRACES_SAMPLER;
  delete process.env.OTEL_TRACES_SAMPLER_ARG;
  delete process.env.CERNIQ_OTEL_TRACE_SAMPLING_RATIO;
  delete process.env.NODE_ENV;
}

describe("resolveEffectiveOtlpSamplerName", () => {
  beforeEach(clearSamplingEnv);

  it("respectă OTEL_TRACES_SAMPLER când e setat", () => {
    process.env.OTEL_TRACES_SAMPLER = "always_off";
    expect(resolveEffectiveOtlpSamplerName()).toBe("always_off");
  });

  it("în producție fără env folosește parentbased_traceidratio", () => {
    process.env.NODE_ENV = "production";
    expect(resolveEffectiveOtlpSamplerName()).toBe("parentbased_traceidratio");
  });

  it("în development fără env folosește parentbased_always_on", () => {
    process.env.NODE_ENV = "development";
    expect(resolveEffectiveOtlpSamplerName()).toBe("parentbased_always_on");
  });
});

describe("buildTraceSampler", () => {
  beforeEach(clearSamplingEnv);

  it("construiește un sampler (ParentBased + baggage wrapper)", () => {
    process.env.NODE_ENV = "test";
    const s = buildTraceSampler();
    expect(s).toBeDefined();
    expect(String(s)).toContain("BaggageForceSampleSampler");
  });

  it("expune cheia baggage documentată", () => {
    expect(CERNIQ_TRACE_BAGGAGE_FORCE_SAMPLE).toBe("cerniq.trace.force_sample");
  });
});
