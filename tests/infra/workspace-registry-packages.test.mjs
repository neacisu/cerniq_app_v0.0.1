#!/usr/bin/env node
/**
 * Fiecare pachet din pnpm-workspace cu package.json trebuie să aibă intrare în testing-coverage-tiers.json.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const registryPath = path.join(root, "docs/developer-guide/testing-coverage-tiers.json");
const workspacePath = path.join(root, "pnpm-workspace.yaml");

function collectPackagesUnderDir(baseRel) {
  /** @type {string[]} */
  const out = [];
  const dir = path.join(root, baseRel);
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const pkgDir = path.join(dir, ent.name);
    if (fs.existsSync(path.join(pkgDir, "package.json"))) {
      out.push(path.relative(root, pkgDir));
    }
  }
  return out;
}

function expandOneWorkspaceEntry(entry) {
  if (entry.endsWith("/*")) {
    return collectPackagesUnderDir(entry.slice(0, -2));
  }
  const pkgDir = path.join(root, entry);
  if (fs.existsSync(path.join(pkgDir, "package.json"))) {
    return [path.relative(root, pkgDir)];
  }
  return [];
}

function expandWorkspacePackages(wsPackages) {
  /** @type {string[]} */
  const out = [];
  for (const entry of wsPackages) {
    out.push(...expandOneWorkspaceEntry(entry));
  }
  return [...new Set(out)].toSorted((a, b) => a.localeCompare(b));
}

function readPackageName(pkgDirRel) {
  const raw = fs.readFileSync(path.join(root, pkgDirRel, "package.json"), "utf-8");
  const j = JSON.parse(raw);
  assert.ok(typeof j.name === "string" && j.name.length > 0, `${pkgDirRel}: name lipsă`);
  return j.name;
}

const registry = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
const registered = new Set((registry.packages ?? []).map((p) => p.package));

const wsText = fs.readFileSync(workspacePath, "utf-8");
const ws = YAML.parse(wsText);
const pkgDirs = expandWorkspacePackages(ws.packages ?? []);

for (const dir of pkgDirs) {
  const name = readPackageName(dir);
  test(`registrul tier include workspace package ${name} (${dir})`, () => {
    assert.ok(registered.has(name), `Adaugă ${name} în docs/developer-guide/testing-coverage-tiers.json`);
  });
}
