import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { db } from "./client.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export async function runMigrations() {
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "postgis"`);
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "vector"`);
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);

  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS bronze`);
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS silver`);
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS gold`);
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS approval`);
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS audit`);

  console.log("Extensions and schemas created");
}

const IGNORABLE_ERROR_CODES = new Set([
  "42P07", // duplicate_table
  "42P06", // duplicate_schema
  "42710", // duplicate_object (e.g. type, constraint)
]);

/** Run generated Drizzle SQL migrations from ./drizzle/*.sql (idempotent: ignores "already exists" errors). */
export async function runDrizzleMigrations() {
  const drizzleDir = join(__dirname, "..", "drizzle");
  const files = readdirSync(drizzleDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const path = join(drizzleDir, file);
    const content = readFileSync(path, "utf-8");
    const statements = content
      .split(/--> statement-breakpoint\n?/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const statement of statements) {
      try {
        await db.execute(sql.raw(statement));
      } catch (err: unknown) {
        const directCode =
          err && typeof err === "object" && "code" in err ? (err as { code: string }).code : "";
        const causeCode =
          err &&
          typeof err === "object" &&
          "cause" in err &&
          (err as { cause: unknown }).cause &&
          typeof (err as { cause: unknown }).cause === "object" &&
          "code" in ((err as { cause: unknown }).cause as object)
            ? (err as { cause: { code: string } }).cause.code
            : "";
        const code = directCode || causeCode;
        if (IGNORABLE_ERROR_CODES.has(code)) {
          console.log(`Skipped (already exists): ${statement.slice(0, 60)}...`);
        } else {
          throw err;
        }
      }
    }
    console.log(`Ran migration: ${file}`);
  }
}

export async function applyRlsPolicies() {
  const tablesWithTenantId = ["users", "roles", "user_roles"];
  const approvalTables = ["approval.approval_tasks", "approval.approval_type_configs"];
  const auditTables = ["audit.approval_audit_log"];

  const allTables = [...tablesWithTenantId, ...approvalTables, ...auditTables];

  const tenantCondition = "(tenant_id = current_setting('app.tenant_id')::uuid)";

  for (const table of allTables) {
    const policyName = table.replace(".", "_");
    await db.execute(sql.raw(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`));
    await db.execute(sql.raw(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`));

    await db.execute(
      sql.raw(
        `CREATE POLICY IF NOT EXISTS tenant_isolation_${policyName} ON ${table} FOR SELECT USING ${tenantCondition}`,
      ),
    );
    await db.execute(
      sql.raw(
        `CREATE POLICY IF NOT EXISTS tenant_insert_${policyName} ON ${table} FOR INSERT WITH CHECK ${tenantCondition}`,
      ),
    );
    await db.execute(
      sql.raw(
        `CREATE POLICY IF NOT EXISTS tenant_update_${policyName} ON ${table} FOR UPDATE USING ${tenantCondition} WITH CHECK ${tenantCondition}`,
      ),
    );
    await db.execute(
      sql.raw(
        `CREATE POLICY IF NOT EXISTS tenant_delete_${policyName} ON ${table} FOR DELETE USING ${tenantCondition}`,
      ),
    );
  }

  console.log(`RLS policies applied to ${allTables.length} tables`);
}
