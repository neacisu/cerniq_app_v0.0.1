import { describe, expect, it } from "vitest";
import { toBullMqQueueName } from "./factory.js";
import { parseWorkerAutoObservabilityEnv } from "./worker-auto-obs-env.js";
import { parseWorkerCognitiveInstrumentationEnv } from "./worker-cognitive-env.js";

describe("parseWorkerAutoObservabilityEnv", () => {
  it("acceptă 1, true, yes (case-insensitive)", () => {
    expect(parseWorkerAutoObservabilityEnv("1")).toBe(true);
    expect(parseWorkerAutoObservabilityEnv("true")).toBe(true);
    expect(parseWorkerAutoObservabilityEnv("YES")).toBe(true);
  });

  it("respinge gol sau alte valori", () => {
    expect(parseWorkerAutoObservabilityEnv(undefined)).toBe(false);
    expect(parseWorkerAutoObservabilityEnv("")).toBe(false);
    expect(parseWorkerAutoObservabilityEnv("0")).toBe(false);
  });
});

describe("parseWorkerCognitiveInstrumentationEnv", () => {
  it("implicit activ (gol / undefined)", () => {
    expect(parseWorkerCognitiveInstrumentationEnv(undefined)).toBe(true);
    expect(parseWorkerCognitiveInstrumentationEnv("")).toBe(true);
  });

  it("dezactivare explicită", () => {
    expect(parseWorkerCognitiveInstrumentationEnv("0")).toBe(false);
    expect(parseWorkerCognitiveInstrumentationEnv("false")).toBe(false);
    expect(parseWorkerCognitiveInstrumentationEnv("OFF")).toBe(false);
  });
});

describe("queue factory", () => {
  it("maps canonical logical queue names to BullMQ-safe physical names", () => {
    expect(toBullMqQueueName("pipeline:promote:bronze-silver")).toBe(
      "pipeline__promote__bronze-silver",
    );
    expect(toBullMqQueueName("ingest:excel")).toBe("ingest__excel");
  });

  it("leaves already safe queue names unchanged", () => {
    expect(toBullMqQueueName("default")).toBe("default");
    expect(toBullMqQueueName("quality-rollup")).toBe("quality-rollup");
  });
});
