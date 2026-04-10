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

function runPythonScript(relScript, extraArgs = []) {
  const scriptPath = path.join(root, relScript);
  return spawnSync("python3", [scriptPath, ...extraArgs], {
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

test("verify_http_route_manifest.py — snapshot aliniat la cod", () => {
  const r = runPythonScript("infra/scripts/verify_http_route_manifest.py");
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test("audit_http_metric_label_allowlist.mjs — label-uri HTTP vs allowlist", () => {
  const r = runNodeScript("infra/scripts/audit_http_metric_label_allowlist.mjs");
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test("build_http_trace_smoke_matrix.py — verify față de snapshot", () => {
  const r = runPythonScript("infra/scripts/build_http_trace_smoke_matrix.py", [
    "--write=docs/generated/http-trace-smoke-matrix.json",
    "--verify",
  ]);
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test("unittest — funcții pure observability (Python infra)", () => {
  const r = spawnSync(
    "python3",
    ["-m", "unittest", "discover", "-s", "tests/infra", "-p", "test_observability_scripts.py", "-v"],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test("compare_route_manifest_openapi.py — JSON valid (mod non-strict)", () => {
  const r = runPythonScript("infra/scripts/compare_route_manifest_openapi.py");
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const data = JSON.parse(r.stdout.trim());
  assert.ok(data.counts || data.skipped);
});

test("build_http_route_manifest.py — JSON cu alias negotiation", () => {
  const r = runPythonScript("infra/scripts/build_http_route_manifest.py");
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const data = JSON.parse(r.stdout);
  assert.ok(Array.isArray(data.routes));
  assert.ok(data.routeCount >= 200, "prag minim rute");
  const prefixes = new Set(
    data.routes.filter((x) => x.registerSymbol === "negotiationRoutes").map((x) => x.prefix),
  );
  assert.deepEqual(prefixes, new Set(["/api/v1/negotiation", "/api/v1/negotiations"]));
});
