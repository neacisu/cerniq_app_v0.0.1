#!/usr/bin/env node
/**
 * Scrie în stdout un rezumat Markdown (pentru $GITHUB_STEP_SUMMARY) din coverage-summary.json
 * generat de Vitest v8 (API + web). Nu înlocuiește Codecov; oferă vizibilitate în UI-ul jobului.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const paths = [
  ["API", path.join(root, "apps/api/coverage/coverage-summary.json")],
  ["Web", path.join(root, "apps/web/coverage/coverage-summary.json")],
];

console.log("## Coverage (Vitest v8)\n");
for (const [label, p] of paths) {
  if (!existsSync(p)) {
    console.log(`- **${label}:** (fișier lipsă după test:coverage)\n`);
    continue;
  }
  try {
    const j = JSON.parse(readFileSync(p, "utf-8"));
    const t = j.total ?? {};
    const pct = (k) => (typeof t[k]?.pct === "number" ? `${t[k].pct.toFixed(2)}%` : "n/a");
    console.log(`| ${label} | Statements | Branches | Functions | Lines |`);
    console.log(`| --- | --- | --- | --- | --- |`);
    console.log(`| % | ${pct("statements")} | ${pct("branches")} | ${pct("functions")} | ${pct("lines")} |\n`);
  } catch {
    console.log(`- **${label}:** parse error\n`);
  }
}
