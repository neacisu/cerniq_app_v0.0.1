import { describe, expect, it, vi } from "vitest";
import {
  getLlmSpendDayUsd,
  getLlmSpendHourUsd,
  incrementLlmSpendDayUsd,
  incrementLlmSpendHourUsd,
  resolveLlmSpendDowngradeState,
  shouldDowngradeLlmToSelfHostedFast,
} from "./llm-cost-governance.js";

describe("llm-cost-governance — Redis zilnic", () => {
  it("incrementLlmSpendDayUsd cumulează și citește înapoi", async () => {
    const store = new Map<string, string>();
    const redis = {
      get: vi.fn(async (k: string) => store.get(k) ?? null),
      incrbyfloat: vi.fn(async (k: string, inc: number) => {
        const cur = Number.parseFloat(store.get(k) ?? "0");
        const next = cur + inc;
        store.set(k, String(next));
        return String(next);
      }),
      expire: vi.fn(async () => 1),
    };
    const tenant = "tenant-a";
    const v1 = await incrementLlmSpendDayUsd(redis, tenant, 1.5);
    expect(v1).toBeCloseTo(1.5);
    const v2 = await incrementLlmSpendDayUsd(redis, tenant, 0.25);
    expect(v2).toBeCloseTo(1.75);
    const read = await getLlmSpendDayUsd(redis, tenant);
    expect(read).toBeCloseTo(1.75);
  });

  it("incrementLlmSpendHourUsd cumulează pe bucket orar", async () => {
    const store = new Map<string, string>();
    const redis = {
      get: vi.fn(async (k: string) => store.get(k) ?? null),
      incrbyfloat: vi.fn(async (k: string, inc: number) => {
        const cur = Number.parseFloat(store.get(k) ?? "0");
        const next = cur + inc;
        store.set(k, String(next));
        return String(next);
      }),
      expire: vi.fn(async () => 1),
    };
    const tenant = "tenant-hour";
    const v1 = await incrementLlmSpendHourUsd(redis, tenant, 2);
    expect(v1).toBeCloseTo(2);
    const read = await getLlmSpendHourUsd(redis, tenant);
    expect(read).toBeCloseTo(2);
  });

  it("resolveLlmSpendDowngradeState — true la 80% din cap MEDIUM", async () => {
    const tenant = "t-downgrade";
    const redis = {
      get: vi.fn(async () => "42"),
    };
    const { downgradeToFast, spentUsdDay } = await resolveLlmSpendDowngradeState({
      redis,
      tenantId: tenant,
      tier: "MEDIUM",
    });
    expect(spentUsdDay).toBe(42);
    expect(downgradeToFast).toBe(
      shouldDowngradeLlmToSelfHostedFast({ spentUsdDay: 42, tier: "MEDIUM" }),
    );
    expect(downgradeToFast).toBe(true);
  });
});
