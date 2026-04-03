#!/usr/bin/env node
/**
 * Verifică că sonar-project.properties există și conține chei obligatorii + căi LCOV declarate (fără a cere fișierele LCOV prezente în working tree).
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sonarPath = path.join(root, "sonar-project.properties");

if (!existsSync(sonarPath)) {
  console.error("Lipsește sonar-project.properties la root.");
  process.exit(1);
}

const raw = readFileSync(sonarPath, "utf8");
const lines = raw.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#"));
const props = Object.fromEntries(
  lines.map((l) => {
    const i = l.indexOf("=");
    if (i === -1) return [l, ""];
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  }),
);

const required = ["sonar.projectKey", "sonar.organization", "sonar.sources", "sonar.tests"];
for (const k of required) {
  if (!props[k]) {
    console.error(`Lipsește sau e goală cheia Sonar: ${k}`);
    process.exit(1);
  }
}

const lcovKey = "sonar.typescript.lcov.reportPaths";
if (!props[lcovKey]) {
  console.error(`Lipsește ${lcovKey}`);
  process.exit(1);
}

const paths = props[lcovKey].split(",").map((p) => p.trim());
for (const rel of paths) {
  if (!rel.endsWith("lcov.info")) {
    console.error(`Cale LCOV neașteptată (așteptat *lcov.info): ${rel}`);
    process.exit(1);
  }
}

console.log("OK: sonar-project.properties — chei și căi LCOV valide.");
process.exit(0);
