#!/usr/bin/env node
/**
 * Verificare artefacte tests/load (fișiere prezente, k6 inspect în Docker dacă e disponibil).
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const REQUIRED = [
  "tests/load/k6-config.js",
  "tests/load/api-health.k6.js",
  "tests/load/api-enrichment.k6.js",
  "tests/load/api-outreach.k6.js",
  "tests/load/run-load-tests.sh",
];

for (const rel of REQUIRED) {
  test(`fișier obligatoriu: ${rel}`, () => {
    const p = path.join(root, rel);
    assert.ok(fs.existsSync(p), `lipsește ${rel}`);
  });
}

test("run-load-tests.sh este executabil", () => {
  const p = path.join(root, "tests/load/run-load-tests.sh");
  const st = fs.statSync(p);
  assert.ok(st.mode & 0o111, "chmod +x tests/load/run-load-tests.sh");
});

test("docker: k6 inspect — scripturi load (fără API live)", () => {
  const r = spawnSync(
    "docker",
    [
      "run",
      "--rm",
      "-v",
      `${root}:/work`,
      "-w",
      "/work",
      "grafana/k6:0.57.0",
      "inspect",
      "tests/load/api-health.k6.js",
    ],
    { encoding: "utf8", timeout: 120_000 },
  );
  if (r.error && String(r.error.message || r.error).includes("ENOENT")) {
    return;
  }
  assert.equal(r.status, 0, r.stderr || r.stdout);
});
