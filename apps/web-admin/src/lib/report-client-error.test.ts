import { describe, expect, it } from "vitest";
import { buildAdminClientErrorIdempotencyKey } from "./report-client-error.js";

describe("buildAdminClientErrorIdempotencyKey", () => {
  it("este determinist pentru același input", () => {
    const input = {
      message: "Admin boundary",
      stack: "at x (y.js:1:1)",
      source: "ErrorBoundary",
    };
    expect(buildAdminClientErrorIdempotencyKey(input)).toBe(
      buildAdminClientErrorIdempotencyKey(input),
    );
  });

  it("respectă trunchierea (același prefix mesaj → aceeași cheie)", () => {
    const a = { message: "x".repeat(5000) };
    const b = { message: "x".repeat(4000) + "tail" };
    expect(buildAdminClientErrorIdempotencyKey(a)).toBe(buildAdminClientErrorIdempotencyKey(b));
  });

  it("FNV pe code points (paritate comportament Unicode cu apps/web)", () => {
    const rocket = "\uD83D\uDE80";
    const k = buildAdminClientErrorIdempotencyKey({ message: `x${rocket}y` });
    expect(k).toMatch(/^xfe:[0-9a-f]+$/);
  });
});
