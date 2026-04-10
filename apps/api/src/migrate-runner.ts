/**
 * Run DB migrations (extensions, schemas, Drizzle SQL, RLS).
 * Used by CD pipeline: mount runtime-secrets at /secrets and set SECRETS_PATH=/secrets/api.env.
 * Usage: node dist/migrate-runner.js
 */
import "./config.js";
import { createServiceLogger } from "@cerniq/observability";
import { runAllMigrations, closeMigrationDb } from "@cerniq/db";

const migrateLog = createServiceLogger("db-migrate-runner");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run") || process.env.MIGRATION_DRY_RUN === "true";
const rollback = args.has("--rollback") || process.env.MIGRATION_ROLLBACK === "true";

let exitCode = 0;
try {
  await runAllMigrations({ dryRun, rollback });
  migrateLog.info({ event: "migrations_completed" }, "Migrations completed successfully.");
} catch (err) {
  migrateLog.error({ err, event: "migrations_failed" }, "Migration failed");
  exitCode = 1;
} finally {
  await closeMigrationDb();
}
process.exit(exitCode);
