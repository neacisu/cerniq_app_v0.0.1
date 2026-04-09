import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import * as metrics from "./metrics.js";
import {
  assertLlmFrontierGdprAllows,
  assertLlmFrontierHourlySpendNoSpike,
  consensusStructuredVote,
  LlmFrontierGdprViolation,
  LlmFrontierHourlySpendSpikeError,
  shouldTriggerLlmConsensusVote,
  withLlmFallbackChain,
} from "./llm-fallback.js";

describe("shouldTriggerLlmConsensusVote", () => {
  it("declanșează pentru discount > 30%", () => {
    expect(shouldTriggerLlmConsensusVote({ discountPct: 30 })).toBe(false);
    expect(shouldTriggerLlmConsensusVote({ discountPct: 31 })).toBe(true);
  });

  it("declanșează pentru churn > 70", () => {
    expect(shouldTriggerLlmConsensusVote({ churnScore: 70 })).toBe(false);
    expect(shouldTriggerLlmConsensusVote({ churnScore: 71 })).toBe(true);
  });

  it("declanșează pentru credit în banda borderline [50,60]", () => {
    expect(shouldTriggerLlmConsensusVote({ creditScore: 49 })).toBe(false);
    expect(shouldTriggerLlmConsensusVote({ creditScore: 50 })).toBe(true);
    expect(shouldTriggerLlmConsensusVote({ creditScore: 55 })).toBe(true);
    expect(shouldTriggerLlmConsensusVote({ creditScore: 60 })).toBe(true);
    expect(shouldTriggerLlmConsensusVote({ creditScore: 61 })).toBe(false);
  });
});

describe("assertLlmFrontierGdprAllows", () => {
  it("permite non_sensitive", () => {
    expect(() => assertLlmFrontierGdprAllows("non_sensitive")).not.toThrow();
  });

  it("blochează sensitive", () => {
    expect(() => assertLlmFrontierGdprAllows("sensitive")).toThrow(LlmFrontierGdprViolation);
  });
});

describe("assertLlmFrontierHourlySpendNoSpike", () => {
  it("aruncă când cheltuiala orară ≥ prag", async () => {
    const redis = {
      get: vi.fn(async () => "25"),
    };
    await expect(
      assertLlmFrontierHourlySpendNoSpike({
        redis,
        tenantId: "t",
        tier: "SMALL",
      }),
    ).rejects.toThrow(LlmFrontierHourlySpendSpikeError);
  });
});

describe("withLlmFallbackChain", () => {
  beforeEach(() => {
    vi.spyOn(metrics, "recordLlmFallback").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returnează primary fără fallback", async () => {
    const r = await withLlmFallbackChain({
      primary: async () => 42,
      fallbacks: [{ name: "x", run: async () => 0 }],
    });
    expect(r).toBe(42);
    expect(metrics.recordLlmFallback).not.toHaveBeenCalled();
  });

  it("primary eșuează → primul fallback reușește și înregistrează metrică", async () => {
    const r = await withLlmFallbackChain({
      primary: async () => {
        throw new Error("primary down");
      },
      fallbacks: [
        { name: "grok-4", run: async () => 99 },
        { name: "gpt-4o", run: async () => 1 },
      ],
    });
    expect(r).toBe(99);
    expect(metrics.recordLlmFallback).toHaveBeenCalledWith("grok-4", "error");
  });

  it("sensitive: primary eșuează → LlmFrontierGdprViolation (fără fallback)", async () => {
    await expect(
      withLlmFallbackChain({
        primary: async () => {
          throw new Error("fail");
        },
        fallbacks: [{ name: "x", run: async () => 1 }],
        dataSensitivity: "sensitive",
      }),
    ).rejects.toThrow(LlmFrontierGdprViolation);
    expect(metrics.recordLlmFallback).not.toHaveBeenCalled();
  });

  it("spendGuard: spike orar blochează fallback frontier", async () => {
    const redis = {
      get: vi.fn(async (key: string) => {
        if (key.includes("day")) return "1";
        if (key.includes("hour")) return "99";
        return null;
      }),
    };
    await expect(
      withLlmFallbackChain({
        primary: async () => {
          throw new Error("infraq down");
        },
        fallbacks: [{ name: "x", run: async () => 1 }],
        spendGuard: { redis, tenantId: "t", tier: "SMALL" },
      }),
    ).rejects.toThrow(LlmFrontierHourlySpendSpikeError);
  });
});

describe("consensusStructuredVote", () => {
  const schema = z.object({ approved: z.boolean() });
  const messages = [
    { role: "system" as const, content: 'Return ONLY JSON: {"approved":true|false}' },
    { role: "user" as const, content: "Approve?" },
  ];

  it("majoritate 2/3 pe același răspuns", async () => {
    const raw = `{"approved":true}`;
    const models = [
      { id: "a", generateText: vi.fn().mockResolvedValue(raw) },
      { id: "b", generateText: vi.fn().mockResolvedValue(raw) },
      { id: "c", generateText: vi.fn().mockResolvedValue(`{"approved":false}`) },
    ];
    const r = await consensusStructuredVote({
      schema,
      messages,
      models,
      triggerLabel: "test",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.approved).toBe(true);
      expect(r.agreement).toBe("majority");
    }
  });

  it("insufficient_models dacă < 2 modele", async () => {
    const r = await consensusStructuredVote({
      schema,
      messages,
      models: [{ id: "only", generateText: vi.fn() }],
      triggerLabel: "test",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("insufficient_models");
  });

  it("parse_all_failed include modelTraces pentru audit (toate răspunsurile brute)", async () => {
    const models = [
      { id: "a", generateText: vi.fn().mockResolvedValue("not json") },
      { id: "b", generateText: vi.fn().mockResolvedValue("also bad") },
    ];
    const r = await consensusStructuredVote({
      schema,
      messages,
      models,
      triggerLabel: "audit_traces",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("parse_all_failed");
      expect(r.modelTraces?.map((t) => t.modelId).sort()).toEqual(["a", "b"]);
    }
  });

  it("agregă același conținut semantic când cheile JSON sunt în ordine diferită (canonicalizare)", async () => {
    const nestedSchema = z.object({ x: z.number(), y: z.number() });
    const msgs = [
      { role: "system" as const, content: 'Return ONLY JSON: {"x":number,"y":number}' },
      { role: "user" as const, content: "?" },
    ];
    const models = [
      { id: "a", generateText: vi.fn().mockResolvedValue(`{"y":2,"x":1}`) },
      { id: "b", generateText: vi.fn().mockResolvedValue(`{"x":1,"y":2}`) },
      { id: "c", generateText: vi.fn().mockResolvedValue(`{"x":9,"y":9}`) },
    ];
    const r = await consensusStructuredVote({
      schema: nestedSchema,
      messages: msgs,
      models,
      triggerLabel: "canonical_keys",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({ x: 1, y: 2 });
      const byLocale = (a: string, b: string) => a.localeCompare(b, "en");
      const sortedActual = r.agreeingModelIds.toSorted(byLocale);
      const sortedExpected = ["a", "b"].toSorted(byLocale);
      expect(sortedActual).toEqual(sortedExpected);
    }
  });
});
