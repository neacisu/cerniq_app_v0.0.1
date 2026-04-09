import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { metricsRegistry } from "./metrics.js";

beforeEach(() => {
  metricsRegistry.resetMetrics();
  process.env.INFRAQ_GUARD_TOKEN = "test-token";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("scanPrompt / scanOutput (remote: false)", () => {
  it("scanPrompt sare rețeaua și returnează valid", async () => {
    const { scanPrompt } = await import("./llm-guard.js");
    const r = await scanPrompt("hello", { remote: false });
    expect(r.is_valid).toBe(true);
  });

  it("scanOutput sare rețeaua", async () => {
    const { scanOutput } = await import("./llm-guard.js");
    const r = await scanOutput("p", "o", { remote: false });
    expect(r.is_valid).toBe(true);
  });
});

describe("scanPrompt HTTP (mock fetch)", () => {
  it("parsează răspuns valid și nu incrementează violations", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ is_valid: true, scanners: { PromptInjection: 0 } }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    );
    const { scanPrompt } = await import("./llm-guard.js");
    const { llmGuardViolationsTotal } = await import("./metrics.js");
    const r = await scanPrompt("safe text");
    expect(r.is_valid).toBe(true);
    expect((await llmGuardViolationsTotal.get()).values.length).toBe(0);
  });

  it("is_valid=false incrementează violations per scanner", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              is_valid: false,
              scanners: { PromptInjection: 1, Toxicity: 0.5 },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
      ),
    );
    const { scanPrompt } = await import("./llm-guard.js");
    const { llmGuardViolationsTotal } = await import("./metrics.js");
    const r = await scanPrompt("bad");
    expect(r.is_valid).toBe(false);
    const v = await llmGuardViolationsTotal.get();
    expect(v.values.length).toBeGreaterThanOrEqual(1);
  });
});

describe("guardedLLMCall", () => {
  it("blochează prompt invalid (remote scan)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ is_valid: false, scanners: { BanTopics: 1 } }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    );
    const { guardedLLMCall } = await import("./llm-guard.js");
    const r = await guardedLLMCall({
      userPrompt: "x",
      llmGenerate: async () => "should not run",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("prompt_blocked");
  });

  it("succes cu scan remote valid + business guardrails trecute", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ is_valid: true, scanners: {} }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    );
    const { guardedLLMCall } = await import("./llm-guard.js");
    const r = await guardedLLMCall({
      userPrompt: "u",
      systemPrompt: "s",
      llmGenerate: async () => "final answer",
      runBusinessGuardrails: async () => ({ passed: true }),
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.output).toBe("final answer");
  });

  it("regenerează la output invalid până la succes", async () => {
    let outputScanPass = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const u =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : (input as Request).url;
        if (u.includes("analyze/prompt")) {
          return new Response(JSON.stringify({ is_valid: true, scanners: {} }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        if (u.includes("analyze/output")) {
          outputScanPass++;
          const ok = outputScanPass >= 2;
          return new Response(
            JSON.stringify({
              is_valid: ok,
              scanners: ok ? {} : { Sensitive: 1 },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        return new Response("not found", { status: 404 });
      }),
    );
    const { guardedLLMCall } = await import("./llm-guard.js");
    let gen = 0;
    const r = await guardedLLMCall({
      userPrompt: "u",
      maxOutputRegenerations: 2,
      llmGenerate: async () => {
        gen++;
        return gen === 1 ? "bad" : "good";
      },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.output).toBe("good");
      expect(r.outputRegenerations).toBe(1);
    }
  });

  it("business guardrail epuizează regenerările", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ is_valid: true, scanners: {} }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
      ),
    );
    const { guardedLLMCall } = await import("./llm-guard.js");
    const r = await guardedLLMCall({
      userPrompt: "u",
      maxOutputRegenerations: 1,
      llmGenerate: async () => "same",
      runBusinessGuardrails: async () => ({ passed: false, reason: "price" }),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("business_guardrail_exhausted");
  });
});

describe("llm-cost-governance", () => {
  it("shouldDowngradeLlmToSelfHostedFast la 80% din cap SMALL", async () => {
    const { shouldDowngradeLlmToSelfHostedFast, LLM_DAILY_CAP_USD } =
      await import("./llm-cost-governance.js");
    expect(shouldDowngradeLlmToSelfHostedFast({ spentUsdDay: 8, tier: "SMALL" })).toBe(true);
    expect(shouldDowngradeLlmToSelfHostedFast({ spentUsdDay: 7, tier: "SMALL" })).toBe(false);
    expect(LLM_DAILY_CAP_USD.ENTERPRISE).toBe(500);
  });

  it("redisLlmSpendDayKey", async () => {
    const { redisLlmSpendDayKey } = await import("./llm-cost-governance.js");
    expect(redisLlmSpendDayKey("t1", "2026-04-06")).toBe("llm:spend:usd:day:t1:2026-04-06");
  });
});
