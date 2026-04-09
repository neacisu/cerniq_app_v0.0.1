#!/usr/bin/env node
/**
 * Regresie: lista de pachete din infra/scripts/run-vitest-ci.mjs include workerii critici.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const script = path.join(root, "infra/scripts/run-vitest-ci.mjs");

test("run-vitest-ci.mjs include @cerniq/worker-outreach", () => {
  const src = fs.readFileSync(script, "utf-8");
  assert.match(src, /"@cerniq\/worker-outreach"/);
});

const MUST = [
  "@cerniq/api",
  "@cerniq/worker-enrichment",
  "@cerniq/worker-shared",
  "@cerniq/db",
];

for (const pkg of MUST) {
  test(`run-vitest-ci.mjs include ${pkg}`, () => {
    const src = fs.readFileSync(script, "utf-8");
    assert.match(src, new RegExp(`"${pkg.replaceAll("\\", "\\\\")}"`));
  });
}
