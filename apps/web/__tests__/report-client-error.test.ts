import { describe, expect, it } from "vitest";
import { buildClientErrorIdempotencyKey } from "@/lib/report-client-error.js";

describe("buildClientErrorIdempotencyKey", () => {
  it("este determinist pentru același input", () => {
    const input = {
      message: "Test error",
      stack: "at foo (bar.js:1:1)",
      source: "ErrorBoundary",
    };
    expect(buildClientErrorIdempotencyKey(input)).toBe(buildClientErrorIdempotencyKey(input));
  });

  it("respectă trunchierea câmpurilor (același prefix → aceeași cheie)", () => {
    const a = { message: "x".repeat(5000), stack: undefined, source: undefined };
    const b = { message: "x".repeat(4000) + "suffix", stack: undefined, source: undefined };
    expect(buildClientErrorIdempotencyKey(a)).toBe(buildClientErrorIdempotencyKey(b));
  });

  it("diferă pentru mesaje distincte după trunchiere", () => {
    const k1 = buildClientErrorIdempotencyKey({ message: "alpha" });
    const k2 = buildClientErrorIdempotencyKey({ message: "beta" });
    expect(k1).not.toBe(k2);
  });

  it("tratează perechi surrogate ca un singur punct de cod (FNV pe code point)", () => {
    const rocket = "\uD83D\uDE80";
    const k = buildClientErrorIdempotencyKey({ message: `x${rocket}y` });
    expect(k).toMatch(/^xfe:[0-9a-f]+$/);
    expect(k).toBe(buildClientErrorIdempotencyKey({ message: `x${rocket}y` }));
  });
});
