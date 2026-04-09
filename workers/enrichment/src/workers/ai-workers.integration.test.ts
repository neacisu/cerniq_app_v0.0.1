/**
 * Contract integrare workeri AI (J1–J4) — procesori BullMQ exportați.
 */
import { describe, it, expect } from "vitest";
import { grokStructuringProcessor } from "./j1-grok-structuring.js";
import { aiDataMergerProcessor } from "./j2-ai-data-merger.js";
import { aiConfidenceScorerProcessor } from "./j3-ai-confidence-scorer.js";
import { aiFallbackProcessor } from "./j4-ai-fallback.js";

describe("AI workers integration (J1–J4 processors)", () => {
  it("exportă grokStructuringProcessor", () => {
    expect(typeof grokStructuringProcessor).toBe("function");
  });

  it("exportă aiDataMergerProcessor", () => {
    expect(typeof aiDataMergerProcessor).toBe("function");
  });

  it("exportă aiConfidenceScorerProcessor", () => {
    expect(typeof aiConfidenceScorerProcessor).toBe("function");
  });

  it("exportă aiFallbackProcessor", () => {
    expect(typeof aiFallbackProcessor).toBe("function");
  });
});
