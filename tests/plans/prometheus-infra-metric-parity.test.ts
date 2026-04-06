/**
 * Paritate `infra/config` (Prometheus / Grafana / alert rules) vs metrici declarate în cod
 * (prom-client: Counter / Gauge / Histogram). Histogram-urile permit și sufixele _bucket, _sum, _count.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");

const SOURCE_FILES = [
  "apps/api/src/plugins/metrics.ts",
  "workers/e3-ai-sales/src/e3-metrics.ts",
  "workers/e4-postsale/src/e4-metrics.ts",
  "workers/e5-nurturing/src/lib/e5-metrics.ts",
  "workers/shared/src/metrics.ts",
] as const;

const declRe = /new (Counter|Gauge|Histogram)\(\{[\s\S]*?\bname:\s*["']([a-zA-Z0-9_:]+)["']/g;

const metricTokenRe = /\bcerniq_[a-z0-9_]+\b/g;

/** Doar string-uri din câmpuri PromQL / Grafana (evită uid-uri `cerniq_staging`, comentarii `cerniq_e5_*`). */
function collectExprStrings(value: unknown, key: string | null, out: string[]): void {
  if (value === null || value === undefined) return;
  if (typeof value === "string") {
    if (key === "expr" || key === "definition") {
      out.push(value);
      return;
    }
    // Variabile Grafana: `query` poate fi listă CSV (datasource) — păstrăm doar PromQL-like.
    if (key === "query" && (value.includes("(") || value.includes("label_values"))) {
      out.push(value);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectExprStrings(item, null, out);
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      collectExprStrings(v, k, out);
    }
  }
}

function collectDeclared(): { counters: Set<string>; histograms: Set<string> } {
  const counters = new Set<string>();
  const histograms = new Set<string>();
  for (const rel of SOURCE_FILES) {
    const abs = path.join(ROOT, rel);
    const text = readFileSync(abs, "utf8");
    declRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = declRe.exec(text)) !== null) {
      const kind = m[1];
      const name = m[2];
      if (kind === "Histogram") histograms.add(name);
      else counters.add(name);
    }
  }
  return { counters, histograms };
}

function buildAllowlist(counters: Set<string>, histograms: Set<string>): Set<string> {
  const allow = new Set<string>();
  for (const c of counters) allow.add(c);
  for (const h of histograms) {
    allow.add(h);
    allow.add(`${h}_bucket`);
    allow.add(`${h}_sum`);
    allow.add(`${h}_count`);
  }
  return allow;
}

function walkConfigFiles(dir: string, out: string[] = []): string[] {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkConfigFiles(full, out);
    else if (/\.(yml|yaml|json)$/.test(ent.name)) out.push(full);
  }
  return out;
}

/** Elimină valori de label din ghilimele — ex. `datname="cerniq_staging"` nu e metrică. */
function stripQuotedStrings(s: string): string {
  return s.replaceAll(/"(?:[^"\\]|\\.)*"/g, '""').replaceAll(/'(?:[^'\\]|\\.)*'/g, "''");
}

function tokensInFile(content: string): string[] {
  const sanitized = stripQuotedStrings(content);
  const found: string[] = [];
  metricTokenRe.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = metricTokenRe.exec(sanitized)) !== null) {
    found.push(m[0]);
  }
  return found;
}

describe("infra/config — referințe cerniq_* aliniate la prom-client", () => {
  it("fiecare token cerniq_* din infra/config apare în inventarul de metrici (+ sufixe histogram)", () => {
    const { counters, histograms } = collectDeclared();
    const allow = buildAllowlist(counters, histograms);
    const infraDir = path.join(ROOT, "infra/config");
    const files = walkConfigFiles(infraDir);
    const violations: string[] = [];

    for (const file of files) {
      const text = readFileSync(file, "utf8");
      const exprParts: string[] = [];
      try {
        if (file.endsWith(".json")) {
          collectExprStrings(JSON.parse(text) as unknown, null, exprParts);
        } else {
          collectExprStrings(parseYaml(text) as unknown, null, exprParts);
        }
      } catch {
        exprParts.length = 0;
        exprParts.push(text);
      }
      const scanned = exprParts.length > 0 ? exprParts.join("\n") : text;
      for (const tok of tokensInFile(scanned)) {
        if (!allow.has(tok)) {
          violations.push(`${tok} ← ${path.relative(ROOT, file)}`);
        }
      }
    }

    const sorted = violations.toSorted((a, b) => a.localeCompare(b, "en"));
    expect(sorted).toEqual([]);
  });
});
