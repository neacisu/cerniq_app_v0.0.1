#!/usr/bin/env node
/**
 * Verificare artefacte tests/chaos (prezentă, script executabil).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const REQUIRED = [
  "tests/chaos/pumba-scenarios.yml",
  "tests/chaos/run-chaos-test.sh",
  "docs/chaos-engineering-playbook.md",
];

for (const rel of REQUIRED) {
  test(`fișier obligatoriu: ${rel}`, () => {
    const p = path.join(root, rel);
    assert.ok(fs.existsSync(p), `lipsește ${rel}`);
  });
}

test("run-chaos-test.sh este executabil", () => {
  const p = path.join(root, "tests/chaos/run-chaos-test.sh");
  const st = fs.statSync(p);
  assert.ok(st.mode & 0o111, "chmod +x tests/chaos/run-chaos-test.sh");
});
