import { describe, it, expect } from "vitest";
import { enrichError, fingerprintError, isTransientError } from "./error-enrichment.js";

describe("error-enrichment", () => {
  it("stable fingerprint for same error", () => {
    const e = new Error("same");
    e.stack = "Error: same\n    at a.js:1:1";
    expect(fingerprintError(e)).toBe(fingerprintError(e));
  });

  it("detects transient by message pattern", () => {
    expect(isTransientError(new Error("ECONNRESET on read"))).toBe(true);
    expect(isTransientError(new Error("permanent business rule"))).toBe(false);
  });

  it("detects transient by PG code", () => {
    const e = Object.assign(new Error("deadlock"), { code: "40P01" });
    expect(isTransientError(e)).toBe(true);
  });

  it("builds cause chain without infinite loop on cycle", () => {
    const a = new Error("a");
    const b = new Error("b");
    a.cause = b;
    b.cause = a;
    const r = enrichError(a);
    expect(r.causeChain.some((c) => c.message === "(cycle)")).toBe(true);
  });

  it("classifies ZodError name as validation", () => {
    const z = new Error("bad");
    z.name = "ZodError";
    expect(enrichError(z).errorType).toBe("validation");
  });
});
