#!/usr/bin/env node
/**
 * Eșuează dacă există artefacte de build (*.js, *.d.ts, *.map) în arborii `src/`
 * ai pachetelor/aplicațiilor TypeScript — sursă unică trebuie să fie .ts.
 * Excepții: poate fi extins cu --allow path (nu folosit implicit).
 */
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const roots = [
  path.join(root, "packages"),
  path.join(root, "apps"),
  path.join(root, "workers"),
];

const badExt = new Set([".js", ".d.ts", ".map"]);
const offenders = [];

function recordBadArtifactIfNeeded(full, e) {
  const rel = path.relative(root, full);
  if (!rel.includes(`${path.sep}src${path.sep}`)) return;
  const ext = path.extname(e.name);
  if (!badExt.has(ext) || e.name.endsWith(".test.ts")) return;
  if (ext === ".js" && e.name.endsWith(".config.js")) return;
  offenders.push(rel);
}

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "dist" || e.name === "coverage") continue;
      walk(full);
      continue;
    }
    recordBadArtifactIfNeeded(full, e);
  }
}

for (const base of roots) {
  if (!statSync(base, { throwIfNoEntry: false })?.isDirectory()) continue;
  const pkgs = readdirSync(base, { withFileTypes: true });
  for (const p of pkgs) {
    if (!p.isDirectory()) continue;
    const src = path.join(base, p.name, "src");
    if (statSync(src, { throwIfNoEntry: false })?.isDirectory()) walk(src);
  }
}

if (offenders.length > 0) {
  console.error("[verify-src-artifacts] Artefacte interzise în src/:");
  const sorted = offenders.toSorted((a, b) => a.localeCompare(b, "en"));
  for (const o of sorted) console.error(`  - ${o}`);
  console.error(
    "\nEliminați fișierele generate sau adăugați excepție documentată în ADR/registru. Vezi ADR-0029.",
  );
  process.exit(1);
}
console.log("[verify-src-artifacts] OK — fără .js/.d.ts/.map parazite în src/ (pachete scanate)");
