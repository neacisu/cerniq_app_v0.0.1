import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import {
  generateValidatedJsonWithRetries,
  LlmStructuredOutputExhaustedError,
  tryParseAndValidateJson,
  validateLlmJsonOutput,
  stripLlmJsonFences,
} from "./llm-structured-output.js";

vi.mock("./metrics.js", () => ({
  llmRegenerationAttempts: { observe: vi.fn() },
}));

const schema = z.object({
  score: z.number().min(-100).max(100),
  intent: z.enum(["NEUTRAL"]),
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("llm-structured-output", () => {
  it("stripLlmJsonFences elimină fence-uri markdown", () => {
    expect(stripLlmJsonFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("tryParseAndValidateJson reușește pentru JSON valid", () => {
    const r = tryParseAndValidateJson('{"score":0,"intent":"NEUTRAL"}', schema);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.score).toBe(0);
  });

  it("validateLlmJsonOutput aruncă la invalid", () => {
    expect(() => validateLlmJsonOutput('{"score":"x","intent":"NEUTRAL"}', schema)).toThrow();
  });

  it("generateValidatedJsonWithRetries reîncearcă și reușește la a doua rundă", async () => {
    let n = 0;
    const data = await generateValidatedJsonWithRetries({
      schema,
      maxAttempts: 3,
      generateRaw: async () => {
        n += 1;
        if (n === 1) return "not json";
        return JSON.stringify({ score: 0, intent: "NEUTRAL" });
      },
    });
    expect(data.intent).toBe("NEUTRAL");
    expect(n).toBe(2);
  });

  it("generateValidatedJsonWithRetries aruncă LlmStructuredOutputExhaustedError după maxAttempts", async () => {
    await expect(
      generateValidatedJsonWithRetries({
        schema,
        maxAttempts: 2,
        generateRaw: async () => '{"broken":true}',
      }),
    ).rejects.toThrow(LlmStructuredOutputExhaustedError);
  });
});
