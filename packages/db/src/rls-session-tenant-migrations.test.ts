import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const drizzleDir = join(__dirname, "..", "drizzle");

function readSql(name: string): string {
  return readFileSync(join(drizzleDir, name), "utf8");
}

describe("Migrații RLS — tenant sesiune (0060 / 0062)", () => {
  it("0060 definește funcția și politicile folosesc apelul, nu literalul repetat în CREATE POLICY", () => {
    const sql = readSql("0060_llm_audit_job_payloads_nomenclator_siruta.sql");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.cerniq_app_session_tenant_id()");
    expect(sql).toContain("COMMENT ON FUNCTION public.cerniq_app_session_tenant_id()");
    const policyBlocks = sql.split("CREATE POLICY").slice(1);
    for (const block of policyBlocks) {
      expect(
        block.includes("current_setting('app.tenant_id'"),
        `Policy block should not inline current_setting: ${block.slice(0, 120)}`,
      ).toBe(false);
    }
    expect(
      (sql.match(/public\.cerniq_app_session_tenant_id\(\)/g) ?? []).length,
    ).toBeGreaterThanOrEqual(8);
  });

  it("0062 nu duplică current_setting în politici; depinde de funcția din 0060", () => {
    const sql = readSql("0062_integration_abstraction_layer.sql");
    expect(sql).toContain("public.cerniq_app_session_tenant_id()");
    expect(sql.includes("current_setting('app.tenant_id'")).toBe(false);
  });
});
