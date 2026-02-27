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

/** Run generated Drizzle SQL migrations from ./drizzle/*.sql (idempotent: ignores "already exists" errors). */
export async function runDrizzleMigrations() {
  const drizzleDir = join(__dirname, "..", "drizzle");
  const files = readdirSync(drizzleDir)
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => {
      // Keep policy migration last so schema/FK changes are not blocked by FORCE RLS.
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
      try {
        await db.execute(sql.raw(statement));
      } catch (err: unknown) {
        const { code, message } = getPgError(err);
        const isOwnerFunction = code === "42501" && /must be owner of function/i.test(message);
        const isOwnerRelation = code === "42501" && /must be owner of relation/i.test(message);
        const isOwnerTriggerRelation =
          isOwnerRelation && /^DROP TRIGGER IF EXISTS /i.test(statement);
        const isOwnerPolicyRelation = isOwnerRelation && /^DROP POLICY IF EXISTS /i.test(statement);
        const isOwnerRlsToggle =
          isOwnerRelation &&
          /^ALTER TABLE .* (ENABLE|FORCE) ROW LEVEL SECURITY;?$/i.test(statement);
        if (IGNORABLE_ERROR_CODES.has(code)) {
          console.log(`Skipped (already exists): ${statement.slice(0, 60)}...`);
        } else if (
          isOwnerFunction ||
          isOwnerTriggerRelation ||
          isOwnerPolicyRelation ||
          isOwnerRlsToggle
        ) {
          console.log(
            `Skipped (object owned by base role, idempotent): ${statement.slice(0, 60)}...`,
          );
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
    "public.invite_codes",
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

  const functions = ["public.get_user_by_email(text)", "public.trigger_set_updated_at()"];
  for (const fn of functions) {
    try {
      await db.execute(sql.raw(`ALTER FUNCTION ${fn} OWNER TO ${BASE_ROLE}`));
    } catch {
      // Function may not exist yet
    }
  }

  console.log(`Ownership transferred to ${BASE_ROLE}`);
}
