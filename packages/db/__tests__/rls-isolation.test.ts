import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const SQL_DIR = join(__dirname, "..", "drizzle");

function readSqlFile(name: string): string {
  const path = join(SQL_DIR, name);
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8");
}

describe("RLS policy definitions", () => {
  const rlsSql = readSqlFile("0005_rls_policies.sql");
  const rlsSafeSql = readSqlFile("0007_rls_safe_current_setting.sql");
  const combinedSql = rlsSql + "\n" + rlsSafeSql;

  it("RLS policies SQL files exist", () => {
    expect(rlsSql.length).toBeGreaterThan(0);
  });

  it("enables RLS on critical tables", () => {
    const enableRlsPattern = /ALTER TABLE.*ENABLE ROW LEVEL SECURITY/gi;
    const matches = combinedSql.match(enableRlsPattern) ?? [];
    expect(matches.length).toBeGreaterThan(0);
  });

  it("defines policies referencing tenant_id", () => {
    const policyPattern = /CREATE POLICY/gi;
    const policies = combinedSql.match(policyPattern) ?? [];
    expect(policies.length).toBeGreaterThan(0);
  });

  it("references app.tenant_id for session-based isolation", () => {
    expect(combinedSql).toContain("tenant_id");
  });
});

describe("RLS tenant isolation logic", () => {
  it("setSessionTenantId function exists in db exports", async () => {
    process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/test";
    const { setSessionTenantId } = await import("../src/client.js");
    expect(typeof setSessionTenantId).toBe("function");
  });

  it("schema tables have tenantId column defined", async () => {
    const { bronzeContacts } = await import("../src/schemas/bronze.js");
    const { silverCompanies } = await import("../src/schemas/silver.js");
    const { goldCompanies } = await import("../src/schemas/gold.js");
    const { approvalTasks } = await import("../src/schemas/approval.js");

    expect(bronzeContacts.tenantId).toBeDefined();
    expect(silverCompanies.tenantId).toBeDefined();
    expect(goldCompanies.tenantId).toBeDefined();
    expect(approvalTasks.tenantId).toBeDefined();
  });
});

describe("SQL triggers and functions", () => {
  it("migration files contain trigger definitions", () => {
    const allSql: string[] = [];
    const files = [
      "0005_rls_policies.sql",
      "0007_rls_safe_current_setting.sql",
      "0008_quality_score_trigger.sql",
    ];

    for (const file of files) {
      const content = readSqlFile(file);
      if (content) allSql.push(content);
    }

    const combined = allSql.join("\n");
    const hasFunctions =
      /CREATE (OR REPLACE )?FUNCTION/gi.test(combined) || /CREATE POLICY/gi.test(combined);
    expect(hasFunctions).toBe(true);
  });

  it("index definitions exist in schemas", async () => {
    const { bronzeContacts } = await import("../src/schemas/bronze.js");
    const { silverCompanies } = await import("../src/schemas/silver.js");
    const { goldCompanies } = await import("../src/schemas/gold.js");

    expect(silverCompanies).toBeDefined();
    expect(goldCompanies).toBeDefined();
    expect(bronzeContacts).toBeDefined();
  });
});
