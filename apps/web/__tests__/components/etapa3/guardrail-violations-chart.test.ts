import { describe, it, expect } from "vitest";
import { fillLast7Days } from "@/components/etapa3/guardrail-violations-chart-utils.js";

describe("fillLast7Days", () => {
  it("completează 7 puncte chiar dacă API returnează doar zile parțiale", () => {
    const d = new Date();
    const key = d.toISOString().slice(0, 10);
    const pts = fillLast7Days([{ day: key, count: 3 }]);
    expect(pts).toHaveLength(7);
    const today = pts.find((p) => p.value === 3);
    expect(today).toBeDefined();
  });
});
