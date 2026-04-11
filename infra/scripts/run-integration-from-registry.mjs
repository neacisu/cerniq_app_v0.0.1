#!/usr/bin/env node
/**
 * Agregă comenzile `integrationTestScript` unice din registrul tier și le execută secvențial.
 * Surse: docs/developer-guide/testing-coverage-tiers.json
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const registryPath = path.join(rootDir, "docs/developer-guide/testing-coverage-tiers.json");
const registry = JSON.parse(readFileSync(registryPath, "utf-8"));

const scripts = [
  ...new Set(
    (registry.packages ?? [])
      .map((p) => p.integrationTestScript)
      .filter((s) => typeof s === "string" && s.trim().length > 0),
  ),
].sort((a, b) => a.localeCompare(b));

if (scripts.length === 0) {
  console.warn("[run-integration-from-registry] Niciun integrationTestScript în registru.");
  process.exit(0);
}

const isCi = process.env.CI === "1" || process.env.CI === "true";

for (const cmd of scripts) {
  if (cmd.includes("smoke:bullmq-prefix") && !process.env.REDIS_URL) {
    if (isCi) {
      console.error(
        "[run-integration-from-registry] REDIS_URL este obligatoriu în CI pentru smoke:bullmq-prefix.",
      );
      process.exit(1);
    }
    console.warn(
      "[run-integration-from-registry] Omite smoke:bullmq-prefix (REDIS_URL ne setat; în mediul local porniți Redis sau exportați REDIS_URL).",
    );
    continue;
  }
  console.error(`[run-integration-from-registry] → ${cmd}`);
  const result = spawnSync(cmd, {
    shell: true,
    stdio: "inherit",
    cwd: rootDir,
    env: { ...process.env },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
