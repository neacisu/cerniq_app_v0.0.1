import { describe, it, expect } from "vitest";
import {
  auditStrictMigrationFile,
  migrationFileNumericPrefix,
  STRICT_MIGRATION_PREFIX,
} from "../../packages/db/src/migration-sql-audit.js";

describe("migration-sql-audit — contract zero-downtime (prefix strict)", () => {
  it("STRICT_MIGRATION_PREFIX este 70 (0070+)", () => {
    expect(STRICT_MIGRATION_PREFIX).toBe(70);
  });

  it("fișiere < 70 nu sunt raportate", () => {
    expect(migrationFileNumericPrefix("0069_foo.sql")).toBe(69);
    expect(auditStrictMigrationFile("0069_foo.sql", "DROP COLUMN x;")).toEqual([]);
  });

  it("0070+ cu DROP COLUMN → problemă", () => {
    const issues = auditStrictMigrationFile("0070_x.sql", "ALTER TABLE t DROP COLUMN c;");
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toContain("DROP COLUMN");
  });

  it("0070+ CREATE INDEX fără CONCURRENTLY → problemă", () => {
    const sql = `CREATE INDEX idx_x ON t (a);\n--> statement-breakpoint\n`;
    const issues = auditStrictMigrationFile("0070_y.sql", sql);
    expect(issues.some((i) => i.includes("CONCURRENTLY"))).toBe(true);
  });

  it("0070+ CREATE INDEX CONCURRENTLY → OK", () => {
    const sql = `CREATE INDEX CONCURRENTLY idx_x ON t (a);\n--> statement-breakpoint\n`;
    expect(auditStrictMigrationFile("0070_z.sql", sql)).toEqual([]);
  });
});
