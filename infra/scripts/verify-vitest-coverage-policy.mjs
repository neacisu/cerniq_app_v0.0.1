#!/usr/bin/env node
/**
 * Verifică că pragurile coverage-v8 pentru pachetele riscante (API + web)
 * rămân documentate în vitest.config.ts — eșuează dacă lipsesc blocul thresholds.
 *
 * Nu impune valori numerice hardcodate aici: sursa de adevăr este fișierul Vitest
 * din fiecare pachet (single source of truth).
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const targets = [
  { pkg: "@cerniq/api", file: path.join(root, "apps/api/vitest.config.ts") },
  { pkg: "@cerniq/web", file: path.join(root, "apps/web/vitest.config.ts") },
];

let failed = false;
for (const { pkg, file } of targets) {
  if (!existsSync(file)) {
    console.error(`[coverage-policy] Lipsește ${file}`);
    failed = true;
    continue;
  }
  const src = readFileSync(file, "utf-8");
  if (!/coverage:\s*\{/.test(src) || !/thresholds:\s*\{/.test(src)) {
    console.error(`[coverage-policy] ${pkg}: lipsește coverage.thresholds în ${path.relative(root, file)}`);
    failed = true;
    continue;
  }
  for (const key of ["statements", "branches", "functions", "lines"]) {
    if (!new RegExp(String.raw`\b${key}\s*:`).test(src)) {
      console.error(`[coverage-policy] ${pkg}: lipsește pragul thresholds.${key} în vitest.config`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}
console.log("[coverage-policy] OK — API și web au thresholds coverage în vitest.config.ts");
