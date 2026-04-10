import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { extractAddConstraintName } from "./migrate-sql-helpers.js";
import { migrateCliLog } from "./migrate-cli-log.js";
import { getPostgresErrorFields } from "./pg-error-fields.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const BASE_ROLE = "c3rn1q";

let _migrationPg: ReturnType<typeof postgres> | null = null;
let _migrationDb: PostgresJsDatabase | null = null;

export type MigrationRunOptions = {
  dryRun?: boolean;
};

/**
 * Dedicated single-connection client for migrations.
 * Using max:1 guarantees SET ROLE persists across all statements.
 * Prefers DATABASE_DIRECT_URL (bypasses PgBouncer) for DDL safety.
 */
function getMigrationDb(): PostgresJsDatabase {
  if (!_migrationDb) {
    const url = (process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL)?.trim();
    if (!url) {
      throw new Error(
        "Missing required environment variable: DATABASE_DIRECT_URL or DATABASE_URL. " +
          "Ensure the OpenBao agent is rendering secrets to SECRETS_PATH (default: /secrets/api.env).",
      );
    }
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

export async function runMigrations(options: MigrationRunOptions = {}) {
  const mdb = getMigrationDb();
  const dryRun = options.dryRun === true;

  const exec = async (statement: string | ReturnType<typeof sql.raw>) => {
    if (dryRun) {
      const text = typeof statement === "string" ? statement : "SQL(statement)";
      console.log(`[DRY-RUN] ${text}`);
      return;
    }
    if (typeof statement === "string") {
      await mdb.execute(sql.raw(statement));
      return;
    }
    await mdb.execute(statement);
  };

  // Suppress PostgreSQL NOTICE messages for idempotent IF NOT EXISTS statements
  await exec(`SET client_min_messages = warning`);

  await exec(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  await exec(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
  await exec(`CREATE EXTENSION IF NOT EXISTS "postgis"`);
  await exec(`CREATE EXTENSION IF NOT EXISTS "vector"`);
  await exec(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);

  // Switch session to the permanent base role so all DDL objects
  // (tables, functions, triggers, policies) are owned by c3rn1q.
  // Dynamic OpenBao roles are members of c3rn1q (INHERIT IN ROLE c3rn1q)
  // so SET ROLE is permitted. With max:1 the role persists for all queries.
  await exec(`SET ROLE "${BASE_ROLE}"`);
  console.log(`Session role set to ${BASE_ROLE} (all DDL will be owned by ${BASE_ROLE})`);

  const schemas = ["bronze", "silver", "gold", "approval", "audit", "integration"];
  for (const schema of schemas) {
    await exec(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
  }

  const [{ current_user: currentUser }] = (await mdb.execute(
    sql`SELECT current_user`,
  )) as unknown as [{ current_user: string }];
  for (const schema of schemas) {
    try {
      await exec(`GRANT ALL ON SCHEMA ${schema} TO "${currentUser}"`);
    } catch {
      // GRANT fails when session role already owns the schema (no GRANT OPTION needed).
      // Safe to skip: SET ROLE ensures all subsequent DDL is owned by BASE_ROLE.
    }
  }

  // Restore default message level for subsequent queries
  await exec(`SET client_min_messages = notice`);

  console.log(`Extensions and schemas created (role: ${currentUser})`);
}

const IGNORABLE_ERROR_CODES = new Set([
  "42P07", // duplicate_table
  "42P06", // duplicate_schema
  "42710", // duplicate_object (e.g. type, constraint)
]);

function isRlsMigrationFile(filename: string): boolean {
  return filename.startsWith("0005_rls") || filename.startsWith("0007_rls");
}

/** Ordine stabilă: fișiere RLS după restul (aceeași convenție ca înainte). */
function compareDrizzleFilenames(a: string, b: string): number {
  const rlsA = isRlsMigrationFile(a);
  const rlsB = isRlsMigrationFile(b);
  if (rlsA && !rlsB) return 1;
  if (!rlsA && rlsB) return -1;
  return a.localeCompare(b);
}

function splitDrizzleStatements(content: string): string[] {
  return content
    .split(/--> statement-breakpoint\n?/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isPermissionDeniedForMigration(code: string, message: string): boolean {
  return (
    code === "42501" &&
    (/must be owner of/i.test(message) || /permission denied for schema/i.test(message))
  );
}

async function executeDrizzleStatement(
  mdb: PostgresJsDatabase,
  statement: string,
  dryRun: boolean,
  logContext?: { file?: string },
): Promise<void> {
  try {
    if (dryRun) {
      console.log(`[DRY-RUN] ${statement.slice(0, 120)}...`);
    } else {
      migrateCliLog({
        level: "info",
        event: "migrate_drizzle_statement",
        file: logContext?.file,
        preview: statement.slice(0, 200).replaceAll(/\s+/g, " "),
      });
      await mdb.execute(sql.raw(statement));
    }
  } catch (err: unknown) {
    const { code, message } = getPostgresErrorFields(err);

    if (IGNORABLE_ERROR_CODES.has(code)) {
      console.log(`Skipped (already exists): ${statement.slice(0, 60)}...`);
      return;
    }
    if (isPermissionDeniedForMigration(code, message)) {
      console.log(`Skipped (idempotent, already applied): ${statement.slice(0, 80)}...`);
      return;
    }
    throw err;
  }
}

async function runDrizzleStatementsForFile(
  mdb: PostgresJsDatabase,
  file: string,
  statements: string[],
  dryRun: boolean,
): Promise<void> {
  for (const statement of statements) {
    const addConstraintName = extractAddConstraintName(statement);
    if (addConstraintName && (await constraintExists(mdb, addConstraintName))) {
      console.log(`Skipped (already exists): ${statement.slice(0, 60)}...`);
      continue;
    }
    await executeDrizzleStatement(mdb, statement, dryRun, { file });
  }
  console.log(`Ran migration: ${file}`);
}

async function constraintExists(mdb: PostgresJsDatabase, constraintName: string): Promise<boolean> {
  const rows = (await mdb.execute(
    sql`SELECT 1 FROM pg_constraint WHERE conname = ${constraintName} LIMIT 1`,
  )) as unknown as Array<Record<string, unknown>>;
  return rows.length > 0;
}

/** Run generated Drizzle SQL migrations from ./drizzle/*.sql (idempotent: ignores "already exists" errors). */
export async function runDrizzleMigrations(options: MigrationRunOptions = {}) {
  const mdb = getMigrationDb();
  const dryRun = options.dryRun === true;

  // Suppress PostgreSQL NOTICE messages for idempotent IF NOT EXISTS statements
  if (!dryRun) await mdb.execute(sql.raw(`SET client_min_messages = warning`));
  // Nu setăm lock_timeout aici: CREATE INDEX CONCURRENTLY poate depăși minute — vezi ghidul zero-downtime.

  const drizzleDir = join(__dirname, "..", "drizzle");
  const files = readdirSync(drizzleDir)
    .filter((f) => f.endsWith(".sql"))
    .toSorted(compareDrizzleFilenames);

  for (const file of files) {
    const path = join(drizzleDir, file);
    const content = readFileSync(path, "utf-8");
    const statements = splitDrizzleStatements(content);
    await runDrizzleStatementsForFile(mdb, file, statements, dryRun);
  }

  if (!dryRun) await mdb.execute(sql.raw(`SET client_min_messages = notice`));
}

/**
 * Safety-net: ensure all Cerniq tables/functions are owned by the base role.
 * With SET ROLE this should already be the case, but this handles edge cases
 * (e.g. objects created before SET ROLE was introduced).
 */
export async function finalizeOwnership(options: MigrationRunOptions = {}) {
  const mdb = getMigrationDb();
  const dryRun = options.dryRun === true;
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
      if (dryRun) {
        console.log(`[DRY-RUN] ALTER TABLE ${table} OWNER TO "${BASE_ROLE}"`);
      } else {
        await mdb.execute(sql.raw(`ALTER TABLE ${table} OWNER TO "${BASE_ROLE}"`));
      }
    } catch {
      // Table may not exist yet on first run
    }
  }

  const functions = ["public.get_user_by_email(text)", "public.trigger_set_updated_at()"];
  for (const fn of functions) {
    try {
      if (dryRun) {
        console.log(`[DRY-RUN] ALTER FUNCTION ${fn} OWNER TO "${BASE_ROLE}"`);
      } else {
        await mdb.execute(sql.raw(`ALTER FUNCTION ${fn} OWNER TO "${BASE_ROLE}"`));
      }
    } catch {
      // Function may not exist yet
    }
  }

  console.log(`Ownership transferred to ${BASE_ROLE}`);
}

export async function runAllMigrations(options: { dryRun?: boolean; rollback?: boolean } = {}) {
  const mdb = getMigrationDb();
  const dryRun = options.dryRun === true;
  const rollback = options.rollback === true;

  if (dryRun) {
    console.log("Running migrations in DRY-RUN mode.");
    await runMigrations({ dryRun: true });
    await runDrizzleMigrations({ dryRun: true });
    await finalizeOwnership({ dryRun: true });
    return;
  }

  if (!rollback) {
    await runMigrations();
    await runDrizzleMigrations();
    await finalizeOwnership();
    return;
  }

  console.log("Running migrations in ROLLBACK mode (transaction will be reverted).");
  await mdb.execute(sql.raw("BEGIN"));
  try {
    await runMigrations();
    await runDrizzleMigrations();
    await finalizeOwnership();
    await mdb.execute(sql.raw("ROLLBACK"));
    console.log("Rollback completed. No migration changes were persisted.");
  } catch (error) {
    await mdb.execute(sql.raw("ROLLBACK"));
    throw error;
  }
}
