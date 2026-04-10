import { describe, expect, it, vi } from "vitest";
import { createSemanticEntropyChecker, isCriticalDecision } from "./semantic-entropy.js";

describe("isCriticalDecision", () => {
  it("recunoaște tipurile critice declarate", () => {
    expect(isCriticalDecision("credit_borderline")).toBe(true);
    expect(isCriticalDecision("unknown")).toBe(false);
  });
});

describe("createSemanticEntropyChecker", () => {
  it("marcă consistent când completările și embedding-urile sunt identice (cosine ~1)", async () => {
    const completionFn = vi.fn().mockResolvedValue("same answer");
    const unit = [1, 0, 0];
    const embeddingFn = vi.fn().mockResolvedValue(unit);

    const { checkWithEntropy } = createSemanticEntropyChecker(completionFn, embeddingFn, {
      temperatures: [0.1, 0.2],
      similarityThreshold: 0.9,
      maxRetries: 0,
    });

    const result = await checkWithEntropy("prompt", 64);
    expect(result.decision).toBe("consistent");
    expect(result.isConsistent).toBe(true);
    expect(result.entropy).toBeLessThan(0.15);
    expect(completionFn).toHaveBeenCalled();
    expect(embeddingFn).toHaveBeenCalled();
  });

  it("returnează uncertain când nu există suficiente răspunsuri valide", async () => {
    const completionFn = vi.fn().mockResolvedValue("");
    const embeddingFn = vi.fn();

    const { checkWithEntropy } = createSemanticEntropyChecker(completionFn, embeddingFn, {
      temperatures: [0.1],
      similarityThreshold: 0.85,
      maxRetries: 0,
    });

    const result = await checkWithEntropy("p", 32);
    expect(result.decision).toBe("uncertain");
    expect(embeddingFn).not.toHaveBeenCalled();
  });

  it("marchează hallucination_risk când similaritatea medie e sub prag*0.7", async () => {
    const answers = ["a", "b", "c"];
    let idx = 0;
    const completionFn = vi.fn(async () => answers[idx++] ?? "");
    const embeddingFn = vi.fn(async (text: string) => {
      if (text === "a") return [1, 0, 0];
      if (text === "b") return [0, 1, 0];
      return [0, 0, 1];
    });

    const flagged = { inc: vi.fn() };
    const hist = { observe: vi.fn() };

    const { checkWithEntropy } = createSemanticEntropyChecker(
      completionFn,
      embeddingFn,
      { temperatures: [0.1, 0.2, 0.3], similarityThreshold: 0.95, maxRetries: 0 },
      {
        hallucinationFlagged: flagged as unknown as import("prom-client").Counter,
        hallucinationLabels: { model: "m", action: "log" },
        entropyHistogram: hist as unknown as import("prom-client").Histogram,
        entropyLabels: { model: "m", task_type: "test" },
      },
    );

    const result = await checkWithEntropy("p", 32);
    expect(result.decision).toBe("hallucination_risk");
    expect(flagged.inc).toHaveBeenCalledWith({ model: "m", action: "log" });
    expect(hist.observe).toHaveBeenCalled();
  });
});
