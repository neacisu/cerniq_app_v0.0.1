#!/usr/bin/env node
/**
 * Artefacte Cognitive Brain: 324 blocuri NEURON în v2 §6, 322 fișiere contract E1–E5,
 * NEURON_MATRIX.csv cu 324 rânduri de date (+ header).
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const cb = path.join(root, "docs/CognitiveBrain");

function runPython(code) {
  return spawnSync("python3", ["-c", code], { cwd: root, encoding: "utf8" });
}

function countNeuronMdUnderStages() {
  let n = 0;
  for (const st of ["E1", "E2", "E3", "E4", "E5"]) {
    const d = path.join(cb, "contracts/neurons", st);
    for (const ent of readdirSync(d)) {
      const p = path.join(d, ent);
      if (ent.endsWith(".md") && statSync(p).isFile()) n += 1;
    }
  }
  return n;
}

test("v2 §6 are exact 324 antete ### NEURON", () => {
  const code = `
from pathlib import Path
import sys
sys.path.insert(0, str(Path("docs/CognitiveBrain/scripts").resolve()))
from _v2_neuron_parse import parse_neuron_blocks
n = len(parse_neuron_blocks(Path("docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md")))
assert n == 324, n
print("ok")
`;
  const r = runPython(code);
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test("contracts/neurons E1–E5: 322 fișiere .md (2 cozi cu două instanțe v2 în același fișier)", () => {
  assert.equal(countNeuronMdUnderStages(), 322);
});

test("NEURON_MATRIX.csv: 325 linii (header + 324 rânduri)", () => {
  const csv = readFileSync(path.join(cb, "NEURON_MATRIX.csv"), "utf8");
  const lines = csv.trim().split("\n");
  assert.equal(lines.length, 325, `expected325 lines, got ${lines.length}`);
});
