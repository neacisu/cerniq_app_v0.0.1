#!/usr/bin/env node
/**
 * Extrage nume metrici Prometheus declarate cu `name: "..."` din fișierele listate mai jos (inventar static).
 * Nu execută aplicația; nu inferă metrici din collectDefaultMetrics (doar documentate în fișier ca prefix cerniq_).
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const files = [
  "apps/api/src/plugins/metrics.ts",
  "workers/e3-ai-sales/src/e3-metrics.ts",
  "workers/e4-postsale/src/e4-metrics.ts",
  "workers/e5-nurturing/src/lib/e5-metrics.ts",
];

/** Doar declarații prom-client; exclude `fp(..., { name: "metrics" })` Fastify plugin. */
const declRe = /new (?:Counter|Gauge|Histogram)\(\{[\s\S]*?\bname:\s*["']([a-zA-Z0-9_:]+)["']/g;

const out = {
  generatedAt: new Date().toISOString(),
  sourceFiles: files,
  note:
    "e4-metrics.ts re-exportă metrici din workers/shared/src/metrics.ts — pentru inventar complet include acel fișier în revizuiri manuale.",
  byFile: {},
  allNames: [],
};

const seen = new Set();
for (const rel of files) {
  const abs = path.join(root, rel);
  const text = readFileSync(abs, "utf8");
  const names = [];
  let m;
  declRe.lastIndex = 0;
  while ((m = declRe.exec(text)) !== null) {
    const n = m[1];
    names.push(n);
    seen.add(n);
  }
  const sortedForFile = [...names].sort((a, b) => a.localeCompare(b, "en"));
  out.byFile[rel] = sortedForFile;
}

out.allNames = [...seen].sort((a, b) => a.localeCompare(b, "en"));

const writeArg = process.argv.find((a) => a.startsWith("--write="));
if (writeArg) {
  const dest = path.resolve(root, writeArg.slice("--write=".length));
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  console.error(`Scris: ${path.relative(root, dest)}`);
}

console.log(JSON.stringify(out, null, 2));
