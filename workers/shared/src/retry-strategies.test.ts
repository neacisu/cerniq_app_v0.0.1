import { describe, expect, it } from "vitest";
import { RETRY_STRATEGIES } from "./queue-registry.js";

describe("RETRY_STRATEGIES", () => {
  it("FAST strategy has 3 attempts with exponential backoff", () => {
    expect(RETRY_STRATEGIES.FAST.attempts).toBe(3);
    expect(RETRY_STRATEGIES.FAST.backoff.type).toBe("exponential");
    expect(RETRY_STRATEGIES.FAST.backoff.delay).toBe(500);
  });

  it("EXTERNAL_API strategy has 5 attempts with 1000ms base", () => {
    expect(RETRY_STRATEGIES.EXTERNAL_API.attempts).toBe(5);
    expect(RETRY_STRATEGIES.EXTERNAL_API.backoff.type).toBe("exponential");
    expect(RETRY_STRATEGIES.EXTERNAL_API.backoff.delay).toBe(1000);
  });

  it("SCRAPING strategy has 3 attempts with 5000ms base", () => {
    expect(RETRY_STRATEGIES.SCRAPING.attempts).toBe(3);
    expect(RETRY_STRATEGIES.SCRAPING.backoff.delay).toBe(5000);
  });

  it("PIPELINE strategy has 2 attempts with fixed delay", () => {
    expect(RETRY_STRATEGIES.PIPELINE.attempts).toBe(2);
    expect(RETRY_STRATEGIES.PIPELINE.backoff.type).toBe("fixed");
  });

  it("HITL strategy has 1 attempt (no auto retry)", () => {
    expect(RETRY_STRATEGIES.HITL.attempts).toBe(1);
  });
});
