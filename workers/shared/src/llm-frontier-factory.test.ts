import { describe, expect, it, vi, afterEach } from "vitest";
import {
  buildFrontierChatTextFallbackSteps,
  buildFrontierStructuredJsonRecordFallbackSteps,
} from "./llm-frontier-factory.js";

describe("llm-frontier-factory", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fără chei API → pașii chat sunt gol", () => {
    vi.stubEnv("XAI_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GOOGLE_AI_API_KEY", "");
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    const steps = buildFrontierChatTextFallbackSteps([{ role: "user", content: "hi" }]);
    expect(steps.length).toBe(0);
  });

  it("fără chei API → pașii JSON structurat sunt gol", () => {
    vi.stubEnv("XAI_API_KEY", "");
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GOOGLE_AI_API_KEY", "");
    vi.stubEnv("DEEPSEEK_API_KEY", "");
    const steps = buildFrontierStructuredJsonRecordFallbackSteps("sys", "user");
    expect(steps.length).toBe(0);
  });
});
