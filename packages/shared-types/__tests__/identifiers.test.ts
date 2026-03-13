import { describe, expect, it } from "vitest";
import {
  convertOldNrRegComToCanonical,
  cuiSchema,
  isValidCUI,
  isValidNrRegCom,
  normalizeNrRegCom,
  nrRegComSchema,
  sanitizeCui,
} from "../src/identifiers.js";

describe("shared identifiers", () => {
  it("sanitizes CUI with RO prefix", () => {
    expect(sanitizeCui(" RO12345678 ")).toBe("12345678");
  });

  it("validates CUI checksum", () => {
    expect(isValidCUI("RO18547290")).toBe(true);
    expect(isValidCUI("12345678")).toBe(false);
  });

  it("normalizes old NrRegCom to canonical format", () => {
    const canonical = convertOldNrRegComToCanonical("J", "40", "1234", "2020");
    expect(normalizeNrRegCom("J40/1234/2020")).toBe(canonical);
  });

  it("accepts canonical NrRegCom format", () => {
    const canonical = convertOldNrRegComToCanonical("J", "40", "1234", "2020");
    expect(normalizeNrRegCom(canonical)).toBe(canonical);
    expect(isValidNrRegCom(canonical)).toBe(true);
  });

  it("rejects invalid NrRegCom checksum", () => {
    expect(isValidNrRegCom("J2020001234409")).toBe(false);
  });

  it("provides zod schemas for cross-layer validation", () => {
    expect(cuiSchema.parse("RO18547290")).toBe("18547290");
    const canonical = nrRegComSchema.parse("J40/1234/2020");
    expect(canonical).toBe(convertOldNrRegComToCanonical("J", "40", "1234", "2020"));
  });
});
