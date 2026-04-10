import { describe, it, expect } from "vitest";
import { deriveNpsIndexFromAvg10 } from "@/components/etapa5/nps-gauge-utils.js";

describe("deriveNpsIndexFromAvg10", () => {
  it("mapează 5 → 0, 10 → 100, 0 → -100", () => {
    expect(deriveNpsIndexFromAvg10(5)).toBe(0);
    expect(deriveNpsIndexFromAvg10(10)).toBe(100);
    expect(deriveNpsIndexFromAvg10(0)).toBe(-100);
  });

  it("clamp la [0,10] înainte de mapare", () => {
    expect(deriveNpsIndexFromAvg10(12)).toBe(100);
    expect(deriveNpsIndexFromAvg10(-3)).toBe(-100);
  });

  it("rotunjește la întreg (ex. 7.5 → 50)", () => {
    expect(deriveNpsIndexFromAvg10(7.5)).toBe(50);
  });
});
