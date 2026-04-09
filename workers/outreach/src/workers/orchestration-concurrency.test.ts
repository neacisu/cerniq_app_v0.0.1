import { describe, it, expect } from "vitest";
import { QUEUES, queueRegistry } from "@cerniq/worker-shared";

describe("orchestration — registry (phone allocator / quarantine)", () => {
  it("PHONE_QUARANTINE este în queueRegistry (separare față de alert:phone:banned)", () => {
    expect(queueRegistry.some((q) => q.name === QUEUES.PHONE_QUARANTINE)).toBe(true);
  });

  it("OUTREACH_PHONE_ALLOCATOR rămâne în registry", () => {
    expect(queueRegistry.some((q) => q.name === QUEUES.OUTREACH_PHONE_ALLOCATOR)).toBe(true);
  });
});
