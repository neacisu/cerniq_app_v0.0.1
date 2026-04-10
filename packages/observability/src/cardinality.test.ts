import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  assertHttpMetricLabelsAllowed,
  CERNIQ_HTTP_PROM_METRIC_LABEL_ALLOWLIST,
} from "./cardinality.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const METRICS_TS = path.join(__dirname, "../../../apps/api/src/plugins/metrics.ts");

/** Meta-caractere de escapat (aliniat la `audit_http_metric_label_allowlist.mjs`). */
const METRIC_NAME_ESCAPE_RE = /[.*+?^${}()|[\]\\]/g;

function extractMetricBlock(src: string, metricName: string): string | null {
  const esc = metricName.replaceAll(METRIC_NAME_ESCAPE_RE, (ch) => `\\${ch}`);
  const re = new RegExp(
    String.raw`new (?:Counter|Gauge|Histogram)\(\{\s*name:\s*["']` +
      esc +
      String.raw`["'][\s\S]*?\}\)`,
    "m",
  );
  const m = re.exec(src);
  return m?.[0] ?? null;
}

function parseLabelNamesFromBlock(block: string): string[] {
  const labelNamesRe = /labelNames:\s*\[([^\]]*)\]/;
  const lm = labelNamesRe.exec(block);
  if (!lm) return [];
  return lm[1]
    .split(",")
    .map((s) => s.trim().replaceAll(/^["']|["']$/g, ""))
    .filter(Boolean);
}

describe("cardinalitate — allowlist metrici HTTP API", () => {
  const src = readFileSync(METRICS_TS, "utf8");

  it("fiecare intrare allowlist are bloc în metrics.ts (sau e gauge fără label)", () => {
    for (const name of Object.keys(CERNIQ_HTTP_PROM_METRIC_LABEL_ALLOWLIST)) {
      const block = extractMetricBlock(src, name);
      expect(block, `lipsește declarația pentru ${name}`).not.toBeNull();
    }
  });

  it("labelNames din cod ⊆ allowlist pentru metricile HTTP suprafață", () => {
    for (const [metricName, allowed] of Object.entries(CERNIQ_HTTP_PROM_METRIC_LABEL_ALLOWLIST)) {
      const block = extractMetricBlock(src, metricName);
      expect(block).not.toBeNull();
      if (block === null) {
        continue;
      }
      const found = parseLabelNamesFromBlock(block);
      for (const l of found) {
        expect(
          allowed.includes(l),
          `${metricName}: label neașteptat "${l}" — actualizați allowlistul sau eliminați label-ul (cardinalitate)`,
        ).toBe(true);
      }
    }
  });

  it("assertHttpMetricLabelsAllowed aruncă pe label necunoscut", () => {
    expect(() =>
      assertHttpMetricLabelsAllowed("cerniq_http_requests_total", [
        "method",
        "route",
        "status",
        "userId",
      ]),
    ).toThrow(/userId/);
  });
});
