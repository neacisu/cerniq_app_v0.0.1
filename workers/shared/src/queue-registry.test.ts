import { describe, expect, it } from "vitest";
import {
  QUEUE_NAME_PATTERN,
  QUEUES,
  assertQueueRegistryComplete,
  getQueueConfig,
  isKnownQueueName,
  queueRegistry,
} from "./queue-registry.js";

describe("queue-registry", () => {
  it("contains the expected number of canonical queues", () => {
    expect(() => assertQueueRegistryComplete()).not.toThrow();
    // 65 Etapa 1 + 54 Etapa 2 static + 40 Etapa 2 per-phone = 159
    expect(queueRegistry).toHaveLength(159);
  });

  it("uses canonical colon-based queue names", () => {
    for (const queue of queueRegistry) {
      expect(queue.name).toMatch(QUEUE_NAME_PATTERN);
      expect(queue.name.includes(".")).toBe(false);
    }
  });

  it("validates known queues and rejects unknown ones", () => {
    expect(isKnownQueueName(QUEUES.PIPELINE_ORCHESTRATE)).toBe(true);
    expect(isKnownQueueName("pipeline:unknown")).toBe(false);
  });

  it("returns queue configuration for known queues", () => {
    expect(getQueueConfig(QUEUES.PIPELINE_ORCHESTRATE)).toMatchObject({
      name: QUEUES.PIPELINE_ORCHESTRATE,
      concurrency: expect.any(Number),
    });
    expect(getQueueConfig("pipeline:unknown")).toBeUndefined();
  });

  it("throws when the registry inventory is incomplete", () => {
    const removed = queueRegistry.pop();
    try {
      expect(() => assertQueueRegistryComplete()).toThrow("Expected 159 queues");
    } finally {
      if (removed) queueRegistry.push(removed);
    }
  });
});
