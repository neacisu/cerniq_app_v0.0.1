#!/usr/bin/env node
/**
 * Paritate CI: fiecare pachet cu includeInVitestCi din registru are script `test` în package.json.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const registryPath = path.join(root, "docs/developer-guide/testing-coverage-tiers.json");
const registry = JSON.parse(fs.readFileSync(registryPath, "utf-8"));

const vitestConfigToDir = new Map();
for (const p of registry.packages ?? []) {
  if (p.includeInVitestCi === false) continue;
  if (typeof p.vitestConfigPath !== "string") continue;
  const dir = path.dirname(path.join(root, p.vitestConfigPath));
  vitestConfigToDir.set(p.package, dir);
}

for (const [pkg, dir] of vitestConfigToDir) {
  test(`${pkg} are script "test" invocabil (CI / turbo)`, () => {
    const pj = path.join(dir, "package.json");
    assert.ok(fs.existsSync(pj), `Lipsește package.json la ${dir}`);
    const j = JSON.parse(fs.readFileSync(pj, "utf-8"));
    assert.ok(
      typeof j.scripts?.test === "string" && j.scripts.test.length > 0,
      `${pkg}: adaugă scripts.test în ${pj}`,
    );
  });
}
