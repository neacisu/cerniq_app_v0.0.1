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

  const schemas = ["bronze", "silver", "gold", "approval", "audit"];
  for (const schema of schemas) {
    await db.execute(sql.raw(`CREATE SCHEMA IF NOT EXISTS ${schema}`));
  }

  const [{ current_user: currentUser }] = (await db.execute(
    sql`SELECT current_user`,
  )) as unknown as [{ current_user: string }];
  for (const schema of schemas) {
    await db.execute(sql.raw(`GRANT ALL ON SCHEMA ${schema} TO "${currentUser}"`));
  }

  console.log(`Extensions and schemas created (grants applied for ${currentUser})`);
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

/**
 * RLS policies are applied via 0005_rls_policies.sql (idempotent DROP+CREATE pattern).
 * This function transfers ownership of all Cerniq tables to the base role (c3rn1q)
 * so objects created by ephemeral OpenBao dynamic roles survive credential rotation.
 */
export async function finalizeOwnership() {
  const BASE_ROLE = "c3rn1q";
  const tables = [
    "public.users",
    "public.roles",
    "public.permissions",
    "public.role_permissions",
    "public.user_roles",
    "public.tenants",
    "approval.approval_tasks",
    "approval.approval_type_configs",
    "audit.approval_audit_log",
  ];

  for (const table of tables) {
    try {
      await db.execute(sql.raw(`ALTER TABLE ${table} OWNER TO ${BASE_ROLE}`));
    } catch {
      // Table may not exist yet on first run
    }
  }

  try {
    await db.execute(
      sql.raw(`ALTER FUNCTION public.get_user_by_email(text) OWNER TO ${BASE_ROLE}`),
    );
  } catch {
    // Function may not exist yet
  }

  console.log(`Ownership transferred to ${BASE_ROLE}`);
}
