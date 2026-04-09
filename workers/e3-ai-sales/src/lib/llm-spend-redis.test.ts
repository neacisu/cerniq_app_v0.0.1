import { describe, expect, it } from "vitest";
import {
  classifyFrontierSpendProvider,
  estimateFrontierReasoningCostUsd,
} from "./llm-spend-redis.js";

describe("classifyFrontierSpendProvider", () => {
  it("mapează xAI / Grok (case-insensitive)", () => {
    expect(classifyFrontierSpendProvider("grok-4")).toBe("xai");
    expect(classifyFrontierSpendProvider("XAI-MODEL")).toBe("xai");
  });

  it("mapează OpenAI GPT", () => {
    expect(classifyFrontierSpendProvider("gpt-4o")).toBe("openai");
  });

  it("mapează Anthropic Claude", () => {
    expect(classifyFrontierSpendProvider("claude-sonnet-4")).toBe("anthropic");
  });

  it("mapează Google Gemini", () => {
    expect(classifyFrontierSpendProvider("gemini-2.0-flash")).toBe("google");
    expect(classifyFrontierSpendProvider("models/google-foo")).toBe("google");
  });

  it("mapează DeepSeek", () => {
    expect(classifyFrontierSpendProvider("deepseek-chat")).toBe("deepseek");
  });

  it("fallback generic frontier pentru model necunoscut", () => {
    expect(classifyFrontierSpendProvider("unknown-vendor-7b")).toBe("frontier");
  });
});

describe("estimateFrontierReasoningCostUsd", () => {
  it("returnează valori pozitive pentru lungimi rezonabile", () => {
    const u = estimateFrontierReasoningCostUsd("gpt-4o", 4000, 2000);
    expect(u).toBeGreaterThan(0);
  });

  it("tariful deepseek diferă de fallback-ul generic (același coeficient ca grok)", () => {
    const deepseek = estimateFrontierReasoningCostUsd("deepseek-chat", 4000, 2000);
    const generic = estimateFrontierReasoningCostUsd("unknown-model", 4000, 2000);
    expect(deepseek).not.toBe(generic);
    expect(deepseek).toBeLessThan(generic);
  });
});
