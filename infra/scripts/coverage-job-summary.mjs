#!/usr/bin/env node
/**
 * Scrie în stdout un rezumat Markdown (pentru $GITHUB_STEP_SUMMARY) din coverage-summary.json
 * generat de Vitest v8 pentru pachetele din registrul tier.
 * Menține ordinea din docs/developer-guide/testing-coverage-tiers.json.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const registryPath = path.join(root, "docs/developer-guide/testing-coverage-tiers.json");
const registry = JSON.parse(readFileSync(registryPath, "utf-8"));

/** Derivează calea coverage-summary.json din vitestConfigPath (ex. apps/api/vitest.config.ts → apps/api/coverage/coverage-summary.json). */
function coverageSummaryPath(vitestConfigRelative) {
  const dir = path.dirname(vitestConfigRelative);
  return path.join(root, dir, "coverage", "coverage-summary.json");
}

console.log("## Coverage (Vitest v8)\n");
console.log(
  "Registru: `docs/developer-guide/testing-coverage-tiers.json`. Dacă un rând arată „fișier lipsă”, rulați `pnpm test:coverage` pentru acel pachet.\n",
);

for (const entry of registry.packages) {
  if (entry.enforceVitestThresholds === false) continue;
  const label = entry.package;
  const p = coverageSummaryPath(entry.vitestConfigPath);
  if (!existsSync(p)) {
    console.log(`- **${label}:** (fișier lipsă după test:coverage) \`${path.relative(root, p)}\`\n`);
    continue;
  }
  try {
    const j = JSON.parse(readFileSync(p, "utf-8"));
    const t = j.total ?? {};
    const pct = (k) => (typeof t[k]?.pct === "number" ? `${t[k].pct.toFixed(2)}%` : "n/a");
    console.log(`### ${label}\n`);
    console.log(`| | Statements | Branches | Functions | Lines |`);
    console.log(`| --- | --- | --- | --- | --- |`);
    console.log(`| % | ${pct("statements")} | ${pct("branches")} | ${pct("functions")} | ${pct("lines")} |\n`);
  } catch {
    console.log(`- **${label}:** parse error în \`${path.relative(root, p)}\`\n`);
  }
}
