import { describe, it, expect, vi } from "vitest";
import { BudgetExceededError, checkLlmBudget, recordLlmCost } from "./llm-cost-tracker.js";

describe("llm-cost-tracker", () => {
  it("checkLlmBudget aruncă BudgetExceededError la depășire cap zilnic", async () => {
    const redis = { get: vi.fn().mockResolvedValue("10.5") };
    await expect(checkLlmBudget(redis, "tid", "SMALL")).rejects.toThrow(BudgetExceededError);
  });

  it("checkLlmBudget returnează downgrade=true la ≥80% din cap", async () => {
    const redis = { get: vi.fn().mockResolvedValue("8.1") };
    const r = await checkLlmBudget(redis, "tid", "SMALL");
    expect(r.downgrade).toBe(true);
    expect(r.cap).toBe(10);
    expect(r.remaining).toBeCloseTo(1.9, 5);
  });

  it("recordLlmCost ignoră cost ≤ 0", async () => {
    const redis = {
      get: vi.fn(),
      incrbyfloat: vi.fn().mockResolvedValue("0"),
      expire: vi.fn().mockResolvedValue(1),
    };
    await recordLlmCost(redis, "tid", 0);
    expect(redis.incrbyfloat).not.toHaveBeenCalled();
  });

  it("recordLlmCost incrementează zi + oră în Redis", async () => {
    const redis = {
      get: vi.fn(),
      incrbyfloat: vi.fn().mockResolvedValue("1.5"),
      expire: vi.fn().mockResolvedValue(1),
    };
    await recordLlmCost(redis, "tid", 1.25, { provider: "openai" });
    expect(redis.incrbyfloat).toHaveBeenCalled();
    expect(redis.incrbyfloat.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
