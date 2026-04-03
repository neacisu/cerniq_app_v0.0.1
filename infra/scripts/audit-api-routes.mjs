#!/usr/bin/env node
/**
 * Inventar rute Fastify: numără app.(get|post|put|patch|delete) în apps/api/src/routes/*.ts
 * + prefixe din apps/api/src/routes/index.ts (registerRoutes) pentru reconciliere cu planul.
 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const routesDir = path.join(root, "apps/api/src/routes");
const indexPath = path.join(routesDir, "index.ts");
const routeRe =
  /\bapp\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/g;

const registerRe =
  /await\s+app\.register\(\s*(\w+)\s*,\s*\{\s*prefix:\s*["']([^"']+)["']\s*\}\s*\)/g;

const files = readdirSync(routesDir)
  .filter((f) => f.endsWith(".ts") && f !== "index.ts")
  .sort((a, b) => a.localeCompare(b, "en"));

const summary = {};
let total = 0;
for (const file of files) {
  const text = readFileSync(path.join(routesDir, file), "utf8");
  const methods = {};
  let m;
  routeRe.lastIndex = 0;
  while ((m = routeRe.exec(text)) !== null) {
    const method = m[1].toUpperCase();
    methods[method] = (methods[method] ?? 0) + 1;
    total += 1;
  }
  const count = Object.values(methods).reduce((a, b) => a + b, 0);
  if (count > 0) {
    summary[file] = { count, methods };
  }
}

const indexText = readFileSync(indexPath, "utf8");
const routeRegistrations = [];
let rm;
registerRe.lastIndex = 0;
while ((rm = registerRe.exec(indexText)) !== null) {
  routeRegistrations.push({ exportSymbol: rm[1], prefix: rm[2] });
}

const out = {
  generatedAt: new Date().toISOString(),
  totalHandlers: total,
  routeRegistrations,
  byFile: summary,
};

const writeArg = process.argv.find((a) => a.startsWith("--write="));
if (writeArg) {
  const dest = path.resolve(root, writeArg.slice("--write=".length));
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  console.error(`Scris: ${path.relative(root, dest)}`);
}

console.log(JSON.stringify(out, null, 2));
