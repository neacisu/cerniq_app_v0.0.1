#!/usr/bin/env node
/**
 * Verifică coerența `vitest.config.ts` cu registrul tier
 * `docs/developer-guide/testing-coverage-tiers.json`:
 * - provider v8
 * - prezența thresholds pentru fiecare dimensiune
 * - valori numerice = așteptările din registru (implicit 100 pe toate cele patru)
 *
 * Pachetele cu `enforceVitestThresholds: false` sunt sărite (nu există încă în registru).
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const registryPath = path.join(root, "docs/developer-guide/testing-coverage-tiers.json");

if (!existsSync(registryPath)) {
  console.error(`[coverage-policy] Lipsește registrul tier: ${path.relative(root, registryPath)}`);
  process.exit(1);
}

/** @type {{ packages: Array<Record<string, unknown>> }} */
const registry = JSON.parse(readFileSync(registryPath, "utf-8"));

const keys = ["statements", "branches", "functions", "lines"];
let failed = false;

for (const entry of registry.packages) {
  if (entry.enforceVitestThresholds === false) continue;

  const pkg =
    typeof entry.package === "string" ? entry.package : JSON.stringify(entry.package ?? "(lipsă)");
  const rel = entry.vitestConfigPath;
  if (typeof rel !== "string") {
    console.error(`[coverage-policy] ${pkg}: lipsește vitestConfigPath în registru`);
    failed = true;
    continue;
  }
  const file = path.join(root, rel);
  if (!existsSync(file)) {
    console.error(`[coverage-policy] Lipsește ${file}`);
    failed = true;
    continue;
  }
  const src = readFileSync(file, "utf-8");
  if (!/coverage:\s*\{/.test(src) || !/thresholds:\s*\{/.test(src)) {
    console.error(`[coverage-policy] ${pkg}: lipsește coverage.thresholds în ${rel}`);
    failed = true;
    continue;
  }
  if (!/provider:\s*["']v8["']/.test(src)) {
    console.error(`[coverage-policy] ${pkg}: lipsește coverage.provider v8 în ${rel}`);
    failed = true;
  }

  const expected = entry.vitestThresholds;
  if (expected && typeof expected === "object") {
    for (const key of keys) {
      const want = expected[key];
      if (typeof want !== "number") {
        console.error(`[coverage-policy] ${pkg}: vitestThresholds.${key} invalid în registru`);
        failed = true;
        continue;
      }
      if (!new RegExp(String.raw`\b${key}\s*:`).test(src)) {
        console.error(`[coverage-policy] ${pkg}: lipsește pragul thresholds.${key} în vitest.config`);
        failed = true;
        continue;
      }
      if (!new RegExp(String.raw`\b${key}\s*:\s*${want}\b`).test(src)) {
        console.error(
          `[coverage-policy] ${pkg}: thresholds.${key} trebuie să fie ${want} (conform registrului) în ${rel}`,
        );
        failed = true;
      }
    }
  } else {
    for (const key of keys) {
      if (!new RegExp(String.raw`\b${key}\s*:`).test(src)) {
        console.error(`[coverage-policy] ${pkg}: lipsește pragul thresholds.${key} în vitest.config`);
        failed = true;
        continue;
      }
      if (!new RegExp(String.raw`\b${key}\s*:\s*100\b`).test(src)) {
        console.error(
          `[coverage-policy] ${pkg}: thresholds.${key} trebuie să fie 100 (implicit registru) în ${rel}`,
        );
        failed = true;
      }
    }
  }
}

if (failed) {
  process.exit(1);
}
console.log(
  "[coverage-policy] OK — vitest coverage v8 aliniat la docs/developer-guide/testing-coverage-tiers.json",
);
