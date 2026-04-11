#!/usr/bin/env node
/**
 * Regresie: pachetele critice din `run-vitest-ci` sunt în registrul tier cu CI activ.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const registryPath = path.join(root, "docs/developer-guide/testing-coverage-tiers.json");
const script = path.join(root, "infra/scripts/run-vitest-ci.mjs");

test("run-vitest-ci.mjs citește registrul tier", () => {
  const src = fs.readFileSync(script, "utf-8");
  assert.match(src, /testing-coverage-tiers\.json/);
});

const registry = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
const ciPackages = new Set(
  registry.packages.filter((p) => p.includeInVitestCi !== false).map((p) => p.package),
);

const MUST = [
  "@cerniq/api",
  "@cerniq/worker-outreach",
  "@cerniq/worker-enrichment",
  "@cerniq/worker-shared",
  "@cerniq/db",
];

for (const pkg of MUST) {
  test(`registrul tier include ${pkg} cu includeInVitestCi`, () => {
    assert.ok(ciPackages.has(pkg), `Lipsește ${pkg} din registrul CI`);
  });
}
