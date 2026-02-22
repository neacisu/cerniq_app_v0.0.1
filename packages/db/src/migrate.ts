import { sql } from "drizzle-orm";
import { db } from "./client.js";

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

export async function applyRlsPolicies() {
  const tablesWithTenantId = ["users", "roles", "user_roles"];
  const approvalTables = [
    "approval.approval_tasks",
    "approval.approval_type_configs",
  ];
  const auditTables = ["audit.approval_audit_log"];

  const allTables = [...tablesWithTenantId, ...approvalTables, ...auditTables];

  for (const table of allTables) {
    await db.execute(sql.raw(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`));

    await db.execute(
      sql.raw(
        `CREATE POLICY IF NOT EXISTS tenant_isolation_${table.replace(".", "_")} ON ${table}
       USING (tenant_id = current_setting('app.tenant_id')::uuid)`,
      ),
    );

    await db.execute(
      sql.raw(
        `CREATE POLICY IF NOT EXISTS tenant_insert_${table.replace(".", "_")} ON ${table}
       FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid)`,
      ),
    );
  }

  console.log(`RLS policies applied to ${allTables.length} tables`);
}
