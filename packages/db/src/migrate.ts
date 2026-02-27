import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const BASE_ROLE = "c3rn1q";

let _migrationPg: ReturnType<typeof postgres> | null = null;
let _migrationDb: PostgresJsDatabase | null = null;

/**
 * Dedicated single-connection client for migrations.
 * Using max:1 guarantees SET ROLE persists across all statements.
 */
function getMigrationDb(): PostgresJsDatabase {
  if (!_migrationDb) {
    const url = process.env.DATABASE_URL ?? "postgresql://localhost:6432/cerniq";
    _migrationPg = postgres(url, { max: 1, prepare: false, idle_timeout: 20, connect_timeout: 10 });
    _migrationDb = drizzle(_migrationPg);
  }
  return _migrationDb;
}

/** Close the dedicated migration connection. Call after all migrations complete. */
export async function closeMigrationDb(): Promise<void> {
  if (_migrationPg) {
    await _migrationPg.end();
    _migrationPg = null;
    _migrationDb = null;
  }
}

export async function runMigrations() {
  const mdb = getMigrationDb();

  await mdb.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  await mdb.execute(sql`CREATE EXTENSION IF NOT EXISTS "postgis"`);
  await mdb.execute(sql`CREATE EXTENSION IF NOT EXISTS "vector"`);
  await mdb.execute(sql`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);

  // Switch session to the permanent base role so all DDL objects
  // (tables, functions, triggers, policies) are owned by c3rn1q.
  // Dynamic OpenBao roles are members of c3rn1q (INHERIT IN ROLE c3rn1q)
  // so SET ROLE is permitted. With max:1 the role persists for all queries.
  await mdb.execute(sql.raw(`SET ROLE "${BASE_ROLE}"`));
  console.log(`Session role set to ${BASE_ROLE} (all DDL will be owned by ${BASE_ROLE})`);

  const schemas = ["bronze", "silver", "gold", "approval", "audit"];
  for (const schema of schemas) {
    await mdb.execute(sql.raw(`CREATE SCHEMA IF NOT EXISTS ${schema}`));
  }

  const [{ current_user: currentUser }] = (await mdb.execute(
    sql`SELECT current_user`,
  )) as unknown as [{ current_user: string }];
  for (const schema of schemas) {
    await mdb.execute(sql.raw(`GRANT ALL ON SCHEMA ${schema} TO "${currentUser}"`));
  }

  console.log(`Extensions and schemas created (grants applied for ${currentUser})`);
}

const IGNORABLE_ERROR_CODES = new Set([
  "42P07", // duplicate_table
  "42P06", // duplicate_schema
  "42710", // duplicate_object (e.g. type, constraint)
]);

function getPgError(err: unknown): { code: string; message: string } {
  const obj = err && typeof err === "object" ? err : null;
  const cause =
    obj && "cause" in obj && obj.cause && typeof obj.cause === "object"
      ? (obj.cause as { code?: string; message?: string })
      : null;
  const code =
    (cause?.code as string) || (obj && "code" in obj ? (obj as { code: string }).code : "") || "";
  const message =
    (cause?.message as string) ||
    (obj && "message" in obj ? (obj as { message: string }).message : "") ||
    "";
  return { code, message };
}

function getAddConstraintName(statement: string): string | null {
  const match = statement.match(/ADD\s+CONSTRAINT\s+"([^"]+)"/i);
  return match?.[1] ?? null;
}

async function constraintExists(mdb: PostgresJsDatabase, constraintName: string): Promise<boolean> {
  const rows = (await mdb.execute(
    sql`SELECT 1 FROM pg_constraint WHERE conname = ${constraintName} LIMIT 1`,
  )) as unknown as Array<Record<string, unknown>>;
  return rows.length > 0;
}

/** Run generated Drizzle SQL migrations from ./drizzle/*.sql (idempotent: ignores "already exists" errors). */
export async function runDrizzleMigrations() {
  const mdb = getMigrationDb();
  const drizzleDir = join(__dirname, "..", "drizzle");
  const files = readdirSync(drizzleDir)
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => {
      if (a === "0005_rls_policies.sql") return 1;
      if (b === "0005_rls_policies.sql") return -1;
      return a.localeCompare(b);
    });

  for (const file of files) {
    const path = join(drizzleDir, file);
    const content = readFileSync(path, "utf-8");
    const statements = content
      .split(/--> statement-breakpoint\n?/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const statement of statements) {
      const addConstraintName = getAddConstraintName(statement);
      if (addConstraintName && (await constraintExists(mdb, addConstraintName))) {
        console.log(`Skipped (already exists): ${statement.slice(0, 60)}...`);
        continue;
      }

      try {
        await mdb.execute(sql.raw(statement));
      } catch (err: unknown) {
        const { code, message } = getPgError(err);

        const isOwnership = code === "42501" && /must be owner of/i.test(message);

        if (IGNORABLE_ERROR_CODES.has(code)) {
          console.log(`Skipped (already exists): ${statement.slice(0, 60)}...`);
        } else if (isOwnership) {
          console.log(`Skipped (ownership mismatch, idempotent): ${statement.slice(0, 80)}...`);
        } else {
          throw err;
        }
      }
    }
    console.log(`Ran migration: ${file}`);
  }
}

/**
 * Safety-net: ensure all Cerniq tables/functions are owned by the base role.
 * With SET ROLE this should already be the case, but this handles edge cases
 * (e.g. objects created before SET ROLE was introduced).
 */
export async function finalizeOwnership() {
  const mdb = getMigrationDb();
  const tables = [
    "public.users",
    "public.roles",
    "public.permissions",
    "public.role_permissions",
    "public.user_roles",
    "public.tenants",
    "public.invite_codes",
    "approval.approval_tasks",
    "approval.approval_type_configs",
    "audit.approval_audit_log",
  ];

  for (const table of tables) {
    try {
      await mdb.execute(sql.raw(`ALTER TABLE ${table} OWNER TO "${BASE_ROLE}"`));
    } catch {
      // Table may not exist yet on first run
    }
  }

  const functions = ["public.get_user_by_email(text)", "public.trigger_set_updated_at()"];
  for (const fn of functions) {
    try {
      await mdb.execute(sql.raw(`ALTER FUNCTION ${fn} OWNER TO "${BASE_ROLE}"`));
    } catch {
      // Function may not exist yet
    }
  }

  console.log(`Ownership transferred to ${BASE_ROLE}`);
}
