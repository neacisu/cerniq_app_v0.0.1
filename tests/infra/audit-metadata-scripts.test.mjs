#!/usr/bin/env node
/**
 * Smoke tests pentru scripturile de audit metadata (rulare reală, fără mock).
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { test } from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

function runNodeScript(relScript, extraArgs = []) {
  const scriptPath = path.join(root, relScript);
  return spawnSync(process.execPath, [scriptPath, ...extraArgs], {
    cwd: root,
    encoding: "utf8",
  });
}

function assertLocaleSorted(names, label) {
  const sorted = [...names].sort((a, b) => String(a).localeCompare(String(b), "en"));
  assert.deepEqual(names, sorted, `${label}: allNames trebuie sortate cu localeCompare(en)`);
}

test("audit-prometheus-metrics.mjs produce JSON valid cu allNames sortate", () => {
  const r = runNodeScript("infra/scripts/audit-prometheus-metrics.mjs");
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const data = JSON.parse(r.stdout);
  assert.ok(data.generatedAt);
  assert.ok(Array.isArray(data.allNames));
  assertLocaleSorted(data.allNames, "allNames");
  for (const rel of Object.keys(data.byFile)) {
    assertLocaleSorted(data.byFile[rel], rel);
  }
});

test("audit-api-routes.mjs produce JSON valid cu routeRegistrations", () => {
  const r = runNodeScript("infra/scripts/audit-api-routes.mjs");
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const data = JSON.parse(r.stdout);
  assert.ok(Array.isArray(data.routeRegistrations));
  assert.ok(data.totalHandlers > 0, "trebuie cel puțin un handler Fastify detectat");
  assertLocaleSorted(Object.keys(data.byFile), "byFile keys");
});
