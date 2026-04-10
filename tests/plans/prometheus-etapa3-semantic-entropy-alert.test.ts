/**
 * FAZA 23 — Regulă alertă entropie semantică: expr referă metrici din workers/shared metrics.ts.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ETAPA3 = path.join(ROOT, "infra/config/prometheus/etapa3.yml");

describe("etapa3.yml — SemanticEntropyFlagRateHigh", () => {
  it("expr folosește counter/histogram reale din cod", () => {
    const s = readFileSync(ETAPA3, "utf8");
    const block = s.split("SemanticEntropyFlagRateHigh")[1]?.split("- alert:")[0] ?? "";
    expect(block).toContain("cerniq_hallucination_flagged_total");
    expect(block).toContain("cerniq_llm_requests_total");
    expect(block).toContain('task_type="reasoning"');
    expect(block).toContain("for: 1h");
  });
});
