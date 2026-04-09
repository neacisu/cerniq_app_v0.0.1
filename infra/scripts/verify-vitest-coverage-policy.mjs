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
/** Aliniat cu `infra/scripts/run-vitest-ci.mjs` — fiecare pachet trebuie să declare `coverage.thresholds` (v8). */
const targets = [
  { pkg: "@cerniq/api", file: path.join(root, "apps/api/vitest.config.ts") },
  { pkg: "@cerniq/web", file: path.join(root, "apps/web/vitest.config.ts") },
  { pkg: "@cerniq/web-admin", file: path.join(root, "apps/web-admin/vitest.config.ts") },
  { pkg: "@cerniq/monitoring-api", file: path.join(root, "apps/monitoring-api/vitest.config.ts") },
  { pkg: "@cerniq/db", file: path.join(root, "packages/db/vitest.config.ts") },
  { pkg: "@cerniq/shared-types", file: path.join(root, "packages/shared-types/vitest.config.ts") },
  { pkg: "@cerniq/config", file: path.join(root, "packages/config/vitest.config.ts") },
  { pkg: "@cerniq/observability", file: path.join(root, "packages/observability/vitest.config.ts") },
  { pkg: "@cerniq/worker-enrichment", file: path.join(root, "workers/enrichment/vitest.config.ts") },
  { pkg: "@cerniq/worker-shared", file: path.join(root, "workers/shared/vitest.config.ts") },
  { pkg: "@cerniq/worker-ai", file: path.join(root, "workers/ai/vitest.config.ts") },
  { pkg: "@cerniq/worker-outreach", file: path.join(root, "workers/outreach/vitest.config.ts") },
  { pkg: "@cerniq/worker-e3-ai-sales", file: path.join(root, "workers/e3-ai-sales/vitest.config.ts") },
  { pkg: "@cerniq/worker-e4-postsale", file: path.join(root, "workers/e4-postsale/vitest.config.ts") },
  { pkg: "@cerniq/worker-e5-nurturing", file: path.join(root, "workers/e5-nurturing/vitest.config.ts") },
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
  if (!/provider:\s*["']v8["']/.test(src)) {
    console.error(`[coverage-policy] ${pkg}: lipsește coverage.provider v8 în ${path.relative(root, file)}`);
    failed = true;
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
console.log("[coverage-policy] OK — pachetele din run-vitest-ci au coverage v8 + thresholds în vitest.config.ts");
