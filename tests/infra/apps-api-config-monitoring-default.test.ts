/**
 * Default MONITORING_API_INTERNAL_URL — HTTP pe rețeaua Docker (fără TLS la monitoring-api).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");
const CONFIG = path.join(ROOT, "apps", "api", "src", "config.ts");

describe("apps/api config — MONITORING_API_INTERNAL_URL", () => {
  it("default este http:// (nu https://) pentru monitoring-api intern", () => {
    const s = readFileSync(CONFIG, "utf8");
    expect(s).toContain(
      'MONITORING_API_INTERNAL_URL: z.url().default("http://cerniq-monitoring-api:64080")',
    );
  });
});
