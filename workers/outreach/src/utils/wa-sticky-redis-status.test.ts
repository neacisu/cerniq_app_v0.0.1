import { describe, expect, it } from "vitest";
import { isRedisStatusAllowingStickyWa } from "./wa-sticky-redis-status.js";

describe("isRedisStatusAllowingStickyWa", () => {
  it("permite STICKY când Redis nu are încă status (null)", () => {
    expect(isRedisStatusAllowingStickyWa(null)).toBe(true);
  });

  it("permite STICKY când statusul este ACTIVE", () => {
    expect(isRedisStatusAllowingStickyWa("ACTIVE")).toBe(true);
  });

  it("permite STICKY pentru string gol (comportament echivalent cu !status din allocator)", () => {
    expect(isRedisStatusAllowingStickyWa("")).toBe(true);
  });

  it("blochează STICKY pentru status non-ACTIVE setat explicit", () => {
    expect(isRedisStatusAllowingStickyWa("BANNED")).toBe(false);
    expect(isRedisStatusAllowingStickyWa("OFFLINE")).toBe(false);
    expect(isRedisStatusAllowingStickyWa("QUOTA_EXCEEDED")).toBe(false);
  });
});
