import { describe, expect, it } from "vitest";
import { estimateSmsSegments } from "./sms-encoding.js";

describe("estimateSmsSegments", () => {
  it("GSM ASCII — un singur segment până la 160", () => {
    const s = "a".repeat(160);
    expect(estimateSmsSegments(s)).toEqual({ segments: 1, encoding: "GSM7" });
  });

  it("GSM ASCII — multipart după 160", () => {
    const s = "a".repeat(161);
    expect(estimateSmsSegments(s).segments).toBe(2);
    expect(estimateSmsSegments(s).encoding).toBe("GSM7");
  });

  it("Unicode — UCS-2 (un segment până la 70)", () => {
    const s = "ă".repeat(70);
    expect(estimateSmsSegments(s)).toEqual({ segments: 1, encoding: "UCS2" });
  });

  it("Unicode — multipart 71 caractere", () => {
    const s = "ă".repeat(71);
    expect(estimateSmsSegments(s).segments).toBe(2);
  });
});
