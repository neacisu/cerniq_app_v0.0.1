#!/usr/bin/env node
/**
 * CI: verifică că labelNames pentru metricile HTTP din apps/api/src/plugins/metrics.ts
 * respectă allowlist-ul din packages/observability/src/http-metric-label-allowlist.json.
 *
 * Rulare: node infra/scripts/audit_http_metric_label_allowlist.mjs
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const allowlistPath = path.join(root, "packages/observability/src/http-metric-label-allowlist.json");
const CERNIQ_HTTP_PROM_METRIC_LABEL_ALLOWLIST = JSON.parse(readFileSync(allowlistPath, "utf8"));

function assertHttpMetricLabelsAllowed(metricName, labelNames) {
  const allowed = CERNIQ_HTTP_PROM_METRIC_LABEL_ALLOWLIST[metricName];
  if (!allowed) return;
  const bad = labelNames.filter((l) => !allowed.includes(l));
  if (bad.length > 0) {
    throw new Error(
      `Metrică ${metricName}: label-uri nepermise [${bad.join(", ")}]. Actualizați http-metric-label-allowlist.json.`,
    );
  }
}

const metricsPath = path.join(root, "apps/api/src/plugins/metrics.ts");
const src = readFileSync(metricsPath, "utf8");

const METRIC_NAME_ESCAPE_RE = /[.*+?^${}()|[\]\\]/g;

function extractMetricBlock(metricName) {
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

function parseLabelNamesFromBlock(block) {
  const lm = block.match(/labelNames:\s*\[([^\]]*)\]/);
  if (!lm) return [];
  return lm[1]
    .split(",")
    .map((s) => s.trim().replaceAll(/^["']|["']$/g, ""))
    .filter(Boolean);
}

let failed = false;
for (const name of Object.keys(CERNIQ_HTTP_PROM_METRIC_LABEL_ALLOWLIST)) {
  const block = extractMetricBlock(name);
  if (!block) {
    console.error(`audit_http_metric_label_allowlist: lipsește metrica ${name} în metrics.ts`);
    failed = true;
    continue;
  }
  const labels = parseLabelNamesFromBlock(block);
  try {
    assertHttpMetricLabelsAllowed(name, labels);
  } catch (e) {
    console.error(String(e));
    failed = true;
  }
}

if (failed) process.exit(1);
console.error("audit_http_metric_label_allowlist: OK");
