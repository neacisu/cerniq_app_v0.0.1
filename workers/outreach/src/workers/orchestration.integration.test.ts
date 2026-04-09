/**
 * Contract integrare — fabrici orchestration (fără Redis live): exporturi stabile pentru phone allocator / channel selector / dispatch.
 */
import { describe, it, expect } from "vitest";
import {
  createPhoneAllocatorWorker,
  createChannelSelectorWorker,
  createDispatchWorker,
} from "./orchestration.js";

describe("orchestration integration (export factories)", () => {
  it("exportă createPhoneAllocatorWorker (Redis injectat la apel)", () => {
    expect(typeof createPhoneAllocatorWorker).toBe("function");
  });

  it("exportă createChannelSelectorWorker", () => {
    expect(typeof createChannelSelectorWorker).toBe("function");
  });

  it("exportă createDispatchWorker", () => {
    expect(typeof createDispatchWorker).toBe("function");
  });
});
