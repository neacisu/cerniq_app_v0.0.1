import { describe, expect, it } from "vitest";
import {
  sanitizeCui,
  isValidCUI,
  sanitizeNrRegCom,
  normalizeNrRegCom,
  computeNrRegComCheckDigit,
  convertOldNrRegComToCanonical,
} from "./identifiers.js";

describe("sanitizeCui", () => {
  it("removes RO prefix", () => {
    expect(sanitizeCui("RO12345678")).toBe("12345678");
  });

  it("removes lowercase ro prefix via toUpperCase", () => {
    expect(sanitizeCui("ro12345678")).toBe("12345678");
  });

  it("removes non-digit characters", () => {
    expect(sanitizeCui("12.345.678")).toBe("12345678");
  });

  it("trims whitespace", () => {
    expect(sanitizeCui("  12345678  ")).toBe("12345678");
  });

  it("handles RO prefix + non-digits combined", () => {
    expect(sanitizeCui("RO 12-345-678")).toBe("12345678");
  });

  it("returns empty string for non-numeric input", () => {
    expect(sanitizeCui("ROABC")).toBe("");
  });
});

describe("isValidCUI", () => {
  it("validates a known valid CUI (checksum correct)", () => {
    expect(isValidCUI("14399840")).toBe(true);
  });

  it("rejects a CUI with wrong check digit", () => {
    expect(isValidCUI("14399841")).toBe(false);
  });

  it("handles RO prefix transparently", () => {
    expect(isValidCUI("RO14399840")).toBe(true);
  });

  it("rejects too-short CUI", () => {
    expect(isValidCUI("1")).toBe(false);
  });

  it("rejects too-long CUI (> 10 digits)", () => {
    expect(isValidCUI("12345678901")).toBe(false);
  });

  it("rejects non-numeric CUI after sanitization", () => {
    expect(isValidCUI("ABCDEF")).toBe(false);
  });
});

describe("sanitizeNrRegCom", () => {
  it("preserves old format J09/98/2003 as-is (uppercased, no conversion)", () => {
    expect(sanitizeNrRegCom("J09/98/2003")).toBe("J09/98/2003");
  });

  it("preserves old format with lowercase input", () => {
    expect(sanitizeNrRegCom("j09/98/2003")).toBe("J09/98/2003");
  });

  it("does NOT convert old format to canonical new format", () => {
    const result = sanitizeNrRegCom("J09/98/2003");
    expect(result).not.toMatch(/^J\d{13}$/);
    expect(result).toBe("J09/98/2003");
  });

  it("returns valid new format as-is when check digit matches", () => {
    const oldFormat = "J09/98/2003";
    const canonical = normalizeNrRegCom(oldFormat);
    if (canonical) {
      expect(sanitizeNrRegCom(canonical)).toBe(canonical);
    }
  });

  it("returns null for invalid new format (bad check digit)", () => {
    expect(sanitizeNrRegCom("J20030000980999")).toBeNull();
  });

  it("returns null for garbage input", () => {
    expect(sanitizeNrRegCom("ABCDEFGH")).toBeNull();
  });

  it("returns null for empty/whitespace input", () => {
    expect(sanitizeNrRegCom("   ")).toBeNull();
  });

  it("strips whitespace before matching", () => {
    expect(sanitizeNrRegCom("  J09/98/2003  ")).toBe("J09/98/2003");
  });
});

describe("normalizeNrRegCom (canonical conversion)", () => {
  it("converts old format to canonical new format", () => {
    const result = normalizeNrRegCom("J09/98/2003");
    expect(result).not.toBeNull();
    expect(result).toMatch(/^J\d{4}\d{6}\d{2}\d$/);
  });

  it("returns null for invalid input", () => {
    expect(normalizeNrRegCom("INVALID")).toBeNull();
  });
});

describe("computeNrRegComCheckDigit", () => {
  it("returns a single digit 0-9", () => {
    const digit = computeNrRegComCheckDigit("J200300009809");
    expect(digit).toBeGreaterThanOrEqual(0);
    expect(digit).toBeLessThanOrEqual(9);
  });

  it("throws for invalid base format", () => {
    expect(() => computeNrRegComCheckDigit("INVALID")).toThrow();
  });
});

describe("convertOldNrRegComToCanonical", () => {
  it("produces correct canonical format with check digit", () => {
    const result = convertOldNrRegComToCanonical("J", "09", "98", "2003");
    expect(result).toMatch(/^J\d{4}\d{6}\d{2}\d$/);
    expect(result.startsWith("J2003")).toBe(true);
  });

  it("pads county and order correctly", () => {
    const result = convertOldNrRegComToCanonical("F", "2", "5", "2020");
    expect(result).toMatch(/^F\d{13}$/);
    expect(result.startsWith("F2020")).toBe(true);
  });
});
